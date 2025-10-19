// =====================================================
// CALCULADORA DE PRICING DINÁMICO
// =====================================================
// Integra el sistema de tarifas dinámicas con los cálculos existentes

import { supabase } from '@/lib/supabase/client'
import { TarifaDinamica, TipoVehiculo, ConfiguracionPricing } from '@/types/database'

// Resultado detallado del cálculo
export interface CalculoPricingDetallado {
  monto_total: number
  tarifa_aplicada: TarifaDinamica | null
  configuracion_aplicada: ConfiguracionPricing | null
  desglose: {
    tiempo_total_minutos: number
    tiempo_gracia_aplicado: number
    tiempo_facturable_minutos: number
    horas_completas: number
    minutos_adicionales: number
    tarifa_primera_hora: number
    tarifa_horas_adicionales: number
    tarifa_minima: number
    redondeo_aplicado: boolean
  }
  es_tarifa_fija: boolean
  observaciones: string[]
}

// Función principal para calcular pricing dinámico
export async function calcularPricingDinamico(
  tipoVehiculo: TipoVehiculo,
  horaEntrada: string | Date,
  horaSalida: string | Date = new Date()
): Promise<CalculoPricingDetallado> {
  
  const entrada = typeof horaEntrada === 'string' ? new Date(horaEntrada) : horaEntrada
  const salida = typeof horaSalida === 'string' ? new Date(horaSalida) : horaSalida
  
  const observaciones: string[] = []
  
  // 1. Obtener configuración global de pricing
  const { data: config } = await supabase
    .from('configuracion_pricing')
    .select('*')
    .single()
  
  // 2. Calcular tiempo total en minutos
  const diffMs = salida.getTime() - entrada.getTime()
  const tiempoTotalMinutos = Math.max(0, Math.floor(diffMs / (1000 * 60)))
  
  // 3. Aplicar tiempo de gracia si está configurado
  const tiempoGracia = config?.tiempo_gracia_minutos || 0
  const tiempoFacturable = Math.max(0, tiempoTotalMinutos - tiempoGracia)
  
  if (tiempoGracia > 0 && tiempoTotalMinutos <= tiempoGracia) {
    observaciones.push(`Tiempo de gracia aplicado: ${tiempoGracia} minutos`)
  }
  
  // 4. Buscar tarifa dinámica aplicable
  const tarifaDinamica = await buscarTarifaAplicable(tipoVehiculo, entrada)
  
  if (!tarifaDinamica) {
    // Fallback a tarifa fija tradicional
    return calcularTarifaFija(tipoVehiculo, tiempoFacturable, config, {
      tiempo_total_minutos: tiempoTotalMinutos,
      tiempo_gracia_aplicado: tiempoGracia,
      observaciones
    })
  }
  
  // 5. Aplicar redondeo si está configurado
  let tiempoParaCalculo = tiempoFacturable
  let redondeoAplicado = false
  
  if (config?.redondeo_minutos && config.redondeo_minutos > 1) {
    const redondeo = config.redondeo_minutos
    tiempoParaCalculo = Math.ceil(tiempoFacturable / redondeo) * redondeo
    redondeoAplicado = tiempoParaCalculo !== tiempoFacturable
    
    if (redondeoAplicado) {
      observaciones.push(`Redondeo aplicado a ${redondeo} minutos`)
    }
  }
  
  // 6. Calcular monto con tarifa dinámica
  const horasCompletas = Math.floor(tiempoParaCalculo / 60)
  const minutosAdicionales = tiempoParaCalculo % 60
  
  let montoTotal = 0
  
  // Primera hora
  if (tiempoParaCalculo > 0) {
    montoTotal += tarifaDinamica.tarifa_primera_hora
  }
  
  // Horas adicionales completas
  if (horasCompletas > 1) {
    montoTotal += (horasCompletas - 1) * tarifaDinamica.tarifa_hora_adicional
  }
  
  // Minutos adicionales (se cobran como fracción de hora)
  if (minutosAdicionales > 0 && horasCompletas >= 1) {
    const fraccionHora = minutosAdicionales / 60
    montoTotal += fraccionHora * tarifaDinamica.tarifa_hora_adicional
  }
  
  // 7. Aplicar tarifa mínima
  const tarifaMinima = tarifaDinamica.tarifa_minima
  if (montoTotal < tarifaMinima) {
    montoTotal = tarifaMinima
    observaciones.push(`Tarifa mínima aplicada: S/ ${tarifaMinima.toFixed(2)}`)
  }
  
  // 8. Aplicar tarifa máxima si existe
  if (tarifaDinamica.tarifa_maxima && montoTotal > tarifaDinamica.tarifa_maxima) {
    montoTotal = tarifaDinamica.tarifa_maxima
    observaciones.push(`Tarifa máxima aplicada: S/ ${tarifaDinamica.tarifa_maxima.toFixed(2)}`)
  }
  
  observaciones.push(`Tarifa dinámica aplicada: ${tarifaDinamica.nombre}`)
  
  return {
    monto_total: Number(montoTotal.toFixed(2)),
    tarifa_aplicada: tarifaDinamica,
    configuracion_aplicada: config,
    desglose: {
      tiempo_total_minutos: tiempoTotalMinutos,
      tiempo_gracia_aplicado: tiempoGracia,
      tiempo_facturable_minutos: tiempoFacturable,
      horas_completas: horasCompletas,
      minutos_adicionales: minutosAdicionales,
      tarifa_primera_hora: tarifaDinamica.tarifa_primera_hora,
      tarifa_horas_adicionales: tarifaDinamica.tarifa_hora_adicional,
      tarifa_minima: tarifaDinamica.tarifa_minima,
      redondeo_aplicado: redondeoAplicado
    },
    es_tarifa_fija: false,
    observaciones
  }
}

