#Requires -Version 5.1
<#
.SYNOPSIS
    Đóng gói tiện ích Chrome thành .crx tự host, kèm update.xml và file .reg chính sách.

.DESCRIPTION
    Dùng khi KHÔNG đưa tiện ích lên Chrome Web Store. Chrome trên Windows chặn cài
    tiện ích ngoài store bằng thao tác tay, nhưng vẫn cài và TỰ CẬP NHẬT bình thường
    nếu được khai bằng chính sách (ExtensionInstallForcelist) trỏ tới một update.xml
    do mình host - đây là đường mà mọi đơn vị dùng nội bộ đi.

    Kết quả trong -OutputDir:
        <ten>-<version>.crx     gói đã ký
        update.xml              bản kê phiên bản Chrome hỏi định kỳ (~5 tiếng/lần)
        chrome-policy.reg       khóa registry phát cho IT của đơn vị

    Deploy-Iis.ps1 sẽ chép thư mục này lên site web thành /ext và tự điền địa chỉ thật
    vào update.xml, nên ở bước build không cần biết tên miền của đơn vị.

.PARAMETER KeyFile
    File .pem chứa khóa ký. KHÓA NÀY QUYẾT ĐỊNH ID CỦA TIỆN ÍCH: đổi khóa là Chrome coi
    như một tiện ích khác, mọi máy trạm phải cài lại từ đầu. Chưa có file thì script tự
    sinh - cất ngay vào nơi lưu bí mật của đơn vị, KHÔNG commit lên git.

.EXAMPLE
    .\Pack-Extension.ps1 -KeyFile D:\secrets\zerocheck.pem
    Đóng gói từ extension-his\extension\dist, để Deploy-Iis.ps1 điền địa chỉ sau.

.EXAMPLE
    .\Pack-Extension.ps1 -KeyFile D:\secrets\zerocheck.pem -BaseUrl https://cbyts.benhvien.vn
    Điền sẵn địa chỉ vào update.xml và file .reg (khi tự chép tay lên máy chủ).
#>
[CmdletBinding()]
param(
    # Thư mục bản build của tiện ích (chứa manifest.json). Mặc định: extension-his\extension\dist
    [string]$DistPath,

    # File khóa ký .pem - xem phần .PARAMETER KeyFile.
    [string]$KeyFile,

    # Nơi ghi kết quả. Mặc định: deploy\iis\out\ext
    [string]$OutputDir,

    # Địa chỉ gốc của site web-admin, ví dụ https://cbyts.benhvien.vn. Bỏ trống thì
    # để lại chỗ trống cho Deploy-Iis.ps1 điền theo binding thật của máy chủ.
    [string]$BaseUrl = '',

    # Đường dẫn chrome.exe nếu cài chỗ khác thường.
    [string]$ChromePath = '',

    # Ép ID tiện ích (chỉ dùng khi script không tự đọc được từ file .crx).
    [string]$ExtensionId = ''
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }

# ---------------------------------------------------------------- đường dẫn
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $DistPath) { $DistPath = Join-Path $repoRoot 'extension-his\extension\dist' }
if (-not $OutputDir) { $OutputDir = Join-Path $PSScriptRoot 'out\ext' }

if (-not (Test-Path (Join-Path $DistPath 'manifest.json'))) {
    throw "Không thấy manifest.json trong $DistPath - build tiện ích trước (npm run build)."
}

$manifest = Get-Content (Join-Path $DistPath 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { throw 'manifest.json không có trường version.' }
# Tên file không dấu, không khoảng trắng: nó nằm trong URL update.xml.
$safeName = ($manifest.name -replace '[^A-Za-z0-9]+', '-').Trim('-').ToLowerInvariant()
if (-not $safeName) { $safeName = 'extension' }

Write-Host "Đóng gói tiện ích $($manifest.name) $version" -ForegroundColor White
Write-Info "Nguồn: $DistPath"

# ---------------------------------------------------------------- tìm Chrome
function Find-Chrome {
    if ($ChromePath) {
        if (-not (Test-Path $ChromePath)) { throw "Không thấy $ChromePath." }
        return $ChromePath
    }
    # Edge cũng là Chromium nên gói .crx được, dùng làm phương án dự phòng.
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
    )
    foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
    throw 'Không tìm thấy chrome.exe. Cài Google Chrome hoặc chỉ định -ChromePath.'
}

