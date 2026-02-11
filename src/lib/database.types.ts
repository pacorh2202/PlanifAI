export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          attendees: string[] | null
          category_label: string | null
          color: string | null
          created_at: string
          creation_source: string | null
          description_points: string[] | null
          emotional_impact: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          recurrence_id: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          attendees?: string[] | null
          category_label?: string | null
          color?: string | null
          created_at?: string
          creation_source?: string | null
          description_points?: string[] | null
          emotional_impact?: string | null
          end_time: string
          event_type: string
          id?: string
          location?: string | null
          recurrence_id?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          attendees?: string[] | null
          category_label?: string | null
          color?: string | null
          created_at?: string
          creation_source?: string | null
          description_points?: string[] | null
          emotional_impact?: string | null
          end_time?: string
          event_type?: string
          id?: string
          location?: string | null
          recurrence_id?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          device_model: string | null
          device_type: string | null
          id: string
          is_active: boolean
          last_used_at: string
          player_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          player_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          player_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_avatar: string | null
          friend_handle: string
          friend_id: string
          friend_name: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_avatar?: string | null
          friend_handle: string
          friend_id: string
          friend_name: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_avatar?: string | null
          friend_handle?: string
          friend_id?: string
          friend_name?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_cache: {
        Row: {
          completed: number
          distribution: Json
          failed: number
          last_calculated_at: string
          moved: number
          streak: number
          user_id: string
        }
        Insert: {
          completed?: number
          distribution?: Json
          failed?: number
          last_calculated_at?: string
          moved?: number
          streak?: number
          user_id: string
        }
        Update: {
          completed?: number
          distribution?: Json
          failed?: number
          last_calculated_at?: string
          moved?: number
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string
          active_template_id: string
          assistant_name: string
          assistant_voice: string
          created_at: string
          custom_template: Json | null
          handle: string
          id: string
          is_dark_mode: boolean
          language: string
          last_usage_reset: string | null
          monthly_token_usage: number | null
          profile_image: string | null
          subscription_tier:
          | Database["public"]["Enums"]["subscription_tier"]
          | null
          updated_at: string
          user_name: string
        }
        Insert: {
          accent_color?: string
          active_template_id?: string
          assistant_name?: string
          assistant_voice?: string
          created_at?: string
          custom_template?: Json | null
          handle: string
          id: string
          is_dark_mode?: boolean
          language?: string
          last_usage_reset?: string | null
          monthly_token_usage?: number | null
          profile_image?: string | null
          subscription_tier?:
          | Database["public"]["Enums"]["subscription_tier"]
          | null
          updated_at?: string
          user_name?: string
        }
        Update: {
          accent_color?: string
          active_template_id?: string
          assistant_name?: string
          assistant_voice?: string
          created_at?: string
          custom_template?: Json | null
          handle?: string
          id?: string
          is_dark_mode?: boolean
          language?: string
          last_usage_reset?: string | null
          monthly_token_usage?: number | null
          profile_image?: string | null
          subscription_tier?:
          | Database["public"]["Enums"]["subscription_tier"]
          | null
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suggestions: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_kpi_stats: {
        Row: {
          completed: number | null
          distribution: Json | null
          failed: number | null
          last_calculated_at: string | null
          moved: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      calculate_user_streak: { Args: { user_uuid: string }; Returns: number }
      check_and_reset_usage: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      create_event_reminders: { Args: never; Returns: undefined }
      get_event_if_accessible: {
        Args: { p_event_id: string }
        Returns: {
          all_day: boolean
          attendees: string[] | null
          category_label: string | null
          color: string | null
          created_at: string
          creation_source: string | null
          description_points: string[] | null
          emotional_impact: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_mutual_friends_count: {
        Args: { user_a: string; user_b: string }
        Returns: number
      }
      get_suggested_friends: {
        Args: { current_user_id: string }
        Returns: {
          handle: string
          id: string
          mutual_friends_count: number
          profile_image: string
          user_name: string
        }[]
      }
      get_user_kpi_stats: { Args: { user_uuid: string }; Returns: Json }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_daily: number
          best_streak: number
          completed: number
          completion_rate: number
          current_streak: number
          distribution: Json
          failed: number
          favorite_category: string
          moved: number
          pending_tasks: number
          total_tasks: number
        }[]
      }
      get_user_stats_v2: {
        Args: { p_user_id: string }
        Returns: {
          avg_daily: number
          best_streak: number
          completed: number
          completion_rate: number
          current_streak: number
          distribution: Json
          efficiency_improvement: number
          failed: number
          favorite_category: string
          moved: number
          pending_tasks: number
          stress_level: number
          time_saved_minutes: number
          total_tasks: number
        }[]
      }
      get_user_visible_events: {
        Args: never
        Returns: {
          all_day: boolean
          attendees: string[] | null
          category_label: string | null
          color: string | null
          created_at: string
          creation_source: string | null
          description_points: string[] | null
          emotional_impact: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      has_event_access: {
        Args: { event_uuid: string; user_uuid: string }
        Returns: boolean
      }
      increment_token_usage: {
        Args: { tokens: number; user_id_param: string }
        Returns: undefined
      }
      is_event_owner: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_participant: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      refresh_user_kpi_cache: {
        Args: { user_uuid?: string }
        Returns: undefined
      }
      rpc_get_kpi_stats: { Args: never; Returns: Json }
      user_has_access_to_event: { Args: { event_id: string }; Returns: boolean }
      user_has_editor_access: { Args: { event_id: string }; Returns: boolean }
      accept_recurring_invitation: {
        Args: { p_recurrence_id: string; p_user_id: string }
        Returns: void
      }
      reject_recurring_invitation: {
        Args: { p_recurrence_id: string; p_user_id: string }
        Returns: void
      }
    }
    Enums: {
      subscription_tier: "free" | "pro" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
    Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
    Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof Database["public"]["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