// Buscar la tarifa dinámica más apropiada
async function buscarTarifaAplicable(
  tipoVehiculo: TipoVehiculo,
  horaEntrada: Date
): Promise<TarifaDinamica | null> {
  
  // Obtener día de la semana y hora de la entrada
  const diaEntrada = horaEntrada.getDay() // 0=domingo, 1=lunes, etc.
  const horaEntradaStr = horaEntrada.toTimeString().substring(0, 5) // "HH:MM"
  
  // Buscar tarifas activas para este tipo de vehículo
  const { data: tarifas, error } = await supabase
    .from('tarifas_dinamicas')
    .select('*')
    .eq('tipo_vehiculo', tipoVehiculo)
    .eq('is_active', true)
    .order('prioridad', { ascending: false }) // Mayor prioridad primero
  
  if (error || !tarifas?.length) {
    return null
  }
  
  // Filtrar tarifas que aplican para este día y hora
  const tarifasAplicables = tarifas.filter(tarifa => {
    // Verificar día de la semana
    if (!tarifa.dias_semana.includes(diaEntrada)) {
      return false
    }
    
    // Verificar rango horario
    // Manejar rangos que cruzan medianoche (ej: 22:00 - 06:00)
    const horaInicio = tarifa.hora_inicio
    const horaFin = tarifa.hora_fin
    
    if (horaInicio <= horaFin) {
      // Rango normal (ej: 06:00 - 22:00)
      return horaEntradaStr >= horaInicio && horaEntradaStr <= horaFin
    } else {
      // Rango nocturno que cruza medianoche (ej: 22:00 - 06:00)
      return horaEntradaStr >= horaInicio || horaEntradaStr <= horaFin
    }
  })
  
  // Retornar la tarifa con mayor prioridad
  return tarifasAplicables[0] || null
}

// Fallback a sistema de tarifa fija
function calcularTarifaFija(
  tipoVehiculo: TipoVehiculo,
  tiempoFacturableMinutos: number,
  config: ConfiguracionPricing | null,
  datosBase: {
    tiempo_total_minutos: number
    tiempo_gracia_aplicado: number
    observaciones: string[]
  }
): CalculoPricingDetallado {
  
  // Tarifas fijas tradicionales
  const tarifasPorHora = {
    auto: 6.00,
    moto: 3.00
  }
  
  const tarifaHora = tarifasPorHora[tipoVehiculo]
  const horas = Math.max(1, Math.ceil(tiempoFacturableMinutos / 60))
  const montoTotal = horas * tarifaHora
  
  datosBase.observaciones.push('Tarifa fija aplicada (sin configuración dinámica)')
  
  return {
    monto_total: Number(montoTotal.toFixed(2)),
    tarifa_aplicada: null,
    configuracion_aplicada: config,
    desglose: {
      tiempo_total_minutos: datosBase.tiempo_total_minutos,
      tiempo_gracia_aplicado: datosBase.tiempo_gracia_aplicado,
      tiempo_facturable_minutos: tiempoFacturableMinutos,
      horas_completas: horas,
      minutos_adicionales: 0,
      tarifa_primera_hora: tarifaHora,
      tarifa_horas_adicionales: tarifaHora,
      tarifa_minima: tarifaHora,
      redondeo_aplicado: false
    },
    es_tarifa_fija: true,
    observaciones: datosBase.observaciones
  }
}

