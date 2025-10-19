// =====================================================
// SIMULADOR DE PRICING DINÁMICO - TESTING TOOL
// =====================================================

import { simularPricingDinamico } from '@/lib/pricing/calculator'
import { TipoVehiculo } from '@/types/database'

// Datos de prueba para el simulador
interface EscenarioPrueba {
  nombre: string
  tipoVehiculo: TipoVehiculo
  minutosEstadia: number
  fechaReferencia: Date
  resultadoEsperado?: number
}

// Escenarios de prueba para validar el sistema
export const escenariosPrueba: EscenarioPrueba[] = [
  // Escenarios básicos - horario diurno
  {
    nombre: "Auto 1 hora - Diurno",
    tipoVehiculo: "auto",
    minutosEstadia: 60,
    fechaReferencia: new Date('2024-10-18T10:00:00'), // Viernes 10:00 AM
    resultadoEsperado: 6.00
  },
  {
    nombre: "Moto 30 minutos - Diurno", 
    tipoVehiculo: "moto",
    minutosEstadia: 30,
    fechaReferencia: new Date('2024-10-18T14:00:00'), // Viernes 2:00 PM
    resultadoEsperado: 3.00
  },
  
  // Escenarios nocturnos
  {
    nombre: "Auto 2 horas - Nocturno",
    tipoVehiculo: "auto", 
    minutosEstadia: 120,
    fechaReferencia: new Date('2024-10-18T23:00:00'), // Viernes 11:00 PM
  },
  {
    nombre: "Moto 1 hora - Nocturno",
    tipoVehiculo: "moto",
    minutosEstadia: 60, 
    fechaReferencia: new Date('2024-10-19T01:00:00'), // Sábado 1:00 AM
  },
  
  // Escenarios de fin de semana
  {
    nombre: "Auto fin de semana - Día",
    tipoVehiculo: "auto",
    minutosEstadia: 180, // 3 horas
    fechaReferencia: new Date('2024-10-19T12:00:00'), // Sábado 12:00 PM
  },
  {
    nombre: "Moto fin de semana - Tarde",
    tipoVehiculo: "moto", 
    minutosEstadia: 90, // 1.5 horas
    fechaReferencia: new Date('2024-10-20T16:00:00'), // Domingo 4:00 PM
  },
  
  // Escenarios de larga duración
  {
    nombre: "Auto estacionamiento prolongado",
    tipoVehiculo: "auto",
    minutosEstadia: 480, // 8 horas
    fechaReferencia: new Date('2024-10-18T08:00:00'), // Viernes 8:00 AM
  },
  {
    nombre: "Moto estacionamiento nocturno completo",
    tipoVehiculo: "moto",
    minutosEstadia: 600, // 10 horas 
    fechaReferencia: new Date('2024-10-18T22:00:00'), // Viernes 10:00 PM
  }
]

