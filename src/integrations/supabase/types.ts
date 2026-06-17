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
      booking_extensions: {
        Row: {
          booking_id: string
          created_at: string
          extra_amount: number
          extra_hours: number
          extra_units: number
          id: string
          new_end_date: string
          paid_at: string | null
          payment_intent_id: string | null
          rate: string
          requested_by: string
          responded_at: string | null
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          extra_amount: number
          extra_hours: number
          extra_units: number
          id?: string
          new_end_date: string
          paid_at?: string | null
          payment_intent_id?: string | null
          rate: string
          requested_by: string
          responded_at?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          extra_amount?: number
          extra_hours?: number
          extra_units?: number
          id?: string
          new_end_date?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          rate?: string
          requested_by?: string
          responded_at?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_extensions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          auto_release_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          category: string | null
          city: string | null
          commission_amount: number
          commission_rate: number
          completed_by_provider_at: string | null
          completed_by_seeker_at: string | null
          created_at: string
          dispute_opened_at: string | null
          dispute_reason: string | null
          end_at: string
          escrow_status: string
          id: string
          last_overdue_charge_at: string | null
          listing_id: string
          original_amount: number | null
          overdue_charges_total: number
          payment_intent_id: string | null
          payout_amount: number | null
          provider_id: string
          refund_amount: number
          refund_status: string | null
          released_at: string | null
          released_transfer_id: string | null
          seeker_id: string
          start_at: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          surge_multiplier: number
          total_price: number
          updated_at: string
        }
        Insert: {
          auto_release_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          city?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_by_provider_at?: string | null
          completed_by_seeker_at?: string | null
          created_at?: string
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          end_at: string
          escrow_status?: string
          id?: string
          last_overdue_charge_at?: string | null
          listing_id: string
          original_amount?: number | null
          overdue_charges_total?: number
          payment_intent_id?: string | null
          payout_amount?: number | null
          provider_id: string
          refund_amount?: number
          refund_status?: string | null
          released_at?: string | null
          released_transfer_id?: string | null
          seeker_id: string
          start_at: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          surge_multiplier?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          auto_release_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          city?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_by_provider_at?: string | null
          completed_by_seeker_at?: string | null
          created_at?: string
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          end_at?: string
          escrow_status?: string
          id?: string
          last_overdue_charge_at?: string | null
          listing_id?: string
          original_amount?: number | null
          overdue_charges_total?: number
          payment_intent_id?: string | null
          payout_amount?: number | null
          provider_id?: string
          refund_amount?: number
          refund_status?: string | null
          released_at?: string | null
          released_transfer_id?: string | null
          seeker_id?: string
          start_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          surge_multiplier?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          provider_id: string
          seeker_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          provider_id: string
          seeker_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          provider_id?: string
          seeker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_availability_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          listing_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          listing_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          listing_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_availability_slots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_rental_terms: {
        Row: {
          created_at: string
          listing_id: string
          min_months: number
          season_end_month: number | null
          season_start_month: number | null
          seasonal: boolean
          start_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          min_months?: number
          season_end_month?: number | null
          season_start_month?: number | null
          seasonal?: boolean
          start_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          min_months?: number
          season_end_month?: number | null
          season_start_month?: number | null
          seasonal?: boolean
          start_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_rental_terms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          availability: string
          cancellation: string | null
          category: string
          city: string
          country: string
          created_at: string
          daily: number | null
          description: string
          disclaimer_accepted: boolean
          features: string[] | null
          hourly: number | null
          id: string
          lat: number
          lng: number
          monthly: number | null
          nearby_landmarks: string[] | null
          photos: Json | null
          postal_code: string | null
          province: string
          region: string | null
          seasonal: number | null
          size: string | null
          spots: number | null
          sqft: number | null
          status: string
          student_discount: boolean | null
          student_discount_percent: number | null
          student_universities: string | null
          title: string
          type: string
          unit: string | null
          updated_at: string
          host_id: string
          weekly: number | null
        }
        Insert: {
          address: string
          availability?: string
          cancellation?: string | null
          category: string
          city: string
          country: string
          created_at?: string
          daily?: number | null
          description: string
          disclaimer_accepted?: boolean
          features?: string[] | null
          hourly?: number | null
          id?: string
          lat: number
          lng: number
          monthly?: number | null
          nearby_landmarks?: string[] | null
          photos?: Json | null
          postal_code?: string | null
          province: string
          region?: string | null
          seasonal?: number | null
          size?: string | null
          spots?: number | null
          sqft?: number | null
          status?: string
          student_discount?: boolean | null
          student_discount_percent?: number | null
          student_universities?: string | null
          title: string
          type: string
          unit?: string | null
          updated_at?: string
          host_id: string
          weekly?: number | null
        }
        Update: {
          address?: string
          availability?: string
          cancellation?: string | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          daily?: number | null
          description?: string
          disclaimer_accepted?: boolean
          features?: string[] | null
          hourly?: number | null
          id?: string
          lat?: number
          lng?: number
          monthly?: number | null
          nearby_landmarks?: string[] | null
          photos?: Json | null
          postal_code?: string | null
          province?: string
          region?: string | null
          seasonal?: number | null
          size?: string | null
          spots?: number | null
          sqft?: number | null
          status?: string
          student_discount?: boolean | null
          student_discount_percent?: number | null
          student_universities?: string | null
          title?: string
          type?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          weekly?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      overdue_charges: {
        Row: {
          amount: number
          booking_id: string
          charge_date: string
          created_at: string
          error_message: string | null
          id: string
          payment_intent_id: string | null
          rate: number
          status: string
          units: number
        }
        Insert: {
          amount: number
          booking_id: string
          charge_date: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_intent_id?: string | null
          rate: number
          status?: string
          units: number
        }
        Update: {
          amount?: number
          booking_id?: string
          charge_date?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_intent_id?: string | null
          rate?: number
          status?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "overdue_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      surge_pricing: {
        Row: {
          category: string
          city: string
          created_at: string
          days_of_week: number[] | null
          end_at: string | null
          end_time: string | null
          id: string
          is_active: boolean
          label: string | null
          start_at: string | null
          start_time: string | null
          surge_multiplier: number
          updated_at: string
        }
        Insert: {
          category?: string
          city: string
          created_at?: string
          days_of_week?: number[] | null
          end_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          start_at?: string | null
          start_time?: string | null
          surge_multiplier?: number
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string
          created_at?: string
          days_of_week?: number[] | null
          end_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          start_at?: string | null
          start_time?: string | null
          surge_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          host_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          host_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_available_slots:
        | { Args: { _check_date: string; _listing_id: string }; Returns: Json }
        | {
            Args: {
              end_search: string
              start_search: string
              target_listing_id: string
            }
            Returns: {
              available_end: string
              available_start: string
            }[]
          }
      get_daily_availability: {
        Args: {
          range_end: string
          range_start: string
          target_listing_id: string
        }
        Returns: {
          day: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "provider" | "seeker" | "admin"
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
      app_role: ["provider", "seeker", "admin"],
    },
  },
} as const
