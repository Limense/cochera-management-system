import { NextRequest, NextResponse } from 'next/server'import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@supabase/supabase-js'import { supabase } from '@/lib/supabase/client'

import { z } from 'zod'import { z } from 'zod'

import bcrypt from 'bcryptjs'

// Cliente admin de Supabase

const supabaseAdmin = createClient(// Schema de validación para usuarios

  process.env.NEXT_PUBLIC_SUPABASE_URL!,const usuarioSchema = z.object({

  process.env.SUPABASE_SERVICE_ROLE_KEY!,  email: z.string().email('Email inválido'),

  {  nombre: z.string()

    auth: {    .min(2, 'El nombre debe tener al menos 2 caracteres')

      autoRefreshToken: false,    .max(100, 'El nombre no puede tener más de 100 caracteres'),

      persistSession: false  apellido: z.string()

    }    .min(2, 'El apellido debe tener al menos 2 caracteres')

  }    .max(100, 'El apellido no puede tener más de 100 caracteres'),

)  telefono: z.string()

    .regex(/^[0-9\-\+\(\)\s]+$/, 'El teléfono solo puede contener números y símbolos de formato')

// Schemas de validación    .min(8, 'El teléfono debe tener al menos 8 dígitos')

const createUserSchema = z.object({    .max(20, 'El teléfono no puede tener más de 20 caracteres')

  email: z.string().email('Email inválido'),    .optional(),

  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),  rol: z.enum(['admin', 'operator', 'viewer']).default('operator'),

  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),  password: z.string()

  role: z.enum(['admin', 'supervisor']).default('supervisor'),    .min(8, 'La contraseña debe tener al menos 8 caracteres')

  created_by: z.string().uuid().optional()    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'),

})  is_active: z.boolean().default(true),

  permissions: z.object({

const updateUserSchema = z.object({    can_manage_spaces: z.boolean().default(false),

  id: z.string().uuid('ID inválido'),    can_manage_vehicles: z.boolean().default(false),

  full_name: z.string().min(2).optional(),    can_manage_sessions: z.boolean().default(true),

  role: z.enum(['admin', 'supervisor']).optional(),    can_view_reports: z.boolean().default(false),

  is_active: z.boolean().optional()    can_manage_users: z.boolean().default(false),

})    can_manage_pricing: z.boolean().default(false)

  }).optional()

// GET - Obtener todos los usuarios})

