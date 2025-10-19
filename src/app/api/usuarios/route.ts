import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Schema de validación para usuarios
const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede tener más de 100 caracteres'),
  telefono: z.string()
    .regex(/^[0-9\-\+\(\)\s]+$/, 'El teléfono solo puede contener números y símbolos de formato')
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(20, 'El teléfono no puede tener más de 20 caracteres')
    .optional(),
  rol: z.enum(['admin', 'operator', 'viewer']).default('operator'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  is_active: z.boolean().default(true),
  permissions: z.object({
    can_manage_spaces: z.boolean().default(false),
    can_manage_vehicles: z.boolean().default(false),
    can_manage_sessions: z.boolean().default(true),
    can_view_reports: z.boolean().default(false),
    can_manage_users: z.boolean().default(false),
    can_manage_pricing: z.boolean().default(false)
  }).optional()
})

const updateUsuarioSchema = usuarioSchema.partial().omit({ email: true, password: true })

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Contraseña actual requerida'),
  new_password: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número')
})

// GET - Obtener todos los usuarios (sin contraseñas)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const rol = searchParams.get('rol')
    const search = searchParams.get('search')

    let query = supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, telefono, rol, is_active, permissions, created_at, updated_at, last_login')
      .order('created_at', { ascending: false })

    // Filtros
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (rol) {
      query = query.eq('rol', rol)
    }

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: usuarios, error } = await query

    if (error) {
      throw new Error(`Error obteniendo usuarios: ${error.message}`)
    }

    // Obtener estadísticas adicionales para cada usuario
    const usuariosConStats = await Promise.all((usuarios || []).map(async (usuario) => {
      // Contar sesiones creadas por este usuario (si aplica)
      const { count: sesionesCreadas } = await supabase
        .from('sesiones_parqueo')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', usuario.id)

      return {
        ...usuario,
        total_sesiones_creadas: sesionesCreadas || 0,
        ultimo_acceso: usuario.last_login ? new Date(usuario.last_login).toLocaleDateString() : 'Nunca'
      }
    }))

    return NextResponse.json({
      data: usuariosConStats,
      message: 'Usuarios obtenidos exitosamente',
      count: usuariosConStats.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en GET /api/usuarios:', error)
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

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = usuarioSchema.parse(body)

    // Verificar que el email no existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('email')
      .eq('email', validatedData.email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error verificando usuario existente: ${checkError.message}`)
    }

    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'Usuario ya existe',
          message: `Ya existe un usuario con el email ${validatedData.email}`,
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Configurar permisos por defecto según el rol
    let permissions = validatedData.permissions || {}
    
    switch (validatedData.rol) {
      case 'admin':
        permissions = {
          can_manage_spaces: true,
          can_manage_vehicles: true,
          can_manage_sessions: true,
          can_view_reports: true,
          can_manage_users: true,
          can_manage_pricing: true
        }
        break
      case 'operator':
        permissions = {
          can_manage_spaces: false,
          can_manage_vehicles: true,
          can_manage_sessions: true,
          can_view_reports: false,
          can_manage_users: false,
          can_manage_pricing: false
        }
        break
      case 'viewer':
        permissions = {
          can_manage_spaces: false,
          can_manage_vehicles: false,
          can_manage_sessions: false,
          can_view_reports: true,
          can_manage_users: false,
          can_manage_pricing: false
        }
        break
    }

    // Crear el usuario
    const { data: nuevoUsuario, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        ...validatedData,
        email: validatedData.email.toLowerCase(),
        password_hash: hashedPassword,
        permissions
      })
      .select('id, email, nombre, apellido, telefono, rol, is_active, permissions, created_at')
      .single()

    if (insertError) {
      throw new Error(`Error creando usuario: ${insertError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: 'usuario_creado',
      tabla_afectada: 'usuarios',
      registro_id: nuevoUsuario.id,
      detalles: {
        email: validatedData.email,
        nombre: validatedData.nombre,
        apellido: validatedData.apellido,
        rol: validatedData.rol
      }
    })

    return NextResponse.json({
      data: nuevoUsuario,
      message: `Usuario ${validatedData.email} creado exitosamente`,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/usuarios:', error)
    
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

// PUT - Actualizar usuario existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, change_password, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del usuario es obligatorio para actualizar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingUser) {
      return NextResponse.json(
        { 
          error: 'Usuario no encontrado',
          message: `No se encontró un usuario con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Si es cambio de contraseña
    if (change_password) {
      const passwordData = changePasswordSchema.parse(change_password)
      
      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(passwordData.current_password, existingUser.password_hash)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { 
            error: 'Contraseña incorrecta',
            message: 'La contraseña actual no es correcta',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        )
      }

      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(passwordData.new_password, 12)
      
      // Actualizar solo la contraseña
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        throw new Error(`Error actualizando contraseña: ${updateError.message}`)
      }

      // Log de auditoría
      await supabase.from('auditoria_logs').insert({
        accion_tipo: 'password_changed',
        tabla_afectada: 'usuarios',
        registro_id: id,
        detalles: {
          email: existingUser.email,
          changed_by: id // En un sistema real, sería el ID del usuario que hace el cambio
        }
      })

      return NextResponse.json({
        message: 'Contraseña actualizada exitosamente',
        timestamp: new Date().toISOString()
      })
    }

    // Actualización regular del usuario
    const validatedData = updateUsuarioSchema.parse(updateData)

    // Si se cambia el rol, actualizar permisos automáticamente
    if (validatedData.rol && validatedData.rol !== existingUser.rol) {
      let newPermissions = {}
      
      switch (validatedData.rol) {
        case 'admin':
          newPermissions = {
            can_manage_spaces: true,
            can_manage_vehicles: true,
            can_manage_sessions: true,
            can_view_reports: true,
            can_manage_users: true,
            can_manage_pricing: true
          }
          break
        case 'operator':
          newPermissions = {
            can_manage_spaces: false,
            can_manage_vehicles: true,
            can_manage_sessions: true,
            can_view_reports: false,
            can_manage_users: false,
            can_manage_pricing: false
          }
          break
        case 'viewer':
          newPermissions = {
            can_manage_spaces: false,
            can_manage_vehicles: false,
            can_manage_sessions: false,
            can_view_reports: true,
            can_manage_users: false,
            can_manage_pricing: false
          }
          break
      }
      
      validatedData.permissions = { ...existingUser.permissions, ...newPermissions }
    }

    // Actualizar el usuario
    const { data: usuarioActualizado, error: updateError } = await supabase
      .from('usuarios')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, nombre, apellido, telefono, rol, is_active, permissions, created_at, updated_at')
      .single()

    if (updateError) {
      throw new Error(`Error actualizando usuario: ${updateError.message}`)
    }

    // Log de auditoría
    await supabase.from('auditoria_logs').insert({
      accion_tipo: validatedData.is_active === false ? 'usuario_desactivado' : 'usuario_actualizado',
      tabla_afectada: 'usuarios',
      registro_id: id,
      detalles: {
        email: existingUser.email,
        cambios: validatedData,
        rol_anterior: existingUser.rol,
        rol_nuevo: validatedData.rol || existingUser.rol
      }
    })

    return NextResponse.json({
      data: usuarioActualizado,
      message: `Usuario ${existingUser.email} actualizado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en PUT /api/usuarios:', error)
    
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

// DELETE - Eliminar usuario (desactivar, no eliminar físicamente)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const permanent = searchParams.get('permanent') === 'true'

    if (!id) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del usuario es obligatorio para eliminar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingUser) {
      return NextResponse.json(
        { 
          error: 'Usuario no encontrado',
          message: `No se encontró un usuario con ID ${id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Verificar que no es el último admin
    if (existingUser.rol === 'admin') {
      const { count: adminCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'admin')
        .eq('is_active', true)

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { 
            error: 'Último administrador',
            message: 'No se puede eliminar el último administrador del sistema',
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        )
      }
    }

    if (permanent) {
      // Eliminación física (solo si no tiene registros relacionados)
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(`Error eliminando usuario: ${deleteError.message}`)
      }

      // Log de auditoría
      await supabase.from('auditoria_logs').insert({
        accion_tipo: 'usuario_eliminado_permanente',
        tabla_afectada: 'usuarios',
        registro_id: id,
        detalles: {
          email: existingUser.email,
          nombre: existingUser.nombre,
          apellido: existingUser.apellido,
          rol: existingUser.rol
        }
      })

      return NextResponse.json({
        message: `Usuario ${existingUser.email} eliminado permanentemente`,
        timestamp: new Date().toISOString()
      })
    } else {
      // Desactivación (soft delete)
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        throw new Error(`Error desactivando usuario: ${updateError.message}`)
      }

      // Log de auditoría
      await supabase.from('auditoria_logs').insert({
        accion_tipo: 'usuario_desactivado',
        tabla_afectada: 'usuarios',
        registro_id: id,
        detalles: {
          email: existingUser.email,
          nombre: existingUser.nombre,
          apellido: existingUser.apellido,
          rol: existingUser.rol
        }
      })

      return NextResponse.json({
        message: `Usuario ${existingUser.email} desactivado exitosamente`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error en DELETE /api/usuarios:', error)
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