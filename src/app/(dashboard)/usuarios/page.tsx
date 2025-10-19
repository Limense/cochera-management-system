'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  Plus, 
  Search,
  UserCheck,
  Shield,
  Eye,
  Info,
  Key
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Esquema de validación para nuevo usuario
const nuevoUsuarioSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z
    .string()
    .email('Email inválido')
    .refine((email) => {
      // Lista de dominios comunes que funcionan con Supabase
      const commonDomains = [
        'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
        'icloud.com', 'live.com', 'msn.com', 'protonmail.com'
      ]
      const domain = email.split('@')[1]
      return commonDomains.includes(domain)
    }, {
      message: 'Usa un dominio común como @gmail.com, @hotmail.com, o @outlook.com'
    }),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'supervisor'], {
    message: 'Selecciona un rol válido'
  })
})

type NuevoUsuarioForm = z.infer<typeof nuevoUsuarioSchema>

// Esquema de validación para cambio de contraseña
const cambioPasswordSchema = z.object({
  new_password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
})

type CambioPasswordForm = z.infer<typeof cambioPasswordSchema>

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'supervisor'
  is_active: boolean
  created_at: string
  created_by?: string
  creator?: {
    full_name: string
  } | null
}

export default function UsuariosPage() {
  const { profile, isAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [nuevoUsuarioModal, setNuevoUsuarioModal] = useState(false)
  const [cambioPasswordModal, setCambioPasswordModal] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UserProfile | null>(null)
  const queryClient = useQueryClient()

  // Query para obtener usuarios
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          is_active,
          created_at,
          created_by,
          creator:created_by(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data.map(user => ({
        ...user,
        creator: Array.isArray(user.creator) ? user.creator[0] : user.creator
      })) as UserProfile[]
    }
  })

  // Formulario para nuevo usuario
  const form = useForm<NuevoUsuarioForm>({
    resolver: zodResolver(nuevoUsuarioSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'supervisor'
    }
  })

  // Formulario para cambio de contraseña
  const passwordForm = useForm<CambioPasswordForm>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: ''
    }
  })

  // Mutación para crear usuario usando API endpoint
  const crearUsuarioMutation = useMutation({
    mutationFn: async (data: NuevoUsuarioForm) => {
      try {
        console.log('🚀 Iniciando creación via API:', data.email)
        
        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: data.full_name,
            email: data.email,
            password: data.password,
            role: data.role,
            currentUserId: profile?.id
          }),
        })

        const result = await response.json()
        
        console.log('📡 Respuesta del API:', { status: response.status, result })
        
        if (!response.ok) {
          // Manejo específico de errores del API
          if (result.error?.includes('invalid') && result.error?.includes('email')) {
            throw new Error(`El email "${data.email}" no es válido. Intenta con un dominio común como @gmail.com, @hotmail.com, o @outlook.com`)
          }
          if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
            throw new Error(`El email "${data.email}" ya está registrado. Usa otro email.`)
          }
          throw new Error(result.error || 'Error al crear usuario')
        }

        console.log('✅ Usuario creado exitosamente via API:', result.user?.id)
        return result.user
      } catch (error) {
        console.error('❌ Error detallado en creación:', error)
        throw error
      }
    },
    onSuccess: (user) => {
      console.log('🎉 Mutación exitosa, usuario creado:', user?.email)
      toast.success('Usuario creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setNuevoUsuarioModal(false)
      form.reset()
    },
    onError: (error: Error) => {
      console.error('💥 Error en mutación:', error)
      toast.error(error.message || 'Error al crear usuario')
    }
  })

  // Mutación para actualizar estado activo/inactivo
  const toggleUsuarioActivoMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Estado de usuario actualizado')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar usuario')
    }
  })

  // Mutación para cambiar contraseña usando API endpoint
  const cambiarPasswordMutation = useMutation({
    mutationFn: async (data: CambioPasswordForm) => {
      if (!usuarioSeleccionado) throw new Error('No se seleccionó usuario')
      
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: usuarioSeleccionado.id,
          newPassword: data.new_password,
          adminId: profile?.id
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar contraseña')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Contraseña cambiada exitosamente')
      setCambioPasswordModal(false)
      setUsuarioSeleccionado(null)
      passwordForm.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cambiar contraseña')
    }
  })

  // Verificar permisos de admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            Solo los administradores pueden gestionar usuarios
          </p>
        </Card>
      </div>
    )
  }

  // Filtrar usuarios por término de búsqueda
  const usuariosFiltrados = usuarios?.filter(usuario =>
    usuario.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleSubmit = (data: NuevoUsuarioForm) => {
    crearUsuarioMutation.mutate(data)
  }

  const handlePasswordSubmit = (data: CambioPasswordForm) => {
    cambiarPasswordMutation.mutate(data)
  }

  const toggleUsuarioActivo = (userId: string, currentState: boolean) => {
    toggleUsuarioActivoMutation.mutate({
      userId,
      isActive: !currentState
    })
  }

  const abrirCambioPassword = (usuario: UserProfile) => {
    setUsuarioSeleccionado(usuario)
    setCambioPasswordModal(true)
    passwordForm.reset()
  }

  return (
    <ProtectedRoute requireSupervisor={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600">Administrar usuarios del sistema</p>
          </div>
        
        <Button 
          onClick={() => setNuevoUsuarioModal(true)}
          size="lg"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios?.filter(u => u.is_active).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios?.filter(u => u.role === 'admin').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Supervisores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios?.filter(u => u.role === 'supervisor').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Fecha creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {usuario.full_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {usuario.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.role === 'admin' ? 'default' : 'secondary'}>
                        {usuario.role === 'admin' ? 'Administrador' : 'Supervisor'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Switch
                          checked={usuario.is_active}
                          onCheckedChange={() => toggleUsuarioActivo(usuario.id, usuario.is_active)}
                          disabled={usuario.id === profile?.id} // No puede desactivarse a sí mismo
                        />
                        <span className="ml-2 text-sm">
                          {usuario.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {usuario.creator?.full_name || 'Sistema'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(usuario.created_at).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toast.info(`Ver detalles de ${usuario.full_name}`)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirCambioPassword(usuario)}
                          disabled={usuario.id === profile?.id} // No puede cambiar su propia contraseña
                          title="Cambiar contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para nuevo usuario */}
      <Dialog open={nuevoUsuarioModal} onOpenChange={setNuevoUsuarioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          
          {/* Nota informativa */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">⚡ Creación Profesional de Usuarios:</p>
                <ul className="text-xs space-y-1">
                  <li>• Usuario creado inmediatamente (sin confirmación de email)</li>
                  <li>• Utiliza API de administrador para mayor control</li>
                  <li>• Usa emails con dominios comunes para mejor compatibilidad</li>
                  <li>• La contraseña debe tener al menos 6 caracteres</li>
                </ul>
              </div>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input 
                          type="email" 
                          placeholder="juan@gmail.com" 
                          {...field} 
                          className="flex-1"
                        />
                        {field.value && !field.value.match(/@(gmail|hotmail|outlook|yahoo|icloud|live|msn|protonmail)\.com$/) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const username = field.value.split('@')[0]
                              form.setValue('email', `${username}@gmail.com`)
                            }}
                            className="whitespace-nowrap"
                          >
                            📧 Usar Gmail
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <div className="text-xs text-gray-500 mt-1">
                      💡 Usa dominios comunes como @gmail.com, @hotmail.com, @outlook.com
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNuevoUsuarioModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={crearUsuarioMutation.isPending}
                >
                  {crearUsuarioMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para cambio de contraseña */}
      <Dialog open={cambioPasswordModal} onOpenChange={setCambioPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cambiar Contraseña - {usuarioSeleccionado?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Key className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">🔐 Cambio Profesional de Contraseña:</p>
                <ul className="text-xs space-y-1">
                  <li>• Se actualiza inmediatamente en el sistema</li>
                  <li>• El usuario debe usar la nueva contraseña en su próximo login</li>
                  <li>• La contraseña debe tener al menos 6 caracteres</li>
                  <li>• Se registrará en los logs de auditoría</li>
                </ul>
              </div>
            </div>
          </div>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCambioPasswordModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={cambiarPasswordMutation.isPending}
                >
                  {cambiarPasswordMutation.isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </ProtectedRoute>
  )
}