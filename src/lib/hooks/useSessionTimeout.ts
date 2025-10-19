'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Configuración de timeouts
const TIMEOUT_CONFIG = {
  // Timeout por inactividad: 15 minutos
  INACTIVITY_TIMEOUT: 15 * 60 * 1000, // 15 minutos en ms
  
  // Timeout absoluto: 8 horas
  ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8 horas en ms
  
  // Refresh automático: cada 60 minutos si hay actividad
  AUTO_REFRESH_INTERVAL: 60 * 60 * 1000, // 60 minutos en ms
  
  // Alertas antes del logout
  WARNING_TIMES: {
    TWO_MINUTES: 2 * 60 * 1000, // 2 minutos antes
    ONE_MINUTE: 1 * 60 * 1000,   // 1 minuto antes
    THIRTY_SECONDS: 30 * 1000    // 30 segundos antes
  }
}

interface SessionTimeoutCallbacks {
  onWarning?: (timeRemaining: number) => void
  onLogout?: (reason: 'inactivity' | 'absolute' | 'manual') => void
  onRefresh?: () => void
}

export function useSessionTimeout(callbacks?: SessionTimeoutCallbacks) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  // Referencias para los timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const absoluteTimerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  // Tiempo de inicio de sesión
  const sessionStartRef = useRef<number>(Date.now())
  const lastActivityRef = useRef<number>(Date.now())

  // Función para registrar eventos en auditoría
  const logAuditEvent = useCallback(async (action: 'login' | 'logout', details: Record<string, string | number> = {}) => {
    if (!user) return
    
    try {
      await supabase.from('auditoria_logs').insert({
        usuario_id: user.id,
        accion_tipo: action,
        tabla_afectada: 'auth.sessions',
        detalles: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ...details
        },
        ip_address: await fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => data.ip)
          .catch(() => 'unknown')
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }, [user])

  // Función para limpiar todos los timers
  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    
    if (absoluteTimerRef.current) {
      clearTimeout(absoluteTimerRef.current)
      absoluteTimerRef.current = null
    }
    
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    
    // Limpiar timers de advertencia
    Object.values(warningTimersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    warningTimersRef.current = {}
  }, [])

  // Función para realizar logout
  const performLogout = useCallback(async (reason: 'inactivity' | 'absolute' | 'manual') => {
    try {
      // Limpiar timers
      clearAllTimers()
      
      // Registrar evento de logout
      await logAuditEvent('logout', { reason, duration: Date.now() - sessionStartRef.current })
      
      // Realizar logout
      await signOut()
      
      // Callback personalizado
      callbacks?.onLogout?.(reason)
      
      // Redirigir a login con mensaje
      router.push(`/login?timeout=${reason}`)
    } catch (error) {
      console.error('Error during logout:', error)
      router.push('/login')
    }
  }, [callbacks, clearAllTimers, logAuditEvent, router, signOut])

  // Función para refrescar la sesión
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        await performLogout('absolute')
        return
      }
      
      if (data?.session) {
        // Actualizar last_login en profiles
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user?.id)
        
        callbacks?.onRefresh?.()
        console.log('Session refreshed successfully')
      }
    } catch (error) {
      console.error('Error during session refresh:', error)
      await performLogout('absolute')
    }
  }, [callbacks, performLogout, user?.id])

  // Función para configurar timers de advertencia
  const setupWarningTimers = useCallback(() => {
    const now = Date.now()
    const timeUntilInactivityTimeout = TIMEOUT_CONFIG.INACTIVITY_TIMEOUT - (now - lastActivityRef.current)
    
    // Limpiar advertencias anteriores
    Object.values(warningTimersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    warningTimersRef.current = {}
    
    // Configurar nuevas advertencias solo si hay tiempo suficiente
    Object.entries(TIMEOUT_CONFIG.WARNING_TIMES).forEach(([key, warningTime]) => {
      const timeToWarning = timeUntilInactivityTimeout - warningTime
      
      if (timeToWarning > 0) {
        warningTimersRef.current[key] = setTimeout(() => {
          callbacks?.onWarning?.(warningTime)
        }, timeToWarning)
      }
    })
  }, [callbacks])

  // Función para resetear timer de inactividad
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Limpiar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    
    // Configurar nuevo timer
    inactivityTimerRef.current = setTimeout(() => {
      performLogout('inactivity')
    }, TIMEOUT_CONFIG.INACTIVITY_TIMEOUT)
    
    // Configurar advertencias
    setupWarningTimers()
  }, [performLogout, setupWarningTimers])

  // Detectar actividad del usuario
  const handleUserActivity = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  // Inicializar timers cuando hay usuario
  useEffect(() => {
    if (!user) {
      clearAllTimers()
      return
    }

    // Registrar login si es una nueva sesión
    logAuditEvent('login', { session_start: sessionStartRef.current })

    // Configurar timer de inactividad
    resetInactivityTimer()
    
    // Configurar timer absoluto (8 horas desde el inicio de sesión)
    absoluteTimerRef.current = setTimeout(() => {
      performLogout('absolute')
    }, TIMEOUT_CONFIG.ABSOLUTE_TIMEOUT)
    
    // Configurar refresh automático cada 60 minutos
    const setupRefreshTimer = () => {
      refreshTimerRef.current = setTimeout(async () => {
        await refreshSession()
        setupRefreshTimer() // Reconfigurar para el siguiente ciclo
      }, TIMEOUT_CONFIG.AUTO_REFRESH_INTERVAL)
    }
    setupRefreshTimer()

    // Event listeners para detectar actividad
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    // Cleanup
    return () => {
      clearAllTimers()
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [user, resetInactivityTimer, performLogout, refreshSession, handleUserActivity, logAuditEvent, clearAllTimers])

  // Logout al cerrar pestaña/navegador (protección para tablets)
  useEffect(() => {
    if (!user) return

    const handleBeforeUnload = () => {
      // Intentar logout silencioso
      navigator.sendBeacon('/api/logout', JSON.stringify({ userId: user.id }))
      performLogout('manual')
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // La pestaña se ocultó, iniciar logout diferido
        setTimeout(() => {
          if (document.hidden) {
            performLogout('manual')
          }
        }, 30000) // 30 segundos de gracia
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, performLogout])

  return {
    // Información de la sesión
    sessionDuration: Date.now() - sessionStartRef.current,
    lastActivity: lastActivityRef.current,
    timeUntilInactivityTimeout: TIMEOUT_CONFIG.INACTIVITY_TIMEOUT - (Date.now() - lastActivityRef.current),
    timeUntilAbsoluteTimeout: TIMEOUT_CONFIG.ABSOLUTE_TIMEOUT - (Date.now() - sessionStartRef.current),
    
    // Funciones de control
    refreshSession,
    performLogout: (reason: 'manual') => performLogout(reason),
    resetActivity: handleUserActivity,
    
    // Configuración
    config: TIMEOUT_CONFIG
  }
}