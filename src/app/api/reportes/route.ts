import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Cliente admin de Supabase para bypasear RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Schema para filtros de reportes
const reporteSchema = z.object({
  tipo: z.enum(['ingresos', 'ocupacion', 'vehiculos', 'espacios', 'tiempos', 'frecuentes']),
  fecha_inicio: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  fecha_fin: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  granularidad: z.enum(['dia', 'semana', 'mes']).default('dia'),
  espacio_numero: z.number().optional(),
  vehiculo_placa: z.string().optional(),
  incluir_activos: z.boolean().default(true),
  formato: z.enum(['json', 'csv']).default('json')
})

// GET - Generar reportes según tipo y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validar parámetros
    const queryParams = {
      tipo: searchParams.get('tipo') || 'ingresos',
      fecha_inicio: searchParams.get('fecha_inicio') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fecha_fin: searchParams.get('fecha_fin') || new Date().toISOString().split('T')[0],
      granularidad: searchParams.get('granularidad') || 'dia',
      espacio_numero: searchParams.get('espacio_numero') ? parseInt(searchParams.get('espacio_numero')!) : undefined,
      vehiculo_placa: searchParams.get('vehiculo_placa') || undefined,
      incluir_activos: searchParams.get('incluir_activos') !== 'false',
      formato: searchParams.get('formato') || 'json'
    }

    const validatedParams = reporteSchema.parse(queryParams)

    let reportData = {}
    
    switch (validatedParams.tipo) {
      case 'ingresos':
        reportData = await generarReporteIngresos(validatedParams)
        break
      case 'ocupacion':
        reportData = await generarReporteOcupacion(validatedParams)
        break
      case 'vehiculos':
        reportData = await generarReporteVehiculos(validatedParams)
        break
      case 'espacios':
        reportData = await generarReporteEspacios(validatedParams)
        break
      case 'tiempos':
        reportData = await generarReporteTiempos(validatedParams)
        break
      case 'frecuentes':
        reportData = await generarReporteFrecuentes(validatedParams)
        break
      default:
        throw new Error('Tipo de reporte no válido')
    }

    return NextResponse.json({
      ...reportData,
      parametros: validatedParams,
      generado_en: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en GET /api/reportes:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          message: 'Los parámetros enviados no cumplen con el formato requerido',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Funciones para generar diferentes tipos de reportes
async function generarReporteIngresos(params: z.infer<typeof reporteSchema>) {
  const { data: sesiones, error } = await supabaseAdmin
    .from('sesiones_parqueo')
    .select(`
      id,
      hora_entrada,
      hora_salida,
      monto_calculado,
      placa,
      espacio_numero,
      is_active,
      tipo_vehiculo
    `)
    .gte('hora_entrada', params.fecha_inicio)
    .lte('hora_entrada', params.fecha_fin + ' 23:59:59')
    .order('hora_entrada', { ascending: true })

  if (error) {
    throw new Error(`Error obteniendo datos de ingresos: ${error.message}`)
  }

  if (!sesiones) {
    return {
      data: [],
      resumen: {
        total_ingresos: 0,
        total_sesiones: 0,
        promedio_por_sesion: 0,
        por_tipo_vehiculo: {},
        sesiones_activas: 0
      },
      tipo: 'ingresos'
    }
  }

  // Filtrar sesiones activas si no se incluyen
  const sesionesFiltered = params.incluir_activos ? sesiones : sesiones.filter(s => !s.is_active)

  // Calcular totales
  const total_ingresos = sesionesFiltered.reduce((sum, sesion) => sum + (sesion.monto_calculado || 0), 0)
  const total_sesiones = sesionesFiltered.length
  const promedio_por_sesion = total_sesiones > 0 ? total_ingresos / total_sesiones : 0

  // Desglose por tipo de vehículo
  const por_tipo: Record<string, { sesiones: number, ingresos: number }> = {}
  
  sesionesFiltered.forEach(sesion => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tipo = (sesion as any).tipo_vehiculo || 'auto'
    if (!por_tipo[tipo]) por_tipo[tipo] = { sesiones: 0, ingresos: 0 }
    por_tipo[tipo].sesiones += 1
    por_tipo[tipo].ingresos += sesion.monto_calculado || 0
  })

  // Agrupar datos por período (día, semana o mes)
  const dataPorPeriodo: Record<string, { periodo: string, ingresos: number, sesiones: number }> = {}
  
  sesionesFiltered.forEach(sesion => {
    const fecha = new Date(sesion.hora_entrada)
    let periodo = ''
    
    if (params.granularidad === 'dia') {
      periodo = fecha.toISOString().split('T')[0] // YYYY-MM-DD
    } else if (params.granularidad === 'semana') {
      const año = fecha.getFullYear()
      const semana = Math.ceil((fecha.getDate() + new Date(fecha.getFullYear(), fecha.getMonth(), 1).getDay()) / 7)
      periodo = `${año}-S${semana.toString().padStart(2, '0')}`
    } else {
      periodo = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`
    }
    
    if (!dataPorPeriodo[periodo]) {
      dataPorPeriodo[periodo] = { periodo, ingresos: 0, sesiones: 0 }
    }
    
    dataPorPeriodo[periodo].ingresos += sesion.monto_calculado || 0
    dataPorPeriodo[periodo].sesiones += 1
  })

  return {
    data: Object.values(dataPorPeriodo),
    resumen: {
      total_ingresos,
      total_sesiones,
      promedio_por_sesion: Math.round(promedio_por_sesion * 100) / 100,
      por_tipo_vehiculo: por_tipo,
      sesiones_activas: sesiones.filter(s => s.is_active).length
    },
    tipo: 'ingresos'
  }
}

async function generarReporteOcupacion(params: z.infer<typeof reporteSchema>) {
  const { data: espacios, error: espaciosError } = await supabaseAdmin
    .from('espacios')
    .select('*')
    .order('numero', { ascending: true })

  if (espaciosError) {
    throw new Error(`Error obteniendo espacios: ${espaciosError.message}`)
  }

  const { data: sesiones, error: sesionesError } = await supabaseAdmin
    .from('sesiones_parqueo')
    .select('*')
    .gte('hora_entrada', params.fecha_inicio)
    .lte('hora_entrada', params.fecha_fin + ' 23:59:59')

  if (sesionesError) {
    throw new Error(`Error obteniendo sesiones: ${sesionesError.message}`)
  }

  if (!espacios || !sesiones) {
    return {
      data: [],
      resumen: {
        total_espacios: 0,
        espacios_disponibles: 0,
        espacios_ocupados: 0,
        espacios_mantenimiento: 0,
        promedio_ocupacion: 0,
        espacio_mas_usado: null
      },
      tipo: 'ocupacion'
    }
  }

  // Calcular estadísticas por espacio
  const estadisticasPorEspacio = espacios.map(espacio => {
    const sesionesEspacio = sesiones.filter(s => s.espacio_numero === espacio.numero)
    const tiempoTotal = sesionesEspacio.reduce((total, sesion) => {
      if (sesion.hora_salida) {
        return total + (new Date(sesion.hora_salida).getTime() - new Date(sesion.hora_entrada).getTime())
      }
      return total
    }, 0)

    const tiempoTotalHoras = tiempoTotal / (1000 * 60 * 60)
    const horasEnPeriodo = (new Date(params.fecha_fin).getTime() - new Date(params.fecha_inicio).getTime()) / (1000 * 60 * 60)
    const porcentajeOcupacion = horasEnPeriodo > 0 ? (tiempoTotalHoras / horasEnPeriodo) * 100 : 0

    return {
      numero: espacio.numero,
      tipo: espacio.tipo,
      estado: espacio.estado,
      total_sesiones: sesionesEspacio.length,
      tiempo_ocupado_horas: Math.round(tiempoTotalHoras * 100) / 100,
      porcentaje_ocupacion: Math.min(Math.round(porcentajeOcupacion * 100) / 100, 100),
      ingresos_generados: sesionesEspacio.reduce((sum, s) => sum + (s.monto_calculado || 0), 0)
    }
  })

  // Estadísticas generales
  const totalEspacios = espacios.length
  const espaciosDisponibles = espacios.filter(e => e.estado === 'disponible').length
  const espaciosOcupados = espacios.filter(e => e.estado === 'ocupado').length
  const espaciosMantenimiento = espacios.filter(e => e.estado === 'mantenimiento').length

  const promedioOcupacion = estadisticasPorEspacio.reduce((sum, e) => sum + e.porcentaje_ocupacion, 0) / totalEspacios

  return {
    data: estadisticasPorEspacio,
    resumen: {
      total_espacios: totalEspacios,
      espacios_disponibles: espaciosDisponibles,
      espacios_ocupados: espaciosOcupados,
      espacios_mantenimiento: espaciosMantenimiento,
      promedio_ocupacion: Math.round(promedioOcupacion * 100) / 100,
      espacio_mas_usado: estadisticasPorEspacio.reduce((max, current) => 
        current.total_sesiones > max.total_sesiones ? current : max, estadisticasPorEspacio[0])
    },
    tipo: 'ocupacion'
  }
}

async function generarReporteVehiculos(params: z.infer<typeof reporteSchema>) {
  // Primero obtenemos todas las sesiones del período
  const { data: sesiones, error: sesionesError } = await supabaseAdmin
    .from('sesiones_parqueo')
    .select('id, hora_entrada, hora_salida, monto_calculado, placa, is_active, tipo_vehiculo')
    .gte('hora_entrada', params.fecha_inicio)
    .lte('hora_entrada', params.fecha_fin + ' 23:59:59')

  if (sesionesError) {
    throw new Error(`Error obteniendo sesiones: ${sesionesError.message}`)
  }

  // Luego obtenemos información de vehículos
  const { data: vehiculos, error: vehiculosError } = await supabaseAdmin
    .from('vehiculos')
    .select('placa, propietario, tipo, marca, color, is_frequent')

  if (vehiculosError) {
    throw new Error(`Error obteniendo vehículos: ${vehiculosError.message}`)
  }

  if (!sesiones) {
    return {
      data: [],
      resumen: {
        total_vehiculos_periodo: 0,
        vehiculos_frecuentes: 0,
        vehiculo_mas_frecuente: null,
        promedio_sesiones: 0
      },
      tipo: 'vehiculos'
    }
  }

  // Crear un mapa de vehículos para acceso rápido
  const vehiculosMap = new Map()
  vehiculos?.forEach(v => {
    vehiculosMap.set(v.placa, v)
  })

  // Agrupar sesiones por vehículo
  const vehiculosStats = new Map()
  
  sesiones.forEach(sesion => {
    if (!vehiculosStats.has(sesion.placa)) {
      const vehiculoData = vehiculosMap.get(sesion.placa)
      vehiculosStats.set(sesion.placa, {
        placa: sesion.placa,
        propietario: vehiculoData?.propietario || 'N/A',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tipo: vehiculoData?.tipo || (sesion as any).tipo_vehiculo || 'auto',
        marca: vehiculoData?.marca || 'N/A',
        color: vehiculoData?.color || 'N/A',
        is_frequent: vehiculoData?.is_frequent || false,
        sesiones: [],
        total_sesiones: 0,
        monto_calculado: 0,
        tiempo_total_minutos: 0
      })
    }
    
    const vehiculo = vehiculosStats.get(sesion.placa)
    vehiculo.sesiones.push(sesion)
    vehiculo.total_sesiones += 1
    vehiculo.monto_calculado += sesion.monto_calculado || 0
    
    if (sesion.hora_salida) {
      const tiempo = new Date(sesion.hora_salida).getTime() - new Date(sesion.hora_entrada).getTime()
      vehiculo.tiempo_total_minutos += Math.round(tiempo / (1000 * 60))
    }
  })

  const estadisticasVehiculos = Array.from(vehiculosStats.values())
  
  // Ordenar por total de sesiones descendente
  estadisticasVehiculos.sort((a, b) => b.total_sesiones - a.total_sesiones)

  return {
    data: estadisticasVehiculos,
    resumen: {
      total_vehiculos_periodo: estadisticasVehiculos.length,
      vehiculos_frecuentes: estadisticasVehiculos.filter(v => v.is_frequent).length,
      vehiculo_mas_frecuente: estadisticasVehiculos[0] || null,
      promedio_sesiones: estadisticasVehiculos.length > 0 ? 
        Math.round(estadisticasVehiculos.reduce((sum, v) => sum + v.total_sesiones, 0) / estadisticasVehiculos.length * 100) / 100 : 0
    },
    tipo: 'vehiculos'
  }
}

async function generarReporteEspacios(params: z.infer<typeof reporteSchema>) {
  return await generarReporteOcupacion(params) // Reutilizar lógica de ocupación
}

async function generarReporteTiempos(params: z.infer<typeof reporteSchema>) {
  const { data: sesiones, error } = await supabaseAdmin
    .from('sesiones_parqueo')
    .select(`
      id,
      hora_entrada,
      hora_salida,
      placa,
      espacio_numero,
      is_active,
      tipo_vehiculo
    `)
    .gte('hora_entrada', params.fecha_inicio)
    .lte('hora_entrada', params.fecha_fin + ' 23:59:59')
    .not('hora_salida', 'is', null) // Solo sesiones completadas

  if (error) {
    throw new Error(`Error obteniendo sesiones: ${error.message}`)
  }

  if (!sesiones || sesiones.length === 0) {
    return {
      data: [],
      resumen: {
        total_sesiones: 0,
        tiempo_promedio_minutos: 0,
        tiempo_maximo_minutos: 0,
        tiempo_minimo_minutos: 0,
        distribucion_por_rangos: {
          '0-30min': 0,
          '31-60min': 0,
          '1-2hrs': 0,
          '2-4hrs': 0,
          '4+hrs': 0
        }
      },
      tipo: 'tiempos'
    }
  }

  // Calcular tiempos de estadía
  const tiemposEstadia = sesiones.map(sesion => {
    const entrada = new Date(sesion.hora_entrada)
    const salida = new Date(sesion.hora_salida!)
    const tiempoMinutos = (salida.getTime() - entrada.getTime()) / (1000 * 60)

    return {
      ...sesion,
      tiempo_minutos: Math.round(tiempoMinutos),
      tiempo_horas: Math.round(tiempoMinutos / 60 * 100) / 100
    }
  })

  // Estadísticas de tiempos
  const tiempos = tiemposEstadia.map(s => s.tiempo_minutos)
  const tiempoPromedio = tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length
  const tiempoMaximo = Math.max(...tiempos)
  const tiempoMinimo = Math.min(...tiempos)

  // Distribución por rangos
  const rangos = {
    '0-30min': tiempos.filter(t => t <= 30).length,
    '31-60min': tiempos.filter(t => t > 30 && t <= 60).length,
    '1-2hrs': tiempos.filter(t => t > 60 && t <= 120).length,
    '2-4hrs': tiempos.filter(t => t > 120 && t <= 240).length,
    '4+hrs': tiempos.filter(t => t > 240).length
  }

  return {
    data: tiemposEstadia,
    resumen: {
      total_sesiones: sesiones.length,
      tiempo_promedio_minutos: Math.round(tiempoPromedio),
      tiempo_maximo_minutos: tiempoMaximo,
      tiempo_minimo_minutos: tiempoMinimo,
      distribucion_por_rangos: rangos
    },
    tipo: 'tiempos'
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generarReporteFrecuentes(params: z.infer<typeof reporteSchema>) {
  const { data: vehiculosFrecuentes, error } = await supabaseAdmin
    .from('vehiculos')
    .select('*')
    .eq('is_frequent', true)

  if (error) {
    throw new Error(`Error obteniendo vehículos frecuentes: ${error.message}`)
  }

  // Obtener sesiones de cada vehículo frecuente
  const vehiculosConSesiones = await Promise.all(
    (vehiculosFrecuentes || []).map(async (vehiculo) => {
      const { data: sesiones } = await supabaseAdmin
        .from('sesiones_parqueo')
        .select('id, hora_entrada, hora_salida, monto_calculado')
        .eq('placa', vehiculo.placa)
        .order('hora_entrada', { ascending: false })
        .limit(10)

      return {
        ...vehiculo,
        sesiones: sesiones || []
      }
    })
  )

  return {
    data: vehiculosConSesiones,
    resumen: {
      total_frecuentes: vehiculosConSesiones.length
    },
    tipo: 'frecuentes'
  }
}
