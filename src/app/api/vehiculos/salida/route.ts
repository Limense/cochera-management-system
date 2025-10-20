import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con service role para operaciones de servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/vehiculos/salida
 * Procesa la salida de un vehículo y calcula el cobro
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sesion_id, metodo_pago, monto_cobrado } = body

    // Validaciones
    if (!sesion_id) {
      return NextResponse.json(
        { error: 'sesion_id es requerido' },
        { status: 400 }
      )
    }

    if (!metodo_pago) {
      return NextResponse.json(
        { error: 'metodo_pago es requerido' },
        { status: 400 }
      )
    }

    // 1. Obtener la sesión activa
    const { data: sesion, error: sesionError } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select('*')
      .eq('id', sesion_id)
      .eq('is_active', true)
      .single()

    if (sesionError || !sesion) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o ya finalizada' },
        { status: 404 }
      )
    }

    // 2. Calcular tarifa usando la función SQL
    const { data: tarifaCalculada, error: tarifaError } = await supabaseAdmin
      .rpc('calcular_tarifa', {
        tipo_vehiculo: sesion.tipo_vehiculo,
        hora_entrada: sesion.hora_entrada,
        hora_salida: new Date().toISOString()
      })

    if (tarifaError) {
      console.error('Error calculando tarifa:', tarifaError)
      return NextResponse.json(
        { error: 'Error calculando tarifa' },
        { status: 500 }
      )
    }

    const monto_final = monto_cobrado || tarifaCalculada

    // 3. Actualizar sesión de parqueo (cerrar sesión)
    const { error: updateError } = await supabaseAdmin
      .from('sesiones_parqueo')
      .update({
        hora_salida: new Date().toISOString(),
        monto_calculado: monto_final,
        estado_pago: 'pagado',
        metodo_pago: metodo_pago
      })
      .eq('id', sesion_id)

    if (updateError) {
      console.error('Error actualizando sesión:', updateError)
      return NextResponse.json(
        { error: 'Error procesando salida' },
        { status: 500 }
      )
    }

    // 4. Actualizar estado del espacio a disponible
    const { error: espacioError } = await supabaseAdmin
      .from('espacios')
      .update({ 
        estado: 'disponible',
        last_occupied_at: new Date().toISOString()
      })
      .eq('numero', sesion.espacio_numero)

    if (espacioError) {
      console.error('Error liberando espacio:', espacioError)
      // No lanzamos error porque la sesión ya se cerró
    }

    // 5. Registrar en auditoría
    try {
      await supabaseAdmin
        .from('auditoria_logs')
        .insert({
          usuario_id: sesion.processed_by || null,
          accion_tipo: 'salida_vehiculo',
          tabla_afectada: 'sesiones_parqueo',
          registro_id: sesion_id,
          detalles: {
            placa: sesion.placa,
            espacio_numero: sesion.espacio_numero,
            monto_cobrado: monto_final,
            metodo_pago: metodo_pago
          },
          monto: monto_final
        })
    } catch (auditError) {
      console.error('Error en auditoría (no crítico):', auditError)
    }

    // 6. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Salida procesada exitosamente',
      data: {
        sesion_id: sesion_id,
        placa: sesion.placa,
        espacio_numero: sesion.espacio_numero,
        hora_entrada: sesion.hora_entrada,
        hora_salida: new Date().toISOString(),
        monto_calculado: tarifaCalculada,
        monto_cobrado: monto_final,
        metodo_pago: metodo_pago
      }
    })

  } catch (error) {
    console.error('Error en /api/vehiculos/salida:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vehiculos/salida?placa=ABC123
 * Busca sesiones activas por placa para preparar la salida
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placa = searchParams.get('placa')

    if (!placa) {
      return NextResponse.json(
        { error: 'Parámetro placa es requerido' },
        { status: 400 }
      )
    }

    // Buscar sesión activa
    const { data: sesiones, error } = await supabaseAdmin
      .from('sesiones_parqueo')
      .select(`
        *,
        espacios:espacio_numero (numero, estado)
      `)
      .eq('placa', placa.toUpperCase())
      .eq('is_active', true)

    if (error) {
      console.error('Error buscando sesión:', error)
      return NextResponse.json(
        { error: 'Error buscando vehículo' },
        { status: 500 }
      )
    }

    if (!sesiones || sesiones.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró vehículo activo con esa placa' },
        { status: 404 }
      )
    }

    const sesion = sesiones[0]

    // Calcular tarifa estimada
    const { data: tarifaEstimada } = await supabaseAdmin
      .rpc('calcular_tarifa', {
        tipo_vehiculo: sesion.tipo_vehiculo,
        hora_entrada: sesion.hora_entrada,
        hora_salida: new Date().toISOString()
      })

    // Calcular tiempo transcurrido
    const entrada = new Date(sesion.hora_entrada)
    const ahora = new Date()
    const tiempoMs = ahora.getTime() - entrada.getTime()
    const horas = Math.floor(tiempoMs / (1000 * 60 * 60))
    const minutos = Math.floor((tiempoMs % (1000 * 60 * 60)) / (1000 * 60))

    return NextResponse.json({
      success: true,
      data: {
        sesion_id: sesion.id,
        placa: sesion.placa,
        tipo_vehiculo: sesion.tipo_vehiculo,
        espacio_numero: sesion.espacio_numero,
        hora_entrada: sesion.hora_entrada,
        tiempo_transcurrido: `${horas}h ${minutos}m`,
        tarifa_estimada: tarifaEstimada,
        puede_salir: true
      }
    })

  } catch (error) {
    console.error('Error en GET /api/vehiculos/salida:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
