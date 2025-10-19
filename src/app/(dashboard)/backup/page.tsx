'use client'

import SistemaBackup from '@/components/dashboard/SistemaBackup'

export default function BackupPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Respaldo</h1>
        <p className="text-muted-foreground">
          Gestiona los respaldos automáticos y manuales del sistema de cochera
        </p>
      </div>
      
      <SistemaBackup />
    </div>
  )
}