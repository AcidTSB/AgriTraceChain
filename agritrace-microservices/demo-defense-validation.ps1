param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$TraceDbContainer = "agritrace-trace-db",
    [string]$DbUser = "agritrace",
    [string]$DbName = "trace_db"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body,
        [hashtable]$Headers
    )

    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $Headers
        ContentType = "application/json"
        TimeoutSec = 30
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }

    try {
        $response = Invoke-RestMethod @params
        return @{
            ok = $true
            status = 200
            body = $response
        }
    } catch {
        $status = 500
        $raw = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $raw = $reader.ReadToEnd()
            } catch {
                $raw = $_.Exception.Message
            }
        } else {
            $raw = $_.Exception.Message
        }

        $json = $null
        try { $json = $raw | ConvertFrom-Json } catch {}

        return @{
            ok = $false
            status = $status
            body = $json
            raw = $raw
        }
    }
}

function Register-User {
    param([string]$Username,[string]$Password,[string]$Email,[string]$Role,[string]$FullName)

    $payload = @{
        username = $Username
        password = $Password
        email = $Email
        fullName = $FullName
        role = $Role
    }

    $res = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/register" -Body $payload -Headers @{}
    if (-not $res.ok -and $res.status -notin @(400,409)) {
        throw "Register failed for $Username. status=$($res.status) body=$($res.raw)"
    }
}

function Login-User {
    param([string]$Username,[string]$Password)

    $payload = @{ username = $Username; password = $Password }
    $res = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/login" -Body $payload -Headers @{}
    if (-not $res.ok) {
        throw "Login failed for $Username. status=$($res.status) body=$($res.raw)"
    }

    $token = $res.body.data.accessToken
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Login response missing accessToken for $Username"
    }
    return $token
}

function AuthHeader {
    param([string]$Token)
    return @{ Authorization = "Bearer $Token" }
}

$runId = [DateTime]::UtcNow.ToString("yyyyMMddHHmmss")

$farmerUser = "farmer_demo_$runId"
$adminUser = "admin_demo_$runId"
$inspectorUser = "inspector_demo_$runId"
$password = "Password123!"

$result = [ordered]@{
    runId = $runId
    baseUrl = $BaseUrl
    case1 = @{}
    case2 = @{}
    case3 = @{}
    case4 = @{}
}

Write-Step "Setup users and tokens"
Register-User -Username $adminUser -Password $password -Email "$adminUser@example.com" -Role "ADMIN" -FullName "Demo Admin"
Register-User -Username $farmerUser -Password $password -Email "$farmerUser@example.com" -Role "FARMER" -FullName "Demo Farmer"
Register-User -Username $inspectorUser -Password $password -Email "$inspectorUser@example.com" -Role "INSPECTOR" -FullName "Demo Inspector"

$adminToken = Login-User -Username $adminUser -Password $password
$farmerToken = Login-User -Username $farmerUser -Password $password
$inspectorToken = Login-User -Username $inspectorUser -Password $password

Write-Step "CASE 3 - RBAC"
$farmerCreateProduct = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/products" -Body @{ name = "RBAC-Forbidden-$runId"; description = "Should be forbidden" } -Headers (AuthHeader -Token $farmerToken)
$adminCreateProduct = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/products" -Body @{ name = "Organic Tomato $runId"; description = "Demo product" } -Headers (AuthHeader -Token $adminToken)

if ($farmerCreateProduct.status -ne 403) {
    throw "RBAC failed: FARMER create product expected 403, got $($farmerCreateProduct.status)"
}
if (-not $adminCreateProduct.ok) {
    throw "RBAC failed: ADMIN create product expected success, got status $($adminCreateProduct.status)"
}

$productId = $adminCreateProduct.body.data.id
$result.case3 = [ordered]@{
    farmerCreateProductStatus = $farmerCreateProduct.status
    adminCreateProductStatus = if ($adminCreateProduct.ok) { 201 } else { $adminCreateProduct.status }
    pass = $true
}

Write-Step "CASE 1 - Normal flow"
$farmCreate = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/farms" -Body @{ name = "Demo Farm $runId"; location = "Da Lat" } -Headers (AuthHeader -Token $farmerToken)
if (-not $farmCreate.ok) {
    throw "Create farm failed. status=$($farmCreate.status) body=$($farmCreate.raw)"
}
$farmId = $farmCreate.body.data.id

$batchCreatePayload = @{ farmId = $farmId; productId = $productId; quantity = 150; harvestDate = "2026-04-20" }
$batchCreate = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/batches" -Body $batchCreatePayload -Headers (AuthHeader -Token $farmerToken)
if (-not $batchCreate.ok) {
    throw "Create batch failed. status=$($batchCreate.status) body=$($batchCreate.raw)"
}

