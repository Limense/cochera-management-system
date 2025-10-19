// src/lib/hooks/useAuditoria.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

// Tipos TypeScript siguiendo convención híbrida
interface AuditoriaLog {
  // TÉCNICOS (Inglés)
  id: string
  timestamp: string
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  correlation_id: string | null

  // NEGOCIO (Español)
  usuario_id: string
  accion_tipo: string
  tabla_afectada: string | null
  registro_id: string | null
  detalles: Record<string, unknown>
  monto: number | null

  // Relaciones
  profiles?: {
    full_name: string
    email: string
    role: string
  }
}

interface AuditoriaParams {
  amount?: number
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

// Hook para auditoría
export function useAuditoria() {
  const { user, profile } = useAuth()

  // Query para obtener logs de auditoría (solo admins)
  const {
    data: logs,
    isLoading,
    error
  } = useQuery({
    queryKey: ['auditoria-logs'],
    queryFn: async (): Promise<AuditoriaLog[]> => {
      const { data, error } = await supabase
        .from('auditoria_logs')
        .select(`
          *,
          profiles:usuario_id (
            full_name,
            email,
            role
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    },
    enabled: profile?.role === 'admin'
  })

  // Función para registrar acciones de auditoría
  const logAuditAction = async (
    accionTipo: string,
    params: AuditoriaParams = {}
  ): Promise<void> => {
    try {
      if (!user?.id) return

      // Obtener información del navegador
      const userAgent = typeof window !== 'undefined' 
        ? window.navigator.userAgent 
        : null

      await supabase.from('auditoria_logs').insert({
        usuario_id: user.id,
        accion_tipo: accionTipo,
        tabla_afectada: params.entityType || null,
        registro_id: params.entityId || null,
        monto: params.amount || null,
        detalles: params.details || {},
        timestamp: new Date().toISOString(),
        user_agent: userAgent,
        // IP se puede obtener del servidor si es necesario
        ip_address: null
      })
    } catch (error) {
      console.warn('Error al registrar auditoría:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // Función para obtener descripción legible de la acción
  const getActionDescription = (actionType: string): string => {
    const descriptions: Record<string, string> = {
      'entrada_vehiculo': 'registró entrada de vehículo',
      'salida_vehiculo': 'procesó salida y pago',
      'pago_procesado': 'procesó pago',
      'caja_abierta': 'abrió caja',
      'caja_cerrada': 'cerró caja',
      'usuario_creado': 'creó nuevo usuario',
      'usuario_actualizado': 'actualizó usuario',
      'configuracion_cambiada': 'modificó configuración',
      'login': 'inició sesión',
      'logout': 'cerró sesión',
      'tarifa_modificada': 'modificó tarifas',
      'espacio_mantenimiento': 'cambió espacio a mantenimiento'
    }
    return descriptions[actionType] || actionType
  }

  // Función para formatear fecha y hora
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Función para agrupar logs por día
  const groupLogsByDay = (logs: AuditoriaLog[]): Record<string, AuditoriaLog[]> => {
    return logs.reduce((groups, log) => {
      const day = new Date(log.timestamp).toLocaleDateString('es-PE')
      if (!groups[day]) {
        groups[day] = []
      }
      groups[day].push(log)
      return groups
    }, {} as Record<string, AuditoriaLog[]>)
  }

  return {
    // Data
    logs: logs || [],
    logsGroupedByDay: logs ? groupLogsByDay(logs) : {},
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    logAuditAction,
    
    // Utils
    getActionDescription,
    formatTimestamp,
    
    // Permissions
    canViewLogs: profile?.role === 'admin'
  }
}

// Hook específico para logging automático en operaciones
export function useAutoAudit() {
  const { logAuditAction } = useAuditoria()

  // Wrapper para operaciones de entrada
  const auditEntradaVehiculo = async (data: {
    placa: string
    espacioNumero: number
    tipoVehiculo: string
    sessionId?: string
  }) => {
    await logAuditAction('entrada_vehiculo', {
      entityType: 'sesiones_parqueo',
      entityId: data.sessionId,
      details: {
        placa: data.placa,
        espacio_numero: data.espacioNumero,
        tipo_vehiculo: data.tipoVehiculo
      }
    })
  }

  // Wrapper para operaciones de salida
  const auditSalidaVehiculo = async (data: {
    placa: string
    monto: number
    metodoPago: string
    duracion?: string
    sessionId?: string
  }) => {
    await logAuditAction('salida_vehiculo', {
      entityType: 'sesiones_parqueo',
      entityId: data.sessionId,
      amount: data.monto,
      details: {
        placa: data.placa,
        metodo_pago: data.metodoPago,
        duracion: data.duracion
      }
    })
  }

  // Wrapper para operaciones de login
  const auditLogin = async () => {
    await logAuditAction('login', {
      details: { 
        login_time: new Date().toISOString() 
      }
    })
  }

  // Wrapper para operaciones de logout
  const auditLogout = async () => {
    await logAuditAction('logout', {
      details: { 
        logout_time: new Date().toISOString() 
      }
    })
  }

  return {
    auditEntradaVehiculo,
    auditSalidaVehiculo,
    auditLogin,
    auditLogout
  }
}