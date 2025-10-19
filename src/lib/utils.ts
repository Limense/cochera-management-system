import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utilidades para formateo y cálculos del sistema de cochera
export function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`
}

export function formatDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return date.toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function calcularDuracion(horaEntrada: string | Date): string {
  const entrada = typeof horaEntrada === 'string' ? new Date(horaEntrada) : horaEntrada
  const ahora = new Date()
  const diffMs = ahora.getTime() - entrada.getTime()
  
  const horas = Math.floor(diffMs / (1000 * 60 * 60))
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (horas === 0) {
    return `${minutos} min`
  } else if (minutos === 0) {
    return `${horas}h`
  } else {
    return `${horas}h ${minutos}min`
  }
}

export function calcularTarifa(
  tipoVehiculo: 'auto' | 'moto', 
  horaEntrada: string | Date
): number {
  const entrada = typeof horaEntrada === 'string' ? new Date(horaEntrada) : horaEntrada
  const ahora = new Date()
  const diffMs = ahora.getTime() - entrada.getTime()
  const horas = Math.ceil(diffMs / (1000 * 60 * 60)) // Redondear hacia arriba
  
  // Tarifas por hora
  const tarifas = {
    auto: 6.00,
    moto: 3.00
  }
  
  return Math.max(1, horas) * tarifas[tipoVehiculo]
}

// Función asíncrona para usar pricing dinámico
export async function calcularTarifaDinamicaCompleta(
  tipoVehiculo: 'auto' | 'moto',
  horaEntrada: string | Date,
  horaSalida?: string | Date
): Promise<number> {
  try {
    // Intentar usar pricing dinámico
    const { calcularTarifaDinamica } = await import('@/lib/pricing/calculator')
    return await calcularTarifaDinamica(tipoVehiculo, horaEntrada, horaSalida)
  } catch (error) {
    console.warn('Error en cálculo dinámico, usando tarifa fija:', error)
    // Fallback a cálculo tradicional
    return calcularTarifa(tipoVehiculo, horaEntrada)
  }
}
