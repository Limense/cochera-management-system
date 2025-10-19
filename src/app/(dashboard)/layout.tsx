'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ToastProvider } from '@/components/providers/ToastProvider'

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </ToastProvider>
    </ProtectedRoute>
  )
}