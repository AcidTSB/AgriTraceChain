$ErrorActionPreference = 'Stop'

function Get-ByPath {
    param($Obj, [string]$Path)
    $cur = $Obj
    foreach ($seg in $Path.Split('.')) {
        if ($null -eq $cur) { return $null }
        $cur = $cur.$seg
    }
    return $cur
}

function Get-FirstValue {
    param($Obj, [string[]]$Paths)
    foreach ($p in $Paths) {
        $v = Get-ByPath -Obj $Obj -Path $p
        if ($null -ne $v -and "$v" -ne '') { return $v }
    }
    return $null
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        $Body,
        [string]$Token
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $jsonBody = $null
    if ($null -ne $Body) { $jsonBody = $Body | ConvertTo-Json -Compress -Depth 20 }

    $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $jsonBody -SkipHttpErrorCheck
    $raw = if ($resp.Content) { [string]$resp.Content } else { '' }
    $obj = $null
    try { $obj = $raw | ConvertFrom-Json -Depth 50 } catch {}

    [pscustomobject]@{
        Status = [int]$resp.StatusCode
        Raw    = $raw
        Obj    = $obj
    }
}

function Print-Step {
    param([string]$Name, $Resp)
    $compact = if ($Resp.Obj) { $Resp.Obj | ConvertTo-Json -Compress -Depth 20 } else { $Resp.Raw }
    Write-Output ("{0}`tHTTP_STATUS={1}`tBODY={2}" -f $Name, $Resp.Status, $compact)
}

function Fail-IfError {
    param([string]$Name, $Resp)
    if ([int]$Resp.Status -ge 400) {
        Write-Output "FAIL_AT=$Name"
        $logs = docker compose logs --tail=160 api-gateway product-service trace-service user-service 2>&1
        Write-Output "DOCKER_LOGS_BEGIN"
        $logs
        Write-Output "DOCKER_LOGS_END"
        Write-Output "ROOT_CAUSE_LINES_BEGIN"
        $logs | Select-String -Pattern 'ERROR|Exception|Caused by|NullPointer|NoSuchMethod|DataIntegrityViolation|IllegalArgument' -CaseSensitive:$false | ForEach-Object { $_.Line }
        Write-Output "ROOT_CAUSE_LINES_END"
        exit 1
    }
}

$base = 'http://localhost:8080/api/v1'
$sfx = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$adminUser = "admin_fix_$sfx"
$farmerUser = "farmer_fix_$sfx"

$registerAdminPayload = @{
    username = $adminUser
    password = 'Admin@123'
    email    = "$adminUser@agri.local"
    fullName = 'Admin Fix'
    role     = 'ADMIN'
}
$registerFarmerPayload = @{
    username = $farmerUser
    password = 'Farmer@123'
    email    = "$farmerUser@agri.local"
    fullName = 'Farmer Fix'
    role     = 'FARMER'
}

$resp = Invoke-Api -Method 'POST' -Url "$base/auth/register" -Body $registerAdminPayload
Print-Step -Name 'REGISTER_ADMIN' -Resp $resp
Fail-IfError -Name 'REGISTER_ADMIN' -Resp $resp

$resp = Invoke-Api -Method 'POST' -Url "$base/auth/register" -Body $registerFarmerPayload
Print-Step -Name 'REGISTER_FARMER' -Resp $resp
Fail-IfError -Name 'REGISTER_FARMER' -Resp $resp

$resp = Invoke-Api -Method 'POST' -Url "$base/auth/login" -Body @{ username = $adminUser; password = 'Admin@123' }
Print-Step -Name 'LOGIN_ADMIN' -Resp $resp
Fail-IfError -Name 'LOGIN_ADMIN' -Resp $resp
$adminToken = Get-FirstValue -Obj $resp.Obj -Paths @('data.accessToken','accessToken','data.token','token')
if (-not $adminToken) {
    Write-Output 'FAIL_AT=LOGIN_ADMIN_TOKEN_PARSE'
    exit 1
}

$resp = Invoke-Api -Method 'POST' -Url "$base/auth/login" -Body @{ username = $farmerUser; password = 'Farmer@123' }
Print-Step -Name 'LOGIN_FARMER' -Resp $resp
Fail-IfError -Name 'LOGIN_FARMER' -Resp $resp
$farmerToken = Get-FirstValue -Obj $resp.Obj -Paths @('data.accessToken','accessToken','data.token','token')
if (-not $farmerToken) {
    Write-Output 'FAIL_AT=LOGIN_FARMER_TOKEN_PARSE'
    exit 1
}

$productPayload = @{
    name        = "Product Fix $sfx"
    description = 'Created by automated fix flow'
    category    = 'GRAIN'
    unit        = 'KG'
}
$resp = Invoke-Api -Method 'POST' -Url "$base/products" -Body $productPayload -Token $adminToken
Print-Step -Name 'CREATE_PRODUCT' -Resp $resp
Fail-IfError -Name 'CREATE_PRODUCT' -Resp $resp
$productId = Get-FirstValue -Obj $resp.Obj -Paths @('data.id','id','data.productId','productId')

$farmPayload = @{
    name     = "Farm Fix $sfx"
    location = 'Fix Valley'
    size     = 25.5
}
$resp = Invoke-Api -Method 'POST' -Url "$base/farms" -Body $farmPayload -Token $farmerToken
Print-Step -Name 'CREATE_FARM' -Resp $resp
Fail-IfError -Name 'CREATE_FARM' -Resp $resp
$farmId = Get-FirstValue -Obj $resp.Obj -Paths @('data.id','id','data.farmId','farmId')

$harvestDate = (Get-Date).ToString('yyyy-MM-dd')
$batchPayload = @{
    farmId      = $farmId
    productId   = $productId
    quantity    = 120
    harvestDate = $harvestDate
}
$resp = Invoke-Api -Method 'POST' -Url "$base/batches" -Body $batchPayload -Token $farmerToken
Print-Step -Name 'CREATE_BATCH' -Resp $resp
Fail-IfError -Name 'CREATE_BATCH' -Resp $resp
$batchId = Get-FirstValue -Obj $resp.Obj -Paths @('data.id','id','data.batchId','batchId')

$tracePayload = @{
    batchId      = $batchId
    action       = 'HARVESTING'
    description  = 'Harvesting logged from inline execution script'
}
$resp = Invoke-Api -Method 'POST' -Url "$base/trace-logs" -Body $tracePayload -Token $farmerToken
Print-Step -Name 'ADD_TRACE' -Resp $resp
Fail-IfError -Name 'ADD_TRACE' -Resp $resp
