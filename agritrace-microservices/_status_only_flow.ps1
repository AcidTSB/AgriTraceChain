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

function Invoke-Step {
    param([string]$Name,[string]$Method,[string]$Url,$Payload=$null,[string]$Token='')
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $body = $null
    if ($null -ne $Payload) { $body = $Payload | ConvertTo-Json -Compress -Depth 30 }
    $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $body -SkipHttpErrorCheck
    $raw = if ($resp.Content) { [string]$resp.Content } else { '' }
    $obj = $null
    try { $obj = $raw | ConvertFrom-Json -Depth 60 } catch {}
    $status = [int]$resp.StatusCode
    Write-Host "STEP=$Name STATUS=$status"
    [pscustomobject]@{ Name=$Name; Status=$status; Raw=$raw; Obj=$obj }
}

function Fail-And-Exit {
    param([string]$Step,[int]$Status,[string]$Body)
    $reason = $Body
    if (-not $reason) { $reason = "HTTP $Status at $Step" }
    $reason = ($reason -replace '[\r\n]+',' ')
    if ($reason.Length -gt 260) { $reason = $reason.Substring(0,260) }
    $logs = docker compose logs --tail=300 api-gateway user-service product-service trace-service 2>&1
    $errs = $logs | Select-String -Pattern 'ERROR|Exception' -CaseSensitive:$false | Select-Object -First 5
    $cause = if ($errs) { (($errs | ForEach-Object { ($_.Line -replace '[\r\n]+',' ').Trim() }) -join ' | ') } else { 'No ERROR/Exception lines found in recent logs.' }
    Write-Output "FAIL_REASON=$reason"
    Write-Output "LIKELY_CAUSE=$cause"
    exit 1
}

$base = 'http://localhost:8080/api/v1'
$suffix = Get-Date -Format 'yyyyMMddHHmmss'
Write-Host "STEP=SUFFIX_TIMESTAMP STATUS=200"

$adminUser = "admin_$suffix"
$farmerUser = "farmer_$suffix"

$r1 = Invoke-Step -Name 'REGISTER_ADMIN' -Method 'POST' -Url "$base/auth/register" -Payload @{
    username=$adminUser; password='Admin@123'; email="$adminUser@agri.local"; fullName='Admin User'; role='ADMIN'
}
if ($r1.Status -ge 400) { Fail-And-Exit -Step $r1.Name -Status $r1.Status -Body $r1.Raw }

$r2 = Invoke-Step -Name 'REGISTER_FARMER' -Method 'POST' -Url "$base/auth/register" -Payload @{
    username=$farmerUser; password='Farmer@123'; email="$farmerUser@agri.local"; fullName='Farmer User'; role='FARMER'
}
if ($r2.Status -ge 400) { Fail-And-Exit -Step $r2.Name -Status $r2.Status -Body $r2.Raw }

$r3 = Invoke-Step -Name 'LOGIN_ADMIN' -Method 'POST' -Url "$base/auth/login" -Payload @{ username=$adminUser; password='Admin@123' }
if ($r3.Status -ge 400) { Fail-And-Exit -Step $r3.Name -Status $r3.Status -Body $r3.Raw }
$adminToken = Get-JsonValue -Obj $r3.Obj -Paths @('data.accessToken','accessToken','data.token','token')
if (-not $adminToken) { Fail-And-Exit -Step 'LOGIN_ADMIN' -Status 500 -Body 'Token not found in admin login response' }

$r4 = Invoke-Step -Name 'LOGIN_FARMER' -Method 'POST' -Url "$base/auth/login" -Payload @{ username=$farmerUser; password='Farmer@123' }
if ($r4.Status -ge 400) { Fail-And-Exit -Step $r4.Name -Status $r4.Status -Body $r4.Raw }
$farmerToken = Get-JsonValue -Obj $r4.Obj -Paths @('data.accessToken','accessToken','data.token','token')
if (-not $farmerToken) { Fail-And-Exit -Step 'LOGIN_FARMER' -Status 500 -Body 'Token not found in farmer login response' }

$r5 = Invoke-Step -Name 'CREATE_PRODUCT' -Method 'POST' -Url "$base/products" -Token $adminToken -Payload @{
    name="Rice $suffix"; description='Status flow product'; category='GRAIN'; unit='KG'
}
if ($r5.Status -ge 400) { Fail-And-Exit -Step $r5.Name -Status $r5.Status -Body $r5.Raw }
$productId = Get-JsonValue -Obj $r5.Obj -Paths @('data.id','id','data.productId','productId')
if (-not $productId) { Fail-And-Exit -Step 'CREATE_PRODUCT' -Status 500 -Body 'productId not found in create product response' }

$r6 = Invoke-Step -Name 'CREATE_FARM' -Method 'POST' -Url "$base/farms" -Token $farmerToken -Payload @{
    name="Farm $suffix"; location='Field-A'; size=42
}
if ($r6.Status -ge 400) { Fail-And-Exit -Step $r6.Name -Status $r6.Status -Body $r6.Raw }
$farmId = Get-JsonValue -Obj $r6.Obj -Paths @('data.id','id','data.farmId','farmId')
if (-not $farmId) { Fail-And-Exit -Step 'CREATE_FARM' -Status 500 -Body 'farmId not found in create farm response' }

$r7 = Invoke-Step -Name 'CREATE_BATCH' -Method 'POST' -Url "$base/batches" -Token $farmerToken -Payload @{
    farmId=$farmId; productId=$productId; quantity=100; harvestDate='2026-04-19'
}
if ($r7.Status -ge 400) { Fail-And-Exit -Step $r7.Name -Status $r7.Status -Body $r7.Raw }
$batchId = Get-JsonValue -Obj $r7.Obj -Paths @('data.id','id','data.batchId','batchId')
if (-not $batchId) { Fail-And-Exit -Step 'CREATE_BATCH' -Status 500 -Body 'batchId not found in create batch response' }

$r8 = Invoke-Step -Name 'ADD_TRACE' -Method 'POST' -Url "$base/trace-logs" -Token $farmerToken -Payload @{
    batchId=$batchId; action='HARVESTING'; location='Plot-A'; notes='Harvest done'
}
if ($r8.Status -ge 400) { Fail-And-Exit -Step $r8.Name -Status $r8.Status -Body $r8.Raw }

$r9 = Invoke-Step -Name 'GET_TRACE_BY_BATCH_ID' -Method 'GET' -Url "$base/trace-logs/batch/$batchId" -Token $farmerToken
if ($r9.Status -ge 400) { Fail-And-Exit -Step $r9.Name -Status $r9.Status -Body $r9.Raw }

Write-Host "IDS productId=$productId farmId=$farmId batchId=$batchId"