export async function GET() {

  try {const updateUsuarioSchema = usuarioSchema.partial().omit({ email: true, password: true })

    const { data: profiles, error } = await supabaseAdmin

      .from('profiles')const changePasswordSchema = z.object({

      .select('*')  current_password: z.string().min(1, 'Contraseña actual requerida'),

      .order('created_at', { ascending: false })  new_password: z.string()

    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')

    if (error) {    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número')

      throw new Error(`Error obteniendo usuarios: ${error.message}`)})

    }

// GET - Obtener todos los usuarios (sin contraseñas)

    return NextResponse.json({ usuarios: profiles || [] })export async function GET(request: NextRequest) {

  try {

  } catch (error) {    const { searchParams } = new URL(request.url)

    console.error('Error en GET /api/usuarios:', error)    const includeInactive = searchParams.get('include_inactive') === 'true'

    return NextResponse.json(    const rol = searchParams.get('rol')

      {     const search = searchParams.get('search')

        error: 'Error obteniendo usuarios',

        message: error instanceof Error ? error.message : 'Error desconocido'    let query = supabase

      },      .from('usuarios')

      { status: 500 }      .select('id, email, nombre, apellido, telefono, rol, is_active, permissions, created_at, updated_at, last_login')

    )      .order('created_at', { ascending: false })

  }

}    // Filtros

    if (!includeInactive) {

// POST - Crear nuevo usuario      query = query.eq('is_active', true)

export async function POST(request: NextRequest) {    }

  try {

    const body = await request.json()    if (rol) {

    const validatedData = createUserSchema.parse(body)      query = query.eq('rol', rol)

    }

    // 1. Crear usuario en Auth

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({    if (search) {

      email: validatedData.email,      query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`)

      password: validatedData.password,    }

      email_confirm: true, // Auto-confirmar email

      user_metadata: {    const { data: usuarios, error } = await query

        full_name: validatedData.full_name

      }    if (error) {

    })      throw new Error(`Error obteniendo usuarios: ${error.message}`)

    }

    if (authError) {

      throw new Error(`Error creando usuario en Auth: ${authError.message}`)    // Obtener estadísticas adicionales para cada usuario

    }    const usuariosConStats = await Promise.all((usuarios || []).map(async (usuario) => {

      // Contar sesiones creadas por este usuario (si aplica)

    if (!authData.user) {      const { count: sesionesCreadas } = await supabase

      throw new Error('No se pudo crear el usuario')        .from('sesiones_parqueo')

    }        .select('*', { count: 'exact', head: true })

        .eq('created_by', usuario.id)

    // 2. Crear perfil en la tabla profiles

    const { data: profile, error: profileError } = await supabaseAdmin      return {

      .from('profiles')        ...usuario,

      .insert({        total_sesiones_creadas: sesionesCreadas || 0,

        id: authData.user.id,        ultimo_acceso: usuario.last_login ? new Date(usuario.last_login).toLocaleDateString() : 'Nunca'

        email: validatedData.email,      }

        full_name: validatedData.full_name,    }))

        role: validatedData.role,

        is_active: true,    return NextResponse.json({

        created_by: validatedData.created_by      data: usuariosConStats,

      })      message: 'Usuarios obtenidos exitosamente',

      .select()      count: usuariosConStats.length,

      .single()      timestamp: new Date().toISOString()

    })

    if (profileError) {

      // Si falla la creación del perfil, eliminar el usuario de Auth  } catch (error) {

      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)    console.error('Error en GET /api/usuarios:', error)

      throw new Error(`Error creando perfil: ${profileError.message}`)    return NextResponse.json(

    }      { 

        error: 'Error interno del servidor',

    return NextResponse.json(        message: error instanceof Error ? error.message : 'Error desconocido',

      {         timestamp: new Date().toISOString()

        message: 'Usuario creado exitosamente',      },

        usuario: profile      { status: 500 }

      },    )

      { status: 201 }  }

    )}



  } catch (error) {// POST - Crear nuevo usuario

    console.error('Error en POST /api/usuarios:', error)export async function POST(request: NextRequest) {

      try {

    if (error instanceof z.ZodError) {    const body = await request.json()

      return NextResponse.json(    const validatedData = usuarioSchema.parse(body)

        { 

          error: 'Datos inválidos',    // Verificar que el email no existe

          details: error.issues    const { data: existingUser, error: checkError } = await supabase

        },      .from('usuarios')

        { status: 400 }      .select('email')

      )      .eq('email', validatedData.email.toLowerCase())

    }      .single()



    return NextResponse.json(    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned

      {       throw new Error(`Error verificando usuario existente: ${checkError.message}`)

        error: 'Error creando usuario',    }

        message: error instanceof Error ? error.message : 'Error desconocido'

      },    if (existingUser) {

      { status: 500 }      return NextResponse.json(

    )        { 

  }          error: 'Usuario ya existe',

}          message: `Ya existe un usuario con el email ${validatedData.email}`,

          timestamp: new Date().toISOString()

// PATCH - Actualizar usuario        },

export async function PATCH(request: NextRequest) {        { status: 409 }

  try {      )

    const body = await request.json()    }

    const validatedData = updateUserSchema.parse(body)

    // Encriptar contraseña

    const updateData: Record<string, unknown> = {    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

      updated_at: new Date().toISOString()

    }    // Configurar permisos por defecto según el rol

    let permissions = validatedData.permissions || {}

    if (validatedData.full_name !== undefined) {    

      updateData.full_name = validatedData.full_name    switch (validatedData.rol) {

    }      case 'admin':

    if (validatedData.role !== undefined) {        permissions = {

      updateData.role = validatedData.role          can_manage_spaces: true,

    }          can_manage_vehicles: true,

    if (validatedData.is_active !== undefined) {          can_manage_sessions: true,

      updateData.is_active = validatedData.is_active          can_view_reports: true,

    }          can_manage_users: true,

          can_manage_pricing: true

    const { data: profile, error } = await supabaseAdmin        }

      .from('profiles')        break

      .update(updateData)      case 'operator':

      .eq('id', validatedData.id)        permissions = {

      .select()          can_manage_spaces: false,

      .single()          can_manage_vehicles: true,

          can_manage_sessions: true,

    if (error) {          can_view_reports: false,

      throw new Error(`Error actualizando usuario: ${error.message}`)          can_manage_users: false,

    }          can_manage_pricing: false

        }

    return NextResponse.json({         break

      message: 'Usuario actualizado exitosamente',      case 'viewer':

      usuario: profile        permissions = {

    })          can_manage_spaces: false,

          can_manage_vehicles: false,

  } catch (error) {          can_manage_sessions: false,

    console.error('Error en PATCH /api/usuarios:', error)          can_view_reports: true,

              can_manage_users: false,

    if (error instanceof z.ZodError) {          can_manage_pricing: false

      return NextResponse.json(        }

        {         break

          error: 'Datos inválidos',    }

          details: error.issues

        },    // Crear el usuario

        { status: 400 }    const { data: nuevoUsuario, error: insertError } = await supabase

      )      .from('usuarios')

    }      .insert({

        ...validatedData,

    return NextResponse.json(        email: validatedData.email.toLowerCase(),

      {         password_hash: hashedPassword,

        error: 'Error actualizando usuario',        permissions

        message: error instanceof Error ? error.message : 'Error desconocido'      })

      },      .select('id, email, nombre, apellido, telefono, rol, is_active, permissions, created_at')

      { status: 500 }      .single()

    )

  }    if (insertError) {

}      throw new Error(`Error creando usuario: ${insertError.message}`)

    }

// DELETE - Eliminar usuario

export async function DELETE(request: NextRequest) {    // Log de auditoría

  try {    await supabase.from('auditoria_logs').insert({

    const { searchParams } = new URL(request.url)      accion_tipo: 'usuario_creado',

    const userId = searchParams.get('id')      tabla_afectada: 'usuarios',

      registro_id: nuevoUsuario.id,

    if (!userId) {      detalles: {

      return NextResponse.json(        email: validatedData.email,

        { error: 'ID de usuario requerido' },        nombre: validatedData.nombre,

        { status: 400 }        apellido: validatedData.apellido,

      )        rol: validatedData.rol

    }      }

    })

    // 1. Eliminar perfil

    const { error: profileError } = await supabaseAdmin    return NextResponse.json({

      .from('profiles')      data: nuevoUsuario,

      .delete()      message: `Usuario ${validatedData.email} creado exitosamente`,

      .eq('id', userId)      timestamp: new Date().toISOString()

    }, { status: 201 })

    if (profileError) {

      throw new Error(`Error eliminando perfil: ${profileError.message}`)  } catch (error) {

    }    console.error('Error en POST /api/usuarios:', error)

    

    // 2. Eliminar usuario de Auth    if (error instanceof z.ZodError) {

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)      return NextResponse.json(

        { 

    if (authError) {          error: 'Datos inválidos',

      console.warn('Error eliminando usuario de Auth:', authError)          message: 'Los datos enviados no cumplen con el formato requerido',

      // No lanzar error porque el perfil ya fue eliminado          details: error.issues,

    }          timestamp: new Date().toISOString()

        },

    return NextResponse.json({         { status: 400 }

      message: 'Usuario eliminado exitosamente'      )

    })    }



  } catch (error) {    return NextResponse.json(

    console.error('Error en DELETE /api/usuarios:', error)      { 

    return NextResponse.json(        error: 'Error interno del servidor',

      {         message: error instanceof Error ? error.message : 'Error desconocido',

        error: 'Error eliminando usuario',        timestamp: new Date().toISOString()

        message: error instanceof Error ? error.message : 'Error desconocido'      },

      },      { status: 500 }

      { status: 500 }    )

    )  }

  }}

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