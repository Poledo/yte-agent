#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Cài/nâng cấp "Chiến binh y tế số" lên IIS trên máy chủ Windows.

.DESCRIPTION
    Chạy TRÊN MÁY CHỦ, trong thư mục gói do Build-Package.ps1 sinh ra (hoặc trỏ tới gói
    bằng -PackagePath). Script làm trọn một lượt triển khai:

        1. Kiểm tra điều kiện IIS (ASP.NET Core Hosting Bundle, URL Rewrite, ARR).
        2. Sao lưu bản đang chạy (giữ $KeepBackups bản gần nhất).
        3. Đặt app_offline.htm + dừng app pool để nhả khóa file, rồi copy bản mới.
           GIỮ NGUYÊN: api\Storage (file đã nạp) và api\appsettings.Production.json.
        4. Vá web.config của API (môi trường Production, log, giới hạn upload 50MB)
           và sinh web.config cho site web (SPA fallback + proxy /api).
        5. Tạo/cập nhật app pool + site, cấp quyền ghi Storage cho app pool.
        6. Nếu gói có kèm tiện ích Chrome: xuất bản /ext (bản .crx + update.xml) để
           máy trạm tự cập nhật mà không cần Chrome Web Store.
        7. Bật lại, gọi thử /api/health và trang chủ để xác nhận sống.

    Chạy lại nhiều lần được (idempotent) - lần sau chỉ là nâng cấp phiên bản.

.PARAMETER NoProxy
    Không dùng ARR reverse proxy. Site API mở cổng riêng ra ngoài, web-admin phải được
    build kèm -ApiBaseUrl trỏ tới cổng đó, và Cors:WebAdminOrigins trong
    appsettings.Production.json phải liệt kê origin của web-admin.

.EXAMPLE
    .\Deploy-Iis.ps1 -CheckOnly
    Chỉ kiểm tra máy chủ đủ điều kiện chưa, không đụng gì.

.EXAMPLE
    .\Deploy-Iis.ps1 -HostHeader cbyts.benhvien.vn -HttpsPort 443 -CertThumbprint A1B2... -ForceHttps
    Cài kèm HTTPS bằng chứng chỉ đã nạp sẵn trong LocalMachine\My, ép chuyển hướng HTTP sang HTTPS.

.EXAMPLE
    .\Deploy-Iis.ps1 -Rollback
    Quay lại bản sao lưu gần nhất.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    # Thư mục (hoặc file .zip) chứa gói. Bỏ trống = dùng chính thư mục đặt script này.
    [string]$PackagePath,

    # Tên site web trên IIS; site API sẽ là "<SiteName>-api".
    [string]$SiteName = 'cbyts',

    # Nơi cài đặt trên đĩa máy chủ.
    [string]$InstallRoot = 'C:\inetpub\cbyts',

    # Cổng HTTP của site web.
    [int]$Port = 80,

    # Cổng HTTPS; 0 = không tạo binding HTTPS.
    [int]$HttpsPort = 0,

    # Tên miền gắn vào binding (bỏ trống = nhận mọi tên miền trỏ tới máy này).
    [string]$HostHeader = '',

    # Dấu vân tay chứng chỉ trong kho LocalMachine\My (bắt buộc khi HttpsPort > 0).
    [string]$CertThumbprint = '',

    # Cổng nội bộ của site API.
    [int]$ApiPort = 8080,

    # Không dùng reverse proxy - xem phần .PARAMETER NoProxy.
    [switch]$NoProxy,

    # Thêm luật chuyển hướng HTTP -> HTTPS (chỉ có nghĩa khi đã cấu hình HTTPS).
    [switch]$ForceHttps,

    # Địa chỉ gốc điền vào update.xml của tiện ích Chrome, ví dụ https://cbyts.benhvien.vn.
    # Bỏ trống = tự suy từ binding của site (tên miền + giao thức + cổng).
    [string]$ExtensionBaseUrl = '',

    # Số bản sao lưu giữ lại.
    [int]$KeepBackups = 5,

    # Chỉ kiểm tra điều kiện rồi thoát.
    [switch]$CheckOnly,

    # Khôi phục bản sao lưu gần nhất.
    [switch]$Rollback
)

$ErrorActionPreference = 'Stop'
$script:Warnings = @()

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    [OK]  $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }
function Write-Warn($msg) {
    Write-Host "    [!]   $msg" -ForegroundColor Yellow
    $script:Warnings += $msg
}

Import-Module WebAdministration -ErrorAction Stop

$apiPoolName = "$SiteName-api"
$webPoolName = "$SiteName-web"
$apiSiteName = "$SiteName-api"
$apiDir = Join-Path $InstallRoot 'api'
$webDir = Join-Path $InstallRoot 'web'
$backupRoot = Join-Path $InstallRoot 'backup'
$prodConfigName = 'appsettings.Production.json'

