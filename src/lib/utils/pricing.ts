import { TarifaDinamica } from '@/types/database'

// Plantillas predefinidas de tarifas por horarios
export const PLANTILLAS_TARIFAS = {
  // Tarifas diurnas (6:00 AM - 10:00 PM)
  DIURNA_AUTO: {
    nombre: 'Tarifa Diurna - Autos',
    descripcion: 'Tarifa estándar para autos durante horario diurno',
    tipo_vehiculo: 'auto' as const,
    hora_inicio: '06:00',
    hora_fin: '22:00',
    dias_semana: [1, 2, 3, 4, 5], // Lunes a viernes
    tarifa_primera_hora: 5.00,
    tarifa_hora_adicional: 3.00,
    tarifa_minima: 2.50,
    tarifa_maxima: 30.00,
    prioridad: 1
  },
  
  DIURNA_MOTO: {
    nombre: 'Tarifa Diurna - Motos',
    descripcion: 'Tarifa estándar para motos durante horario diurno',
    tipo_vehiculo: 'moto' as const,
    hora_inicio: '06:00',
    hora_fin: '22:00',
    dias_semana: [1, 2, 3, 4, 5], // Lunes a viernes
    tarifa_primera_hora: 3.00,
    tarifa_hora_adicional: 2.00,
    tarifa_minima: 1.50,
    tarifa_maxima: 20.00,
    prioridad: 1
  },

  // Tarifas nocturnas (10:00 PM - 6:00 AM)
  NOCTURNA_AUTO: {
    nombre: 'Tarifa Nocturna - Autos',
    descripcion: 'Tarifa especial para autos durante horario nocturno',
    tipo_vehiculo: 'auto' as const,
    hora_inicio: '22:00',
    hora_fin: '06:00',
    dias_semana: [1, 2, 3, 4, 5], // Lunes a viernes
    tarifa_primera_hora: 4.00,
    tarifa_hora_adicional: 2.50,
    tarifa_minima: 2.00,
    tarifa_maxima: 25.00,
    prioridad: 2 // Mayor prioridad que diurna
  },

  NOCTURNA_MOTO: {
    nombre: 'Tarifa Nocturna - Motos',
    descripcion: 'Tarifa especial para motos durante horario nocturno',
    tipo_vehiculo: 'moto' as const,
    hora_inicio: '22:00',
    hora_fin: '06:00',
    dias_semana: [1, 2, 3, 4, 5], // Lunes a viernes
    tarifa_primera_hora: 2.50,
    tarifa_hora_adicional: 1.50,
    tarifa_minima: 1.00,
    tarifa_maxima: 15.00,
    prioridad: 2
  },

  // Tarifas de fin de semana
  FIN_SEMANA_AUTO: {
    nombre: 'Tarifa Fin de Semana - Autos',
    descripcion: 'Tarifa especial para autos durante fines de semana',
    tipo_vehiculo: 'auto' as const,
    hora_inicio: '00:00',
    hora_fin: '23:59',
    dias_semana: [6, 0], // Sábado y domingo
    tarifa_primera_hora: 6.00,
    tarifa_hora_adicional: 4.00,
    tarifa_minima: 3.00,
    tarifa_maxima: 40.00,
    prioridad: 3 // Máxima prioridad
  },

  FIN_SEMANA_MOTO: {
    nombre: 'Tarifa Fin de Semana - Motos',
    descripcion: 'Tarifa especial para motos durante fines de semana',
    tipo_vehiculo: 'moto' as const,
    hora_inicio: '00:00',
    hora_fin: '23:59',
    dias_semana: [6, 0], // Sábado y domingo
    tarifa_primera_hora: 4.00,
    tarifa_hora_adicional: 2.50,
    tarifa_minima: 2.00,
    tarifa_maxima: 25.00,
    prioridad: 3
  }
}

// Configuración por defecto del sistema
export const CONFIGURACION_DEFAULT = {
  redondeo_minutos: 15, // Redondear a 15 minutos
  tiempo_gracia_minutos: 10, // 10 minutos gratis
  aplicar_tarifa_nocturna: true,
  aplicar_tarifa_fin_semana: true
}

