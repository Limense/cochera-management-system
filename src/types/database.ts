// =====================================================
// TIPOS DE BASE DE DATOS - CONVENCIÓN HÍBRIDA
// =====================================================
// Español: Campos de negocio, conceptos del dominio
// Inglés: Campos técnicos, metadatos del sistema
// =====================================================

// ENUMS (Valores en español)
export type UserRole = 'admin' | 'supervisor'
export type TipoVehiculo = 'auto' | 'moto'
export type EstadoEspacio = 'disponible' | 'ocupado' | 'mantenimiento'
export type EstadoPago = 'pendiente' | 'pagado' | 'cancelado'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'yape' | 'plin'
export type EstadoTurno = 'abierto' | 'cerrado'
export type AccionAuditoria = 
  | 'entrada_vehiculo' 
  | 'salida_vehiculo' 
  | 'pago_procesado'
  | 'caja_abierta' 
  | 'caja_cerrada'
  | 'usuario_creado' 
  | 'usuario_actualizado'
  | 'configuracion_cambiada' 
  | 'login' 
  | 'logout' 
  | 'tarifa_modificada'
  | 'espacio_mantenimiento'

// =====================================================
// INTERFACES PRINCIPALES (Convención Híbrida)
// =====================================================

// Perfil de usuario (extensión de auth.users)
export interface Profile {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Campos visibles al usuario
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  
  // TÉCNICOS (Inglés) - Metadatos del sistema
  created_by?: string
  last_login?: string
}

// Espacio de estacionamiento
export interface Espacio {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Conceptos del dominio
  numero: number
  estado: EstadoEspacio
  tipo: TipoVehiculo | 'mixto'
  ubicacion?: string
  tarifa_auto: number
  tarifa_moto: number
  
  // TÉCNICOS (Inglés) - Metadatos
  last_occupied_at?: string
  maintenance_notes?: string
}

// Registro de vehículo
export interface Vehiculo {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Campos visibles al usuario
  placa: string
  propietario?: string
  telefono?: string
  tipo_vehiculo: TipoVehiculo
  color?: string
  marca?: string
  
  // TÉCNICOS (Inglés) - Metadatos
  visit_count: number
  last_visit: string
}

// Sesión de estacionamiento (tabla principal)
export interface SesionParqueo {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Conceptos del dominio
  placa: string
  espacio_numero: number
  tipo_vehiculo: TipoVehiculo
  hora_entrada: string
  hora_salida?: string
  monto_calculado?: number
  estado_pago: EstadoPago
  metodo_pago?: MetodoPago
  
  // TÉCNICOS (Inglés) - Metadatos del sistema
  session_id: string
  processed_by?: string
  session_duration?: string // INTERVAL como string
  is_active: boolean
}

// Control de caja/turno
export interface ControlCaja {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Conceptos operativos
  fecha: string // DATE
  empleado_id: string
  hora_apertura: string
  hora_cierre?: string
  dinero_inicial: number
  dinero_final?: number
  dinero_esperado?: number
  diferencia?: number
  estado_turno: EstadoTurno
  observaciones?: string
  
  // TÉCNICOS (Inglés) - Metadatos
  shift_duration?: string // INTERVAL como string
}

// Registro de auditoría
export interface AuditoriaLog {
  // TÉCNICOS (Inglés)
  id: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  
  // NEGOCIO (Español) - Acciones del dominio
  usuario_id: string
  accion_tipo: AccionAuditoria
  tabla_afectada?: string
  registro_id?: string
  detalles: Record<string, unknown> // JSONB
  monto?: number
  
  // TÉCNICOS (Inglés) - Metadatos adicionales
  session_id?: string
  correlation_id?: string
}

// Resumen diario automatizado
export interface ResumenDiario {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Métricas del negocio
  fecha: string // DATE
  ingresos_totales: number
  total_vehiculos: number
  cantidad_autos: number
  cantidad_motos: number
  tiempo_promedio_estadia?: string // INTERVAL como string
  espacios_max_ocupados: number
  hora_pico?: string // TIME
  
  // TÉCNICOS (Inglés) - Metadatos calculados
  occupancy_rate: number
  avg_revenue_per_vehicle: number
}

// Tarifas dinámicas por horarios y días
export interface TarifaDinamica {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Configuración de tarifa
  nombre: string
  descripcion?: string
  tipo_vehiculo: TipoVehiculo
  
  // Horarios (formato HH:MM)
  hora_inicio: string // "06:00"
  hora_fin: string // "22:00"
  
  // Días de la semana (0=domingo, 1=lunes, ..., 6=sábado)
  dias_semana: number[] // [1,2,3,4,5] para lunes-viernes
  
  // Tarifas
  tarifa_primera_hora: number
  tarifa_hora_adicional: number
  tarifa_minima: number // Monto mínimo a cobrar
  tarifa_maxima?: number // Techo máximo (opcional)
  
  // TÉCNICOS (Inglés) - Metadatos
  is_active: boolean
  prioridad: number // Para resolver conflictos (mayor prioridad gana)
  created_by: string
  last_modified_by?: string
}

// Configuración global de pricing
export interface ConfiguracionPricing {
  // TÉCNICOS (Inglés)
  id: string
  created_at: string
  updated_at: string
  
  // NEGOCIO (Español) - Configuraciones globales
  redondeo_minutos: number // Redondear a 15, 30, 60 minutos
  tiempo_gracia_minutos: number // Tiempo gratis al inicio
  aplicar_tarifa_nocturna: boolean
  aplicar_tarifa_fin_semana: boolean
  
