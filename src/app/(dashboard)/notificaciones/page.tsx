'use client'

import SistemaNotificaciones from '@/components/dashboard/SistemaNotificaciones'

export default function NotificacionesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Notificaciones</h1>
        <p className="text-muted-foreground">
          Gestiona alertas, recordatorios y notificaciones del sistema de cochera
        </p>
      </div>
      
      <SistemaNotificaciones />
    </div>
  )
}