# ------------------------------------------------------- đọc ID từ file .crx
function ConvertTo-ExtensionId([byte[]]$hash16) {
    <#
      ID tiện ích = 16 byte đầu của SHA-256 khóa công khai, mỗi nửa byte đổi thành
      một chữ cái a-p (Chrome cố ý không dùng hex để ID chỉ gồm chữ).
    #>
    $sb = New-Object System.Text.StringBuilder
    foreach ($b in $hash16) {
        [void]$sb.Append([char](97 + ($b -shr 4)))
        [void]$sb.Append([char](97 + ($b -band 0x0F)))
    }
    $sb.ToString()
}

function Get-CrxId([string]$crxPath) {
    $bytes = [System.IO.File]::ReadAllBytes($crxPath)
    if ($bytes.Length -lt 16 -or [System.Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'Cr24') {
        return $null
    }
    $format = [BitConverter]::ToUInt32($bytes, 4)

    if ($format -eq 2) {
        # CRX2: sau header là khóa công khai DER, băm ra ID.
        $pubLen = [BitConverter]::ToUInt32($bytes, 8)
        $pub = New-Object byte[] $pubLen
        [Array]::Copy($bytes, 16, $pub, 0, $pubLen)
        $sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($pub)
        return ConvertTo-ExtensionId $sha[0..15]
    }

    # CRX3: ID nằm sẵn trong header protobuf, trường signed_header_data (số hiệu 10000)
    # bọc SignedData.crx_id (16 byte) - chuỗi thẻ tương ứng là 82 F1 04 12 0A 10.
    $headerSize = [BitConverter]::ToUInt32($bytes, 8)
    # Chỉ số bắt đầu HỢP LỆ CUỐI CÙNG: cụm 6 byte thẻ + 16 byte ID vừa khít hết header
    # (Chrome đặt trường này ở cuối), nên phải quét tới tận $limit chứ không dừng trước.
    $limit = [Math]::Min(12 + $headerSize, $bytes.Length) - 22
    for ($i = 12; $i -le $limit; $i++) {
        if ($bytes[$i] -eq 0x82 -and $bytes[$i + 1] -eq 0xF1 -and $bytes[$i + 2] -eq 0x04 -and
            $bytes[$i + 3] -eq 0x12 -and $bytes[$i + 4] -eq 0x0A -and $bytes[$i + 5] -eq 0x10) {
            return ConvertTo-ExtensionId $bytes[($i + 6)..($i + 21)]
        }
    }
    return $null
}

# ------------------------------------------------------------------- đóng gói
$chrome = Find-Chrome
Write-Ok "Trình đóng gói: $chrome"

# Gói từ bản sao trong thư mục tạm: Chrome ghi .crx/.pem NGAY CẠNH thư mục nguồn,
# gói thẳng từ repo là rác rơi vào cây mã nguồn.
$work = Join-Path $env:TEMP 'cbyts-crx'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
$stage = Join-Path $work $safeName
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -Path (Join-Path $DistPath '*') -Destination $stage -Recurse -Force

$crxOut = Join-Path $work "$safeName.crx"
$pemOut = Join-Path $work "$safeName.pem"

Write-Step 'Ký và nén .crx'
$chromeArgs = @("--pack-extension=`"$stage`"", '--no-message-box')
$newKey = $false
if ($KeyFile -and (Test-Path $KeyFile)) {
    $chromeArgs += "--pack-extension-key=`"$((Resolve-Path $KeyFile).Path)`""
    Write-Info "Khóa ký: $KeyFile"
}
else {
    $newKey = $true
    Write-Info 'Chưa có khóa ký - Chrome sẽ sinh khóa mới'
}

Start-Process -FilePath $chrome -ArgumentList $chromeArgs -Wait -NoNewWindow
# Chrome đôi khi trả quyền điều khiển trước khi ghi xong file - chờ thêm một nhịp.
for ($i = 0; $i -lt 30 -and -not (Test-Path $crxOut); $i++) { Start-Sleep -Milliseconds 500 }
if (-not (Test-Path $crxOut)) {
    throw "Chrome không tạo được $crxOut. Đóng hết cửa sổ Chrome rồi chạy lại (Chrome đang mở đôi khi từ chối gói)."
}
Write-Ok "$([math]::Round((Get-Item $crxOut).Length / 1KB, 1)) KB"

if ($newKey) {
    if (-not $KeyFile) { $KeyFile = Join-Path $OutputDir "$safeName.pem" }
    New-Item -ItemType Directory -Path (Split-Path $KeyFile -Parent) -Force | Out-Null
    Move-Item $pemOut $KeyFile -Force
}

$id = if ($ExtensionId) { $ExtensionId } else { Get-CrxId $crxOut }
if (-not $id) {
    throw 'Không đọc được ID tiện ích từ file .crx. Mở chrome://extensions ở chế độ nhà phát triển, cài thử file .crx để xem ID rồi chạy lại với -ExtensionId.'
}
Write-Ok "ID tiện ích: $id"

# ------------------------------------------------------------- ghi kết quả ra
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
Get-ChildItem $OutputDir -Filter '*.crx' | Remove-Item -Force   # chỉ giữ bản mới nhất

$crxName = "$safeName-$version.crx"
Copy-Item $crxOut (Join-Path $OutputDir $crxName) -Force

# Chỗ trống để Deploy-Iis.ps1 điền địa chỉ thật của máy chủ.
$base = if ($BaseUrl) { $BaseUrl.TrimEnd('/') } else { '{{BASE_URL}}' }

@"
<?xml version="1.0" encoding="UTF-8"?>
<!-- Chrome hỏi file này khoảng 5 tiếng một lần. Ra bản mới = tăng version trong
     manifest.json, chạy lại Pack-Extension.ps1, deploy lại. -->
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="$id">
    <updatecheck codebase="$base/ext/$crxName" version="$version" />
  </app>
</gupdate>
"@ | Set-Content -Path (Join-Path $OutputDir 'update.xml') -Encoding UTF8

# .reg phải là UTF-16 LE thì regedit mới đọc đúng tiếng Việt trong chú thích.
@"
Windows Registry Editor Version 5.00

; Cai va tu dong cap nhat tien ich $($manifest.name) tren may tram.
; Ap dung cho MOI nguoi dung cua may; can quyen admin (bam phai > Merge).
; Luu y: ExtensionInstallForcelist khoa luon viec go/tat tien ich.

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist]
"1"="$id;$base/ext/update.xml"

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist]
"1"="$id;$base/ext/update.xml"
"@ | Set-Content -Path (Join-Path $OutputDir 'chrome-policy.reg') -Encoding Unicode

Write-Ok "$OutputDir"
Write-Info "  $crxName"
Write-Info '  update.xml'
Write-Info '  chrome-policy.reg'

if ($newKey) {
    Write-Host "`nKHÓA KÝ MỚI: $KeyFile" -ForegroundColor Yellow
    Write-Host '  Cất vào nơi lưu bí mật của đơn vị và sao lưu. Mất khóa = ID đổi = mọi máy trạm' -ForegroundColor Yellow
    Write-Host '  phải cài lại tiện ích từ đầu. Lộ khóa = người khác ký được bản cập nhật giả.' -ForegroundColor Yellow
    Write-Host '  Lần đóng gói sau nhớ truyền -KeyFile trỏ đúng file này.' -ForegroundColor Yellow
}

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue

[pscustomobject]@{ Id = $id; Version = $version; CrxName = $crxName; OutputDir = $OutputDir }
