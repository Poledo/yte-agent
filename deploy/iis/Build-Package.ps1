#Requires -Version 5.1
<#
.SYNOPSIS
    Đóng gói bản triển khai IIS cho "Chiến binh y tế số" (API .NET + web-admin Angular).

.DESCRIPTION
    Chạy trên MÁY BUILD (có .NET SDK + Node), không cần IIS. Kết quả là một thư mục
    (và file .zip) tự chứa đủ mọi thứ để cài lên máy chủ Windows:

        <out>\<version>\
            api\                bản publish của AIValidation.Api
            web\                bản build Angular (dist/web-admin/browser)
            templates\          web.config, appsettings.Production mẫu, app_offline
            Deploy-Iis.ps1      script cài đặt - chạy ngay tại chỗ trên máy chủ
            package-info.json   version, commit, thời điểm build

    Máy chủ KHÔNG cần .NET SDK hay Node, chỉ cần ASP.NET Core Hosting Bundle.

.PARAMETER ApiBaseUrl
    Chỉ dùng khi KHÔNG chạy IIS reverse proxy (deploy kiểu 2 site riêng). Đặt địa chỉ
    tuyệt đối của API, ví dụ 'https://api.benhvien.vn'. Bỏ trống (mặc định) = web gọi
    API cùng origin qua /api - hợp với Deploy-Iis.ps1 chế độ proxy.

.EXAMPLE
    .\Build-Package.ps1
    Đóng gói bản mặc định (proxy cùng origin), có chạy unit test.

.EXAMPLE
    .\Build-Package.ps1 -SkipTests -Version 2026.08.10
    Đóng gói nhanh, đặt tên phiên bản cố định.
#>
[CmdletBinding()]
param(
    # Nơi chứa các gói đã build. Mặc định: deploy\iis\out
    [string]$OutputRoot,

    # Tên phiên bản = tên thư mục gói. Mặc định: yyyyMMdd-HHmm
    [string]$Version,

    # Địa chỉ API tuyệt đối (chỉ khi không dùng reverse proxy).
    [string]$ApiBaseUrl = '',

    # Bỏ qua bước chạy unit test (không khuyến khích cho bản đưa ra khách hàng).
    [switch]$SkipTests,

    # Chỉ build một phần - dùng khi vá nóng một bên.
    [switch]$SkipApi,
    [switch]$SkipWeb,

    # Không nén .zip (để tiết kiệm thời gian khi copy bằng robocopy qua LAN).
    [switch]$NoZip
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- tiện ích in
function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }

function Invoke-Checked {
    <# Chạy lệnh ngoài và dừng ngay nếu exit code khác 0 - tránh đóng gói bản build hỏng. #>
    param([string]$File, [string[]]$Arguments, [string]$WorkingDirectory)

    Write-Info "$File $($Arguments -join ' ')"
    Push-Location $WorkingDirectory
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Lệnh '$File $($Arguments -join ' ')' thất bại (mã lỗi $LASTEXITCODE)."
        }
    }
    finally { Pop-Location }
}

# ------------------------------------------------------------ xác định đường dẫn
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiProject = Join-Path $repoRoot 'api-validation\AIValidation.Api\AIValidation.Api.csproj'
$apiSolutionDir = Join-Path $repoRoot 'api-validation'
$webDir = Join-Path $repoRoot 'web-admin'

if (-not (Test-Path $apiProject)) { throw "Không thấy $apiProject - chạy script từ trong repo yte-agent." }
if (-not $OutputRoot) { $OutputRoot = Join-Path $PSScriptRoot 'out' }
if (-not $Version) { $Version = Get-Date -Format 'yyyyMMdd-HHmm' }

$stage = Join-Path $OutputRoot $Version
$stageApi = Join-Path $stage 'api'
$stageWeb = Join-Path $stage 'web'

Write-Host "Đóng gói bản triển khai IIS - phiên bản $Version" -ForegroundColor White
Write-Info "Repo:  $repoRoot"
Write-Info "Đích:  $stage"

# ------------------------------------------------------------- kiểm tra công cụ
Write-Step 'Kiểm tra công cụ build'
if (-not $SkipApi) {
    if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
        throw 'Không thấy dotnet SDK. Cài .NET 10 SDK: https://dotnet.microsoft.com/download'
    }
    Write-Ok ".NET SDK $(& dotnet --version)"
}
if (-not $SkipWeb) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Không thấy Node.js. Cài Node 22+: https://nodejs.org'
    }
    Write-Ok "Node $(& node --version)"
}

# Dọn thư mục gói cũ cùng tên để không lẫn file thừa của lần build trước.
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

