'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { AlertTriangle, Clock, Shield } from 'lucide-react'

interface SessionWarningProps {
  isVisible: boolean
  timeRemaining: number // en milisegundos
  onExtendSession: () => void
  onLogout: () => void
}

export function SessionWarning({ 
  isVisible, 
  timeRemaining, 
  onExtendSession, 
  onLogout 
}: SessionWarningProps) {
  const [countdown, setCountdown] = useState<number>(timeRemaining)

  useEffect(() => {
    setCountdown(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          // Auto-logout cuando llega a 0
          onLogout()
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, onLogout])

  // Formatear tiempo restante
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return `${seconds} segundos`
  }

  // Determinar el nivel de urgencia
  const getUrgencyLevel = (ms: number) => {
    if (ms <= 30000) return 'critical' // 30 segundos o menos
    if (ms <= 60000) return 'warning'  // 1 minuto o menos
    return 'info' // 2 minutos o menos
  }

  const urgencyLevel = getUrgencyLevel(countdown)

  // Estilos según urgencia
  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          pulseClass: 'animate-pulse'
        }
      case 'warning':
        return {
          borderColor: 'border-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
          pulseClass: ''
        }
      default:
        return {
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          pulseClass: ''
        }
    }
  }

  const styles = getUrgencyStyles()

  const getMessage = () => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          title: '⚠️ Cerrando Sesión Inmediatamente',
          description: 'Su sesión se cerrará automáticamente por seguridad.'
        }
      case 'warning':
        return {
          title: '🚨 Sesión por Expirar',
          description: 'Su sesión se cerrará pronto por inactividad. ¿Desea continuar trabajando?'
        }
      default:
        return {
          title: '⏰ Aviso de Seguridad',
          description: 'Su sesión expirará pronto por inactividad. ¿Desea extender su sesión?'
        }
    }
  }

  const message = getMessage()

  if (!isVisible) return null

  return (
    <Dialog open={isVisible} onOpenChange={() => {}}>
      <DialogContent 
        className={`${styles.bgColor} ${styles.borderColor} border-2 ${styles.pulseClass} max-w-md`}
        // Prevenir cierre accidental
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${styles.textColor}`}>
            {urgencyLevel === 'critical' ? (
              <AlertTriangle className={`h-6 w-6 ${styles.iconColor}`} />
            ) : (
              <Shield className={`h-6 w-6 ${styles.iconColor}`} />
            )}
            {message.title}
          </DialogTitle>
          <DialogDescription className={`${styles.textColor} text-base`}>
            {message.description}
          </DialogDescription>
        </DialogHeader>

        {/* Contador visual */}
        <div className="flex items-center justify-center py-4">
          <div className={`flex items-center gap-2 text-2xl font-bold ${styles.textColor}`}>
            <Clock className={`h-8 w-8 ${styles.iconColor}`} />
            {formatTime(countdown)}
          </div>
        </div>

        {/* Información de seguridad */}
        <div className={`${styles.bgColor} p-3 rounded-lg border ${styles.borderColor}`}>
          <div className={`text-sm ${styles.textColor}`}>
            <p className="font-semibold mb-1">🛡️ Protección de Seguridad Activa:</p>
            <ul className="text-xs space-y-1 pl-4">
              <li>• Esta cochera utiliza tablets compartidas</li>
              <li>• Su sesión se cierra automáticamente por seguridad</li>
              <li>• Esto protege la información de la empresa</li>
            </ul>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          {urgencyLevel !== 'critical' && (
            <Button 
              onClick={onExtendSession}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              ✅ Continuar Trabajando
            </Button>
          )}
          
          <Button 
            onClick={onLogout}
            variant={urgencyLevel === 'critical' ? 'default' : 'outline'}
            className={`${urgencyLevel === 'critical' ? 'flex-1' : 'flex-1'} ${
              urgencyLevel === 'critical' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            size="lg"
          >
            {urgencyLevel === 'critical' ? '🔓 Cerrar Sesión' : '🚪 Cerrar Sesión'}
          </Button>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
              urgencyLevel === 'critical' 
                ? 'bg-red-500' 
                : urgencyLevel === 'warning' 
                  ? 'bg-orange-500' 
                  : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.max(0, (countdown / timeRemaining) * 100)}%` 
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook para usar el componente SessionWarning
export function useSessionWarning() {
  const [isVisible, setIsVisible] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const showWarning = (time: number) => {
    setTimeRemaining(time)
    setIsVisible(true)
  }

  const hideWarning = () => {
    setIsVisible(false)
    setTimeRemaining(0)
  }

  const extendSession = () => {
    hideWarning()
    // Simular actividad para resetear timers
    document.dispatchEvent(new MouseEvent('mousemove'))
  }

  return {
    isVisible,
    timeRemaining,
    showWarning,
    hideWarning,
    extendSession
  }
}