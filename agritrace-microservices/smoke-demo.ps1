$ErrorActionPreference = "Stop"

Set-Location "D:\Coding\Java\AgriTraceChain\agritrace-microservices"

docker compose ps

$urls = @(
  "http://localhost:9080/actuator/health",
  "http://localhost:9081/actuator/health",
  "http://localhost:9082/actuator/health",
  "http://localhost:9083/actuator/health",
  "http://localhost:9084/actuator/health"
)

$results = foreach ($url in $urls) {
  try {
    $res = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 15 -SkipHttpErrorCheck
    $status = [int]$res.StatusCode
    $body = $null
    $raw = $res.Content
    if ($raw -is [byte[]]) {
      $raw = [System.Text.Encoding]::UTF8.GetString($raw)
    }
    try { $body = $raw | ConvertFrom-Json } catch { }
    [pscustomobject]@{
      Url = $url
      StatusCode = $status
      Health = if ($body -and $body.status) { $body.status } else { "N/A" }
      Pass = ($status -eq 200 -and ($body.status -eq "UP"))
    }
  } catch {
    [pscustomobject]@{
      Url = $url
      StatusCode = "ERR"
      Health = "N/A"
      Pass = $false
    }
  }
}

$results | Format-Table -AutoSize

$failed = $results | Where-Object { -not $_.Pass }
if ($failed.Count -gt 0) {
  Write-Error "Smoke check failed for $($failed.Count) endpoint(s)."
}

Write-Host "Smoke check passed."
