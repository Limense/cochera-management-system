/**
 * =====================================================
 * API: CONTROL DE CAJA
 * =====================================================
 * Maneja apertura, cierre y consulta de turnos de caja
 * 
 * Endpoints:
 * - POST   /api/control-caja        → Abrir nuevo turno
 * - PATCH  /api/control-caja        → Cerrar turno activo
 * - GET    /api/control-caja        → Consultar turno actual
 * - GET    /api/control-caja?fecha=YYYY-MM-DD → Historial de fecha
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// =====================================================
// POST: ABRIR NUEVO TURNO
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empleado_id, dinero_inicial, observaciones } = body

    // Validaciones
    if (!empleado_id) {
      return NextResponse.json(
        { error: 'El ID del empleado es requerido' },
        { status: 400 }
      )
    }

    if (dinero_inicial === undefined || dinero_inicial < 0) {
      return NextResponse.json(
        { error: 'El dinero inicial debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    // Verificar que el empleado existe y está activo
    const { data: empleado, error: empleadoError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', empleado_id)
      .single()

    if (empleadoError || !empleado || !empleado.is_active) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      )
    }

    // Verificar que no haya turno abierto para este empleado hoy
    const fechaHoy = new Date().toISOString().split('T')[0]
    
    const { data: turnoExistente, error: turnoError } = await supabaseAdmin
      .from('control_caja')
      .select('*')
      .eq('empleado_id', empleado_id)
      .eq('fecha', fechaHoy)
      .eq('estado_turno', 'abierto')
      .single()

    if (turnoExistente) {
      return NextResponse.json(
        { 
          error: 'Ya existe un turno abierto para este empleado hoy',
          turno: turnoExistente
        },
        { status: 409 }
      )
    }

    // Crear nuevo turno
    const { data: nuevoTurno, error: insertError } = await supabaseAdmin
      .from('control_caja')
      .insert([{
        empleado_id,
        fecha: fechaHoy,
        hora_apertura: new Date().toISOString(),
        dinero_inicial: parseFloat(dinero_inicial),
        estado_turno: 'abierto',
        observaciones: observaciones || null
      }])
      .select(`
        *,
        empleado:profiles(id, full_name, email, role)
      `)
      .single()

    if (insertError) {
      console.error('Error insertando turno:', insertError)
      return NextResponse.json(
        { error: `Error al abrir turno: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Registrar en auditoría
    await supabaseAdmin
      .from('auditoria_logs')
      .insert([{
        usuario_id: empleado_id,
        accion_tipo: 'caja_abierta',
        tabla_afectada: 'control_caja',
        registro_id: nuevoTurno.id,
        detalles: {
          dinero_inicial,
          observaciones
        }
      }])

    return NextResponse.json({
      success: true,
      message: 'Turno abierto exitosamente',
      turno: nuevoTurno
    })

  } catch (error) {
    console.error('Error en POST /api/control-caja:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// =====================================================
// PATCH: CERRAR TURNO ACTIVO
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { turno_id, dinero_final, observaciones } = body

    // Validaciones
    if (!turno_id) {
      return NextResponse.json(
        { error: 'El ID del turno es requerido' },
        { status: 400 }
      )
    }

    if (dinero_final === undefined || dinero_final < 0) {
      return NextResponse.json(
        { error: 'El dinero final debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    // Obtener turno actual
    const { data: turno, error: turnoError } = await supabaseAdmin
      .from('control_caja')
      .select('*, empleado:profiles(id, full_name)')
      .eq('id', turno_id)
      .single()

    if (turnoError || !turno) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    if (turno.estado_turno === 'cerrado') {
      return NextResponse.json(
        { error: 'Este turno ya está cerrado' },
        { status: 409 }
      )
    }

    // Calcular ingresos del día desde sesiones de parqueo
    const fechaHoy = new Date().toISOString().split('T')[0]
    
    const { data: sesionesHoy, error: sesionesError } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select('monto_calculado, estado_pago, metodo_pago')
      .gte('hora_salida', `${fechaHoy}T00:00:00`)
      .lte('hora_salida', `${fechaHoy}T23:59:59`)
      .eq('estado_pago', 'pagado')

    if (sesionesError) {
      console.error('Error consultando sesiones:', sesionesError)
    }

    // Calcular total de ingresos
    const totalIngresos = sesionesHoy?.reduce((sum, sesion) => {
      return sum + (parseFloat(sesion.monto_calculado || '0'))
    }, 0) || 0

    // Dinero esperado = dinero inicial + ingresos del día
    const dineroEsperado = parseFloat(turno.dinero_inicial) + totalIngresos

    // Actualizar turno (diferencia se calcula automáticamente por GENERATED COLUMN)
    const { data: turnoCerrado, error: updateError } = await supabaseAdmin
      .from('control_caja')
      .update({
        hora_cierre: new Date().toISOString(),
        dinero_final: parseFloat(dinero_final),
        dinero_esperado: dineroEsperado,
        estado_turno: 'cerrado',
        observaciones: observaciones || turno.observaciones
      })
      .eq('id', turno_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error cerrando turno:', updateError)
      return NextResponse.json(
        { error: `Error al cerrar turno: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Registrar en auditoría
    await supabaseAdmin
      .from('auditoria_logs')
      .insert([{
        usuario_id: turno.empleado_id,
        accion_tipo: 'caja_cerrada',
        tabla_afectada: 'control_caja',
        registro_id: turno_id,
        monto: totalIngresos,
        detalles: {
          dinero_inicial: turno.dinero_inicial,
          dinero_final: parseFloat(dinero_final),
          dinero_esperado: dineroEsperado,
          diferencia: parseFloat(dinero_final) - dineroEsperado,
          total_ingresos: totalIngresos,
          observaciones
        }
      }])

    // Calcular estadísticas de sesiones
    const estadisticas = {
      total_vehiculos: sesionesHoy?.length || 0,
      total_ingresos: totalIngresos,
      efectivo: sesionesHoy?.filter(s => s.metodo_pago === 'efectivo').length || 0,
      tarjeta: sesionesHoy?.filter(s => s.metodo_pago === 'tarjeta').length || 0,
      yape: sesionesHoy?.filter(s => s.metodo_pago === 'yape').length || 0,
      plin: sesionesHoy?.filter(s => s.metodo_pago === 'plin').length || 0
    }

    return NextResponse.json({
      success: true,
      message: 'Turno cerrado exitosamente',
      turno: turnoCerrado,
      estadisticas,
      cuadre: {
        dinero_inicial: parseFloat(turno.dinero_inicial),
        ingresos_del_dia: totalIngresos,
        dinero_esperado: dineroEsperado,
        dinero_final: parseFloat(dinero_final),
        diferencia: parseFloat(dinero_final) - dineroEsperado
      }
    })

  } catch (error) {
    console.error('Error en PATCH /api/control-caja:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET: CONSULTAR TURNO ACTUAL O HISTORIAL
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const empleado_id = searchParams.get('empleado_id')
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]
    const historial = searchParams.get('historial') === 'true'

    // Si solicita historial
    if (historial && empleado_id) {
      const { data: turnos, error } = await supabaseAdmin
        .from('control_caja')
        .select(`
          *,
          empleado:profiles(id, full_name, email, role)
        `)
        .eq('empleado_id', empleado_id)
        .order('fecha', { ascending: false })
        .order('hora_apertura', { ascending: false })
        .limit(30)

      if (error) {
        return NextResponse.json(
          { error: `Error consultando historial: ${error.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        turnos
      })
    }

    // Consultar turno actual del día
    let query = supabaseAdmin
      .from('control_caja')
      .select(`
        *,
        empleado:profiles(id, full_name, email, role)
      `)
      .eq('fecha', fecha)

    if (empleado_id) {
      query = query.eq('empleado_id', empleado_id)
    }

    const { data: turnos, error } = await query
      .order('hora_apertura', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: `Error consultando turnos: ${error.message}` },
        { status: 500 }
      )
    }

    // Si hay un turno abierto, calcular ingresos en tiempo real
    const turnoAbierto = turnos?.find(t => t.estado_turno === 'abierto')
    
    if (turnoAbierto) {
      const { data: sesionesHoy } = await supabaseAdmin
        .from('sesiones_parqueo')
        .select('monto_calculado, estado_pago, metodo_pago')
        .gte('hora_salida', `${fecha}T00:00:00`)
        .lte('hora_salida', `${fecha}T23:59:59`)
        .eq('estado_pago', 'pagado')

      const ingresosActuales = sesionesHoy?.reduce((sum, sesion) => {
        return sum + (parseFloat(sesion.monto_calculado || '0'))
      }, 0) || 0

      turnoAbierto.ingresos_actuales = ingresosActuales
      turnoAbierto.dinero_esperado_actual = parseFloat(turnoAbierto.dinero_inicial) + ingresosActuales
      turnoAbierto.total_vehiculos_hoy = sesionesHoy?.length || 0
    }

    return NextResponse.json({
      success: true,
      turno_actual: turnoAbierto || null,
      turnos
    })

  } catch (error) {
    console.error('Error en GET /api/control-caja:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