// Función simplificada para usar en la interfaz (backward compatibility)
export async function calcularTarifaDinamica(
  tipoVehiculo: TipoVehiculo,
  horaEntrada: string | Date,
  horaSalida?: string | Date
): Promise<number> {
  const resultado = await calcularPricingDinamico(tipoVehiculo, horaEntrada, horaSalida)
  return resultado.monto_total
}

// Función para simular cálculo (para previsualizaciones)
export async function simularPricingDinamico(
  tipoVehiculo: TipoVehiculo,
  minutosEstadia: number,
  fechaHoraReferencia: Date = new Date()
): Promise<CalculoPricingDetallado> {
  
  const horaEntrada = new Date(fechaHoraReferencia)
  const horaSalida = new Date(fechaHoraReferencia.getTime() + (minutosEstadia * 60 * 1000))
  
  return calcularPricingDinamico(tipoVehiculo, horaEntrada, horaSalida)
}

// Obtener tarifas activas para mostrar en UI
export async function obtenerTarifasActivas(): Promise<TarifaDinamica[]> {
  const { data, error } = await supabase
    .from('tarifas_dinamicas')
    .select('*')
    .eq('is_active', true)
    .order('tipo_vehiculo', { ascending: true })
    .order('prioridad', { ascending: false })
  
  if (error) {
    console.error('Error obteniendo tarifas activas:', error)
    return []
  }
  
  return data || []
}

// Validar si hay conflictos entre tarifas
export async function validarConflictosTarifas(
  tarifa: Omit<TarifaDinamica, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>,
  tarifaId?: string
): Promise<{ tieneConflictos: boolean; conflictos: string[] }> {
  
  const conflictos: string[] = []
  
  // Buscar tarifas que puedan entrar en conflicto
  const { data: tarifasExistentes } = await supabase
    .from('tarifas_dinamicas')
    .select('*')
    .eq('tipo_vehiculo', tarifa.tipo_vehiculo)
    .eq('is_active', true)
    .neq('id', tarifaId || '') // Excluir la misma tarifa en caso de edición
  
  if (!tarifasExistentes?.length) {
    return { tieneConflictos: false, conflictos: [] }
  }
  
  // Verificar conflictos de horarios y días
  for (const tarifaExistente of tarifasExistentes) {
    // Verificar si hay días en común
    const diasEnComun = tarifa.dias_semana.some(dia => 
      tarifaExistente.dias_semana.includes(dia)
    )
    
    if (!diasEnComun) continue
    
    // Verificar si hay solapamiento de horarios
    const haySolapamiento = verificarSolapamientoHorarios(
      tarifa.hora_inicio,
      tarifa.hora_fin,
      tarifaExistente.hora_inicio,
      tarifaExistente.hora_fin
    )
    
    if (haySolapamiento) {
      // Si tienen la misma prioridad, es un conflicto
      if (tarifa.prioridad === tarifaExistente.prioridad) {
        conflictos.push(
          `Conflicto con tarifa "${tarifaExistente.nombre}" - misma prioridad (${tarifa.prioridad})`
        )
      }
    }
  }
  
  return {
    tieneConflictos: conflictos.length > 0,
    conflictos
  }
}

// Verificar solapamiento entre rangos horarios
function verificarSolapamientoHorarios(
  inicio1: string,
  fin1: string,
  inicio2: string,
  fin2: string
): boolean {
  
  // Convertir horarios a minutos para facilitar comparación
  const minutosInicio1 = convertirHoraAMinutos(inicio1)
  const minutosFin1 = convertirHoraAMinutos(fin1)
  const minutosInicio2 = convertirHoraAMinutos(inicio2)
  const minutosFin2 = convertirHoraAMinutos(fin2)
  
  // Manejar rangos que cruzan medianoche
  const cruza1 = minutosInicio1 > minutosFin1
  const cruza2 = minutosInicio2 > minutosFin2
  
  if (!cruza1 && !cruza2) {
    // Ambos rangos son normales
    return !(minutosFin1 < minutosInicio2 || minutosFin2 < minutosInicio1)
  }
  
  // Si alguno cruza medianoche, hay solapamiento
  return true
}

function convertirHoraAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}