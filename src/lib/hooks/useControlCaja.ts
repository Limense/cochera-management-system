// src/lib/hooks/useControlCaja.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

// Tipos TypeScript siguiendo convención híbrida
interface ControlCaja {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  shift_duration: string | null

  // NEGOCIO (Español)
  fecha: string
  empleado_id: string
  hora_apertura: string
  hora_cierre: string | null
  dinero_inicial: number
  dinero_final: number | null
  dinero_esperado: number | null
  diferencia: number | null
  estado_turno: 'abierto' | 'cerrado'
  observaciones: string | null

  // Relaciones
  profiles?: {
    full_name: string
    email: string
  }
}

interface AperturaFormData {
  dinero_inicial: number
  observaciones?: string
}

interface CierreFormData {
  dinero_final: number
  observaciones?: string
}

interface VentasDelDia {
  total_ventas: number
  cantidad_vehiculos: number
  ventas_por_metodo: Record<string, number>
}

// Hook principal para control de caja
export function useControlCaja() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  // Query para obtener el turno actual del usuario
  const {
    data: turnoActual,
    isLoading: loadingTurno,
    error: errorTurno
  } = useQuery({
    queryKey: ['turno-actual', user?.id],
    queryFn: async (): Promise<ControlCaja | null> => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('control_caja')
        .select(`
          *,
          profiles:empleado_id (
            full_name,
            email
          )
        `)
        .eq('empleado_id', user.id)
        .eq('estado_turno', 'abierto')
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })

  // Query para obtener ventas del día actual
  const {
    data: ventasHoy,
    isLoading: loadingVentas
  } = useQuery({
    queryKey: ['ventas-hoy', new Date().toISOString().split('T')[0]],
    queryFn: async (): Promise<VentasDelDia> => {
      const hoy = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('sesiones_parqueo')
        .select('monto_calculado, metodo_pago')
        .eq('estado_pago', 'pagado')
        .gte('created_at', `${hoy}T00:00:00`)
        .lt('created_at', `${hoy}T23:59:59`)

      if (error) throw error

      const total_ventas = data.reduce((sum, item) => sum + (item.monto_calculado || 0), 0)
      const cantidad_vehiculos = data.length
      
      // Agrupar por método de pago
      const ventas_por_metodo = data.reduce((acc, item) => {
        const metodo = item.metodo_pago || 'no_especificado'
        acc[metodo] = (acc[metodo] || 0) + (item.monto_calculado || 0)
        return acc
      }, {} as Record<string, number>)

      return {
        total_ventas,
        cantidad_vehiculos,
        ventas_por_metodo
      }
    }
  })

  // Query para historial de turnos (solo admins ven todos)
  const {
    data: historialTurnos,
    isLoading: loadingHistorial
  } = useQuery({
    queryKey: ['historial-turnos', user?.id, profile?.role],
    queryFn: async (): Promise<ControlCaja[]> => {
      if (!user?.id) return []

      let query = supabase
        .from('control_caja')
        .select(`
          *,
          profiles:empleado_id (
            full_name,
            email
          )
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)

      // Si no es admin, solo ve sus propios turnos
      if (profile?.role !== 'admin') {
        query = query.eq('empleado_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id && !!profile?.role
  })

  // Mutation para abrir caja
  const abrirCaja = useMutation({
    mutationFn: async (data: AperturaFormData): Promise<ControlCaja> => {
      if (!user?.id) throw new Error('Usuario no autenticado')
      
      // Verificar que no hay turno abierto
      if (turnoActual) {
        throw new Error('Ya tienes un turno abierto. Cierra el turno actual primero.')
      }

      const fechaHoy = new Date().toISOString().split('T')[0]
      
      const { data: nuevoCaja, error } = await supabase
        .from('control_caja')
        .insert({
          empleado_id: user.id,
          fecha: fechaHoy,
          dinero_inicial: data.dinero_inicial,
          observaciones: data.observaciones,
          estado_turno: 'abierto'
        })
        .select(`
          *,
          profiles:empleado_id (
            full_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Log de auditoría
      await logAuditAction('caja_abierta', {
        amount: data.dinero_inicial,
        details: { 
          fecha: fechaHoy,
          observaciones: data.observaciones 
        }
      })

      return nuevoCaja
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['turno-actual'] })
      queryClient.invalidateQueries({ queryKey: ['historial-turnos'] })
      
      toast.success(`Caja abierta con S/. ${data.dinero_inicial}`, {
        description: `Turno iniciado el ${new Date(data.fecha).toLocaleDateString()}`
      })
    },
    onError: (error: Error) => {
      toast.error('Error al abrir caja', {
        description: error.message
      })
    }
  })

  // Mutation para cerrar caja
  const cerrarCaja = useMutation({
    mutationFn: async (data: CierreFormData): Promise<ControlCaja> => {
      if (!turnoActual) {
        throw new Error('No hay turno abierto para cerrar')
      }

      const { data: cajaActualizada, error } = await supabase
        .from('control_caja')
        .update({
          dinero_final: data.dinero_final,
          observaciones: data.observaciones,
          estado_turno: 'cerrado',
          hora_cierre: new Date().toISOString()
        })
        .eq('id', turnoActual.id)
        .select(`
          *,
          profiles:empleado_id (
            full_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Log de auditoría
      await logAuditAction('caja_cerrada', {
        amount: data.dinero_final,
        details: {
          dinero_inicial: turnoActual.dinero_inicial,
          dinero_esperado: cajaActualizada.dinero_esperado,
          diferencia: cajaActualizada.diferencia,
          observaciones: data.observaciones
        }
      })

      return cajaActualizada
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['turno-actual'] })
      queryClient.invalidateQueries({ queryKey: ['historial-turnos'] })
      
      const diferencia = data.diferencia || 0
      const mensaje = diferencia === 0 
        ? 'Caja cuadrada perfectamente ✅'
        : `${diferencia > 0 ? 'Sobrante' : 'Faltante'}: S/. ${Math.abs(diferencia)}`
      
      toast.success('Caja cerrada correctamente', {
        description: mensaje
      })
    },
    onError: (error: Error) => {
      toast.error('Error al cerrar caja', {
        description: error.message
      })
    }
  })

  // Función auxiliar para logging de auditoría
  const logAuditAction = async (
    accionTipo: string,
    detalles: { amount?: number; details?: Record<string, unknown> }
  ) => {
    try {
      await supabase.from('auditoria_logs').insert({
        usuario_id: user?.id,
        accion_tipo: accionTipo,
        tabla_afectada: 'control_caja',
        registro_id: turnoActual?.id || null,
        monto: detalles.amount || null,
        detalles: detalles.details || {},
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.warn('Error al registrar auditoría:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // Estados calculados
  const hayTurnoAbierto = !!turnoActual
  const puedeAbrirCaja = !hayTurnoAbierto && !abrirCaja.isPending
  const puedeCerrarCaja = hayTurnoAbierto && !cerrarCaja.isPending
  
  // Cálculo de dinero esperado en tiempo real
  const dineroEsperado = turnoActual 
    ? (turnoActual.dinero_inicial + (ventasHoy?.total_ventas || 0))
    : 0

  return {
    // Estado del turno
    turnoActual,
    hayTurnoAbierto,
    puedeAbrirCaja,
    puedeCerrarCaja,
    dineroEsperado,

    // Datos
    ventasHoy,
    historialTurnos,

    // Loading states
    loadingTurno,
    loadingVentas,
    loadingHistorial,

    // Errores
    errorTurno,

    // Mutations
    abrirCaja,
    cerrarCaja,

    // Estados de carga de las mutaciones
    isOpeningCaja: abrirCaja.isPending,
    isClosingCaja: cerrarCaja.isPending
  }
}

// Hook auxiliar para administradores (ver todos los turnos)
export function useControlCajaAdmin() {
  const { profile } = useAuth()
  
  return useQuery({
    queryKey: ['admin-turnos-todos'],
    queryFn: async (): Promise<ControlCaja[]> => {
      const { data, error } = await supabase
        .from('control_caja')
        .select(`
          *,
          profiles:empleado_id (
            full_name,
            email
          )
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
    enabled: profile?.role === 'admin'
  })
}