# ------------------------------------------------------------------------ API
if (-not $SkipApi) {
    if (-not $SkipTests) {
        Write-Step 'Chạy unit test API'
        Invoke-Checked -File 'dotnet' -Arguments @('test', '--nologo', '-v', 'q') -WorkingDirectory $apiSolutionDir
        Write-Ok 'Test qua hết'
    }

    Write-Step 'Publish API (.NET Release)'
    # Publish framework-dependent: máy chủ dùng chung ASP.NET Core Hosting Bundle,
    # nhẹ hơn self-contained và vá bảo mật runtime theo Windows Update.
    Invoke-Checked -File 'dotnet' -Arguments @(
        'publish', $apiProject, '-c', 'Release', '-o', $stageApi, '--nologo'
    ) -WorkingDirectory $repoRoot

    # Bản publish sinh sẵn web.config cho AspNetCoreModuleV2 - Deploy-Iis.ps1 sẽ vá thêm
    # biến môi trường Production và giới hạn dung lượng upload.
    if (-not (Test-Path (Join-Path $stageApi 'AIValidation.Api.dll'))) {
        throw 'Publish xong nhưng không thấy AIValidation.Api.dll.'
    }
    # Không mang Storage của máy dev sang máy chủ (chứa file đã nạp lúc thử nghiệm).
    $stageStorage = Join-Path $stageApi 'Storage'
    if (Test-Path $stageStorage) { Remove-Item $stageStorage -Recurse -Force }
    Write-Ok "API: $([math]::Round((Get-ChildItem $stageApi -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)) MB"
}

# ------------------------------------------------------------------- web-admin
if (-not $SkipWeb) {
    Write-Step 'Build web-admin (Angular production)'

    if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
        Write-Info 'Chưa có node_modules - chạy npm ci'
        Invoke-Checked -File 'npm' -Arguments @('ci') -WorkingDirectory $webDir
    }

    $ngArgs = @('ng', 'build', '--configuration', 'production')
    if ($ApiBaseUrl) {
        # Kiểu 2 site riêng: web gọi thẳng sang host API khác origin. Ghi file môi
        # trường riêng (gitignore) rồi build bằng configuration "iis" - KHÔNG sửa
        # environment.ts đang được commit.
        $envFile = Join-Path $webDir 'src\environments\environment.iis.ts'
        @"
// FILE SINH TỰ ĐỘNG bởi deploy/iis/Build-Package.ps1 - đừng sửa tay, đừng commit.
// Dùng khi web-admin và API nằm ở hai site IIS khác origin (không có ARR proxy).
export const environment = {
  production: true,
  apiBaseUrl: '$($ApiBaseUrl.TrimEnd('/'))',
};
"@ | Set-Content -Path $envFile -Encoding UTF8
        Write-Info "apiBaseUrl = $ApiBaseUrl (configuration iis)"
        $ngArgs = @('ng', 'build', '--configuration', 'iis')
    }
    Invoke-Checked -File 'npx' -Arguments $ngArgs -WorkingDirectory $webDir

    $dist = Join-Path $webDir 'dist\web-admin\browser'
    if (-not (Test-Path (Join-Path $dist 'index.html'))) {
        throw "Build xong nhưng không thấy $dist\index.html."
    }
    New-Item -ItemType Directory -Path $stageWeb -Force | Out-Null
    Copy-Item -Path (Join-Path $dist '*') -Destination $stageWeb -Recurse -Force
    Write-Ok "Web: $((Get-ChildItem $stageWeb -Recurse -File).Count) file"
}

# --------------------------------------------------- script cài + template kèm gói
Write-Step 'Gắn kèm script cài đặt'
Copy-Item -Path (Join-Path $PSScriptRoot 'Deploy-Iis.ps1') -Destination $stage -Force
Copy-Item -Path (Join-Path $PSScriptRoot 'templates') -Destination $stage -Recurse -Force
Write-Ok 'Deploy-Iis.ps1 + templates'

# ------------------------------------------------------------- thông tin phiên bản
$commit = 'unknown'
try {
    Push-Location $repoRoot
    $commit = (& git rev-parse --short HEAD 2>$null)
    if ($LASTEXITCODE -ne 0) { $commit = 'unknown' }
}
catch { $commit = 'unknown' }
finally { Pop-Location }

[pscustomobject]@{
    version    = $Version
    gitCommit  = $commit
    builtAt    = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
    builtOn    = $env:COMPUTERNAME
    apiBaseUrl = if ($ApiBaseUrl) { $ApiBaseUrl } else { '(cùng origin qua /api)' }
    includes   = @(if (-not $SkipApi) { 'api' }; if (-not $SkipWeb) { 'web' })
} | ConvertTo-Json | Set-Content -Path (Join-Path $stage 'package-info.json') -Encoding UTF8

# ------------------------------------------------------------------------- nén
$zipPath = $null
if (-not $NoZip) {
    Write-Step 'Nén gói'
    $zipPath = Join-Path $OutputRoot "cbyts-iis-$Version.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Ok "$zipPath ($([math]::Round((Get-Item $zipPath).Length / 1MB, 1)) MB)"
}

Write-Host "`nXONG. Bước tiếp theo:" -ForegroundColor White
if ($zipPath) {
    Write-Host "  1. Chép $zipPath sang máy chủ, giải nén (vd C:\deploy\cbyts)." -ForegroundColor Gray
}
else {
    Write-Host "  1. Chép thư mục $stage sang máy chủ." -ForegroundColor Gray
}
Write-Host '  2. Mở PowerShell QUYỀN ADMIN tại thư mục đó rồi chạy:' -ForegroundColor Gray
Write-Host '       .\Deploy-Iis.ps1 -CheckOnly        # kiểm tra điều kiện IIS trước' -ForegroundColor Gray
Write-Host '       .\Deploy-Iis.ps1                   # cài đặt thật' -ForegroundColor Gray
