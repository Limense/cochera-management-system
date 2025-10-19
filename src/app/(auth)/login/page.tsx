'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { AlertTriangle, Clock, Shield, Info } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sistema de Cochera
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión para acceder al sistema
          </p>
        </div>
        
        {/* Mensaje de timeout si existe */}
        {getTimeoutMessage()}

        {/* Información de seguridad para tablets */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm">
                🛡️ Seguridad para Tablets Compartidas
              </h3>
              <ul className="text-gray-600 text-xs mt-2 space-y-1">
                <li>• Tu sesión se cerrará automáticamente después de 15 minutos sin actividad</li>
                <li>• Tiempo máximo de sesión: 8 horas continuas</li>
                <li>• La sesión se renovará automáticamente cada hora si estás activo</li>
                <li>• Recibirás alertas antes del cierre automático</li>
              </ul>
            </div>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
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