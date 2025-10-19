# Script para insertar datos de prueba en Supabase desde Windows PowerShell
# Ejecutar desde la raíz del proyecto: .\scripts\insertar-datos-prueba.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseAnonKey
)

Write-Host "🚀 Iniciando inserción de datos de prueba en Supabase..." -ForegroundColor Green

# Verificar que curl esté disponible
try {
    $curlVersion = curl --version 2>$null
    if (-not $curlVersion) {
        throw "curl no encontrado"
    }
} catch {
    Write-Host "❌ Error: curl no está instalado. Instala curl o usa Git Bash." -ForegroundColor Red
    exit 1
}

# Headers para las peticiones
$headers = @{
    "apikey" = $SupabaseAnonKey
    "Authorization" = "Bearer $SupabaseAnonKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

Write-Host "🔗 Conectando a Supabase: $SupabaseUrl" -ForegroundColor Yellow

# Función para hacer peticiones HTTP
function Invoke-SupabaseInsert {
    param(
        [string]$Table,
        [object[]]$Data,
        [string]$Description
    )
    
    Write-Host "📝 Insertando $Description..." -ForegroundColor Cyan
    
    $jsonData = $Data | ConvertTo-Json -Depth 10 -Compress
    $url = "$SupabaseUrl/rest/v1/$Table"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $jsonData -ErrorAction Stop
        Write-Host "   ✅ $Description insertados correctamente" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   ❌ Error insertando $Description`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. Insertar espacios de parqueo
$espacios = @()
for ($i = 1; $i -le 45; $i++) {
    $estado = switch ($i) {
        {$_ -in 1..30} { "disponible" }
        {$_ -in 31..42} { "ocupado" }
        {$_ -in 43..45} { "mantenimiento" }
    }
    
    $espacios += @{
        numero_espacio = $i
        estado = $estado
        tipo_vehiculo = if ($i -le 35) { "auto" } else { "moto" }
        tarifa_por_hora = if ($i -le 35) { 15.0 } else { 8.0 }
        created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
}

$success = Invoke-SupabaseInsert -Table "espacios" -Data $espacios -Description "45 espacios de parqueo"
if (-not $success) { exit 1 }

# 2. Insertar vehículos
$vehiculos = @(
    @{ placa = "ABC123"; tipo = "auto"; marca = "Toyota"; modelo = "Corolla"; color = "Blanco" },
    @{ placa = "XYZ789"; tipo = "auto"; marca = "Honda"; modelo = "Civic"; color = "Negro" },
    @{ placa = "DEF456"; tipo = "auto"; marca = "Nissan"; modelo = "Sentra"; color = "Gris" },
    @{ placa = "GHI789"; tipo = "auto"; marca = "Ford"; modelo = "Focus"; color = "Azul" },
    @{ placa = "JKL012"; tipo = "auto"; marca = "Chevrolet"; modelo = "Cruze"; color = "Rojo" },
    @{ placa = "MNO345"; tipo = "auto"; marca = "Volkswagen"; modelo = "Jetta"; color = "Blanco" },
    @{ placa = "PQR678"; tipo = "auto"; marca = "Hyundai"; modelo = "Elantra"; color = "Plata" },
    @{ placa = "STU901"; tipo = "auto"; marca = "Kia"; modelo = "Rio"; color = "Verde" },
    @{ placa = "VWX234"; tipo = "auto"; marca = "Mazda"; modelo = "3"; color = "Negro" },
    @{ placa = "YZA567"; tipo = "auto"; marca = "Subaru"; modelo = "Impreza"; color = "Azul" },
    @{ placa = "M001"; tipo = "moto"; marca = "Honda"; modelo = "CBR"; color = "Rojo" },
    @{ placa = "M002"; tipo = "moto"; marca = "Yamaha"; modelo = "R6"; color = "Azul" },
    @{ placa = "M003"; tipo = "moto"; marca = "Kawasaki"; modelo = "Ninja"; color = "Verde" },
    @{ placa = "M004"; tipo = "moto"; marca = "Suzuki"; modelo = "GSXR"; color = "Negro" }
)

foreach ($vehiculo in $vehiculos) {
    $vehiculo.created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $vehiculo.updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

$success = Invoke-SupabaseInsert -Table "vehiculos" -Data $vehiculos -Description "14 vehículos de prueba"
if (-not $success) { exit 1 }

# 3. Insertar sesiones activas
$now = Get-Date
$sesionesActivas = @()

# Sesiones de diferentes duraciones
$duraciones = @(30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720, 1440)
$placasOcupadas = @("ABC123", "XYZ789", "DEF456", "GHI789", "JKL012", "MNO345", "PQR678", "STU901", "VWX234", "YZA567", "M001", "M002")

for ($i = 0; $i -lt 12; $i++) {
    $espacioNum = $i + 31  # Espacios 31-42 están ocupados
    $entrada = $now.AddMinutes(-$duraciones[$i]).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $sesionesActivas += @{
        espacio_id = $espacioNum
        placa_vehiculo = $placasOcupadas[$i]
        hora_entrada = $entrada
        is_active = $true
        created_at = $entrada
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
}

$success = Invoke-SupabaseInsert -Table "sesiones_parqueo" -Data $sesionesActivas -Description "12 sesiones activas"
if (-not $success) { exit 1 }

# 4. Insertar algunas sesiones completadas del día actual
$sesionesCompletadas = @()
for ($i = 1; $i -le 8; $i++) {
    $entrada = $now.AddHours(-($i + 2)).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $salida = $now.AddHours(-$i).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $sesionesCompletadas += @{
        espacio_id = $i
        placa_vehiculo = "HIST00$i"
        hora_entrada = $entrada
        hora_salida = $salida
        duracion_minutos = 60
        tarifa_aplicada = 15.0
        monto_cobrado = 15.0
        is_active = $false
        created_at = $entrada
        updated_at = $salida
    }
}

$success = Invoke-SupabaseInsert -Table "sesiones_parqueo" -Data $sesionesCompletadas -Description "8 sesiones completadas del día"
if (-not $success) { exit 1 }

Write-Host ""
Write-Host "🎉 ¡Datos de prueba insertados exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Resumen de datos insertados:" -ForegroundColor Yellow
Write-Host "   • 45 espacios de parqueo (30 disponibles, 12 ocupados, 3 en mantenimiento)"
Write-Host "   • 14 vehículos registrados (10 autos, 4 motos)"
Write-Host "   • 12 sesiones activas con diferentes duraciones"
Write-Host "   • 8 sesiones completadas del día actual"
Write-Host ""
Write-Host "🔍 Ve al panel de Diagnóstico en la aplicación para verificar la conexión."
Write-Host ""
Write-Host "💡 Ejemplo de uso:"
Write-Host "   .\scripts\insertar-datos-prueba.ps1 -SupabaseUrl 'https://tu-proyecto.supabase.co' -SupabaseAnonKey 'tu-clave-anon'"