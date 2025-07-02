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
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          is_admin: boolean
          last_login: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          is_admin?: boolean
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          is_admin?: boolean
          last_login?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant'
          content?: string
          tokens_used?: number | null
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          tokens_used: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          tokens_used: number
          cost_usd: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          tokens_used?: number
          cost_usd?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']