# ===========================================================================
# 1. Kiểm tra điều kiện máy chủ
# ===========================================================================
function Test-Prerequisites {
    Write-Step 'Kiểm tra điều kiện IIS'
    $fatal = @()

    if (-not (Get-Service W3SVC -ErrorAction SilentlyContinue)) {
        $fatal += 'Chưa cài IIS. Bật bằng: Install-WindowsFeature Web-Server -IncludeManagementTools'
    }
    else { Write-Ok 'IIS (W3SVC) đã có' }

    # ASP.NET Core Module V2 - do Hosting Bundle cài, thiếu là API trả 500.19/500.21.
    $ancm = Get-WebGlobalModule -Name 'AspNetCoreModuleV2' -ErrorAction SilentlyContinue
    if (-not $ancm) {
        $fatal += 'Thiếu ASP.NET Core Module V2. Cài "ASP.NET Core 10 Hosting Bundle": https://dotnet.microsoft.com/download/dotnet/10.0 (mục Hosting Bundle), rồi chạy iisreset.'
    }
    else { Write-Ok 'AspNetCoreModuleV2' }

    # Runtime ASP.NET Core 10 (Hosting Bundle cài kèm) - kiểm tra theo thư mục shared.
    $sharedRoot = Join-Path $env:ProgramFiles 'dotnet\shared\Microsoft.AspNetCore.App'
    $has10 = (Test-Path $sharedRoot) -and (Get-ChildItem $sharedRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like '10.*' })
    if (-not $has10) {
        $fatal += "Không thấy runtime ASP.NET Core 10 tại $sharedRoot. Cài Hosting Bundle .NET 10."
    }
    else { Write-Ok "Runtime ASP.NET Core $((Get-ChildItem $sharedRoot -Directory | Where-Object Name -like '10.*' | Select-Object -Last 1).Name)" }

    if (-not $NoProxy) {
        $rewrite = Get-WebGlobalModule -Name 'RewriteModule' -ErrorAction SilentlyContinue
        if (-not $rewrite) {
            $fatal += 'Thiếu URL Rewrite. Tải: https://www.iis.net/downloads/microsoft/url-rewrite (cần cho SPA fallback và proxy /api).'
        }
        else { Write-Ok 'URL Rewrite' }

        $proxySection = Get-WebConfiguration -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -ErrorAction SilentlyContinue
        if (-not $proxySection) {
            $fatal += 'Thiếu Application Request Routing (ARR). Tải: https://www.iis.net/downloads/microsoft/application-request-routing - hoặc chạy lại script với -NoProxy.'
        }
        else { Write-Ok 'Application Request Routing' }
    }
    else {
        Write-Info 'Bỏ qua kiểm tra URL Rewrite/ARR (đang dùng -NoProxy)'
    }

    if ($HttpsPort -gt 0 -and -not $CertThumbprint) {
        $fatal += 'Có -HttpsPort thì phải có -CertThumbprint (chứng chỉ trong LocalMachine\My).'
    }
    if ($CertThumbprint) {
        $cert = Get-Item "Cert:\LocalMachine\My\$CertThumbprint" -ErrorAction SilentlyContinue
        if (-not $cert) { $fatal += "Không thấy chứng chỉ $CertThumbprint trong Cert:\LocalMachine\My." }
        else { Write-Ok "Chứng chỉ: $($cert.Subject) (hết hạn $($cert.NotAfter.ToString('dd/MM/yyyy')))" }
    }

    # Cổng đang bị site khác chiếm?
    foreach ($p in @($Port, $ApiPort)) {
        $conflict = Get-WebBinding | Where-Object {
            $_.bindingInformation -match ":$p`:" -and
            $_.ItemXPath -notmatch "@name='$SiteName'" -and $_.ItemXPath -notmatch "@name='$apiSiteName'"
        }
        if ($conflict) { Write-Warn "Cổng $p đang được site IIS khác dùng - kiểm tra lại trước khi chạy thật." }
    }

    if ($fatal.Count -gt 0) {
        Write-Host "`nTHIẾU ĐIỀU KIỆN:" -ForegroundColor Red
        $fatal | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
        throw 'Máy chủ chưa đủ điều kiện triển khai (xem danh sách trên).'
    }
    Write-Ok 'Đủ điều kiện triển khai'
}

