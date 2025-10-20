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
import { 
  Settings, 
  Users, 
  DollarSign,
  Shield,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDateTime } from '@/lib/utils'

// Schemas de validación
const usuarioSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'supervisor']),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional()
})

const tarifaSchema = z.object({
  tarifa_auto: z.number().min(0.1, 'Tarifa debe ser mayor a 0'),
  tarifa_moto: z.number().min(0.1, 'Tarifa debe ser mayor a 0')
})

type UsuarioFormData = z.infer<typeof usuarioSchema>
type TarifaFormData = z.infer<typeof tarifaSchema>

interface Profile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'supervisor'
  is_active: boolean
  created_at: string
  created_by?: string
}

export default function ConfiguracionPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'usuarios' | 'tarifas' | 'auditoria'>('usuarios')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()

  // Query para obtener usuarios
  const { data: usuarios = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async (): Promise<Profile[]> => {
      const response = await fetch('/api/usuarios')
      if (!response.ok) {
        throw new Error('Error obteniendo usuarios')
      }
      const data = await response.json()
      return data.usuarios || []
    }
  })

  // Query para obtener logs de auditoría
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_logs')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    }
  })

  // Forms setup
  const userForm = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'supervisor',
      password: ''
    }
  })

  const tarifaForm = useForm<TarifaFormData>({
    resolver: zodResolver(tarifaSchema),
    defaultValues: {
      tarifa_auto: 6.00,
      tarifa_moto: 3.00
    }
  })

  // Mutation para crear/actualizar usuario
  const saveUserMutation = useMutation({
    mutationFn: async (data: UsuarioFormData): Promise<void> => {
      if (editingUser) {
        // Actualizar usuario existente
        const response = await fetch('/api/usuarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            full_name: data.full_name,
            role: data.role
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Error actualizando usuario')
        }
      } else {
        // Crear nuevo usuario
        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password!,
            full_name: data.full_name,
            role: data.role,
            created_by: profile?.id
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Error creando usuario')
        }
      }
    },
    onSuccess: () => {
      toast.success(
        editingUser 
          ? 'Usuario actualizado exitosamente'
          : 'Usuario creado exitosamente'
      )
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setUserModalOpen(false)
      setEditingUser(null)
      userForm.reset()
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })

  // Mutation para cambiar estado de usuario
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }): Promise<void> => {
      const response = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          is_active: isActive
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error actualizando usuario')
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Usuario ${variables.isActive ? 'activado' : 'desactivado'} exitosamente`)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })

  // Verificar permisos de admin
  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acceso Restringido
          </h2>
          <p className="text-gray-600">
            Solo administradores pueden acceder a la configuración del sistema.
          </p>
        </div>
      </div>
    )
  }

  // Handlers
  const handleNewUser = () => {
    setEditingUser(null)
    userForm.reset({
      full_name: '',
      email: '',
      role: 'supervisor',
      password: ''
    })
    setUserModalOpen(true)
  }

  const handleEditUser = (user: Profile) => {
    setEditingUser(user)
    userForm.reset({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      password: '' // No mostrar contraseña existente
    })
    setUserModalOpen(true)
  }

  const onSubmitUser = (data: UsuarioFormData) => {
    saveUserMutation.mutate(data)
  }

  const getActionDescription = (actionType: string): string => {
    const descriptions: Record<string, string> = {
      'entrada_vehiculo': 'registró entrada de vehículo',
      'salida_vehiculo': 'procesó salida y pago',
      'caja_abierta': 'abrió caja',
      'caja_cerrada': 'cerró caja',
      'usuario_creado': 'creó nuevo usuario',
      'configuracion_cambiada': 'modificó configuración',
      'login': 'inició sesión',
      'logout': 'cerró sesión'
    }
    return descriptions[actionType] || actionType
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
            <p className="text-gray-600">Panel de administración y configuración</p>
          </div>
        </div>

      {/* Navegación de tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'usuarios'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('tarifas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'tarifas'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4 inline-block mr-2" />
          Tarifas
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'auditoria'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 inline-block mr-2" />
          Auditoría
        </button>
      </div>

      {/* Contenido de Usuarios */}
      {activeTab === 'usuarios' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Usuarios
              </CardTitle>
              <Button onClick={handleNewUser}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-8 text-gray-500">
                Cargando usuarios...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.full_name}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={usuario.role === 'admin' ? 'default' : 'secondary'}
                          >
                            {usuario.role === 'admin' ? 'Administrador' : 'Supervisor'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              toggleUserMutation.mutate({
                                userId: usuario.id,
                                isActive: !usuario.is_active
                              })
                            }
                            disabled={usuario.id === profile?.id}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              usuario.is_active 
                                ? 'bg-blue-600' 
                                : 'bg-gray-200'
                            } ${usuario.id === profile?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span 
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                usuario.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(usuario.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(usuario)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {usuario.id !== profile?.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`¿Eliminar usuario ${usuario.full_name}?`)) {
                                    // Implementar eliminación
                                    toast.info('Función de eliminación pendiente')
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contenido de Tarifas */}
      {activeTab === 'tarifas' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Configuración de Tarifas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...tarifaForm}>
              <form className="space-y-4 max-w-md">
                <FormField
                  control={tarifaForm.control}
                  name="tarifa_auto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa por Auto (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={tarifaForm.control}
                  name="tarifa_moto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa por Moto (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  Actualizar Tarifas
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Nota importante</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Los cambios de tarifas solo afectan a nuevas sesiones. 
                Las sesiones activas mantendrán la tarifa con la que ingresaron.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido de Auditoría */}
      {activeTab === 'auditoria' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Registro de Auditoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAudit ? (
              <div className="text-center py-8 text-gray-500">
                Cargando registros...
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.profiles?.full_name}</span>
                      <span>{getActionDescription(log.accion_tipo)}</span>
                      {log.monto && (
                        <Badge variant="outline" className="text-green-600">
                          S/ {log.monto}
                        </Badge>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {formatDateTime(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de usuario */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
              <FormField
                control={userForm.control}
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
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="juan@cochera.com" 
                        {...field}
                        disabled={!!editingUser} // No editar email
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione rol" />
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

              {!editingUser && (
                <FormField
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setUserModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={saveUserMutation.isPending}
                >
                  {saveUserMutation.isPending ? 'Guardando...' : 'Guardar'}
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