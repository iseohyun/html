<#
  @file scripts/set-login-secret.ps1
  @description 카카오 · 네이버 로그인의 Client Secret 을 Firebase 비밀값(Secret Manager)에 넣는다.
    값은 화면에 보이지 않게 입력받고, 줄바꿈 없이 임시 파일에 적어 firebase CLI 에 넘긴 뒤 바로 지운다.
    값은 저장소 · 명령 기록 · 로그에 남지 않는다. 넣은 뒤 그 로그인 함수를 다시 배포해야 새 값을 쓴다.

  사용법 (저장소 맨 위 폴더에서):
    powershell -ExecutionPolicy Bypass -File scripts\set-login-secret.ps1 -Provider naver
    powershell -ExecutionPolicy Bypass -File scripts\set-login-secret.ps1 -Provider naver -Deploy
  -Deploy 를 붙이면 넣은 뒤 그 로그인 함수(naverLogin / kakaoLogin)만 배포한다.
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("naver", "kakao")]
  [string]$Provider,

  [switch]$Deploy,

  [string]$Project = "iseohyun"
)

$ErrorActionPreference = "Stop"
$secretName = "$($Provider.ToUpper())_CLIENT_SECRET"
$functionName = "$($Provider)Login"
$label = if ($Provider -eq "naver") { "네이버" } else { "카카오" }

Write-Host "$label Client Secret 을 Firebase 비밀값 $secretName 에 넣습니다 (프로젝트 $Project)."
$secure = Read-Host -AsSecureString "$label Client Secret 붙여 넣기 (화면에 보이지 않음)"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$tempFile = $null
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
  if (-not $plain) { throw "값이 비어 있습니다. 다시 실행해 주세요." }

  # 줄바꿈 없이 적는다(파이프로 넘기면 PowerShell 이 끝에 줄바꿈을 붙여 비밀값이 달라진다)
  $tempFile = [IO.Path]::Combine([IO.Path]::GetTempPath(), [IO.Path]::GetRandomFileName())
  [IO.File]::WriteAllText($tempFile, $plain, (New-Object Text.UTF8Encoding($false)))
  $plain = $null

  & firebase.cmd functions:secrets:set $secretName --data-file $tempFile --project $Project --force
  if ($LASTEXITCODE -ne 0) { throw "비밀값을 넣지 못했습니다 (firebase 종료 코드 $LASTEXITCODE)." }
  Write-Host "넣었습니다: $secretName" -ForegroundColor Green
}
finally {
  if ($tempFile -and (Test-Path $tempFile)) { Remove-Item $tempFile -Force }
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ($Deploy) {
  Write-Host "$functionName 을 배포합니다…"
  & firebase.cmd deploy --only "functions:$functionName" --project $Project
  if ($LASTEXITCODE -ne 0) { throw "배포하지 못했습니다 (firebase 종료 코드 $LASTEXITCODE)." }
} else {
  Write-Host "새 값을 쓰려면 함수를 배포하세요: firebase.cmd deploy --only functions:$functionName --project $Project"
}
