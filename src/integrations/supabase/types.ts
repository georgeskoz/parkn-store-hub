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
      bookings: {
        Row: {
          category: string | null
          city: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          end_date: string
          id: string
          listing_id: string
          original_amount: number | null
          payment_intent_id: string | null
          provider_id: string
          seeker_id: string
          start_date: string
          status: string
          surge_multiplier: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          end_date: string
          id?: string
          listing_id: string
          original_amount?: number | null
          payment_intent_id?: string | null
          provider_id: string
          seeker_id: string
          start_date: string
          status?: string
          surge_multiplier?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          city?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          end_date?: string
          id?: string
          listing_id?: string
          original_amount?: number | null
          payment_intent_id?: string | null
          provider_id?: string
          seeker_id?: string
          start_date?: string
          status?: string
          surge_multiplier?: number
          total_amount?: number
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
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          provider_id: string
          seeker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          provider_id: string
          seeker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          provider_id?: string
          seeker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
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
          student_discount: boolean | null
          student_discount_percent: number | null
          student_universities: string | null
          title: string
          type: string
          unit: string | null
          updated_at: string
          user_id: string
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
          student_discount?: boolean | null
          student_discount_percent?: number | null
          student_universities?: string | null
          title: string
          type: string
          unit?: string | null
          updated_at?: string
          user_id: string
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
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
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
      [_ in never]: never
    }
    Functions: {
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
