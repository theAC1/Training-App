export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'trainer' | 'athlete'
export type BlockType = 'single' | 'superset' | 'cluster'
export type MesocycleStatus = 'draft' | 'active' | 'completed'

export interface Database {
  public: {
    Tables: {
      athletes: {
        Row: {
          id: string
          trainer_id: string
          name: string
          email: string | null
          notes: string | null
          user_id: string | null
          invite_code: string | null
          invite_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          name: string
          email?: string | null
          notes?: string | null
          user_id?: string | null
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string
          name?: string
          email?: string | null
          notes?: string | null
          user_id?: string | null
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          role: UserRole
          name: string
          trainer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          name: string
          trainer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          name?: string
          trainer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          code: string
          role: UserRole
          athlete_name: string | null
          created_by: string
          expires_at: string
          used_at: string | null
          used_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          role?: UserRole
          athlete_name?: string | null
          created_by: string
          expires_at: string
          used_at?: string | null
          used_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          role?: UserRole
          athlete_name?: string | null
          created_by?: string
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          parent_exercise_id: string | null
          image_url: string
          video_url: string | null
          categories: string[]
          muscle_groups: string[]
          equipment: string[]
          description: string | null
          purpose_note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_exercise_id?: string | null
          image_url: string
          video_url?: string | null
          categories?: string[]
          muscle_groups?: string[]
          equipment?: string[]
          description?: string | null
          purpose_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_exercise_id?: string | null
          image_url?: string
          video_url?: string | null
          categories?: string[]
          muscle_groups?: string[]
          equipment?: string[]
          description?: string | null
          purpose_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mesocycles: {
        Row: {
          id: string
          athlete_id: string
          name: string
          phase: string | null
          start_date: string | null
          duration_weeks: number
          status: MesocycleStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          name: string
          phase?: string | null
          start_date?: string | null
          duration_weeks?: number
          status?: MesocycleStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          name?: string
          phase?: string | null
          start_date?: string | null
          duration_weeks?: number
          status?: MesocycleStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          mesocycle_id: string
          week_number: number
          day_of_week: number | null
          name: string | null
          order_index: number
          notes: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mesocycle_id: string
          week_number: number
          day_of_week?: number | null
          name?: string | null
          order_index: number
          notes?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mesocycle_id?: string
          week_number?: number
          day_of_week?: number | null
          name?: string | null
          order_index?: number
          notes?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      session_blocks: {
        Row: {
          id: string
          session_id: string
          block_type: BlockType
          order_index: number
          rest_between_rounds: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          block_type: BlockType
          order_index: number
          rest_between_rounds?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          block_type?: BlockType
          order_index?: number
          rest_between_rounds?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      planned_exercises: {
        Row: {
          id: string
          block_id: string
          exercise_id: string
          order_in_block: number
          sets_target: number
          reps_target: string
          weight_prescribed: number | null
          rir: number | null
          rest_time_default: number
          notes: string | null
          cluster_reps: number | null
          cluster_count: number | null
          intra_cluster_rest: number | null
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          exercise_id: string
          order_in_block: number
          sets_target: number
          reps_target: string
          weight_prescribed?: number | null
          rir?: number | null
          rest_time_default?: number
          notes?: string | null
          cluster_reps?: number | null
          cluster_count?: number | null
          intra_cluster_rest?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          exercise_id?: string
          order_in_block?: number
          sets_target?: number
          reps_target?: string
          weight_prescribed?: number | null
          rir?: number | null
          rest_time_default?: number
          notes?: string | null
          cluster_reps?: number | null
          cluster_count?: number | null
          intra_cluster_rest?: number | null
          created_at?: string
        }
      }
      set_logs: {
        Row: {
          id: string
          planned_exercise_id: string
          athlete_id: string
          set_number: number
          reps_completed: number
          weight_used: number | null
          pain_flag: boolean
          notes: string | null
          client_uuid: string
          logged_at: string
          synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          planned_exercise_id: string
          athlete_id: string
          set_number: number
          reps_completed: number
          weight_used?: number | null
          pain_flag?: boolean
          notes?: string | null
          client_uuid: string
          logged_at?: string
          synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          planned_exercise_id?: string
          athlete_id?: string
          set_number?: number
          reps_completed?: number
          weight_used?: number | null
          pain_flag?: boolean
          notes?: string | null
          client_uuid?: string
          logged_at?: string
          synced_at?: string | null
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