$batchId = $batchCreate.body.data.id
$batchCode = $batchCreate.body.data.batchCode

$traceFarmer = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/trace-logs" -Body @{ batchId = $batchId; action = "PLANTING"; location = "Farm Zone A"; notes = "Initial planting" } -Headers (AuthHeader -Token $farmerToken)
if (-not $traceFarmer.ok) {
    throw "Farmer trace failed. status=$($traceFarmer.status) body=$($traceFarmer.raw)"
}

$traceInspector = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/trace-logs" -Body @{ batchId = $batchId; action = "INSPECTION"; location = "QA Lab"; notes = "Inspector signed quality check" } -Headers (AuthHeader -Token $inspectorToken)
if (-not $traceInspector.ok) {
    throw "Inspector trace failed. status=$($traceInspector.status) body=$($traceInspector.raw)"
}

$qrBase64 = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/media/qr/$batchCode/base64" -Body $null -Headers @{}
if (-not $qrBase64.ok) {
    throw "Generate QR failed. status=$($qrBase64.status) body=$($qrBase64.raw)"
}

$publicTrace = Invoke-Api -Method "GET" -Url "$BaseUrl/api/public/trace/$batchCode" -Body $null -Headers @{}
if (-not $publicTrace.ok) {
    throw "Public trace failed. status=$($publicTrace.status) body=$($publicTrace.raw)"
}

$lastTrace = $publicTrace.body[-1]
if ($lastTrace.integrityStatus -ne "VERIFIED") {
    throw "Normal flow integrity expected VERIFIED, got $($lastTrace.integrityStatus)"
}

$result.case1 = [ordered]@{
    batchId = $batchId
    batchCode = $batchCode
    qrStatus = 200
    publicTraceStatus = 200
    finalIntegrityStatus = $lastTrace.integrityStatus
    pass = $true
}

Write-Step "CASE 2 - Tamper attack detection"
$traceListBeforeTamper = Invoke-Api -Method "GET" -Url "$BaseUrl/api/public/trace/$batchCode" -Body $null -Headers @{}
if (-not $traceListBeforeTamper.ok) {
    throw "Cannot read trace before tamper. status=$($traceListBeforeTamper.status)"
}

$targetTraceId = $traceListBeforeTamper.body[0].id
if ([string]::IsNullOrWhiteSpace($targetTraceId)) {
    throw "No trace id found to tamper"
}

$escaped = "Tampered by direct DB edit - $runId"
$updateSql = "UPDATE trace_logs SET description = '$escaped' WHERE id = '$targetTraceId';"
$null = docker exec $TraceDbContainer psql -U $DbUser -d $DbName -c $updateSql

$traceAfterTamper = Invoke-Api -Method "GET" -Url "$BaseUrl/api/public/trace/$batchCode" -Body $null -Headers @{}
if (-not $traceAfterTamper.ok) {
    throw "Cannot read trace after tamper. status=$($traceAfterTamper.status)"
}

$tampered = $traceAfterTamper.body | Where-Object { $_.id -eq $targetTraceId } | Select-Object -First 1
if ($null -eq $tampered) {
    throw "Tampered trace not found in response"
}
if ($tampered.integrityStatus -ne "COMPROMISED") {
    throw "Attack detection failed: expected COMPROMISED, got $($tampered.integrityStatus)"
}
if ($tampered.hashVerified -ne $false) {
    throw "Attack detection failed: expected hashVerified=false, got $($tampered.hashVerified)"
}

$result.case2 = [ordered]@{
    tamperedTraceId = $targetTraceId
    integrityStatus = $tampered.integrityStatus
    hashVerified = $tampered.hashVerified
    pass = $true
}

Write-Step "CASE 4 - QR public flow"
$qrPng = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/media/qr/$batchCode" -Body $null -Headers @{}
$publicNoAuth = Invoke-Api -Method "GET" -Url "$BaseUrl/api/public/trace/$batchCode" -Body $null -Headers @{}
if (-not $publicNoAuth.ok) {
    throw "Public no-auth trace failed. status=$($publicNoAuth.status)"
}

$result.case4 = [ordered]@{
    qrPngStatus = if ($qrPng.ok) { 200 } else { $qrPng.status }
    publicTraceNoAuthStatus = 200
    records = @($publicNoAuth.body).Count
    pass = $true
}

Write-Step "DONE"
$result | ConvertTo-Json -Depth 10 | Tee-Object -FilePath "d:/Coding/Java/AgriTraceChain/reports/demo-defense-result-$runId.json"
Write-Host "Saved: d:/Coding/Java/AgriTraceChain/reports/demo-defense-result-$runId.json" -ForegroundColor Green
