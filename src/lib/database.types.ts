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
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          attendees: string[] | null
          category_label: string | null
          color: string | null
          created_at: string
          description_points: string[] | null
          end_time: string
          event_type: string
          id: string
          location: string | null
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
          description_points?: string[] | null
          end_time: string
          event_type: string
          id?: string
          location?: string | null
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
          description_points?: string[] | null
          end_time?: string
          event_type?: string
          id?: string
          location?: string | null
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
      user_suggestions: {
        Row: {
          id: string
          user_id: string
          message: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
          description_points: string[] | null
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
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: false
          isSetofReturn: true
        }
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
      get_user_visible_events: {
        Args: never
        Returns: {
          all_day: boolean
          attendees: string[] | null
          category_label: string | null
          color: string | null
          created_at: string
          description_points: string[] | null
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
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_suggested_friends: {
        Args: { current_user_id: string }
        Returns: {
          id: string
          user_name: string
          handle: string
          profile_image: string | null
          mutual_friends_count: number
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
      get_mutual_friends_count: {
        Args: { user_a: string; user_b: string }
        Returns: number
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
    }
    Enums: {
      subscription_tier: "free" | "pro" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      subscription_tier: ["free", "pro", "premium"],
    },
  },
} as const

