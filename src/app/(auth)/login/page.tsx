'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// ...existing code...
import { toast } from 'sonner'
import { Clock, Shield, Info } from 'lucide-react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Obtener razón del timeout de los parámetros URL
  const timeoutReason = searchParams.get('timeout')

  useEffect(() => {
    // Mostrar mensaje específico según la razón del timeout
    if (timeoutReason) {
      switch (timeoutReason) {
        case 'inactivity':
          toast.warning('⏰ Sesión cerrada por inactividad (15 minutos)', {
            description: 'Tu sesión se cerró automáticamente por seguridad después de 15 minutos sin actividad.',
            duration: 6000
          })
          break
        case 'absolute':
          toast.info('🕐 Sesión cerrada por tiempo máximo (8 horas)', {
            description: 'Tu sesión se cerró después de 8 horas por políticas de seguridad.',
            duration: 6000
          })
          break
        case 'manual':
          toast.info('🔓 Sesión cerrada correctamente', {
            description: 'Has cerrado sesión de forma segura.',
            duration: 4000
          })
          break
        default:
          toast.info('🛡️ Sesión cerrada por seguridad', {
            description: 'Tu sesión se cerró por razones de seguridad.',
            duration: 4000
          })
      }
    }
  }, [timeoutReason])

  const getTimeoutMessage = () => {
    if (!timeoutReason) return null

    const messages = {
      inactivity: {
        icon: <Clock className="h-5 w-5 text-orange-600" />,
        title: 'Sesión Expirada por Inactividad',
        description: 'Tu sesión se cerró automáticamente después de 15 minutos sin actividad.',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800'
      },
      absolute: {
        icon: <Shield className="h-5 w-5 text-blue-600" />,
        title: 'Sesión Expirada por Tiempo Máximo',
        description: 'Tu sesión se cerró después de 8 horas por políticas de seguridad.',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800'
      },
      manual: {
        icon: <Info className="h-5 w-5 text-green-600" />,
        title: 'Sesión Cerrada Correctamente',
        description: 'Has cerrado sesión de forma segura.',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800'
      }
    }

    const message = messages[timeoutReason as keyof typeof messages]
    if (!message) return null

    return (
      <div className={`${message.bgColor} ${message.borderColor} border rounded-lg p-4 mb-6`}>
        <div className="flex items-start gap-3">
          {message.icon}
          <div className="flex-1">
            <h3 className={`font-semibold ${message.textColor} text-sm`}>
              {message.title}
            </h3>
            <p className={`${message.textColor} text-sm mt-1 opacity-90`}>
              {message.description}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        toast.error('Error al iniciar sesión: ' + error.message)
      } else {
        toast.success('¡Sesión iniciada correctamente!')
        router.push('/dashboard')
      }
    } catch {
      toast.error('Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Branding / mensaje izquierdo */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700 text-white p-12">
        <div className="max-w-lg w-full">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-white" />
              <span className="text-3xl font-bold tracking-tight">Cochera System - BELEN</span>
            </div>
            <h1 className="text-4xl font-extrabold mb-2">¡Bienvenido!</h1>
            <p className="text-lg text-neutral-300 mb-6">Gestiona tu cochera de forma eficiente y segura.<br />Automatiza tareas y ahorra tiempo.</p>
          </div>
          <div className="mt-16 text-xs text-neutral-400">© {new Date().getFullYear()} Cochera System. Todos los derechos reservados.</div>
        </div>
      </div>

      {/* Formulario derecho */}
      <div className="flex flex-1 items-center justify-center bg-neutral-50">
        <div className="max-w-md w-full p-8">
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold text-neutral-900">Iniciar Sesión</span>
            <p className="text-sm text-neutral-500 mt-2">Accede con tu cuenta para continuar</p>
          </div>
          {/* Mensaje de timeout si existe */}
          {getTimeoutMessage()}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-neutral-700">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="mt-2 bg-white border border-neutral-300 text-neutral-900 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-neutral-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-2 bg-white border border-neutral-300 text-neutral-900 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-neutral-900 text-white text-base font-semibold py-2 rounded-lg shadow hover:bg-neutral-800 transition-colors"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}