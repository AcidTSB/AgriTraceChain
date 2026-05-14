$ErrorActionPreference = 'Stop'

function Get-JsonValue {
    param($Obj, [string[]]$Paths)
    foreach ($p in $Paths) {
        $cur = $Obj
        $ok = $true
        foreach ($seg in $p.Split('.')) {
            if ($null -eq $cur) { $ok = $false; break }
            $cur = $cur.$seg
        }
        if ($ok -and $null -ne $cur -and "$cur" -ne '') { return "$cur" }
    }
    return $null
}

function Print-Step {
    param([string]$Name, [int]$Status, [string]$Body)
    Write-Output "STEP: $Name"
    Write-Output "STATUS: $Status"
    Write-Output "BODY: $Body"
    Write-Output ""
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        $Payload = $null,
        [string]$Token = ''
    )

    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }

    $bodyJson = $null
    if ($null -ne $Payload) { $bodyJson = $Payload | ConvertTo-Json -Compress -Depth 30 }

    $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $bodyJson -SkipHttpErrorCheck
    $raw = if ($resp.Content) { [string]$resp.Content } else { '' }
    $obj = $null
    try { $obj = $raw | ConvertFrom-Json -Depth 50 } catch {}

    Print-Step -Name $Name -Status ([int]$resp.StatusCode) -Body $raw

    [pscustomobject]@{ Name=$Name; Status=[int]$resp.StatusCode; Raw=$raw; Obj=$obj }
}

function Dump-Logs-OnFailure {
    param([string]$FailedStep)
    $logs = docker compose logs --tail=200 product-service trace-service user-service api-gateway 2>&1
    Write-Output "STEP: DOCKER_LOGS_AFTER_FAILURE_$FailedStep"
    Write-Output "STATUS: 200"
    Write-Output "BODY: BEGIN_DOCKER_LOGS"
    $logs
    Write-Output "BODY: END_DOCKER_LOGS"
    $key = $logs | Select-String -Pattern 'ERROR|Exception|Caused by|IllegalArgument|AccessDenied|401|403|500' -CaseSensitive:$false | Select-Object -First 40
    Write-Output "STEP: KEY_ERROR_LINES"
    Write-Output "STATUS: 200"
    if ($key) {
        Write-Output "BODY:"
        $key | ForEach-Object { $_.Line }
    } else {
        Write-Output "BODY: No obvious error lines matched the filter."
    }
}

function Ensure-Success {
    param($Resp)
    if ($Resp.Status -ge 400) {
        Dump-Logs-OnFailure -FailedStep $Resp.Name
        exit 1
    }
}

$base = 'http://localhost:8080/api/v1'
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

Print-Step -Name 'SUFFIX' -Status 200 -Body (@{ suffix = "$suffix" } | ConvertTo-Json -Compress)

$adminUser = "admin_final_$suffix"
$farmerUser = "farmer_final_$suffix"

$regAdmin = Invoke-Step -Name 'REGISTER_ADMIN' -Method 'POST' -Url "$base/auth/register" -Payload @{
    username = $adminUser
    password = 'Admin@123'
    email    = "$adminUser@agri.local"
    fullName = 'Admin Final'
    role     = 'ADMIN'
}
Ensure-Success $regAdmin

$regFarmer = Invoke-Step -Name 'REGISTER_FARMER' -Method 'POST' -Url "$base/auth/register" -Payload @{
    username = $farmerUser
    password = 'Farmer@123'
    email    = "$farmerUser@agri.local"
    fullName = 'Farmer Final'
    role     = 'FARMER'
}
Ensure-Success $regFarmer

$loginAdmin = Invoke-Step -Name 'LOGIN_ADMIN' -Method 'POST' -Url "$base/auth/login" -Payload @{ username = $adminUser; password = 'Admin@123' }
Ensure-Success $loginAdmin
$adminToken = Get-JsonValue -Obj $loginAdmin.Obj -Paths @('data.accessToken')
if (-not $adminToken) {
    Print-Step -Name 'LOGIN_ADMIN_TOKEN_PARSE' -Status 500 -Body 'data.accessToken not found'
    Dump-Logs-OnFailure -FailedStep 'LOGIN_ADMIN_TOKEN_PARSE'
    exit 1
}

$loginFarmer = Invoke-Step -Name 'LOGIN_FARMER' -Method 'POST' -Url "$base/auth/login" -Payload @{ username = $farmerUser; password = 'Farmer@123' }
Ensure-Success $loginFarmer
$farmerToken = Get-JsonValue -Obj $loginFarmer.Obj -Paths @('data.accessToken')
if (-not $farmerToken) {
    Print-Step -Name 'LOGIN_FARMER_TOKEN_PARSE' -Status 500 -Body 'data.accessToken not found'
    Dump-Logs-OnFailure -FailedStep 'LOGIN_FARMER_TOKEN_PARSE'
    exit 1
}

$product = Invoke-Step -Name 'CREATE_PRODUCT' -Method 'POST' -Url "$base/products" -Token $adminToken -Payload @{
    name = "Product Final $suffix"
    description = 'Final execution product'
}
Ensure-Success $product
$productId = Get-JsonValue -Obj $product.Obj -Paths @('data.id','id','productId')
if (-not $productId) {
    Print-Step -Name 'PRODUCT_ID_PARSE' -Status 500 -Body 'Product id not found in response'
    Dump-Logs-OnFailure -FailedStep 'PRODUCT_ID_PARSE'
    exit 1
}

$farm = Invoke-Step -Name 'CREATE_FARM' -Method 'POST' -Url "$base/farms" -Token $farmerToken -Payload @{
    name = "Farm Final $suffix"
    location = 'Final Field'
}
Ensure-Success $farm
$farmId = Get-JsonValue -Obj $farm.Obj -Paths @('data.id','id','farmId')
if (-not $farmId) {
    Print-Step -Name 'FARM_ID_PARSE' -Status 500 -Body 'Farm id not found in response'
    Dump-Logs-OnFailure -FailedStep 'FARM_ID_PARSE'
    exit 1
}

$batch = Invoke-Step -Name 'CREATE_BATCH' -Method 'POST' -Url "$base/batches" -Token $farmerToken -Payload @{
    farmId = $farmId
    productId = $productId
    quantity = 150
    harvestDate = '2026-04-19'
}
Ensure-Success $batch
$batchId = Get-JsonValue -Obj $batch.Obj -Paths @('data.id','id','batchId')
if (-not $batchId) {
    Print-Step -Name 'BATCH_ID_PARSE' -Status 500 -Body 'Batch id not found in response'
    Dump-Logs-OnFailure -FailedStep 'BATCH_ID_PARSE'
    exit 1
}

$trace = Invoke-Step -Name 'ADD_TRACE' -Method 'POST' -Url "$base/trace-logs" -Token $farmerToken -Payload @{
    batchId = $batchId
    action = 'HARVESTING'
    location = 'Final Plot'
    notes = 'Harvesting event recorded'
}
Ensure-Success $trace

$getTrace = Invoke-Step -Name 'GET_TRACE_BY_BATCH_ID' -Method 'GET' -Url "$base/trace-logs/batch/$batchId"
Ensure-Success $getTrace