  // TÉCNICOS (Inglés) - Metadatos
  modified_by: string
  version: number
}

// =====================================================
// INTERFACES DE FORMULARIOS (NEGOCIO EN ESPAÑOL)
// =====================================================

// Formulario de entrada de vehículo
export interface FormularioEntrada {
  // NEGOCIO (Español) - Lo que ve el usuario
  placa: string
  tipoVehiculo: TipoVehiculo
  espacioNumero: number
  propietario?: string
  telefono?: string
}

// Formulario de salida de vehículo
export interface FormularioSalida {
  // NEGOCIO (Español)
  sesionId: string
  metodoPago: MetodoPago
  montoTotal: number
  observaciones?: string
}

// Formulario de usuario (admin)
export interface FormularioUsuario {
  // NEGOCIO (Español)
  full_name: string
  email: string
  role: UserRole
  password?: string // Solo al crear
}

// =====================================================
// TIPOS DE CONSULTAS Y VISTAS
// =====================================================

// Vista completa de sesión con datos relacionados
export interface SesionCompleta extends SesionParqueo {
  vehiculo?: Vehiculo
  espacio?: Espacio
  procesado_por_profile?: Profile
}

// Métricas del dashboard
export interface MetricasDashboard {
  // NEGOCIO (Español) - Métricas visibles
  espacios_disponibles: number
  espacios_ocupados: number
  ingresos_del_dia: number
  vehiculos_activos: number
  
  // TÉCNICOS (Inglés) - Metadatos
  last_updated: string
  total_espacios: number
}

// Vista de espacio con estado actual
export interface EspacioConEstado extends Espacio {
  // Estado calculado en tiempo real
  sesion_activa?: SesionParqueo
  ocupado_por?: string // placa del vehículo
  tiempo_ocupado?: string
}

// =====================================================
// TIPOS DE UTILIDAD TÉCNICOS (INGLÉS)
// =====================================================

// Respuesta estándar de API
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  timestamp: string
}

// Parámetros de paginación
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Filtros de búsqueda
export interface SearchFilters {
  fecha_desde?: string
  fecha_hasta?: string
  tipo_vehiculo?: TipoVehiculo
  estado_pago?: EstadoPago
  placa?: string
}

// =====================================================
// TIPOS PARA HOOKS Y QUERIES (TÉCNICOS EN INGLÉS)
// =====================================================

export type QueryKey = string[]
export type MutationOptions<T> = {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

// =====================================================
// EXPORTS PARA COMPATIBILIDAD
// =====================================================

// Alias para mantener compatibilidad con código existente
export type Usuario = Profile
export type Sesion = SesionParqueo
export type SesionEstacionamiento = SesionParqueo

// Tipo de base de datos de Supabase (auto-generado eventualmente)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      espacios: {
        Row: Espacio
        Insert: Omit<Espacio, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Espacio, 'id' | 'created_at' | 'updated_at'>>
      }
      vehiculos: {
        Row: Vehiculo
        Insert: Omit<Vehiculo, 'id' | 'created_at' | 'updated_at' | 'visit_count' | 'last_visit'>
        Update: Partial<Omit<Vehiculo, 'id' | 'created_at' | 'updated_at'>>
      }
      sesiones_parqueo: {
        Row: SesionParqueo
        Insert: Omit<SesionParqueo, 'id' | 'created_at' | 'updated_at' | 'session_id' | 'session_duration' | 'is_active'>
        Update: Partial<Omit<SesionParqueo, 'id' | 'created_at' | 'updated_at' | 'session_id' | 'session_duration' | 'is_active'>>
      }
      control_caja: {
        Row: ControlCaja
        Insert: Omit<ControlCaja, 'id' | 'created_at' | 'updated_at' | 'diferencia' | 'shift_duration'>
        Update: Partial<Omit<ControlCaja, 'id' | 'created_at' | 'updated_at' | 'diferencia' | 'shift_duration'>>
      }
      auditoria_logs: {
        Row: AuditoriaLog
        Insert: Omit<AuditoriaLog, 'id' | 'timestamp'>
        Update: never // Los logs no se actualizan
      }
      resumen_diario: {
        Row: ResumenDiario
        Insert: Omit<ResumenDiario, 'id' | 'created_at' | 'updated_at' | 'occupancy_rate' | 'avg_revenue_per_vehicle'>
        Update: Partial<Omit<ResumenDiario, 'id' | 'created_at' | 'updated_at' | 'occupancy_rate' | 'avg_revenue_per_vehicle'>>
      }
      tarifas_dinamicas: {
        Row: TarifaDinamica
        Insert: Omit<TarifaDinamica, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TarifaDinamica, 'id' | 'created_at' | 'updated_at'>>
      }
      configuracion_pricing: {
        Row: ConfiguracionPricing
        Insert: Omit<ConfiguracionPricing, 'id' | 'created_at' | 'updated_at' | 'version'>
        Update: Partial<Omit<ConfiguracionPricing, 'id' | 'created_at' | 'updated_at' | 'version'>>
      }
    }
  }
}

// Dashboard specific types
export interface MetricasDashboard {
  espacios_disponibles: number
  espacios_ocupados: number
  ingresos_del_dia: number
  vehiculos_activos: number
  last_updated: string
  total_espacios: number
}

// Response types for forms and API
export interface CreateSesionRequest {
  espacio_numero: number
  placa: string
  tipo_vehiculo: TipoVehiculo
}

export interface EndSesionRequest {
  sesion_id: string
  monto_calculado: number
}