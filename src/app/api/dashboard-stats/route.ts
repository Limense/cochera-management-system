import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Crear cliente Supabase con service role para operaciones de admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'hoy' // hoy, semana, mes
    const adminId = searchParams.get('adminId')

    // Verificar permisos de admin
    if (!adminId) {
      return NextResponse.json(
        { error: 'ID de administrador requerido' },
        { status: 401 }
      )
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      )
    }

    // Calcular fechas según el período
    const now = new Date()
    let fechaInicio: string
    let fechaFin: string

    switch (periodo) {
      case 'semana':
        const inicioSemana = new Date(now)
        inicioSemana.setDate(now.getDate() - 7)
        fechaInicio = inicioSemana.toISOString().split('T')[0]
        fechaFin = now.toISOString().split('T')[0]
        break
      case 'mes':
        const inicioMes = new Date(now)
        inicioMes.setDate(now.getDate() - 30)
        fechaInicio = inicioMes.toISOString().split('T')[0]
        fechaFin = now.toISOString().split('T')[0]
        break
      default: // 'hoy'
        fechaInicio = now.toISOString().split('T')[0]
        fechaFin = now.toISOString().split('T')[0]
    }

    // 1. Métricas básicas del período
    const { data: sesionesDelPeriodo } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select('*')
      .gte('created_at', `${fechaInicio}T00:00:00.000Z`)
      .lte('created_at', `${fechaFin}T23:59:59.999Z`)

    // 2. Sesiones activas actuales
    const { data: sesionesActivas } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select('*')
      .eq('is_active', true)

    // 3. Datos para gráficos por día
    const diasDelPeriodo = []
    const fechaActual = new Date(fechaInicio)
    const fechaFinal = new Date(fechaFin)

    while (fechaActual <= fechaFinal) {
      diasDelPeriodo.push(fechaActual.toISOString().split('T')[0])
      fechaActual.setDate(fechaActual.getDate() + 1)
    }

    const datosGraficos = diasDelPeriodo.map(fecha => {
      const sesionesDelDia = sesionesDelPeriodo?.filter(s => 
        s.created_at.startsWith(fecha)
      ) || []

      const ingresos = sesionesDelDia
        .filter(s => s.estado_pago === 'pagado')
        .reduce((sum, s) => sum + (s.monto_calculado || 0), 0)

      return {
        fecha: new Date(fecha).toLocaleDateString('es-PE', { 
          day: '2-digit',
          month: '2-digit'
        }),
        ingresos,
        vehiculos: sesionesDelDia.length,
        autos: sesionesDelDia.filter(s => s.tipo_vehiculo === 'auto').length,
        motos: sesionesDelDia.filter(s => s.tipo_vehiculo === 'moto').length
      }
    })

    // 4. Calcular métricas generales
    const totalVehiculos = sesionesDelPeriodo?.length || 0
    const totalIngresos = sesionesDelPeriodo
      ?.filter(s => s.estado_pago === 'pagado')
      .reduce((sum, s) => sum + (s.monto_calculado || 0), 0) || 0
    
    const vehiculosActivos = sesionesActivas?.length || 0
    const espaciosDisponibles = 50 - vehiculosActivos // Asumiendo 50 espacios total
    
    const autosDelPeriodo = sesionesDelPeriodo?.filter(s => s.tipo_vehiculo === 'auto').length || 0
    const motosDelPeriodo = sesionesDelPeriodo?.filter(s => s.tipo_vehiculo === 'moto').length || 0

    // 5. Calcular tendencias (comparación con período anterior)
    const diasPeriodo = diasDelPeriodo.length
    const fechaInicioAnterior = new Date(fechaInicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo)
    const fechaFinAnterior = new Date(fechaInicio)
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1)

    const { data: sesionesAnterior } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select('monto_calculado, tipo_vehiculo')
      .gte('created_at', fechaInicioAnterior.toISOString())
      .lte('created_at', fechaFinAnterior.toISOString())

    const ingresosAnterior = sesionesAnterior
      ?.reduce((sum, s) => sum + (s.monto_calculado || 0), 0) || 0
    
    const tendenciaIngresos = ingresosAnterior > 0 
      ? ((totalIngresos - ingresosAnterior) / ingresosAnterior) * 100 
      : totalIngresos > 0 ? 100 : 0

    const tendenciaVehiculos = sesionesAnterior?.length 
      ? ((totalVehiculos - sesionesAnterior.length) / sesionesAnterior.length) * 100
      : totalVehiculos > 0 ? 100 : 0

    // 6. Datos para gráfico de pie (distribución de vehículos)
    const distribucionVehiculos = [
      {
        tipo: 'Autos',
        cantidad: autosDelPeriodo,
        porcentaje: totalVehiculos > 0 ? (autosDelPeriodo / totalVehiculos) * 100 : 0,
        color: '#3b82f6'
      },
      {
        tipo: 'Motos',
        cantidad: motosDelPeriodo,
        porcentaje: totalVehiculos > 0 ? (motosDelPeriodo / totalVehiculos) * 100 : 0,
        color: '#10b981'
      }
    ]

    // 7. Registrar en auditoría
    await supabaseAdmin
      .from('auditoria_logs')
      .insert({
        usuario_id: adminId,
        accion_tipo: 'configuracion_cambiada',
        tabla_afectada: 'statistics',
        registro_id: `${periodo}_${fechaInicio}`,
        detalles: {
          periodo,
          fechaInicio,
          fechaFin,
          totalVehiculos,
          totalIngresos
        }
      })

    const estadisticas = {
      metricas: {
        totalIngresos,
        totalVehiculos,
        vehiculosActivos,
        espaciosDisponibles,
        autosDelPeriodo,
        motosDelPeriodo,
        tendenciaIngresos: Math.round(tendenciaIngresos * 100) / 100,
        tendenciaVehiculos: Math.round(tendenciaVehiculos * 100) / 100
      },
      graficos: {
        ingresosPorDia: datosGraficos,
        distribucionVehiculos
      },
      periodo,
      fechaInicio,
      fechaFin,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(estadisticas)

  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}