# ===========================================================================
# 2. Xác định gói nguồn
# ===========================================================================
function Resolve-Package {
    $candidate = $PackagePath
    if (-not $candidate) { $candidate = $PSScriptRoot }

    if ($candidate -like '*.zip') {
        $dest = Join-Path $env:TEMP ("cbyts-pkg-" + [System.IO.Path]::GetFileNameWithoutExtension($candidate))
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Write-Info "Giải nén $candidate"
        Expand-Archive -Path $candidate -DestinationPath $dest -Force
        $candidate = $dest
    }

    $candidate = (Resolve-Path $candidate).Path
    $hasApi = Test-Path (Join-Path $candidate 'api\AIValidation.Api.dll')
    $hasWeb = Test-Path (Join-Path $candidate 'web\index.html')
    $hasExt = Test-Path (Join-Path $candidate 'ext\update.xml')
    # Gói chỉ có ext vẫn hợp lệ: phát hành riêng bản tiện ích mới thì không cần
    # đụng tới API lẫn web-admin (Build-Package.ps1 -SkipApi -SkipWeb -ExtensionKey).
    if (-not $hasApi -and -not $hasWeb -and -not $hasExt) {
        throw "Thư mục $candidate không phải gói triển khai (thiếu cả api\AIValidation.Api.dll, web\index.html lẫn ext\update.xml). Dùng -PackagePath để trỏ đúng gói."
    }

    $info = Join-Path $candidate 'package-info.json'
    if (Test-Path $info) {
        $meta = Get-Content $info -Raw | ConvertFrom-Json
        Write-Ok "Gói $($meta.version) - commit $($meta.gitCommit) - build $($meta.builtAt)"
    }
    else { Write-Warn 'Gói không có package-info.json (build thủ công?)' }

    [pscustomobject]@{ Root = $candidate; HasApi = $hasApi; HasWeb = $hasWeb; HasExt = $hasExt }
}

# ===========================================================================
# 3. App pool & site
# ===========================================================================
function Set-AppPoolConfig([string]$name) {
    if (-not (Test-Path "IIS:\AppPools\$name")) {
        New-WebAppPool -Name $name | Out-Null
        Write-Ok "Tạo app pool $name"
    }
    # No Managed Code: ứng dụng .NET (Core) chạy ngoài CLR của IIS.
    Set-ItemProperty "IIS:\AppPools\$name" -Name managedRuntimeVersion -Value ''
    # 64-bit bắt buộc: thư viện native đi kèm (pdfium của PDFtoImage, leptonica/tesseract
    # cho OCR) chỉ có bản x64 - bật 32-bit là lỗi BadImageFormatException lúc đọc PDF scan.
    Set-ItemProperty "IIS:\AppPools\$name" -Name enable32BitAppOnWin64 -Value $false
    # Luôn chạy + không tự ngủ: API có background service (đồng bộ ICD theo lịch, chỉ mục
    # embedding) và giữ cấu hình trong bộ nhớ; để pool ngủ là lịch không chạy.
    Set-ItemProperty "IIS:\AppPools\$name" -Name startMode -Value 'AlwaysRunning'
    Set-ItemProperty "IIS:\AppPools\$name" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
    # Không tự tái khởi động theo giờ (mặc định 29 tiếng) - tránh cắt ngang phiên nạp tài liệu.
    Set-ItemProperty "IIS:\AppPools\$name" -Name recycling.periodicRestart.time -Value ([TimeSpan]::Zero)
}

