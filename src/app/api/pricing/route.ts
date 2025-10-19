import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TarifaDinamica } from '@/types/database'

// Crear cliente Supabase con service role para operaciones de admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para calcular el costo de estacionamiento
export async function calculateParkingCost(
  tipoVehiculo: 'auto' | 'moto',
  horaEntrada: Date,
  horaSalida: Date
): Promise<{
  montoTotal: number
  tarifaAplicada: TarifaDinamica
  detalleCalculo: {
    tiempoTotal: number
    primeraHora: number
    horasAdicionales: number
    montoMinimo: number
    redondeoAplicado: boolean
  }
}> {
  try {
    // 1. Obtener configuración global
    const { data: config } = await supabaseAdmin
      .from('configuracion_pricing')
      .select('*')
      .single()

    // 2. Obtener tarifas activas para el tipo de vehículo
    const { data: tarifas } = await supabaseAdmin
      .from('tarifas_dinamicas')
      .select('*')
      .eq('tipo_vehiculo', tipoVehiculo)
      .eq('is_active', true)
      .order('prioridad', { ascending: false })

    if (!tarifas || tarifas.length === 0) {
      throw new Error(`No hay tarifas configuradas para ${tipoVehiculo}`)
    }

    // 3. Determinar qué tarifa aplicar
    const diaEntrada = horaEntrada.getDay() // 0=domingo, 1=lunes, etc.
    const horaEntradaStr = horaEntrada.toTimeString().slice(0, 5) // "HH:MM"
    
    const tarifaAplicable = tarifas.find(tarifa => 
      tarifa.dias_semana.includes(diaEntrada) &&
      horaEntradaStr >= tarifa.hora_inicio &&
      horaEntradaStr <= tarifa.hora_fin
    )

    if (!tarifaAplicable) {
      // Usar tarifa por defecto (la de mayor prioridad)
      // La primera en el array ya es la de mayor prioridad por el ORDER BY
    }

    const tarifa = tarifaAplicable || tarifas[0]

    // 4. Calcular tiempo total en minutos
    const tiempoTotalMs = horaSalida.getTime() - horaEntrada.getTime()
    let tiempoTotalMin = Math.floor(tiempoTotalMs / (1000 * 60))

    // 5. Aplicar tiempo de gracia
    const tiempoGracia = config?.tiempo_gracia_minutos || 15
    if (tiempoTotalMin <= tiempoGracia) {
      return {
        montoTotal: 0,
        tarifaAplicada: tarifa,
        detalleCalculo: {
          tiempoTotal: tiempoTotalMin,
          primeraHora: 0,
          horasAdicionales: 0,
          montoMinimo: 0,
          redondeoAplicado: false
        }
      }
    }

    // 6. Aplicar redondeo
    const redondeoMin = config?.redondeo_minutos || 15
    const redondeoAplicado = tiempoTotalMin % redondeoMin !== 0
    if (redondeoAplicado) {
      tiempoTotalMin = Math.ceil(tiempoTotalMin / redondeoMin) * redondeoMin
    }

    // 7. Calcular costo
    let montoTotal = 0
    
    // Primera hora
    const primeraHora = Math.min(tiempoTotalMin, 60)
    montoTotal += (primeraHora / 60) * tarifa.tarifa_primera_hora

    // Horas adicionales
    const minutosAdicionales = Math.max(0, tiempoTotalMin - 60)
    const horasAdicionales = minutosAdicionales / 60
    montoTotal += horasAdicionales * tarifa.tarifa_hora_adicional

    // 8. Aplicar mínimo y máximo
    montoTotal = Math.max(montoTotal, tarifa.tarifa_minima)
    if (tarifa.tarifa_maxima) {
      montoTotal = Math.min(montoTotal, tarifa.tarifa_maxima)
    }

    // 9. Redondear a centavos
    montoTotal = Math.round(montoTotal * 100) / 100

    return {
      montoTotal,
      tarifaAplicada: tarifa,
      detalleCalculo: {
        tiempoTotal: tiempoTotalMin,
        primeraHora,
        horasAdicionales: minutosAdicionales,
        montoMinimo: tarifa.tarifa_minima,
        redondeoAplicado
      }
    }

  } catch (error) {
    console.error('Error calculating parking cost:', error)
    throw error
  }
}

