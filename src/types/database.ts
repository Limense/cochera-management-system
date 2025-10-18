// Database Types - Auto-generated from Supabase
export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          es_admin: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          es_admin?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          es_admin?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      espacios: {
        Row: {
          id: string
          numero: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehiculos: {
        Row: {
          id: string
          placa: string
          tipo: 'auto' | 'moto'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          placa: string
          tipo: 'auto' | 'moto'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          placa?: string
          tipo?: 'auto' | 'moto'
          created_at?: string
          updated_at?: string
        }
      }
      sesiones_estacionamiento: {
        Row: {
          id: string
          vehiculo_id: string
          espacio_id: string
          usuario_entrada_id: string
          usuario_salida_id: string | null
          entrada: string
          salida: string | null
          tarifa_aplicada: number | null
          total_pagado: number | null
          estado: 'activa' | 'finalizada'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehiculo_id: string
          espacio_id: string
          usuario_entrada_id: string
          usuario_salida_id?: string | null
          entrada?: string
          salida?: string | null
          tarifa_aplicada?: number | null
          total_pagado?: number | null
          estado?: 'activa' | 'finalizada'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehiculo_id?: string
          espacio_id?: string
          usuario_entrada_id?: string
          usuario_salida_id?: string | null
          entrada?: string
          salida?: string | null
          tarifa_aplicada?: number | null
          total_pagado?: number | null
          estado?: 'activa' | 'finalizada'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Enums
export type TipoVehiculo = 'auto' | 'moto'
export type EstadoSesion = 'activa' | 'finalizada'

// Utility types
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Espacio = Database['public']['Tables']['espacios']['Row']
export type Vehiculo = Database['public']['Tables']['vehiculos']['Row']
export type SesionEstacionamiento = Database['public']['Tables']['sesiones_estacionamiento']['Row']