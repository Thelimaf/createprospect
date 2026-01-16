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
      campaigns: {
        Row: {
          context: string | null
          created_at: string
          goal: string
          id: string
          name: string
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          goal: string
          id?: string
          name: string
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          goal?: string
          id?: string
          name?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_maps_leads: {
        Row: {
          address: string | null
          business_name: string
          campaign_id: string | null
          category: string | null
          city: string | null
          created_at: string
          duplicate_score: number | null
          email: string | null
          enriched_at: string | null
          google_maps_url: string | null
          id: string
          last_contact_date: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          place_id: string | null
          possible_duplicate_of: string | null
          rating: number | null
          reviews_count: number | null
          search_id: string | null
          seen_at: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          campaign_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          duplicate_score?: number | null
          email?: string | null
          enriched_at?: string | null
          google_maps_url?: string | null
          id?: string
          last_contact_date?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          possible_duplicate_of?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_id?: string | null
          seen_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          campaign_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          duplicate_score?: number | null
          email?: string | null
          enriched_at?: string | null
          google_maps_url?: string | null
          id?: string
          last_contact_date?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          possible_duplicate_of?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_id?: string | null
          seen_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_maps_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_maps_searches: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          duplicates: number | null
          id: string
          new_leads: number | null
          query: string
          total_results: number | null
          updated_leads: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          duplicates?: number | null
          id?: string
          new_leads?: number | null
          query: string
          total_results?: number | null
          updated_leads?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          duplicates?: number | null
          id?: string
          new_leads?: number | null
          query?: string
          total_results?: number | null
          updated_leads?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          abacate_charge_id: string
          amount_brl: number
          br_code: string | null
          br_code_base64: string | null
          created_at: string | null
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          expires_at: string | null
          id: string
          paid_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          abacate_charge_id: string
          amount_brl: number
          br_code?: string | null
          br_code_base64?: string | null
          created_at?: string | null
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          abacate_charge_id?: string
          amount_brl?: number
          br_code?: string | null
          br_code_base64?: string | null
          created_at?: string | null
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          duplicate_behavior: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          duplicate_behavior?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          duplicate_behavior?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_results: {
        Row: {
          created_at: string
          enrichment_data: Json | null
          id: string
          item_id: string
          name: string | null
          search_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          enrichment_data?: Json | null
          id?: string
          item_id: string
          name?: string | null
          search_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          enrichment_data?: Json | null
          id?: string
          item_id?: string
          name?: string | null
          search_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          campaign_id: string | null
          created_at: string
          criteria: Json | null
          enrichments: Json | null
          entity_type: string | null
          id: string
          query: string
          result_count: number | null
          status: string | null
          user_id: string
          webset_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          criteria?: Json | null
          enrichments?: Json | null
          entity_type?: string | null
          id?: string
          query: string
          result_count?: number | null
          status?: string | null
          user_id: string
          webset_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          criteria?: Json | null
          enrichments?: Json | null
          entity_type?: string | null
          id?: string
          query?: string
          result_count?: number | null
          status?: string | null
          user_id?: string
          webset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          limits: Json | null
          name: string
          price_brl: number
          slug: string
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name: string
          price_brl?: number
          slug: string
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name?: string
          price_brl?: number
          slug?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          created_at: string | null
          id: string
          last_search_at: string | null
          reset_date: string | null
          searches_used_lifetime: number | null
          searches_used_monthly: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_search_at?: string | null
          reset_date?: string | null
          searches_used_lifetime?: number | null
          searches_used_monthly?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_search_at?: string | null
          reset_date?: string | null
          searches_used_lifetime?: number | null
          searches_used_monthly?: number | null
          user_id?: string
        }
        Relationships: []
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