// Función para ejecutar todas las pruebas
export async function ejecutarPruebasPricing(): Promise<void> {
  console.log('🧪 INICIANDO PRUEBAS DE PRICING DINÁMICO')
  console.log('==========================================')
  
  for (const escenario of escenariosPrueba) {
    try {
      console.log(`\n📋 Prueba: ${escenario.nombre}`)
      console.log(`   Vehículo: ${escenario.tipoVehiculo}`)
      console.log(`   Duración: ${escenario.minutosEstadia} minutos`)
      console.log(`   Fecha/Hora: ${escenario.fechaReferencia.toLocaleString('es-PE')}`)
      
      const resultado = await simularPricingDinamico(
        escenario.tipoVehiculo,
        escenario.minutosEstadia,
        escenario.fechaReferencia
      )
      
      console.log(`   💰 Monto calculado: S/ ${resultado.monto_total.toFixed(2)}`)
      console.log(`   🔧 Tarifa aplicada: ${resultado.tarifa_aplicada?.nombre || 'Tarifa fija'}`)
      console.log(`   📊 Desglose:`)
      console.log(`      - Tiempo total: ${resultado.desglose.tiempo_total_minutos} min`)
      console.log(`      - Tiempo facturable: ${resultado.desglose.tiempo_facturable_minutos} min`)
      console.log(`      - Horas completas: ${resultado.desglose.horas_completas}`)
      console.log(`      - Minutos adicionales: ${resultado.desglose.minutos_adicionales}`)
      console.log(`      - Redondeo aplicado: ${resultado.desglose.redondeo_aplicado ? 'Sí' : 'No'}`)
      
      if (resultado.observaciones.length > 0) {
        console.log(`   📝 Observaciones:`)
        resultado.observaciones.forEach(obs => console.log(`      - ${obs}`))
      }
      
      // Verificar resultado esperado si existe
      if (escenario.resultadoEsperado !== undefined) {
        const diferencia = Math.abs(resultado.monto_total - escenario.resultadoEsperado)
        if (diferencia < 0.01) {
          console.log(`   ✅ ÉXITO: Resultado coincide con lo esperado`)
        } else {
          console.log(`   ❌ ERROR: Esperado S/ ${escenario.resultadoEsperado.toFixed(2)}, obtenido S/ ${resultado.monto_total.toFixed(2)}`)
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`)
    }
  }
  
  console.log('\n🏁 PRUEBAS COMPLETADAS')
  console.log('=====================')
}

// Función para crear tarifas de prueba (ejecutar una vez en setup)
export const tarifasPrueba = [
  // Tarifa diurna para autos (lunes a viernes)
  {
    nombre: "Auto Diurno L-V",
    descripcion: "Tarifa diurna para autos de lunes a viernes",
    tipo_vehiculo: "auto" as TipoVehiculo,
    hora_inicio: "06:00",
    hora_fin: "22:00", 
    dias_semana: [1, 2, 3, 4, 5], // Lunes a Viernes
    tarifa_primera_hora: 6.00,
    tarifa_hora_adicional: 5.00,
    tarifa_minima: 6.00,
    is_active: true,
    prioridad: 10
  },
  
  // Tarifa nocturna para autos
  {
    nombre: "Auto Nocturno",
    descripcion: "Tarifa nocturna para autos (22:00 - 06:00)",
    tipo_vehiculo: "auto" as TipoVehiculo,
    hora_inicio: "22:00",
    hora_fin: "06:00",
    dias_semana: [1, 2, 3, 4, 5, 6, 0], // Todos los días
    tarifa_primera_hora: 8.00,
    tarifa_hora_adicional: 6.00,
    tarifa_minima: 8.00,
    is_active: true,
    prioridad: 15 // Mayor prioridad que diurno
  },
  
  // Tarifa de fin de semana para autos
  {
    nombre: "Auto Fin de Semana",
    descripcion: "Tarifa especial para autos en fin de semana",
    tipo_vehiculo: "auto" as TipoVehiculo,
    hora_inicio: "00:00",
    hora_fin: "23:59",
    dias_semana: [6, 0], // Sábado y Domingo
    tarifa_primera_hora: 7.00,
    tarifa_hora_adicional: 6.00,
    tarifa_minima: 7.00,
    tarifa_maxima: 50.00, // Tarifa máxima por día
    is_active: true,
    prioridad: 20 // Mayor prioridad
  },
  
  // Tarifa diurna para motos
  {
    nombre: "Moto Diurno L-V",
    descripcion: "Tarifa diurna para motos de lunes a viernes",
    tipo_vehiculo: "moto" as TipoVehiculo,
    hora_inicio: "06:00",
    hora_fin: "22:00",
    dias_semana: [1, 2, 3, 4, 5],
    tarifa_primera_hora: 3.00,
    tarifa_hora_adicional: 2.50,
    tarifa_minima: 3.00,
    is_active: true,
    prioridad: 10
  },
  
  // Tarifa nocturna para motos
  {
    nombre: "Moto Nocturno",
    descripcion: "Tarifa nocturna para motos (22:00 - 06:00)",
    tipo_vehiculo: "moto" as TipoVehiculo,
    hora_inicio: "22:00", 
    hora_fin: "06:00",
    dias_semana: [1, 2, 3, 4, 5, 6, 0],
    tarifa_primera_hora: 4.00,
    tarifa_hora_adicional: 3.00,
    tarifa_minima: 4.00,
    is_active: true,
    prioridad: 15
  },
  
  // Tarifa de fin de semana para motos
  {
    nombre: "Moto Fin de Semana",
    descripcion: "Tarifa especial para motos en fin de semana",
    tipo_vehiculo: "moto" as TipoVehiculo,
    hora_inicio: "00:00",
    hora_fin: "23:59",
    dias_semana: [6, 0],
    tarifa_primera_hora: 3.50,
    tarifa_hora_adicional: 3.00,
    tarifa_minima: 3.50,
    tarifa_maxima: 25.00,
    is_active: true,
    prioridad: 20
  }
]

// Configuración de pricing recomendada
export const configuracionPricingRecomendada = {
  redondeo_minutos: 15, // Redondear a 15 minutos
  tiempo_gracia_minutos: 10, // 10 minutos gratis
  aplicar_tarifa_nocturna: true,
  aplicar_tarifa_fin_semana: true
}

// Instrucciones para setup del pricing dinámico
export const instruccionesSetup = `
🚀 SETUP DE PRICING DINÁMICO - INSTRUCCIONES

1. CREAR CONFIGURACIÓN GLOBAL:
   - Ir a /tarifas en el dashboard
   - Crear configuración con: redondeo 15 min, gracia 10 min
   
2. CREAR TARIFAS BÁSICAS:
   - Importar las 6 tarifas predefinidas desde tarifasPrueba
   - Verificar que las prioridades estén correctas (nocturno > diurno)
   
3. PROBAR FUNCIONAMIENTO:
   - Ejecutar ejecutarPruebasPricing() en consola
   - Verificar cálculos en modal de salida
   - Probar diferentes horarios y días
   
4. VALIDAR INTEGRACIÓN:
   - Crear entrada de vehículo de prueba
   - Procesar salida y verificar monto
   - Confirmar que se usa tarifa dinámica correcta
   
💡 TIPS:
- Las tarifas nocturnas tienen mayor prioridad
- Los fines de semana usan tarifas especiales
- El sistema tiene fallback a tarifas fijas si falla
- Todos los cálculos se loggan para auditoría
`

const testingTools = {
  escenariosPrueba,
  ejecutarPruebasPricing,
  tarifasPrueba,
  configuracionPricingRecomendada,
  instruccionesSetup
}

export default testingTools