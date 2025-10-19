import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'

// Schema de validación para vehículos
const vehiculoSchema = z.object({
  placa: z.string()
    .min(6, 'La placa debe tener al menos 6 caracteres')
    .max(10, 'La placa no puede tener más de 10 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'La placa solo puede contener letras mayúsculas, números y guiones'),
  propietario: z.string()
    .min(2, 'El nombre del propietario debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  telefono: z.string()
    .regex(/^[0-9\-\+\(\)\s]+$/, 'El teléfono solo puede contener números, espacios y símbolos de formato')
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(20, 'El teléfono no puede tener más de 20 caracteres'),
  color: z.string()
    .min(2, 'El color debe tener al menos 2 caracteres')
    .max(30, 'El color no puede tener más de 30 caracteres'),
  marca: z.string()
    .min(2, 'La marca debe tener al menos 2 caracteres')
    .max(50, 'La marca no puede tener más de 50 caracteres'),
  modelo: z.string()
    .min(1, 'El modelo es obligatorio')
    .max(50, 'El modelo no puede tener más de 50 caracteres')
    .optional(),
  tipo: z.enum(['auto', 'moto', 'camioneta', 'otro']).default('auto'),
  notas: z.string().max(500, 'Las notas no pueden tener más de 500 caracteres').optional(),
  is_frequent: z.boolean().default(false)
})

const updateVehiculoSchema = vehiculoSchema.partial().omit({ placa: true })

// GET - Obtener todos los vehículos con estadísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('include_stats') === 'true'
    const includeActive = searchParams.get('include_active') === 'true'
    const frequent = searchParams.get('frequent')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')

    let query = supabase
      .from('vehiculos')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtros
    if (frequent === 'true') {
      query = query.eq('is_frequent', true)
    }

    if (search) {
      query = query.or(`placa.ilike.%${search}%,propietario.ilike.%${search}%,marca.ilike.%${search}%`)
    }

    if (limit && !isNaN(parseInt(limit))) {
      query = query.limit(parseInt(limit))
    }

    const { data: vehiculos, error: vehiculosError } = await query

    if (vehiculosError) {
      throw new Error(`Error obteniendo vehículos: ${vehiculosError.message}`)
    }

    // Si se solicitan estadísticas, calcularlas
    if (includeStats) {
      const vehiculosConStats = await Promise.all(vehiculos.map(async (vehiculo) => {
        // Obtener estadísticas de sesiones
        const { data: estadisticas, error: statsError } = await supabase
          .rpc('get_vehicle_stats', { vehicle_plate: vehiculo.placa })

        if (statsError) {
          console.warn(`Error obteniendo estadísticas para ${vehiculo.placa}:`, statsError.message)
        }

        return {
          ...vehiculo,
          estadisticas: estadisticas || {
            total_sesiones: 0,
            tiempo_total_minutos: 0,
            monto_total: 0,
            ultima_visita: null,
            promedio_estancia: 0
          }
        }
      }))

      return NextResponse.json({
        data: vehiculosConStats,
        message: 'Vehículos obtenidos con estadísticas exitosamente',
        timestamp: new Date().toISOString()
      })
    }

    // Si se solicita estado activo
    if (includeActive) {
      const vehiculosConEstado = await Promise.all(vehiculos.map(async (vehiculo) => {
        const { data: sesionActiva } = await supabase
          .from('sesiones_parqueo')
          .select(`
            *,
            espacios!inner(numero)
          `)
          .eq('placa', vehiculo.placa)
          .eq('is_active', true)
          .single()

        return {
          ...vehiculo,
          sesion_activa: sesionActiva || null,
          estacionado_en: sesionActiva?.espacios?.numero || null,
          tiempo_estacionado: sesionActiva ? 
            Math.floor((new Date().getTime() - new Date(sesionActiva.hora_entrada).getTime()) / (1000 * 60))
            : null
        }
      }))

      return NextResponse.json({
        data: vehiculosConEstado,
        message: 'Vehículos obtenidos con estado exitosamente',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      data: vehiculos,
      message: 'Vehículos obtenidos exitosamente',
      count: vehiculos.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en GET /api/vehiculos:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST - Registrar nuevo vehículo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = vehiculoSchema.parse(body)

    // Convertir placa a mayúsculas y limpiar espacios
    validatedData.placa = validatedData.placa.toUpperCase().trim()

    // Verificar que la placa no existe
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehiculos')
      .select('placa')
      .eq('placa', validatedData.placa)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error verificando vehículo existente: ${checkError.message}`)
    }

    if (existingVehicle) {
      return NextResponse.json(
        { 
          error: 'Vehículo ya existe',
          message: `El vehículo con placa ${validatedData.placa} ya está registrado`,
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Crear el vehículo
    const { data: nuevoVehiculo, error: insertError } = await supabase
      .from('vehiculos')
      .insert(validatedData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error registrando vehículo: ${insertError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: 'vehiculo_registrado',
      tabla_afectada: 'vehiculos',
      registro_id: nuevoVehiculo.id,
      detalles: {
        placa: validatedData.placa,
        propietario: validatedData.propietario,
        tipo: validatedData.tipo,
        is_frequent: validatedData.is_frequent
      }
    })

    return NextResponse.json({
      data: nuevoVehiculo,
      message: `Vehículo ${validatedData.placa} registrado exitosamente`,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/vehiculos:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          message: 'Los datos enviados no cumplen con el formato requerido',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar vehículo existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del vehículo es obligatorio para actualizar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const validatedData = updateVehiculoSchema.parse(updateData)

    // Verificar que el vehículo existe
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { 
          error: 'Vehículo no encontrado',
          message: `No se encontró un vehículo con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Actualizar el vehículo
    const { data: vehiculoActualizado, error: updateError } = await supabase
      .from('vehiculos')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error actualizando vehículo: ${updateError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: validatedData.is_frequent !== undefined ? 'vehiculo_frequent_updated' : 'vehiculo_actualizado',
      tabla_afectada: 'vehiculos',
      registro_id: id,
      detalles: {
        placa: existingVehicle.placa,
        cambios: validatedData,
        propietario_anterior: existingVehicle.propietario,
        propietario_nuevo: validatedData.propietario || existingVehicle.propietario
      }
    })

    return NextResponse.json({
      data: vehiculoActualizado,
      message: `Vehículo ${existingVehicle.placa} actualizado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en PUT /api/vehiculos:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          message: 'Los datos enviados no cumplen con el formato requerido',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar vehículo (solo si no tiene sesiones activas)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const force = searchParams.get('force') === 'true'

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del vehículo es obligatorio para eliminar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Verificar que el vehículo existe
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { 
          error: 'Vehículo no encontrado',
          message: `No se encontró un vehículo con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Verificar que no tenga sesiones activas
    const { data: sesionActiva } = await supabase
      .from('sesiones_parqueo')
      .select('id')
      .eq('placa', existingVehicle.placa)
      .eq('is_active', true)
      .single()

    if (sesionActiva) {
      return NextResponse.json(
        { 
          error: 'Vehículo en uso',
          message: 'No se puede eliminar un vehículo que tiene una sesión activa',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Si no es forzado y tiene historial, no permitir
    if (!force) {
      const { data: sesiones, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select('id')
        .eq('placa', existingVehicle.placa)
        .limit(1)

      if (sesionesError) {
        throw new Error(`Error verificando historial: ${sesionesError.message}`)
      }

      if (sesiones && sesiones.length > 0) {
        return NextResponse.json(
          { 
            error: 'Vehículo con historial',
            message: 'No se puede eliminar un vehículo que tiene historial de sesiones. Use force=true para eliminar de todas formas.',
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        )
      }
    }

    // Eliminar el vehículo
    const { error: deleteError } = await supabase
      .from('vehiculos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Error eliminando vehículo: ${deleteError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: force ? 'vehiculo_eliminado_forzado' : 'vehiculo_eliminado',
      tabla_afectada: 'vehiculos',
      registro_id: id,
      detalles: {
        placa: existingVehicle.placa,
        propietario: existingVehicle.propietario,
        tipo: existingVehicle.tipo,
        forzado: force
      }
    })

    return NextResponse.json({
      message: `Vehículo ${existingVehicle.placa} eliminado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en DELETE /api/vehiculos:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}