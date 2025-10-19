// =====================================================
// UTILIDADES DE CÁLCULO - FUNCIONES DE DOMINIO (ESPAÑOL)
// =====================================================
// Lógica de negocio para cálculos de tarifas y tiempos
// =====================================================

import { type TipoVehiculo } from '@/types/database'

// Tarifas base del sistema (configurables)
export const TARIFAS_BASE = {
  auto: 6.00,
  moto: 3.00
} as const

// =====================================================
// FUNCIONES DE DOMINIO (Español)
// =====================================================

/**
 * Calcula la tarifa a cobrar según el tipo de vehículo y duración
 * Regla: Tarifa fija hasta 24 horas, después tarifa adicional por día
 */
export function calcularTarifa(
  tipoVehiculo: TipoVehiculo,
  horaEntrada: string | Date,
  horaSalida: string | Date = new Date()
): number {
  const entrada = new Date(horaEntrada)
  const salida = new Date(horaSalida)
  
  // Calcular duración en horas
  const duracionMs = salida.getTime() - entrada.getTime()
  const duracionHoras = duracionMs / (1000 * 60 * 60)
  
  // Tarifa base según tipo de vehículo
  const tarifaBase = TARIFAS_BASE[tipoVehiculo]
  
  // Regla: Tarifa fija hasta 24 horas
  if (duracionHoras <= 24) {
    return tarifaBase
  }
  
  // Después de 24h, cobrar tarifa adicional por día
  const diasAdicionales = Math.ceil(duracionHoras / 24)
  return tarifaBase * diasAdicionales
}

/**
 * Calcula la duración de una sesión en formato legible
 */
export function calcularDuracion(horaEntrada: string | Date, horaSalida?: string | Date): string {
  const entrada = new Date(horaEntrada)
  const salida = horaSalida ? new Date(horaSalida) : new Date()
  
  const duracionMs = salida.getTime() - entrada.getTime()
  const horas = Math.floor(duracionMs / (1000 * 60 * 60))
  const minutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (horas === 0) {
    return `${minutos} min`
  } else if (horas < 24) {
    return `${horas}h ${minutos}m`
  } else {
    const dias = Math.floor(horas / 24)
    const horasRestantes = horas % 24
    return `${dias}d ${horasRestantes}h ${minutos}m`
  }
}

/**
 * Valida el formato de una placa peruana
 */
export function validarFormatoPlaca(placa: string): boolean {
  // Formato básico: ABC-123 o ABC123 (letras y números)
  const formatoBasico = /^[A-Z]{3}-?\d{3,4}$|^[A-Z]{2}\d{4}$/
  
  // Limpiar espacios y convertir a mayúsculas
  const placaLimpia = placa.trim().toUpperCase()
  
  return formatoBasico.test(placaLimpia)
}

/**
 * Normaliza una placa a formato estándar
 */
export function normalizarPlaca(placa: string): string {
  // Convertir a mayúsculas y eliminar espacios
  let placaNormalizada = placa.trim().toUpperCase()
  
  // Si no tiene guión y tiene formato ABC123, agregar guión
  if (/^[A-Z]{3}\d{3,4}$/.test(placaNormalizada)) {
    placaNormalizada = placaNormalizada.substring(0, 3) + '-' + placaNormalizada.substring(3)
  }
  
  return placaNormalizada
}

/**
 * Busca vehículo por placa (con coincidencias parciales)
 */
export function buscarPorPlaca(placa: string, vehiculos: { placa: string }[]): typeof vehiculos {
  const placaBusqueda = placa.trim().toUpperCase()
  
  return vehiculos.filter(vehiculo => 
    vehiculo.placa.toUpperCase().includes(placaBusqueda)
  )
}

// =====================================================
// UTILIDADES TÉCNICAS (Inglés)
// =====================================================

/**
 * Formats currency in Peruvian Soles
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Formats date and time for display
 */
export function formatDateTime(date: string | Date, includeSeconds = false): string {
  const dateObj = new Date(date)
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  
  if (includeSeconds) {
    options.second = '2-digit'
  }
  
  return new Intl.DateTimeFormat('es-PE', options).format(dateObj)
}

/**
 * Formats date only
 */
export function formatDate(date: string | Date): string {
  const dateObj = new Date(date)
  
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj)
}

/**
 * Formats time only
 */
export function formatTime(date: string | Date): string {
  const dateObj = new Date(date)
  
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateObj)
}

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Gets current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Calculates percentage with safe division
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// =====================================================
// CONSTANTES DEL SISTEMA
// =====================================================

export const SISTEMA_CONFIG = {
  // Configuración de espacios
  TOTAL_ESPACIOS: 45,
  ESPACIOS_RANGE: { min: 1, max: 45 },
  
  // Configuración de sesiones
  SESSION_TIMEOUT_MINUTES: 15,
  MAX_SESSION_HOURS: 8,
  REFRESH_INTERVAL_MINUTES: 60,
  
  // Configuración de polling
  DASHBOARD_REFRESH_MS: 30000, // 30 segundos
  REALTIME_ENABLED: true,
  
  // Validaciones
  PLACA_MIN_LENGTH: 6,
  PLACA_MAX_LENGTH: 8,
  
  // Formatos
  DATE_FORMAT: 'dd/MM/yyyy',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm'
} as const

export const MENSAJES_SISTEMA = {
  // Mensajes de éxito
  ENTRADA_EXITOSA: 'Vehículo registrado exitosamente',
  SALIDA_EXITOSA: 'Salida procesada correctamente',
  PAGO_PROCESADO: 'Pago registrado exitosamente',
  
  // Mensajes de error
  PLACA_INVALIDA: 'Formato de placa inválido',
  ESPACIO_OCUPADO: 'El espacio seleccionado está ocupado',
  VEHICULO_NO_ENCONTRADO: 'Vehículo no encontrado',
  SIN_ESPACIOS_DISPONIBLES: 'No hay espacios disponibles',
  ERROR_CONEXION: 'Error de conexión con el servidor',
  
  // Mensajes de advertencia
  SESION_EXPIRANDO: 'Su sesión expirará pronto',
  DATOS_NO_GUARDADOS: 'Hay datos sin guardar',
  CONFIRMAR_SALIDA: '¿Está seguro de procesar la salida?'
} as const