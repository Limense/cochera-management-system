'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PricingManager } from '@/components/dashboard/PricingManager'
import { SimuladorCostos } from '@/components/pricing/SimuladorCostos'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TarifasPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tarifas</h1>
          <p className="text-muted-foreground">
            Configura tarifas dinámicas y simula costos de estacionamiento
          </p>
        </div>

        <Tabs defaultValue="configuracion" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configuracion">Configuración de Tarifas</TabsTrigger>
            <TabsTrigger value="simulador">Simulador de Costos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configuracion" className="space-y-4">
            <PricingManager />
          </TabsContent>
          
          <TabsContent value="simulador" className="space-y-4">
            <SimuladorCostos />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}