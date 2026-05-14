$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param(
        [string]$Step,
        [string]$Method,
        [string]$Url,
        $Body = $null,
        [string]$Token = ''
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $json = $null
    if ($null -ne $Body) { $json = $Body | ConvertTo-Json -Compress -Depth 30 }

    $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $json -SkipHttpErrorCheck
    $raw = if ($resp.Content) { [string]$resp.Content } else { '' }

    Write-Host '===STEP===' 
    Write-Host $Step
    Write-Host 'STATUS'
    Write-Host ([int]$resp.StatusCode)
    Write-Host 'BODY'
    Write-Host $raw

    [pscustomobject]@{ Status = [int]$resp.StatusCode; Raw = $raw }
}

function Get-JsonValue {
    param([string]$Raw, [string[]]$Paths)
    try { $obj = $Raw | ConvertFrom-Json -Depth 50 } catch { return $null }
    foreach ($p in $Paths) {
        $cur = $obj
        $ok = $true
        foreach ($s in $p.Split('.')) {
            if ($null -eq $cur) { $ok = $false; break }
            $cur = $cur.$s
        }
        if ($ok -and $null -ne $cur -and "$cur" -ne '') { return "$cur" }
    }
    return $null
}

$base = 'http://localhost:8080/api/v1'
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

Invoke-Step -Step 'GENERATE_SUFFIX' -Method 'GET' -Url 'http://localhost:8080/actuator/health' -Body $null | Out-Null
Write-Host '===STEP===' 
Write-Output 'SUFFIX_VALUE'
Write-Host 'STATUS'
Write-Output '200'
Write-Host 'BODY'
Write-Output (@{ suffix = "$suffix" } | ConvertTo-Json -Compress)

$adminUser = "admin_$suffix"
$farmerUser = "farmer_$suffix"

$regAdmin = Invoke-Step -Step 'REGISTER_ADMIN' -Method 'POST' -Url "$base/auth/register" -Body @{
    username = $adminUser
    password = 'Admin@123'
    email = "$adminUser@agri.local"
    fullName = 'Admin User'
    role = 'ADMIN'
}

$regFarmer = Invoke-Step -Step 'REGISTER_FARMER' -Method 'POST' -Url "$base/auth/register" -Body @{
    username = $farmerUser
    password = 'Farmer@123'
    email = "$farmerUser@agri.local"
    fullName = 'Farmer User'
    role = 'FARMER'
}

$loginAdmin = Invoke-Step -Step 'LOGIN_ADMIN' -Method 'POST' -Url "$base/auth/login" -Body @{ username = $adminUser; password = 'Admin@123' }
$adminToken = Get-JsonValue -Raw $loginAdmin.Raw -Paths @('data.accessToken','accessToken','data.token','token')

$loginFarmer = Invoke-Step -Step 'LOGIN_FARMER' -Method 'POST' -Url "$base/auth/login" -Body @{ username = $farmerUser; password = 'Farmer@123' }
$farmerToken = Get-JsonValue -Raw $loginFarmer.Raw -Paths @('data.accessToken','accessToken','data.token','token')

$createProduct = Invoke-Step -Step 'CREATE_PRODUCT' -Method 'POST' -Url "$base/products" -Token $adminToken -Body @{
    name = "Rice $suffix"
    description = 'Automated flow product'
    category = 'GRAIN'
    unit = 'KG'
}
$productId = Get-JsonValue -Raw $createProduct.Raw -Paths @('data.id','id','data.productId','productId')

$createFarm = Invoke-Step -Step 'CREATE_FARM' -Method 'POST' -Url "$base/farms" -Token $farmerToken -Body @{
    name = "Farm $suffix"
    location = 'Field-A'
    size = 42
}
$farmId = Get-JsonValue -Raw $createFarm.Raw -Paths @('data.id','id','data.farmId','farmId')

$createBatch = Invoke-Step -Step 'CREATE_BATCH' -Method 'POST' -Url "$base/batches" -Token $farmerToken -Body @{
    farmId = $farmId
    productId = $productId
    quantity = 100
    harvestDate = (Get-Date).ToString('yyyy-MM-dd')
}

