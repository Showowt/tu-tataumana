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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      tu_admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tu_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_attendance: {
        Row: {
          booking_id: string
          checked_in_at: string | null
          created_at: string
          id: string
          notes: string | null
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          booking_id: string
          checked_in_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          booking_id?: string
          checked_in_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_attendance_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tu_class_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tu_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_bookings: {
        Row: {
          class_date: string | null
          class_name: string | null
          class_time: string | null
          created_at: string | null
          email: string | null
          id: number
          message: string | null
          name: string
          phone: string
          preferred_date: string | null
          service: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          class_date?: string | null
          class_name?: string | null
          class_time?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          message?: string | null
          name: string
          phone: string
          preferred_date?: string | null
          service: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          class_date?: string | null
          class_name?: string | null
          class_time?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          message?: string | null
          name?: string
          phone?: string
          preferred_date?: string | null
          service?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tu_chat_sessions: {
        Row: {
          created_at: string | null
          extracted: Json | null
          id: number
          messages: Json | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extracted?: Json | null
          id?: number
          messages?: Json | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extracted?: Json | null
          id?: number
          messages?: Json | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tu_class_bookings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          guest_name: string | null
          id: string
          pack_id: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          pack_id?: string | null
          session_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          pack_id?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_class_bookings_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "tu_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_class_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tu_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_class_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_class_definitions: {
        Row: {
          capacity: number
          created_at: string
          day_of_week: number
          description: string | null
          description_es: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          level: string
          location: string
          name: string
          name_es: string
          note: string | null
          price_cop: number
          price_usd: number
          start_time: string
          style: string
          teacher: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          day_of_week: number
          description?: string | null
          description_es?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          level?: string
          location?: string
          name: string
          name_es: string
          note?: string | null
          price_cop?: number
          price_usd?: number
          start_time: string
          style: string
          teacher: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          day_of_week?: number
          description?: string | null
          description_es?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          level?: string
          location?: string
          name?: string
          name_es?: string
          note?: string | null
          price_cop?: number
          price_usd?: number
          start_time?: string
          style?: string
          teacher?: string
          updated_at?: string
        }
        Relationships: []
      }
      tu_class_sessions: {
        Row: {
          cancel_reason: string | null
          capacity: number
          created_at: string
          definition_id: string
          enrolled: number
          id: string
          notes: string | null
          session_date: string
          start_time: string
          status: string
          teacher: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          capacity?: number
          created_at?: string
          definition_id: string
          enrolled?: number
          id?: string
          notes?: string | null
          session_date: string
          start_time: string
          status?: string
          teacher: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          capacity?: number
          created_at?: string
          definition_id?: string
          enrolled?: number
          id?: string
          notes?: string | null
          session_date?: string
          start_time?: string
          status?: string
          teacher?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_class_sessions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "tu_class_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_class_slots: {
        Row: {
          capacity: number
          class_date: string
          class_name: string | null
          class_time: string
          created_at: string | null
          day_of_week: number | null
          enrolled: number | null
          id: number
        }
        Insert: {
          capacity: number
          class_date: string
          class_name?: string | null
          class_time: string
          created_at?: string | null
          day_of_week?: number | null
          enrolled?: number | null
          id?: number
        }
        Update: {
          capacity?: number
          class_date?: string
          class_name?: string | null
          class_time?: string
          created_at?: string | null
          day_of_week?: number | null
          enrolled?: number | null
          id?: number
        }
        Relationships: []
      }
      tu_closed_dates: {
        Row: {
          created_at: string | null
          date: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          reason?: string | null
        }
        Relationships: []
      }
      tu_discount_codes: {
        Row: {
          active: boolean
          applicable_packs: string[] | null
          code: string
          created_at: string
          created_by: string
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          one_time_per_student: boolean
          specific_student_id: string | null
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          applicable_packs?: string[] | null
          code: string
          created_at?: string
          created_by?: string
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          one_time_per_student?: boolean
          specific_student_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          applicable_packs?: string[] | null
          code?: string
          created_at?: string
          created_by?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          one_time_per_student?: boolean
          specific_student_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tu_discount_codes_specific_student_id_fkey"
            columns: ["specific_student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_discount_usage: {
        Row: {
          discount_code_id: string
          id: string
          student_id: string
          transaction_id: string | null
          used_at: string
        }
        Insert: {
          discount_code_id: string
          id?: string
          student_id: string
          transaction_id?: string | null
          used_at?: string
        }
        Update: {
          discount_code_id?: string
          id?: string
          student_id?: string
          transaction_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_discount_usage_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "tu_discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_discount_usage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_discount_usage_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "tu_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_events: {
        Row: {
          accent_color: string | null
          booking_service: string | null
          capacity: number | null
          created_at: string
          cta_text: string | null
          cta_text_es: string | null
          description: string | null
          description_es: string | null
          display_order: number | null
          end_time: string | null
          enrolled: number
          event_date: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          location: string
          price_cop: number
          price_usd: number
          show_on_homepage: boolean | null
          start_time: string | null
          status: string
          title: string
          title_es: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          booking_service?: string | null
          capacity?: number | null
          created_at?: string
          cta_text?: string | null
          cta_text_es?: string | null
          description?: string | null
          description_es?: string | null
          display_order?: number | null
          end_time?: string | null
          enrolled?: number
          event_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          location?: string
          price_cop?: number
          price_usd?: number
          show_on_homepage?: boolean | null
          start_time?: string | null
          status?: string
          title: string
          title_es: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          booking_service?: string | null
          capacity?: number | null
          created_at?: string
          cta_text?: string | null
          cta_text_es?: string | null
          description?: string | null
          description_es?: string | null
          display_order?: number | null
          end_time?: string | null
          enrolled?: number
          event_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          location?: string
          price_cop?: number
          price_usd?: number
          show_on_homepage?: boolean | null
          start_time?: string | null
          status?: string
          title?: string
          title_es?: string
          updated_at?: string
        }
        Relationships: []
      }
      tu_leads: {
        Row: {
          booking_step: string | null
          chat_session_id: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string | null
          payment_method: string | null
          phone: string | null
          preferred_date: string | null
          service_interest: string | null
          source: string
          status: string | null
          tata_notes: string | null
          updated_at: string | null
          warmth: string | null
        }
        Insert: {
          booking_step?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string | null
          payment_method?: string | null
          phone?: string | null
          preferred_date?: string | null
          service_interest?: string | null
          source: string
          status?: string | null
          tata_notes?: string | null
          updated_at?: string | null
          warmth?: string | null
        }
        Update: {
          booking_step?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string | null
          payment_method?: string | null
          phone?: string | null
          preferred_date?: string | null
          service_interest?: string | null
          source?: string
          status?: string | null
          tata_notes?: string | null
          updated_at?: string | null
          warmth?: string | null
        }
        Relationships: []
      }
      tu_packs: {
        Row: {
          classes_remaining: number | null
          classes_used: number
          created_at: string
          currency: string
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string
          id: string
          notes: string | null
          original_price: number | null
          pack_type: string
          payment_method: string | null
          price_paid: number
          status: string
          student_id: string
          total_classes: number
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          wompi_transaction_id: string | null
        }
        Insert: {
          classes_remaining?: number | null
          classes_used?: number
          created_at?: string
          currency?: string
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at: string
          id?: string
          notes?: string | null
          original_price?: number | null
          pack_type: string
          payment_method?: string | null
          price_paid?: number
          status?: string
          student_id: string
          total_classes: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          wompi_transaction_id?: string | null
        }
        Update: {
          classes_remaining?: number | null
          classes_used?: number
          created_at?: string
          currency?: string
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string
          id?: string
          notes?: string | null
          original_price?: number | null
          pack_type?: string
          payment_method?: string | null
          price_paid?: number
          status?: string
          student_id?: string
          total_classes?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          wompi_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tu_packs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_passes: {
        Row: {
          classes_remaining: number | null
          classes_used: number
          created_at: string
          email: string | null
          expires_at: string | null
          id: number
          name: string | null
          pass_type: string
          payment_confirmed: boolean
          payment_method: string | null
          phone: string
          status: string
          total_classes: number
          updated_at: string
        }
        Insert: {
          classes_remaining?: number | null
          classes_used?: number
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: number
          name?: string | null
          pass_type: string
          payment_confirmed?: boolean
          payment_method?: string | null
          phone: string
          status?: string
          total_classes: number
          updated_at?: string
        }
        Update: {
          classes_remaining?: number | null
          classes_used?: number
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: number
          name?: string | null
          pass_type?: string
          payment_confirmed?: boolean
          payment_method?: string | null
          phone?: string
          status?: string
          total_classes?: number
          updated_at?: string
        }
        Relationships: []
      }
      tu_private_sessions: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          group_size: number
          id: string
          location: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          price_cop: number
          service_type: string
          session_date: string
          start_time: string
          status: string
          teacher: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          group_size?: number
          id?: string
          location?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          price_cop?: number
          service_type?: string
          session_date: string
          start_time: string
          status?: string
          teacher?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          group_size?: number
          id?: string
          location?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          price_cop?: number
          service_type?: string
          session_date?: string
          start_time?: string
          status?: string
          teacher?: string
          updated_at?: string
        }
        Relationships: []
      }
      tu_settings: {
        Row: {
          category: string
          editable: boolean
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          category?: string
          editable?: boolean
          key: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          category?: string
          editable?: boolean
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      tu_students: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          emergency_contact: string | null
          full_name: string
          id: string
          is_blocked: boolean
          is_partner: boolean | null
          notes: string | null
          phone: string | null
          preferred_lang: string
          role: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          emergency_contact?: string | null
          full_name: string
          id?: string
          is_blocked?: boolean
          is_partner?: boolean | null
          notes?: string | null
          phone?: string | null
          preferred_lang?: string
          role?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          is_blocked?: boolean
          is_partner?: boolean | null
          notes?: string | null
          phone?: string | null
          preferred_lang?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tu_system_logs: {
        Row: {
          category: string
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          route: string | null
          student_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          route?: string | null
          student_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          route?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      tu_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          pack_id: string | null
          payment_method: string | null
          related_pack_type: string | null
          status: string
          student_id: string | null
          wompi_id: string | null
          wompi_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pack_id?: string | null
          payment_method?: string | null
          related_pack_type?: string | null
          status?: string
          student_id?: string | null
          wompi_id?: string | null
          wompi_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pack_id?: string | null
          payment_method?: string | null
          related_pack_type?: string | null
          status?: string
          student_id?: string | null
          wompi_id?: string | null
          wompi_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tu_transactions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "tu_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
      tu_waitlist: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          session_id: number
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          session_id: number
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          session_id?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tu_waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tu_class_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tu_waitlist_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tu_students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_auth_integrity: {
        Args: never
        Returns: {
          null_columns: string
          user_email: string
          user_id: string
        }[]
      }
      fix_auth_nulls: { Args: never; Returns: number }
      tu_book_class: {
        Args: { p_pack_id: string; p_session_id: string; p_student_id: string }
        Returns: Json
      }
      tu_cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string; p_student_id: string }
        Returns: Json
      }
      tu_current_student_id: { Args: never; Returns: string }
      tu_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
