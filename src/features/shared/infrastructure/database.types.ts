/**
 * Database types generated from Supabase schema
 * These types represent the actual database structure
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          name: string
          start_date: string | null
          end_date: string | null
          status: 'planning' | 'booked' | 'ready' | 'done'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date?: string | null
          end_date?: string | null
          status?: 'planning' | 'booked' | 'ready' | 'done'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          status?: 'planning' | 'booked' | 'ready' | 'done'
          created_by?: string
          created_at?: string
        }
      }
      packing_items: {
        Row: {
          id: string
          trip_id: string | null
          title: string
          category: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          is_packed: boolean
        }
        Insert: {
          id?: string
          trip_id?: string | null
          title: string
          category?: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          is_packed?: boolean
        }
        Update: {
          id?: string
          trip_id?: string | null
          title?: string
          category?: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          is_packed?: boolean
        }
      }
      documents: {
        Row: {
          id: string
          trip_id: string | null
          title: string
          description: string | null
          file_url: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          title: string
          description?: string | null
          file_url: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          title?: string
          description?: string | null
          file_url?: string
          created_at?: string
        }
      }
      budget_entries: {
        Row: {
          id: string
          trip_id: string | null
          category: string
          amount: number
          currency: string
          is_planned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          category: string
          amount?: number
          currency?: string
          is_planned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          category?: string
          amount?: number
          currency?: string
          is_planned?: boolean
          created_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          trip_id: string | null
          title: string
          date_time: string
          notes: string | null
        }
        Insert: {
          id?: string
          trip_id?: string | null
          title: string
          date_time: string
          notes?: string | null
        }
        Update: {
          id?: string
          trip_id?: string | null
          title?: string
          date_time?: string
          notes?: string | null
        }
      }
      packing_templates: {
        Row: {
          id: string
          name: string
          category: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom'
          created_by?: string
          created_at?: string
        }
      }
      packing_template_items: {
        Row: {
          id: string
          template_id: string | null
          title: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          title: string
        }
        Update: {
          id?: string
          template_id?: string | null
          title?: string
        }
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: {
        Args: {
          lookup_email: string
        }
        Returns: string
      }
      get_email_by_user_id: {
        Args: {
          lookup_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