// GET: Obtener tarifas dinámicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const tipoVehiculo = searchParams.get('tipoVehiculo')

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

    // Construir query
    let query = supabaseAdmin
      .from('tarifas_dinamicas')
      .select('*')
      .order('prioridad', { ascending: false })

    if (tipoVehiculo) {
      query = query.eq('tipo_vehiculo', tipoVehiculo)
    }

    const { data: tarifas, error } = await query

    if (error) throw error

    // Obtener configuración global
    const { data: config } = await supabaseAdmin
      .from('configuracion_pricing')
      .select('*')
      .single()

    return NextResponse.json({
      tarifas: tarifas || [],
      configuracion: config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting pricing:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// POST: Crear nueva tarifa dinámica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      adminId,
      nombre,
      descripcion,
      tipoVehiculo,
      horaInicio,
      horaFin,
      diasSemana,
      tarifaPrimeraHora,
      tarifaHoraAdicional,
      tarifaMinima,
      tarifaMaxima,
      prioridad
    } = body

    // Verificar permisos
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

    // Validaciones
    if (!nombre || !tipoVehiculo || !horaInicio || !horaFin) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    if (!diasSemana || !Array.isArray(diasSemana) || diasSemana.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un día' },
        { status: 400 }
      )
    }

    if (tarifaPrimeraHora <= 0 || tarifaHoraAdicional <= 0 || tarifaMinima <= 0) {
      return NextResponse.json(
        { error: 'Las tarifas deben ser mayores a 0' },
        { status: 400 }
      )
    }

    // Crear tarifa
    const { data: nuevaTarifa, error } = await supabaseAdmin
      .from('tarifas_dinamicas')
      .insert({
        nombre,
        descripcion,
        tipo_vehiculo: tipoVehiculo,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        dias_semana: diasSemana,
        tarifa_primera_hora: tarifaPrimeraHora,
        tarifa_hora_adicional: tarifaHoraAdicional,
        tarifa_minima: tarifaMinima,
        tarifa_maxima: tarifaMaxima,
        is_active: true,
        prioridad: prioridad || 1,
        created_by: adminId
      })
      .select()
      .single()

    if (error) throw error

    // Registrar en auditoría
    await supabaseAdmin
      .from('auditoria_logs')
      .insert({
        usuario_id: adminId,
        accion_tipo: 'tarifa_modificada',
        tabla_afectada: 'tarifas_dinamicas',
        registro_id: nuevaTarifa.id,
        detalles: {
          accion: 'crear_tarifa',
          nombre,
          tipoVehiculo,
          tarifaPrimeraHora,
          tarifaHoraAdicional
        }
      })

    return NextResponse.json({
      tarifa: nuevaTarifa,
      message: 'Tarifa creada exitosamente'
    })

  } catch (error) {
    console.error('Error creating pricing:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// PUT: Actualizar tarifa existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      adminId,
      tarifaId,
      ...updateData
    } = body

    // Verificar permisos
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

    // Actualizar tarifa
    const { data: tarifaActualizada, error } = await supabaseAdmin
      .from('tarifas_dinamicas')
      .update({
        ...updateData,
        last_modified_by: adminId
      })
      .eq('id', tarifaId)
      .select()
      .single()

    if (error) throw error

    // Registrar en auditoría
    await supabaseAdmin
      .from('auditoria_logs')
      .insert({
        usuario_id: adminId,
        accion_tipo: 'tarifa_modificada',
        tabla_afectada: 'tarifas_dinamicas',
        registro_id: tarifaId,
        detalles: {
          accion: 'actualizar_tarifa',
          cambios: updateData
        }
      })

    return NextResponse.json({
      tarifa: tarifaActualizada,
      message: 'Tarifa actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error updating pricing:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}