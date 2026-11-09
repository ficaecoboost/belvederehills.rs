# Belvedere Hills - preuzimanje fotografija sa starog sajta u novi sajt
# Pokretanje: desni klik na fajl -> "Run with PowerShell" (iz foldera sajta)
# ili u PowerShell-u:  powershell -ExecutionPolicy Bypass -File .\preuzmi-slike.ps1
# Slike se smanjuju (maks. 1600 px) i čuvaju kao JPG, uz male verzije za galeriju (600 px).

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = "https://belvederehills.rs/wp-content/uploads/"
$tmp  = Join-Path $env:TEMP "bh-slike"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

function Save-Resized($src, $dst, $maxW) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $w = $img.Width; $h = $img.Height
    if ($w -gt $maxW) { $h = [int]($h * $maxW / $w); $w = $maxW }
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($dst, $jpg, $ep)
    $g.Dispose(); $bmp.Dispose()
  } finally { $img.Dispose() }
}

$list = @(
  @("2023/06/DSC01552.png","images/galerija/apartmani/DSC01552.jpg",1600,"images/galerija/apartmani/mini/DSC01552.jpg"),
  @("2023/06/DSCF0420.png","images/galerija/apartmani/DSCF0420.jpg",1600,"images/galerija/apartmani/mini/DSCF0420.jpg"),
  @("2023/06/DSCF0416.png","images/galerija/apartmani/DSCF0416.jpg",1600,"images/galerija/apartmani/mini/DSCF0416.jpg"),
  @("2023/06/DSCF0414.png","images/galerija/apartmani/DSCF0414.jpg",1600,"images/galerija/apartmani/mini/DSCF0414.jpg"),
  @("2023/06/DSCF0412.png","images/galerija/apartmani/DSCF0412.jpg",1600,"images/galerija/apartmani/mini/DSCF0412.jpg"),
  @("2023/06/DSCF0407.png","images/galerija/apartmani/DSCF0407.jpg",1600,"images/galerija/apartmani/mini/DSCF0407.jpg"),
  @("2023/06/DSCF0404.png","images/galerija/apartmani/DSCF0404.jpg",1600,"images/galerija/apartmani/mini/DSCF0404.jpg"),
  @("2023/06/DSCF0389.png","images/galerija/apartmani/DSCF0389.jpg",1600,"images/galerija/apartmani/mini/DSCF0389.jpg"),
  @("2023/06/DSCF0379.png","images/galerija/apartmani/DSCF0379.jpg",1600,"images/galerija/apartmani/mini/DSCF0379.jpg"),
  @("2023/06/DSCF0371.png","images/galerija/apartmani/DSCF0371.jpg",1600,"images/galerija/apartmani/mini/DSCF0371.jpg"),
  @("2023/06/DSCF0357.png","images/galerija/apartmani/DSCF0357.jpg",1600,"images/galerija/apartmani/mini/DSCF0357.jpg"),
  @("2023/06/DSCF0355.png","images/galerija/apartmani/DSCF0355.jpg",1600,"images/galerija/apartmani/mini/DSCF0355.jpg"),
  @("2023/06/DSC01623.png","images/galerija/apartmani/DSC01623.jpg",1600,"images/galerija/apartmani/mini/DSC01623.jpg"),
  @("2023/06/DSC01620.png","images/galerija/apartmani/DSC01620.jpg",1600,"images/galerija/apartmani/mini/DSC01620.jpg"),
  @("2023/06/DSC01613.png","images/galerija/apartmani/DSC01613.jpg",1600,"images/galerija/apartmani/mini/DSC01613.jpg"),
  @("2023/06/DSC01609.png","images/galerija/apartmani/DSC01609.jpg",1600,"images/galerija/apartmani/mini/DSC01609.jpg"),
  @("2023/06/DSC01603.png","images/galerija/apartmani/DSC01603.jpg",1600,"images/galerija/apartmani/mini/DSC01603.jpg"),
  @("2023/06/DSC01601.png","images/galerija/apartmani/DSC01601.jpg",1600,"images/galerija/apartmani/mini/DSC01601.jpg"),
  @("2023/06/DSC01594.png","images/galerija/apartmani/DSC01594.jpg",1600,"images/galerija/apartmani/mini/DSC01594.jpg"),
  @("2023/06/DSC01585.png","images/galerija/apartmani/DSC01585.jpg",1600,"images/galerija/apartmani/mini/DSC01585.jpg"),
  @("2023/06/DSC01570.png","images/galerija/apartmani/DSC01570.jpg",1600,"images/galerija/apartmani/mini/DSC01570.jpg"),
  @("2023/06/DSC01567.png","images/galerija/apartmani/DSC01567.jpg",1600,"images/galerija/apartmani/mini/DSC01567.jpg"),
  @("2023/06/DSC01556.png","images/galerija/apartmani/DSC01556.jpg",1600,"images/galerija/apartmani/mini/DSC01556.jpg"),
  @("2021/04/13.jpg","images/galerija/apartmani/13.jpg",1600,"images/galerija/apartmani/mini/13.jpg"),
  @("2021/04/11.jpg","images/galerija/apartmani/11.jpg",1600,"images/galerija/apartmani/mini/11.jpg"),
  @("2021/04/14.jpg","images/galerija/apartmani/14.jpg",1600,"images/galerija/apartmani/mini/14.jpg"),
  @("2021/04/09.jpg","images/galerija/apartmani/09.jpg",1600,"images/galerija/apartmani/mini/09.jpg"),
  @("2021/04/10.jpg","images/galerija/apartmani/10.jpg",1600,"images/galerija/apartmani/mini/10.jpg"),
  @("2021/04/23.jpg","images/galerija/apartmani/23.jpg",1600,"images/galerija/apartmani/mini/23.jpg"),
  @("2021/04/41.jpg","images/galerija/apartmani/41.jpg",1600,"images/galerija/apartmani/mini/41.jpg"),
  @("2021/04/36.jpg","images/galerija/apartmani/36.jpg",1600,"images/galerija/apartmani/mini/36.jpg"),
  @("2021/04/58.jpg","images/galerija/apartmani/58.jpg",1600,"images/galerija/apartmani/mini/58.jpg"),
  @("2021/11/A19-studio-01.jpg","images/galerija/apartmani/A19-studio-01.jpg",1600,"images/galerija/apartmani/mini/A19-studio-01.jpg"),
  @("2021/11/A19-studio-02.jpg","images/galerija/apartmani/A19-studio-02.jpg",1600,"images/galerija/apartmani/mini/A19-studio-02.jpg"),
  @("2021/11/A19-studio-03.jpg","images/galerija/apartmani/A19-studio-03.jpg",1600,"images/galerija/apartmani/mini/A19-studio-03.jpg"),
  @("2021/11/A19-studio-04.jpg","images/galerija/apartmani/A19-studio-04.jpg",1600,"images/galerija/apartmani/mini/A19-studio-04.jpg"),
  @("2021/11/A19-studio-05.jpg","images/galerija/apartmani/A19-studio-05.jpg",1600,"images/galerija/apartmani/mini/A19-studio-05.jpg"),
  @("2021/11/A19-studio-06.jpg","images/galerija/apartmani/A19-studio-06.jpg",1600,"images/galerija/apartmani/mini/A19-studio-06.jpg"),
  @("2023/06/DSCF0352.png","images/galerija/bazen/DSCF0352.jpg",1600,"images/galerija/bazen/mini/DSCF0352.jpg"),
  @("2023/06/DSCF0348.png","images/galerija/bazen/DSCF0348.jpg",1600,"images/galerija/bazen/mini/DSCF0348.jpg"),
  @("2023/06/DSCF0329.png","images/galerija/bazen/DSCF0329.jpg",1600,"images/galerija/bazen/mini/DSCF0329.jpg"),
  @("2023/06/DSCF0328.png","images/galerija/bazen/DSCF0328.jpg",1600,"images/galerija/bazen/mini/DSCF0328.jpg"),
  @("2023/06/DSCF0304.png","images/galerija/bazen/DSCF0304.jpg",1600,"images/galerija/bazen/mini/DSCF0304.jpg"),
  @("2023/06/DSCF0285.png","images/galerija/bazen/DSCF0285.jpg",1600,"images/galerija/bazen/mini/DSCF0285.jpg"),
  @("2023/06/DSCF0274.png","images/galerija/bazen/DSCF0274.jpg",1600,"images/galerija/bazen/mini/DSCF0274.jpg"),
  @("2023/06/DSCF0271.png","images/galerija/bazen/DSCF0271.jpg",1600,"images/galerija/bazen/mini/DSCF0271.jpg"),
  @("2023/06/DSCF0263.png","images/galerija/bazen/DSCF0263.jpg",1600,"images/galerija/bazen/mini/DSCF0263.jpg"),
  @("2023/06/DSCF0250.png","images/galerija/bazen/DSCF0250.jpg",1600,"images/galerija/bazen/mini/DSCF0250.jpg"),
  @("2023/06/DSCF0216.png","images/galerija/bazen/DSCF0216.jpg",1600,"images/galerija/bazen/mini/DSCF0216.jpg"),
  @("2023/06/DSCF0201.png","images/galerija/bazen/DSCF0201.jpg",1600,"images/galerija/bazen/mini/DSCF0201.jpg"),
  @("2023/06/DSCF0195.png","images/galerija/bazen/DSCF0195.jpg",1600,"images/galerija/bazen/mini/DSCF0195.jpg"),
  @("2023/06/DSCF0181.png","images/galerija/bazen/DSCF0181.jpg",1600,"images/galerija/bazen/mini/DSCF0181.jpg"),
  @("2023/06/DSCF0153.png","images/galerija/bazen/DSCF0153.jpg",1600,"images/galerija/bazen/mini/DSCF0153.jpg"),
  @("2023/06/DSCF0144.png","images/galerija/bazen/DSCF0144.jpg",1600,"images/galerija/bazen/mini/DSCF0144.jpg"),
  @("2023/06/DSC01638.png","images/galerija/kafic/DSC01638.jpg",1600,"images/galerija/kafic/mini/DSC01638.jpg"),
  @("2023/06/DSCF0601.png","images/galerija/kafic/DSCF0601.jpg",1600,"images/galerija/kafic/mini/DSCF0601.jpg"),
  @("2023/06/DSCF0581.png","images/galerija/kafic/DSCF0581.jpg",1600,"images/galerija/kafic/mini/DSCF0581.jpg"),
  @("2023/06/DSCF0514.png","images/galerija/kafic/DSCF0514.jpg",1600,"images/galerija/kafic/mini/DSCF0514.jpg"),
  @("2023/06/DSCF0502.png","images/galerija/kafic/DSCF0502.jpg",1600,"images/galerija/kafic/mini/DSCF0502.jpg"),
  @("2023/06/DSCF0480.png","images/galerija/kafic/DSCF0480.jpg",1600,"images/galerija/kafic/mini/DSCF0480.jpg"),
  @("2023/06/DSCF0473.png","images/galerija/kafic/DSCF0473.jpg",1600,"images/galerija/kafic/mini/DSCF0473.jpg"),
  @("2023/06/DSCF0452.png","images/galerija/kafic/DSCF0452.jpg",1600,"images/galerija/kafic/mini/DSCF0452.jpg"),
  @("2023/06/DSCF0442.png","images/galerija/kafic/DSCF0442.jpg",1600,"images/galerija/kafic/mini/DSCF0442.jpg"),
  @("2023/06/DSC01721.png","images/galerija/kafic/DSC01721.jpg",1600,"images/galerija/kafic/mini/DSC01721.jpg"),
  @("2023/06/DSC01689.png","images/galerija/kafic/DSC01689.jpg",1600,"images/galerija/kafic/mini/DSC01689.jpg"),
  @("2023/06/DSC01687.png","images/galerija/kafic/DSC01687.jpg",1600,"images/galerija/kafic/mini/DSC01687.jpg"),
  @("2023/06/DSC01648.png","images/galerija/kafic/DSC01648.jpg",1600,"images/galerija/kafic/mini/DSC01648.jpg"),
  @("2023/06/1.png","images/galerija/kafic/1.jpg",1600,"images/galerija/kafic/mini/1.jpg"),
  @("2023/06/kafic-2.png","images/galerija/kafic/kafic-2.jpg",1600,"images/galerija/kafic/mini/kafic-2.jpg"),
  @("2023/06/kafic-6.png","images/galerija/kafic/kafic-6.jpg",1600,"images/galerija/kafic/mini/kafic-6.jpg"),
  @("2023/06/DSCF0487.png","images/galerija/objekat/DSCF0487.jpg",1600,"images/galerija/objekat/mini/DSCF0487.jpg"),
  @("2023/06/DSCF0485.png","images/galerija/objekat/DSCF0485.jpg",1600,"images/galerija/objekat/mini/DSCF0485.jpg"),
  @("2021/04/70.jpg","images/galerija/objekat/70.jpg",1600,"images/galerija/objekat/mini/70.jpg"),
  @("2021/04/74.jpg","images/galerija/objekat/74.jpg",1600,"images/galerija/objekat/mini/74.jpg"),
  @("2021/04/73.jpg","images/galerija/objekat/73.jpg",1600,"images/galerija/objekat/mini/73.jpg"),
  @("2021/04/66.jpg","images/galerija/objekat/66.jpg",1600,"images/galerija/objekat/mini/66.jpg"),
  @("2021/04/68.jpg","images/galerija/objekat/68.jpg",1600,"images/galerija/objekat/mini/68.jpg"),
  @("2020/08/header1.jpg","images/galerija/objekat/header1.jpg",1600,"images/galerija/objekat/mini/header1.jpg"),
  @("2020/08/Belvedere-objekat.jpg","images/galerija/objekat/Belvedere-objekat.jpg",1600,"images/galerija/objekat/mini/Belvedere-objekat.jpg"),
  @("2021/04/70.jpg","images/hero/naslovna.jpg",1920,""),
  @("2021/04/66.jpg","images/hero/kontakt.jpg",1920,""),
  @("2023/06/DSCF0352.png","images/hero/sadrzaji.jpg",1920,""),
  @("2020/08/header4.jpg","images/o-apartmanima.jpg",1200,""),
  @("2021/11/A19-studio-01.jpg","images/tipovi/studio.jpg",900,""),
  @("2020/08/header7.jpg","images/tipovi/dvosoban.jpg",900,""),
  @("2020/08/belvedere-08.jpg","images/tipovi/trosoban.jpg",900,""),
  @("2020/08/header3.jpg","images/tipovi/dupleks.jpg",900,""),
  @("2018/09/a03.png","images/osnove/dvosoban-A03.png",0,""),
  @("2018/09/a04.png","images/osnove/trosoban-A04.png",0,""),
  @("2018/12/A10-osnova1.jpg","images/osnove/dupleks-A10-nivo1.jpg",0,""),
  @("2018/12/A10-osnova2.jpg","images/osnove/dupleks-A10-nivo2.jpg",0,""),
  @("2018/12/StrukturaNivoa.png","images/osnove/raspored-po-spratovima.png",0,""),
  @("2023/06/DSCF0274.png","images/sadrzaji/bazen.jpg",1200,""),
  @("2023/06/DSCF0195.png","images/sadrzaji/spa.jpg",1200,""),
  @("2023/06/kafic-2.png","images/sadrzaji/kafic.jpg",1200,""),
  @("2021/04/66.jpg","images/sadrzaji/objekat.jpg",1200,"")
)

$i = 0; $err = 0
foreach ($r in $list) {
  $i++
  $src = $r[0]; $dst = Join-Path $root $r[1]; $max = $r[2]; $mini = $r[3]
  Write-Host ("[{0}/{1}] {2}" -f $i, $list.Count, $r[1])
  try {
    $file = Join-Path $tmp ($src -replace "/", "_")
    if (-not (Test-Path $file)) { Invoke-WebRequest -Uri ($base + $src) -OutFile $file -UseBasicParsing }
    if ($max -eq 0) {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
      Copy-Item $file $dst -Force
    } else {
      Save-Resized $file $dst $max
      if ($mini -ne "") { Save-Resized $file (Join-Path $root $mini) 600 }
    }
  } catch { $err++; Write-Warning ("Nije uspelo: " + $src + " - " + $_.Exception.Message) }
}
Write-Host ""
Write-Host ("Gotovo. Obrađeno: {0}, greške: {1}" -f $list.Count, $err)
Read-Host "Pritisnite Enter za izlaz"