// Función para obtener la tarifa aplicable en un momento específico
export function obtenerTarifaAplicable(
  tarifas: TarifaDinamica[],
  tipoVehiculo: 'auto' | 'moto',
  fecha: Date
): TarifaDinamica | null {
  const dia = fecha.getDay() // 0=domingo, 1=lunes, etc.
  const hora = fecha.toTimeString().slice(0, 5) // "HH:MM"
  
  // Filtrar tarifas por tipo de vehículo y que estén activas
  const tarifasValidas = tarifas.filter(t => 
    t.tipo_vehiculo === tipoVehiculo && 
    t.is_active
  )
  
  // Buscar tarifa que aplique para el día y hora específicos
  const tarifasAplicables = tarifasValidas.filter(t => {
    const aplicaPorDia = t.dias_semana.includes(dia)
    
    // Manejar horarios que cruzan medianoche (ej: 22:00 - 06:00)
    const horaInicio = t.hora_inicio
    const horaFin = t.hora_fin
    
    let aplicaPorHora = false
    
    if (horaInicio <= horaFin) {
      // Horario normal (ej: 06:00 - 22:00)
      aplicaPorHora = hora >= horaInicio && hora <= horaFin
    } else {
      // Horario que cruza medianoche (ej: 22:00 - 06:00)
      aplicaPorHora = hora >= horaInicio || hora <= horaFin
    }
    
    return aplicaPorDia && aplicaPorHora
  })
  
  // Retornar la tarifa con mayor prioridad
  if (tarifasAplicables.length > 0) {
    return tarifasAplicables.reduce((prev, current) => 
      current.prioridad > prev.prioridad ? current : prev
    )
  }
  
  // Si no hay tarifa específica, retornar la de mayor prioridad general
  if (tarifasValidas.length > 0) {
    return tarifasValidas.reduce((prev, current) => 
      current.prioridad > prev.prioridad ? current : prev
    )
  }
  
  return null
}

// Función para calcular el costo con una tarifa específica
export function calcularCostoConTarifa(
  tarifa: TarifaDinamica,
  tiempoTotalMinutos: number,
  configuracion: {
    redondeo_minutos: number
    tiempo_gracia_minutos: number
  }
): {
  montoTotal: number
  detalleCalculo: {
    tiempoTotal: number
    tiempoFacturable: number
    primeraHora: number
    horasAdicionales: number
    montoMinimo: number
    redondeoAplicado: boolean
  }
} {
  // Aplicar tiempo de gracia
  if (tiempoTotalMinutos <= configuracion.tiempo_gracia_minutos) {
    return {
      montoTotal: 0,
      detalleCalculo: {
        tiempoTotal: tiempoTotalMinutos,
        tiempoFacturable: 0,
        primeraHora: 0,
        horasAdicionales: 0,
        montoMinimo: 0,
        redondeoAplicado: false
      }
    }
  }

  // Aplicar redondeo
  let tiempoFacturable = tiempoTotalMinutos
  const redondeoAplicado = tiempoFacturable % configuracion.redondeo_minutos !== 0
  
  if (redondeoAplicado) {
    tiempoFacturable = Math.ceil(tiempoFacturable / configuracion.redondeo_minutos) * configuracion.redondeo_minutos
  }

  // Calcular costo
  let montoTotal = 0
  
  // Primera hora (o fracción)
  const minutosParaPrimeraHora = Math.min(tiempoFacturable, 60)
  const fraccionPrimeraHora = minutosParaPrimeraHora / 60
  montoTotal += fraccionPrimeraHora * tarifa.tarifa_primera_hora

  // Horas adicionales
  const minutosAdicionales = Math.max(0, tiempoFacturable - 60)
  const horasAdicionales = minutosAdicionales / 60
  montoTotal += horasAdicionales * tarifa.tarifa_hora_adicional

  // Aplicar mínimo y máximo
  montoTotal = Math.max(montoTotal, tarifa.tarifa_minima)
  if (tarifa.tarifa_maxima) {
    montoTotal = Math.min(montoTotal, tarifa.tarifa_maxima)
  }

  // Redondear a centavos
  montoTotal = Math.round(montoTotal * 100) / 100

  return {
    montoTotal,
    detalleCalculo: {
      tiempoTotal: tiempoTotalMinutos,
      tiempoFacturable,
      primeraHora: minutosParaPrimeraHora,
      horasAdicionales: minutosAdicionales,
      montoMinimo: tarifa.tarifa_minima,
      redondeoAplicado
    }
  }
}

// Función para formatear horarios de manera legible
export function formatearHorario(horaInicio: string, horaFin: string): string {
  // Convertir a formato de 12 horas
  const formatHora = (hora: string) => {
    const [h, m] = hora.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hora12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hora12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  // Manejar horarios que cruzan medianoche
  if (horaInicio > horaFin) {
    return `${formatHora(horaInicio)} - ${formatHora(horaFin)} (+1 día)`
  } else {
    return `${formatHora(horaInicio)} - ${formatHora(horaFin)}`
  }
}

// Función para formatear días de la semana
export function formatearDiasSemana(dias: number[]): string {
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  // Casos especiales
  if (dias.length === 7) return 'Todos los días'
  if (dias.length === 5 && dias.every(d => d >= 1 && d <= 5)) return 'Lunes a Viernes'
  if (dias.length === 2 && dias.includes(0) && dias.includes(6)) return 'Fines de semana'
  
  // Lista de días específicos
  return dias.map(d => nombresDias[d]).join(', ')
}