function Set-SiteConfig {
    param(
        [string]$Name, [string]$Path, [string]$Pool,
        [int]$HttpPort, [string]$IpAddress = '*', [string]$Header = ''
    )

    if (-not (Test-Path "IIS:\Sites\$Name")) {
        New-Website -Name $Name -PhysicalPath $Path -ApplicationPool $Pool `
            -Port $HttpPort -IPAddress $IpAddress -HostHeader $Header -Force | Out-Null
        Write-Ok "Tạo site $Name (cổng $HttpPort)"
    }
    else {
        Set-ItemProperty "IIS:\Sites\$Name" -Name physicalPath -Value $Path
        Set-ItemProperty "IIS:\Sites\$Name" -Name applicationPool -Value $Pool
        $bindingInfo = "$IpAddress`:$HttpPort`:$Header"
        $existing = Get-WebBinding -Name $Name -Protocol http | Where-Object { $_.bindingInformation -eq $bindingInfo }
        if (-not $existing) {
            New-WebBinding -Name $Name -Protocol http -Port $HttpPort -IPAddress $IpAddress -HostHeader $Header
            Write-Ok "Thêm binding http $bindingInfo cho $Name"
        }
        Write-Ok "Cập nhật site $Name"
    }

    # Preload để lần gọi đầu không phải chờ khởi động (đi cùng startMode AlwaysRunning).
    Set-ItemProperty "IIS:\Sites\$Name" -Name applicationDefaults.preloadEnabled -Value $true -ErrorAction SilentlyContinue
}

function Set-HttpsBinding([string]$Name) {
    if ($HttpsPort -le 0) { return }

    $bindingInfo = "*:$HttpsPort`:$HostHeader"
    $existing = Get-WebBinding -Name $Name -Protocol https | Where-Object { $_.bindingInformation -eq $bindingInfo }
    if (-not $existing) {
        # SNI (SslFlags 1) khi có tên miền - cho phép nhiều site HTTPS chung một IP.
        $sslFlags = if ($HostHeader) { 1 } else { 0 }
        New-WebBinding -Name $Name -Protocol https -Port $HttpsPort -HostHeader $HostHeader -SslFlags $sslFlags
        Write-Ok "Thêm binding https $bindingInfo"
    }
    $binding = Get-WebBinding -Name $Name -Protocol https | Where-Object { $_.bindingInformation -eq $bindingInfo }
    $binding.AddSslCertificate($CertThumbprint, 'My')
    Write-Ok "Gắn chứng chỉ $CertThumbprint vào $bindingInfo"
}

# ===========================================================================
# 4. Bật/tắt ứng dụng an toàn khi copy đè
# ===========================================================================
function Stop-Pool([string]$name) {
    if (-not (Test-Path "IIS:\AppPools\$name")) { return }
    if ((Get-WebAppPoolState -Name $name).Value -eq 'Stopped') { return }
    Stop-WebAppPool -Name $name
    for ($i = 0; $i -lt 30; $i++) {
        if ((Get-WebAppPoolState -Name $name).Value -eq 'Stopped') { return }
        Start-Sleep -Milliseconds 500
    }
    Write-Warn "App pool $name chưa dừng hẳn sau 15 giây - copy có thể bị khóa file."
}

function Start-Pool([string]$name) {
    if (-not (Test-Path "IIS:\AppPools\$name")) { return }
    if ((Get-WebAppPoolState -Name $name).Value -ne 'Started') { Start-WebAppPool -Name $name }
}

function Copy-Tree {
    <# robocopy /MIR có loại trừ; trả lỗi thật sự (exit >= 8) thành exception. #>
    param([string]$Source, [string]$Destination, [string[]]$ExcludeFiles = @(), [string[]]$ExcludeDirs = @())

    $roboArgs = @($Source, $Destination, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:3', '/W:2')
    if ($ExcludeFiles.Count) { $roboArgs += '/XF'; $roboArgs += $ExcludeFiles }
    if ($ExcludeDirs.Count) { $roboArgs += '/XD'; $roboArgs += $ExcludeDirs }

    & robocopy @roboArgs | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy '$Source' -> '$Destination' lỗi (mã $LASTEXITCODE)." }
    $global:LASTEXITCODE = 0
}

# ===========================================================================
# 5. Vá web.config
# ===========================================================================
function Update-ApiWebConfig([string]$dir) {
    $file = Join-Path $dir 'web.config'
    if (-not (Test-Path $file)) { throw "Không thấy $file - bản publish thiếu web.config của ANCM." }

    [xml]$xml = Get-Content $file -Raw
    $sws = $xml.configuration.'system.webServer'
    $aspNetCore = $sws.aspNetCore
    if (-not $aspNetCore) { throw 'web.config của API không có phần tử aspNetCore.' }

    # In-process: nhanh hơn out-of-process vì không phải nhảy thêm một chặng HTTP nội bộ.
    $aspNetCore.SetAttribute('hostingModel', 'inprocess')
    # Log stdout tắt mặc định (ghi tốn đĩa); bật tay khi cần soi lỗi khởi động.
    $aspNetCore.SetAttribute('stdoutLogEnabled', 'false')
    $aspNetCore.SetAttribute('stdoutLogFile', '.\logs\stdout')

    # ASPNETCORE_ENVIRONMENT=Production để nạp appsettings.Production.json.
    $envVars = $aspNetCore.SelectSingleNode('environmentVariables')
    if (-not $envVars) { $envVars = $aspNetCore.AppendChild($xml.CreateElement('environmentVariables')) }
    foreach ($pair in @{ ASPNETCORE_ENVIRONMENT = 'Production' }.GetEnumerator()) {
        $node = $envVars.SelectSingleNode("environmentVariable[@name='$($pair.Key)']")
        if (-not $node) {
            $node = $envVars.AppendChild($xml.CreateElement('environmentVariable'))
            $node.SetAttribute('name', $pair.Key)
        }
        $node.SetAttribute('value', $pair.Value)
    }

    # Upload tài liệu/danh mục lớn: nới trần 30MB mặc định của IIS lên 50MB (khớp nginx cũ).
    $security = $sws.SelectSingleNode('security')
    if (-not $security) { $security = $sws.AppendChild($xml.CreateElement('security')) }
    $filtering = $security.SelectSingleNode('requestFiltering')
    if (-not $filtering) { $filtering = $security.AppendChild($xml.CreateElement('requestFiltering')) }
    $limits = $filtering.SelectSingleNode('requestLimits')
    if (-not $limits) { $limits = $filtering.AppendChild($xml.CreateElement('requestLimits')) }
    $limits.SetAttribute('maxAllowedContentLength', '52428800')

    $xml.Save($file)
    Write-Ok 'web.config API: inprocess + Production + upload 50MB'
}

function Write-WebSiteConfig([string]$dir) {
    $template = Join-Path $script:TemplateDir 'web-admin.web.config.template'
    if (-not (Test-Path $template)) { throw "Không thấy template $template." }
    $content = Get-Content $template -Raw

    # Luật proxy /api -> site API nội bộ. Không có ARR thì để trống: trình duyệt gọi
    # thẳng host API (bản web phải build kèm -ApiBaseUrl).
    $proxyRule = ''
    if (-not $NoProxy) {
        $proxyRule = @"
        <!-- /api/* -> site API nội bộ (ARR). Nhờ vậy trình duyệt và tiện ích Chrome
             gọi cùng origin, không dính CORS, chứng chỉ TLS chỉ cần cấp cho một tên miền. -->
        <rule name="ProxyApi" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$ApiPort/api/{R:1}" appendQueryString="true" logRewrittenUrl="true" />
        </rule>
"@
    }

    $httpsRule = ''
    if ($ForceHttps) {
        $httpsRule = @'
        <!-- Ép HTTPS: đặt TRƯỚC mọi luật khác để không proxy nhầm request HTTP. -->
        <rule name="ForceHttps" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
'@
    }

    $content = $content.Replace('{{HTTPS_REDIRECT_RULE}}', $httpsRule).Replace('{{API_PROXY_RULE}}', $proxyRule)
    Set-Content -Path (Join-Path $dir 'web.config') -Value $content -Encoding UTF8
    Write-Ok "web.config web-admin (SPA fallback$(if (-not $NoProxy) { " + proxy /api -> 127.0.0.1:$ApiPort" }))"
}

function Get-PublicBaseUrl {
    <#
      Địa chỉ mà MÁY TRẠM gọi tới, dùng cho update.xml và file .reg. Không có tên miền
      thì lấy tên máy chủ - IP/localhost vô nghĩa với máy trạm ở phòng khác.
    #>
    if ($ExtensionBaseUrl) { return $ExtensionBaseUrl.TrimEnd('/') }

    $useHttps = $HttpsPort -gt 0
    $scheme = if ($useHttps) { 'https' } else { 'http' }
    $port = if ($useHttps) { $HttpsPort } else { $Port }
    $hostName = if ($HostHeader) { $HostHeader } else { $env:COMPUTERNAME }

    if (-not $HostHeader) {
        Write-Warn "Không có -HostHeader nên update.xml của tiện ích dùng tạm '$hostName'. Máy trạm gọi bằng tên miền khác thì chạy lại với -ExtensionBaseUrl."
    }
    $default = ($useHttps -and $port -eq 443) -or (-not $useHttps -and $port -eq 80)
    if ($default) { "${scheme}://$hostName" } else { "${scheme}://${hostName}:$port" }
}

function Publish-Extension([string]$sourceDir, [string]$targetDir) {
    <#
      Chép .crx + update.xml lên site web thành /ext và điền địa chỉ thật vào.
      Máy trạm được khai chính sách trỏ vào /ext/update.xml sẽ tự nâng cấp tiện ích,
      không cần Chrome Web Store và không cần ai đụng vào từng máy.
    #>
    Copy-Tree -Source $sourceDir -Destination $targetDir

    $base = Get-PublicBaseUrl
    foreach ($name in @('update.xml', 'chrome-policy.reg')) {
        $file = Join-Path $targetDir $name
        if (-not (Test-Path $file)) { continue }
        # .reg là UTF-16, update.xml là UTF-8: đọc/ghi giữ nguyên kiểu của từng file.
        $encoding = if ($name -like '*.reg') { 'Unicode' } else { 'UTF8' }
        $raw = Get-Content $file -Raw
        if ($raw -match '\{\{BASE_URL\}\}') {
            Set-Content -Path $file -Value $raw.Replace('{{BASE_URL}}', $base) -Encoding $encoding
        }
    }

    $crx = Get-ChildItem $targetDir -Filter '*.crx' | Select-Object -First 1
    $xml = [xml](Get-Content (Join-Path $targetDir 'update.xml') -Raw)
    $script:ExtensionId = $xml.gupdate.app.appid
    $script:ExtensionUpdateUrl = "$base/ext/update.xml"
    Write-Ok "Tiện ích: $($crx.Name) -> $base/ext/  (ID $script:ExtensionId)"
}

function Add-MissingMimeTypes([string]$site) {
    <#
      IIS đời cũ (8.5 trên Windows Server 2012 R2) chưa biết vài kiểu file Angular sinh ra
      → trình duyệt tải font/manifest bị 404. Chỉ thêm kiểu nào máy chủ CHƯA khai báo:
      khai trùng là IIS trả 500.19 cho cả site.
    #>
    $needed = [ordered]@{
        '.webmanifest' = 'application/manifest+json'
        '.woff2'       = 'font/woff2'
        '.woff'        = 'font/woff'
        # Thiếu kiểu này thì IIS trả 404.3 cho file .crx, Chrome báo "tải bản cập nhật thất bại".
        '.crx'         = 'application/x-chrome-extension'
    }
    $existing = @((Get-WebConfiguration -PSPath 'MACHINE/WEBROOT/APPHOST' `
                -Filter 'system.webServer/staticContent').Collection | ForEach-Object { $_.fileExtension })

    foreach ($ext in $needed.Keys) {
        if ($existing -notcontains $ext) {
            Add-WebConfigurationProperty -PSPath "IIS:\Sites\$site" -Filter 'system.webServer/staticContent' `
                -Name '.' -Value @{ fileExtension = $ext; mimeType = $needed[$ext] } -ErrorAction SilentlyContinue
            Write-Ok "Thêm kiểu MIME $ext"
        }
    }
}

function Set-ArrProxy {
    <# Bật proxy ở mức máy chủ + nới timeout + tắt đệm để luồng SSE (chat) chảy ngay. #>
    if ($NoProxy) { return }

    $filter = 'system.webServer/proxy'
    $section = Get-WebConfiguration -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $filter
    $names = @($section.Attributes | ForEach-Object { $_.Name })

    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $filter -Name 'enabled' -Value $true
    $applied = @('enabled=true')

    # Nạp tài liệu lớn / hỏi đáp RAG có thể lâu hơn 2 phút mặc định của ARR.
    if ($names -contains 'timeout') {
        Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $filter -Name 'timeout' -Value '00:05:00'
        $applied += 'timeout=5 phút'
    }
    # Đệm phản hồi làm chết stream SSE của khung chat - đặt về 0 để đẩy thẳng.
    foreach ($attr in @('responseBufferThreshold', 'responseBufferLimit', 'buffer')) {
        if ($names -contains $attr) {
            Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter $filter -Name $attr -Value 0
            $applied += "$attr=0"
        }
    }
    Write-Ok "ARR proxy: $($applied -join ', ')"
}

# ===========================================================================
# 6. Quyền ghi + cấu hình production
# ===========================================================================
function Grant-AppPoolWrite([string]$path, [string]$pool) {
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
    # (OI)(CI)M = kế thừa cho file/thư mục con, quyền Modify.
    & icacls $path /grant "IIS AppPool\$pool`:(OI)(CI)M" /T /Q | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warn "Không cấp được quyền ghi cho '$pool' trên $path." }
}

function Initialize-ProductionConfig([string]$dir) {
    $target = Join-Path $dir $prodConfigName
    if (Test-Path $target) {
        Write-Ok "Giữ nguyên $prodConfigName đang dùng"
    }
    else {
        Copy-Item (Join-Path $script:TemplateDir 'appsettings.Production.template.json') $target
        Write-Warn "Vừa tạo MỚI $target - phải điền chuỗi kết nối, Jwt:SecretKey, Seed:AdminPassword rồi chạy lại script."
    }

    $raw = Get-Content $target -Raw
    # Placeholder còn nguyên = API chắc chắn không khởi động được, báo sớm cho rõ.
    if ($raw -match 'DIEN_VAO_DAY') {
        Write-Warn "$prodConfigName còn chỗ chưa điền (DIEN_VAO_DAY) - API sẽ không khởi động được."
        return $false
    }
    return $true
}

# ===========================================================================
# 7. Sao lưu / khôi phục
# ===========================================================================
function Backup-Current {
    if (-not (Test-Path $apiDir) -and -not (Test-Path $webDir)) { return }

    $stampDir = Join-Path $backupRoot (Get-Date -Format 'yyyyMMdd-HHmmss')
    # Không sao lưu Storage (có thể vài GB file đã nạp) - dữ liệu đó không bị deploy đụng tới.
    if (Test-Path $apiDir) { Copy-Tree -Source $apiDir -Destination (Join-Path $stampDir 'api') -ExcludeDirs @('Storage', 'logs') }
    if (Test-Path $webDir) { Copy-Tree -Source $webDir -Destination (Join-Path $stampDir 'web') }
    Write-Ok "Sao lưu: $stampDir"

    Get-ChildItem $backupRoot -Directory | Sort-Object Name -Descending |
        Select-Object -Skip $KeepBackups | ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Info "Xóa bản sao lưu cũ $($_.Name)"
        }
}

function Restore-Latest {
    if (-not (Test-Path $backupRoot)) { throw "Chưa có bản sao lưu nào tại $backupRoot." }
    $latest = Get-ChildItem $backupRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { throw "Thư mục $backupRoot rỗng." }

    Write-Step "Khôi phục bản $($latest.Name)"
    if (-not $PSCmdlet.ShouldProcess($latest.FullName, 'Khôi phục')) { return }

    Stop-Pool $apiPoolName; Stop-Pool $webPoolName
    if (Test-Path (Join-Path $latest.FullName 'api')) {
        Copy-Tree -Source (Join-Path $latest.FullName 'api') -Destination $apiDir `
            -ExcludeFiles @($prodConfigName, 'app_offline.htm') -ExcludeDirs @('Storage', 'logs')
    }
    if (Test-Path (Join-Path $latest.FullName 'web')) {
        Copy-Tree -Source (Join-Path $latest.FullName 'web') -Destination $webDir
    }
    Start-Pool $apiPoolName; Start-Pool $webPoolName
    Write-Ok 'Đã khôi phục - kiểm tra lại trang chủ và /api/health.'
}

# ===========================================================================
# 8. Kiểm tra sau triển khai
# ===========================================================================
function Test-Endpoint([string]$url, [string]$label, [int]$retries = 12) {
    for ($i = 1; $i -le $retries; $i++) {
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
                Write-Ok "$label -> HTTP $($res.StatusCode)"
                return $true
            }
        }
        catch {
            # Lần đầu sau deploy phải chờ ANCM khởi động app + chạy migration CSDL.
            if ($i -eq $retries) {
                Write-Warn "$label KHÔNG phản hồi ($($_.Exception.Message))"
                return $false
            }
        }
        Start-Sleep -Seconds 5
    }
    return $false
}

# ===========================================================================
# Chạy
# ===========================================================================
Write-Host "Triển khai IIS - site '$SiteName' tại $InstallRoot" -ForegroundColor White

Test-Prerequisites
if ($CheckOnly) {
    Write-Host "`nChỉ kiểm tra (-CheckOnly), không thay đổi gì." -ForegroundColor White
    if ($script:Warnings.Count) { Write-Host "Có $($script:Warnings.Count) cảnh báo ở trên." -ForegroundColor Yellow }
    return
}

if ($Rollback) { Restore-Latest; return }

$package = Resolve-Package
$script:TemplateDir = Join-Path $package.Root 'templates'
if (-not (Test-Path $script:TemplateDir)) { $script:TemplateDir = Join-Path $PSScriptRoot 'templates' }

if (-not $PSCmdlet.ShouldProcess($InstallRoot, "Triển khai gói $($package.Root)")) { return }

Write-Step 'Chuẩn bị thư mục'
foreach ($d in @($InstallRoot, $apiDir, $webDir, $backupRoot, (Join-Path $apiDir 'logs'))) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}
Write-Ok $InstallRoot

Write-Step 'Sao lưu bản đang chạy'
Backup-Current

Write-Step 'Dừng ứng dụng'
# app_offline.htm: ANCM nhả file ngay và người dùng thấy trang bảo trì thay vì lỗi 503.
$offlineTemplate = Join-Path $script:TemplateDir 'app_offline.htm'
if (Test-Path $offlineTemplate) { Copy-Item $offlineTemplate (Join-Path $apiDir 'app_offline.htm') -Force }
Stop-Pool $apiPoolName
Stop-Pool $webPoolName
Write-Ok 'Đã dừng app pool'

try {
    if ($package.HasApi) {
        Write-Step 'Copy API'
        # GIỮ: appsettings.Production.json (bí mật của máy chủ), Storage (file đã nạp), logs.
        Copy-Tree -Source (Join-Path $package.Root 'api') -Destination $apiDir `
            -ExcludeFiles @($prodConfigName, 'app_offline.htm') -ExcludeDirs @('Storage', 'logs')
        Write-Ok 'Đã copy (giữ nguyên Storage + appsettings.Production.json)'
        Update-ApiWebConfig $apiDir
        $configReady = Initialize-ProductionConfig $apiDir
    }
    else {
        Write-Info 'Gói không có phần API - bỏ qua'
        $configReady = $true
    }

    if ($package.HasWeb) {
        Write-Step 'Copy web-admin'
        # Loại trừ 'ext': gói không kèm tiện ích thì /MIR sẽ xóa mất bản .crx đang phục vụ
        # máy trạm, làm hỏng đường tự cập nhật của cả đơn vị.
        Copy-Tree -Source (Join-Path $package.Root 'web') -Destination $webDir `
            -ExcludeFiles @('web.config') -ExcludeDirs @('ext')
        Write-WebSiteConfig $webDir
    }
    else { Write-Info 'Gói không có phần web - bỏ qua' }

    if ($package.HasExt) {
        Write-Step 'Xuất bản tiện ích Chrome'
        Publish-Extension (Join-Path $package.Root 'ext') (Join-Path $webDir 'ext')
    }

    Write-Step 'Cấu hình IIS'
    Set-AppPoolConfig $apiPoolName
    Set-AppPoolConfig $webPoolName
    # Site API chỉ nghe loopback khi có proxy: không ai gọi thẳng từ ngoài vào cổng 8080.
    $apiIp = if ($NoProxy) { '*' } else { '127.0.0.1' }
    Set-SiteConfig -Name $apiSiteName -Path $apiDir -Pool $apiPoolName -HttpPort $ApiPort -IpAddress $apiIp
    Set-SiteConfig -Name $SiteName -Path $webDir -Pool $webPoolName -HttpPort $Port -Header $HostHeader
    Set-HttpsBinding $SiteName
    Add-MissingMimeTypes $SiteName
    Set-ArrProxy

    Write-Step 'Cấp quyền ghi'
    Grant-AppPoolWrite (Join-Path $apiDir 'Storage') $apiPoolName
    Grant-AppPoolWrite (Join-Path $apiDir 'logs') $apiPoolName
    Write-Ok "Storage + logs ghi được bởi 'IIS AppPool\$apiPoolName'"
}
finally {
    Remove-Item (Join-Path $apiDir 'app_offline.htm') -Force -ErrorAction SilentlyContinue
    Start-Pool $apiPoolName
    Start-Pool $webPoolName
}

Write-Step 'Kiểm tra sau triển khai'
if ($configReady) {
    $apiOk = Test-Endpoint "http://127.0.0.1:$ApiPort/api/health" 'API /api/health'
    $webOk = Test-Endpoint "http://127.0.0.1:$Port/" 'Trang web-admin'
    if (-not $NoProxy) { Test-Endpoint "http://127.0.0.1:$Port/api/health" 'Proxy /api qua site web' | Out-Null }
    if ($package.HasExt) {
        # Kiểm luôn cả .crx: 404.3 do thiếu kiểu MIME chỉ lộ ra khi tải đúng file đó.
        Test-Endpoint "http://127.0.0.1:$Port/ext/update.xml" 'Bản kê cập nhật tiện ích' 3 | Out-Null
        $crxName = (Get-ChildItem (Join-Path $webDir 'ext') -Filter '*.crx' | Select-Object -First 1).Name
        if ($crxName) { Test-Endpoint "http://127.0.0.1:$Port/ext/$crxName" 'Gói .crx' 3 | Out-Null }
    }

    if (-not $apiOk) {
        Write-Warn 'API chưa lên. Soi lỗi: Event Viewer > Windows Logs > Application (nguồn IIS AspNetCore Module), hoặc bật stdoutLogEnabled="true" trong api\web.config rồi xem api\logs\stdout*.log.'
    }
    if (-not $webOk) { Write-Warn 'Site web chưa trả 200 - kiểm tra binding và quyền đọc thư mục web.' }
}
else {
    Write-Warn 'Bỏ qua kiểm tra vì appsettings.Production.json chưa điền xong.'
}

Write-Host "`n================ KẾT QUẢ ================" -ForegroundColor White
Write-Host "Web-admin : http://localhost:$Port/$(if ($HostHeader) { "  (tên miền: $HostHeader)" })" -ForegroundColor Gray
if ($HttpsPort -gt 0) { Write-Host "HTTPS     : https://$(if ($HostHeader) { $HostHeader } else { 'localhost' }):$HttpsPort/" -ForegroundColor Gray }
Write-Host "API       : http://127.0.0.1:$ApiPort/api/health$(if (-not $NoProxy) { '  (ra ngoài qua /api của site web)' })" -ForegroundColor Gray
Write-Host "Cấu hình  : $apiDir\$prodConfigName" -ForegroundColor Gray
Write-Host "Dữ liệu   : $apiDir\Storage  (không bị deploy ghi đè)" -ForegroundColor Gray
Write-Host "Sao lưu   : $backupRoot  (quay lui: .\Deploy-Iis.ps1 -Rollback)" -ForegroundColor Gray
if ($package.HasExt) {
    Write-Host "Tiện ích  : $script:ExtensionUpdateUrl  (ID $script:ExtensionId)" -ForegroundColor Gray
    Write-Host "            Phát $webDir\ext\chrome-policy.reg cho IT đơn vị chạy trên máy trạm" -ForegroundColor Gray
    Write-Host '            (hoặc khai cùng nội dung bằng GPO), Chrome sẽ tự cài và tự cập nhật.' -ForegroundColor Gray
}
if ($script:Warnings.Count) {
    Write-Host "`nCẢNH BÁO ($($script:Warnings.Count)):" -ForegroundColor Yellow
    $script:Warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}
else { Write-Host "`nTriển khai xong, không có cảnh báo." -ForegroundColor Green }
