import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'

// Schema de validación para espacios
const espacioSchema = z.object({
  numero: z.number().min(1).max(45),
  estado: z.enum(['disponible', 'ocupado', 'mantenimiento']),
  tipo: z.enum(['auto', 'moto', 'mixto']),
  ubicacion: z.string().optional(),
  tarifa_auto: z.number().min(0).default(6.00),
  tarifa_moto: z.number().min(0).default(3.00),
  maintenance_notes: z.string().optional()
})

const updateEspacioSchema = espacioSchema.partial().omit({ numero: true })

// GET - Obtener todos los espacios con su estado actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeActive = searchParams.get('include_active') === 'true'

    // Obtener espacios
    const { data: espacios, error: espaciosError } = await supabase
      .from('espacios')
      .select('*')
      .order('numero', { ascending: true })

    if (espaciosError) {
      throw new Error(`Error obteniendo espacios: ${espaciosError.message}`)
    }

    // Si se solicita, incluir sesiones activas
    if (includeActive) {
      const { data: sesionesActivas, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select(`
          *,
          vehiculos!inner(placa, propietario, telefono, color, marca)
        `)
        .eq('is_active', true)

      if (sesionesError) {
        console.warn('Error obteniendo sesiones activas:', sesionesError.message)
      }

      // Combinar datos
      const espaciosConEstado = espacios.map(espacio => {
        const sesionActiva = sesionesActivas?.find(s => s.espacio_numero === espacio.numero)
        return {
          ...espacio,
          sesion_activa: sesionActiva || null,
          ocupado_por: sesionActiva?.placa || null,
          tiempo_ocupado: sesionActiva ? 
            Math.floor((new Date().getTime() - new Date(sesionActiva.hora_entrada).getTime()) / (1000 * 60)) 
            : null
        }
      })

      return NextResponse.json({
        data: espaciosConEstado,
        message: 'Espacios obtenidos con estado exitosamente',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      data: espacios,
      message: 'Espacios obtenidos exitosamente',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en GET /api/espacios:', error)
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

// POST - Crear nuevo espacio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = espacioSchema.parse(body)

    // Verificar que el número de espacio no existe
    const { data: existingSpace, error: checkError } = await supabase
      .from('espacios')
      .select('numero')
      .eq('numero', validatedData.numero)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error verificando espacio existente: ${checkError.message}`)
    }

    if (existingSpace) {
      return NextResponse.json(
        { 
          error: 'Espacio ya existe',
          message: `El espacio número ${validatedData.numero} ya está registrado`,
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Crear el espacio
    const { data: nuevoEspacio, error: insertError } = await supabase
      .from('espacios')
      .insert(validatedData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error creando espacio: ${insertError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: 'espacio_creado',
      tabla_afectada: 'espacios',
      registro_id: nuevoEspacio.id,
      detalles: {
        numero: validatedData.numero,
        estado: validatedData.estado,
        tipo: validatedData.tipo
      }
    })

    return NextResponse.json({
      data: nuevoEspacio,
      message: `Espacio ${validatedData.numero} creado exitosamente`,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/espacios:', error)
    
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

// PUT - Actualizar espacio existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del espacio es obligatorio para actualizar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const validatedData = updateEspacioSchema.parse(updateData)

    // Verificar que el espacio existe
    const { data: existingSpace, error: checkError } = await supabase
      .from('espacios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingSpace) {
      return NextResponse.json(
        { 
          error: 'Espacio no encontrado',
          message: `No se encontró un espacio con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Si se está cambiando a mantenimiento y hay sesión activa, no permitir
    if (validatedData.estado === 'mantenimiento') {
      const { data: sesionActiva } = await supabase
        .from('sesiones_parqueo')
        .select('id')
        .eq('espacio_numero', existingSpace.numero)
        .eq('is_active', true)
        .single()

      if (sesionActiva) {
        return NextResponse.json(
          { 
            error: 'Espacio ocupado',
            message: 'No se puede poner en mantenimiento un espacio ocupado',
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        )
      }
    }

    // Actualizar el espacio
    const { data: espacioActualizado, error: updateError } = await supabase
      .from('espacios')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error actualizando espacio: ${updateError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: validatedData.estado === 'mantenimiento' ? 'espacio_mantenimiento' : 'espacio_actualizado',
      tabla_afectada: 'espacios',
      registro_id: id,
      detalles: {
        cambios: validatedData,
        estado_anterior: existingSpace.estado,
        estado_nuevo: validatedData.estado
      }
    })

    return NextResponse.json({
      data: espacioActualizado,
      message: `Espacio ${existingSpace.numero} actualizado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en PUT /api/espacios:', error)
    
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

// DELETE - Eliminar espacio (solo si no tiene sesiones)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del espacio es obligatorio para eliminar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Verificar que el espacio existe
    const { data: existingSpace, error: checkError } = await supabase
      .from('espacios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingSpace) {
      return NextResponse.json(
        { 
          error: 'Espacio no encontrado',
          message: `No se encontró un espacio con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Verificar que no tenga sesiones asociadas
    const { data: sesiones, error: sesionesError } = await supabase
      .from('sesiones_parqueo')
      .select('id')
      .eq('espacio_numero', existingSpace.numero)
      .limit(1)

    if (sesionesError) {
      throw new Error(`Error verificando sesiones: ${sesionesError.message}`)
    }

    if (sesiones && sesiones.length > 0) {
      return NextResponse.json(
        { 
          error: 'Espacio con historial',
          message: 'No se puede eliminar un espacio que tiene sesiones registradas',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Eliminar el espacio
    const { error: deleteError } = await supabase
      .from('espacios')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Error eliminando espacio: ${deleteError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: 'espacio_eliminado',
      tabla_afectada: 'espacios',
      registro_id: id,
      detalles: {
        numero: existingSpace.numero,
        estado: existingSpace.estado,
        tipo: existingSpace.tipo
      }
    })

    return NextResponse.json({
      message: `Espacio ${existingSpace.numero} eliminado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en DELETE /api/espacios:', error)
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