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
    const { userId, newPassword, currentUserId } = await request.json()
    
    console.log('🔑 API: Reseteando contraseña para usuario:', userId)
    
    // Verificar que los datos requeridos estén presentes
    if (!userId || !newPassword || !currentUserId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: userId, newPassword, currentUserId' }, 
        { status: 400 }
      )
    }
    
    // Verificar que la nueva contraseña cumpla requisitos mínimos
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' }, 
        { status: 400 }
      )
    }
    
    // Verificar permisos del usuario actual (debe ser admin)
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, full_name')
      .eq('id', currentUserId)
      .single()
    
    if (!currentProfile?.is_active || currentProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden resetear contraseñas' }, 
        { status: 403 }
      )
    }
    
    // Obtener información del usuario objetivo
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', userId)
      .single()
    
    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      )
    }
    
    console.log(`🔐 Cambiando contraseña de ${targetProfile.full_name} (${targetProfile.email})`)
    
    // Resetear contraseña usando admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword 
      }
    )
    
    if (updateError) {
      console.error('❌ Error al actualizar contraseña:', updateError)
      return NextResponse.json(
        { error: `Error al actualizar contraseña: ${updateError.message}` }, 
        { status: 400 }
      )
    }
    
    console.log('✅ Contraseña actualizada exitosamente')
    
    // Registrar en auditoría
    await supabaseAdmin.from('auditoria_logs').insert({
      usuario_id: currentUserId,
      accion_tipo: 'usuario_actualizado',
      tabla_afectada: 'auth.users',
      registro_id: userId,
      detalles: {
        accion: 'password_reset',
        admin_name: currentProfile.full_name,
        target_user_name: targetProfile.full_name,
        target_user_email: targetProfile.email,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('📝 Evento registrado en auditoría')
    
    return NextResponse.json({ 
      success: true, 
      message: `Contraseña de ${targetProfile.full_name} actualizada exitosamente`,
      user: updateData.user 
    })
    
  } catch (error) {
    console.error('💥 Error en reset password API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

// Método GET para verificar que el endpoint esté funcionando
export async function GET() {
  return NextResponse.json({ 
    message: 'Reset Password API endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}