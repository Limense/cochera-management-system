import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase con service role para operaciones admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, role, currentUserId } = await request.json()
    
    console.log('API: Creando usuario', { email, role, currentUserId })
    
    // Verificar permisos del usuario actual
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', currentUserId)
      .single()
    
    if (!profile?.is_active || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos de administrador' }, 
        { status: 403 }
      )
    }
    
    // Crear usuario con admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })
    
    if (authError) {
      console.error('Error creating user:', authError)
      return NextResponse.json(
        { error: authError.message }, 
        { status: 400 }
      )
    }
    
    console.log('Usuario creado en auth:', authData.user.id)
    
    // Crear perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        email,
        role,
        is_active: true,
        created_by: currentUserId
      })
    
    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Intentar limpiar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error creando perfil: ${profileError.message}` }, 
        { status: 400 }
      )
    }
    
    console.log('Perfil creado exitosamente')
    
    // Registrar en auditoría
    await supabaseAdmin.from('auditoria_logs').insert({
      usuario_id: currentUserId,
      accion_tipo: 'usuario_creado',
      tabla_afectada: 'profiles',
      registro_id: authData.user.id,
      detalles: {
        nuevo_usuario_email: email,
        nuevo_usuario_role: role,
        created_at: new Date().toISOString()
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      user: authData.user 
    })
    
  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}