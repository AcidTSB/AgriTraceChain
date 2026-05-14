$ErrorActionPreference='Stop'
$base='http://localhost:8080'
$ts=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$adminUser="admin_fix_$ts"
$farmerUser="farmer_fix_$ts"

function Compact-Json([string]$content){
  if([string]::IsNullOrWhiteSpace($content)){ return '{}' }
  try { return (($content | ConvertFrom-Json) | ConvertTo-Json -Compress -Depth 12) } catch { return $content.Trim() }
}

function Invoke-Step {
  param([string]$Name,[string]$Method,[string]$Url,$Body,[string]$Token)
  $headers=@{ 'Content-Type'='application/json' }
  if($Token){ $headers['Authorization']="Bearer $Token" }
  $bodyJson = if($null -ne $Body){ $Body | ConvertTo-Json -Depth 12 -Compress } else { $null }
  $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $bodyJson -SkipHttpErrorCheck -TimeoutSec 40
  $compact = Compact-Json $resp.Content
  Write-Output "STEP=$Name STATUS=$($resp.StatusCode) BODY=$compact"
  return [pscustomobject]@{ Name=$Name; Status=[int]$resp.StatusCode; Json=($(try{$resp.Content|ConvertFrom-Json}catch{$null})) }
}

function Fail-With-Logs {
  param([string]$FailedStep,[int]$StatusCode)
  Write-Output "FAIL_STEP=$FailedStep STATUS=$StatusCode"
  $logs = docker compose logs --tail=200 product-service trace-service api-gateway | Out-String
  Write-Output "LOG_TAIL_BEGIN"
  Write-Output $logs
  Write-Output "LOG_TAIL_END"
  Write-Output "ROOT_CAUSE_LINES_BEGIN"
  (($logs -split "`r?`n") | Where-Object { $_ -match 'ERROR|Exception|Caused by|failed|refused|timed out|Unavailable|UNHEALTHY|Connection reset| 4\\d\\d | 5\\d\\d ' } | Select-Object -Last 40) -join "`n" | Write-Output
  Write-Output "ROOT_CAUSE_LINES_END"
  exit 1
}

Write-Output "COMPOSE_PS_BEGIN"
docker compose ps product-service trace-service api-gateway
Write-Output "COMPOSE_PS_END"

$registerAdmin = Invoke-Step -Name 'register_admin' -Method 'POST' -Url "$base/api/v1/auth/register" -Body @{ username=$adminUser; password='Admin@123'; email="$adminUser@example.com"; fullName='Admin Fix'; role='ADMIN' }
if($registerAdmin.Status -ge 400){ Fail-With-Logs -FailedStep $registerAdmin.Name -StatusCode $registerAdmin.Status }

$registerFarmer = Invoke-Step -Name 'register_farmer' -Method 'POST' -Url "$base/api/v1/auth/register" -Body @{ username=$farmerUser; password='Farmer@123'; email="$farmerUser@example.com"; fullName='Farmer Fix'; role='FARMER' }
if($registerFarmer.Status -ge 400){ Fail-With-Logs -FailedStep $registerFarmer.Name -StatusCode $registerFarmer.Status }

$loginAdmin = Invoke-Step -Name 'login_admin' -Method 'POST' -Url "$base/api/v1/auth/login" -Body @{ username=$adminUser; password='Admin@123' }
if($loginAdmin.Status -ge 400){ Fail-With-Logs -FailedStep $loginAdmin.Name -StatusCode $loginAdmin.Status }
$adminToken = $loginAdmin.Json.accessToken
if(-not $adminToken){ Fail-With-Logs -FailedStep 'login_admin_token_missing' -StatusCode 500 }

$loginFarmer = Invoke-Step -Name 'login_farmer' -Method 'POST' -Url "$base/api/v1/auth/login" -Body @{ username=$farmerUser; password='Farmer@123' }
if($loginFarmer.Status -ge 400){ Fail-With-Logs -FailedStep $loginFarmer.Name -StatusCode $loginFarmer.Status }
$farmerToken = $loginFarmer.Json.accessToken
if(-not $farmerToken){ Fail-With-Logs -FailedStep 'login_farmer_token_missing' -StatusCode 500 }

$productCreate = Invoke-Step -Name 'create_product' -Method 'POST' -Url "$base/api/v1/products" -Token $adminToken -Body @{ name="Product-$ts"; description='E2E product via gateway' }
if($productCreate.Status -ge 400){ Fail-With-Logs -FailedStep $productCreate.Name -StatusCode $productCreate.Status }
$productId = $productCreate.Json.id
if(-not $productId -and $productCreate.Json.data){ $productId = $productCreate.Json.data.id }
if(-not $productId){ Fail-With-Logs -FailedStep 'create_product_id_missing' -StatusCode 500 }

$farmCreate = Invoke-Step -Name 'create_farm' -Method 'POST' -Url "$base/api/v1/farms" -Token $farmerToken -Body @{ name="Farm-$ts"; location='Test Valley' }
if($farmCreate.Status -ge 400){ Fail-With-Logs -FailedStep $farmCreate.Name -StatusCode $farmCreate.Status }
$farmId = $farmCreate.Json.id
if(-not $farmId -and $farmCreate.Json.data){ $farmId = $farmCreate.Json.data.id }
if(-not $farmId){ Fail-With-Logs -FailedStep 'create_farm_id_missing' -StatusCode 500 }

$batchCreate = Invoke-Step -Name 'create_batch' -Method 'POST' -Url "$base/api/v1/batches" -Token $farmerToken -Body @{ farmId=$farmId; productId=$productId; quantity=12.5; harvestDate=(Get-Date).ToString('s') }
if($batchCreate.Status -ge 400){ Fail-With-Logs -FailedStep $batchCreate.Name -StatusCode $batchCreate.Status }
$batchId = $batchCreate.Json.id
if(-not $batchId){ $batchId = $batchCreate.Json.batchId }
if(-not $batchId){ $batchId = $batchCreate.Json.code }
if(-not $batchId -and $batchCreate.Json.data){ $batchId = $batchCreate.Json.data.id; if(-not $batchId){$batchId=$batchCreate.Json.data.code} }
if(-not $batchId){ Fail-With-Logs -FailedStep 'create_batch_id_missing' -StatusCode 500 }

$traceCreate = Invoke-Step -Name 'add_trace' -Method 'POST' -Url "$base/api/v1/trace-logs" -Token $farmerToken -Body @{ batchId="$batchId"; action='HARVESTED'; location='Test Valley'; notes='E2E trace log' }
if($traceCreate.Status -ge 400){ Fail-With-Logs -FailedStep $traceCreate.Name -StatusCode $traceCreate.Status }
