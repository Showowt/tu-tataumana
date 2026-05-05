/**
 * WellnessOS — Database Types
 * Generated from schema. Update after migrations.
 */

export type Database = {
  public: {
    Tables: {
      tu_students: {
        Row: {
          id: string;
          auth_id: string | null;
          email: string;
          phone: string | null;
          full_name: string;
          preferred_lang: "en" | "es";
          role: "student" | "admin";
          emergency_contact: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          email: string;
          phone?: string | null;
          full_name: string;
          preferred_lang?: "en" | "es";
          role?: "student" | "admin";
          emergency_contact?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          email?: string;
          phone?: string | null;
          full_name?: string;
          preferred_lang?: "en" | "es";
          role?: "student" | "admin";
          emergency_contact?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      tu_class_definitions: {
        Row: {
          id: string;
          name: string;
          name_es: string;
          description: string | null;
          description_es: string | null;
          day_of_week: number;
          start_time: string;
          duration_minutes: number;
          teacher: string;
          capacity: number;
          style: string;
          level: "beginner" | "intermediate" | "advanced" | "all";
          price_cop: number;
          price_usd: number;
          location: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_es: string;
          description?: string | null;
          description_es?: string | null;
          day_of_week: number;
          start_time: string;
          duration_minutes?: number;
          teacher: string;
          capacity?: number;
          style: string;
          level?: "beginner" | "intermediate" | "advanced" | "all";
          price_cop?: number;
          price_usd?: number;
          location?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_es?: string;
          description?: string | null;
          description_es?: string | null;
          day_of_week?: number;
          start_time?: string;
          duration_minutes?: number;
          teacher?: string;
          capacity?: number;
          style?: string;
          level?: "beginner" | "intermediate" | "advanced" | "all";
          price_cop?: number;
          price_usd?: number;
          location?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      tu_class_sessions: {
        Row: {
          id: string;
          definition_id: string;
          session_date: string;
          start_time: string;
          teacher: string;
          capacity: number;
          enrolled: number;
          status: "scheduled" | "cancelled" | "completed";
          cancel_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          definition_id: string;
          session_date: string;
          start_time: string;
          teacher: string;
          capacity: number;
          enrolled?: number;
          status?: "scheduled" | "cancelled" | "completed";
          cancel_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          definition_id?: string;
          session_date?: string;
          start_time?: string;
          teacher?: string;
          capacity?: number;
          enrolled?: number;
          status?: "scheduled" | "cancelled" | "completed";
          cancel_reason?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      tu_class_bookings: {
        Row: {
          id: string;
          student_id: string;
          session_id: string;
          pack_id: string | null;
          status: "confirmed" | "cancelled" | "waitlisted" | "no_show";
          cancelled_at: string | null;
          cancel_reason: string | null;
          checked_in: boolean;
          checked_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          session_id: string;
          pack_id?: string | null;
          status?: "confirmed" | "cancelled" | "waitlisted" | "no_show";
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          checked_in?: boolean;
          checked_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          session_id?: string;
          pack_id?: string | null;
          status?: "confirmed" | "cancelled" | "waitlisted" | "no_show";
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          checked_in?: boolean;
          checked_in_at?: string | null;
          updated_at?: string;
        };
      };
      tu_packs: {
        Row: {
          id: string;
          student_id: string;
          pack_type: string;
          total_classes: number;
          classes_used: number;
          classes_remaining: number;
          price_paid: number;
          original_price: number | null;
          currency: "COP" | "USD";
          status: "active" | "expired" | "exhausted" | "cancelled";
          purchased_at: string;
          expires_at: string;
          payment_method: string | null;
          wompi_transaction_id: string | null;
          transaction_id: string | null;
          discount_type: string | null;
          discount_value: number | null;
          discount_reason: string | null;
          verified_by: string | null;
          verified_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          pack_type: string;
          total_classes: number;
          classes_used?: number;
          price_paid: number;
          original_price?: number | null;
          currency?: "COP" | "USD";
          status?: "active" | "expired" | "exhausted" | "cancelled";
          purchased_at?: string;
          expires_at: string;
          payment_method?: string | null;
          wompi_transaction_id?: string | null;
          transaction_id?: string | null;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_reason?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          pack_type?: string;
          total_classes?: number;
          classes_used?: number;
          price_paid?: number;
          original_price?: number | null;
          currency?: "COP" | "USD";
          status?: "active" | "expired" | "exhausted" | "cancelled";
          purchased_at?: string;
          expires_at?: string;
          payment_method?: string | null;
          wompi_transaction_id?: string | null;
          transaction_id?: string | null;
          discount_type?: string | null;
          discount_value?: number | null;
          discount_reason?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      tu_attendance: {
        Row: {
          id: string;
          booking_id: string;
          student_id: string;
          session_id: string;
          status: "attended" | "no_show" | "late_cancel";
          checked_in_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          student_id: string;
          session_id: string;
          status?: "attended" | "no_show" | "late_cancel";
          checked_in_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          student_id?: string;
          session_id?: string;
          status?: "attended" | "no_show" | "late_cancel";
          checked_in_at?: string;
          notes?: string | null;
        };
      };
      tu_transactions: {
        Row: {
          id: string;
          student_id: string | null;
          reference: string;
          wompi_reference: string | null;
          wompi_id: string | null;
          amount: number;
          currency: "COP" | "USD";
          payment_method: string;
          status: "pending" | "approved" | "declined" | "voided" | "error";
          related_pack_type: string | null;
          description: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          reference?: string;
          wompi_reference?: string | null;
          wompi_id?: string | null;
          amount: number;
          currency?: "COP" | "USD";
          payment_method: string;
          status?: "pending" | "approved" | "declined" | "voided" | "error";
          related_pack_type?: string | null;
          description?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          reference?: string;
          wompi_reference?: string | null;
          wompi_id?: string | null;
          amount?: number;
          currency?: "COP" | "USD";
          payment_method?: string;
          status?: "pending" | "approved" | "declined" | "voided" | "error";
          related_pack_type?: string | null;
          description?: string | null;
          metadata?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      tu_events: {
        Row: {
          id: string;
          title: string;
          title_es: string;
          description: string | null;
          description_es: string | null;
          event_date: string;
          start_time: string;
          end_time: string | null;
          duration_minutes: number;
          teacher: string;
          capacity: number;
          enrolled: number;
          price_cop: number;
          price_usd: number;
          presale_price_cop: number | null;
          presale_price_usd: number | null;
          presale_ends_at: string | null;
          location: string;
          image_url: string | null;
          status: "upcoming" | "sold_out" | "cancelled" | "completed";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_es: string;
          description?: string | null;
          description_es?: string | null;
          event_date: string;
          start_time: string;
          end_time?: string | null;
          duration_minutes?: number;
          teacher?: string;
          capacity?: number;
          enrolled?: number;
          price_cop: number;
          price_usd: number;
          presale_price_cop?: number | null;
          presale_price_usd?: number | null;
          presale_ends_at?: string | null;
          location?: string;
          image_url?: string | null;
          status?: "upcoming" | "sold_out" | "cancelled" | "completed";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          title_es?: string;
          description?: string | null;
          description_es?: string | null;
          event_date?: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number;
          teacher?: string;
          capacity?: number;
          enrolled?: number;
          price_cop?: number;
          price_usd?: number;
          presale_price_cop?: number | null;
          presale_price_usd?: number | null;
          presale_ends_at?: string | null;
          location?: string;
          image_url?: string | null;
          status?: "upcoming" | "sold_out" | "cancelled" | "completed";
          is_active?: boolean;
          updated_at?: string;
        };
      };
      // Legacy tables — kept for backward compatibility
      tu_bookings: {
        Row: {
          id: number;
          created_at: string | null;
          updated_at: string | null;
          name: string;
          email: string | null;
          phone: string;
          service: string;
          preferred_date: string | null;
          message: string | null;
          source: string | null;
          status: string | null;
          class_date: string | null;
          class_time: string | null;
          class_name: string | null;
        };
        Insert: {
          name: string;
          phone: string;
          service: string;
          email?: string | null;
          preferred_date?: string | null;
          message?: string | null;
          source?: string | null;
          status?: string | null;
          class_date?: string | null;
          class_time?: string | null;
          class_name?: string | null;
        };
        Update: {
          name?: string;
          phone?: string;
          service?: string;
          email?: string | null;
          preferred_date?: string | null;
          message?: string | null;
          source?: string | null;
          status?: string | null;
          class_date?: string | null;
          class_time?: string | null;
          class_name?: string | null;
        };
      };
      tu_leads: {
        Row: {
          id: number;
          created_at: string | null;
          updated_at: string | null;
          source: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          service_interest: string | null;
          preferred_date: string | null;
          chat_session_id: string | null;
          booking_step: string | null;
          payment_method: string | null;
          warmth: string | null;
          status: string | null;
          tata_notes: string | null;
        };
        Insert: {
          source: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          service_interest?: string | null;
          preferred_date?: string | null;
          chat_session_id?: string | null;
          booking_step?: string | null;
          payment_method?: string | null;
          warmth?: string | null;
          status?: string | null;
          tata_notes?: string | null;
        };
        Update: {
          source?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          service_interest?: string | null;
          preferred_date?: string | null;
          chat_session_id?: string | null;
          booking_step?: string | null;
          payment_method?: string | null;
          warmth?: string | null;
          status?: string | null;
          tata_notes?: string | null;
        };
      };
      tu_closed_dates: {
        Row: {
          date: string;
          reason: string | null;
          created_at: string | null;
        };
        Insert: {
          date: string;
          reason?: string | null;
        };
        Update: {
          date?: string;
          reason?: string | null;
        };
      };
    };
    Functions: {
      tu_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      tu_current_student_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      tu_book_class: {
        Args: {
          p_student_id: string;
          p_session_id: string;
          p_pack_id?: string | null;
        };
        Returns: {
          success?: boolean;
          error?: string;
          booking_id?: string;
          session_date?: string;
          start_time?: string;
        };
      };
      tu_cancel_booking: {
        Args: {
          p_booking_id: string;
          p_student_id: string;
          p_reason?: string | null;
        };
        Returns: {
          success?: boolean;
          error?: string;
          refunded_credit?: boolean;
        };
      };
    };
  };
}

// Convenience type aliases
export type Student = Database["public"]["Tables"]["tu_students"]["Row"];
export type StudentInsert = Database["public"]["Tables"]["tu_students"]["Insert"];
export type ClassDefinition = Database["public"]["Tables"]["tu_class_definitions"]["Row"];
export type ClassSession = Database["public"]["Tables"]["tu_class_sessions"]["Row"];
export type ClassSessionInsert = Database["public"]["Tables"]["tu_class_sessions"]["Insert"];
export type ClassBooking = Database["public"]["Tables"]["tu_class_bookings"]["Row"];
export type Pack = Database["public"]["Tables"]["tu_packs"]["Row"];
export type PackInsert = Database["public"]["Tables"]["tu_packs"]["Insert"];
export type Attendance = Database["public"]["Tables"]["tu_attendance"]["Row"];
export type Transaction = Database["public"]["Tables"]["tu_transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["tu_transactions"]["Insert"];
export type TuEvent = Database["public"]["Tables"]["tu_events"]["Row"];
export type BookingResult = Database["public"]["Functions"]["tu_book_class"]["Returns"];
export type CancelResult = Database["public"]["Functions"]["tu_cancel_booking"]["Returns"];
