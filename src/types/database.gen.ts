export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activites: {
        Row: {
          acre: boolean;
          actif: boolean;
          created_at: string;
          date_debut: string;
          id: string;
          nom: string;
          ordre: number;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at: string;
          user_id: string;
          versement_liberatoire: boolean;
        };
        Insert: {
          acre?: boolean;
          actif?: boolean;
          created_at?: string;
          date_debut: string;
          id?: string;
          nom: string;
          ordre?: number;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id: string;
          versement_liberatoire?: boolean;
        };
        Update: {
          acre?: boolean;
          actif?: boolean;
          created_at?: string;
          date_debut?: string;
          id?: string;
          nom?: string;
          ordre?: number;
          regime?: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id?: string;
          versement_liberatoire?: boolean;
        };
        Relationships: [];
      };
      backup_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          id: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          code_hash: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      abonnements: {
        Row: {
          created_at: string;
          id: string;
          periode_fin: string | null;
          statut: Database["public"]["Enums"]["statut_abonnement"];
          stripe_customer_id: string;
          stripe_subscription_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          periode_fin?: string | null;
          statut?: Database["public"]["Enums"]["statut_abonnement"];
          stripe_customer_id: string;
          stripe_subscription_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          periode_fin?: string | null;
          statut?: Database["public"]["Enums"]["statut_abonnement"];
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cotisations: {
        Row: {
          acre_applique: boolean;
          created_at: string;
          declaration_id: string;
          id: string;
          montant_cotisations: number;
          montant_versement_liberatoire: number | null;
          periode: string;
          taux_applique: number;
          user_id: string;
        };
        Insert: {
          acre_applique?: boolean;
          created_at?: string;
          declaration_id: string;
          id?: string;
          montant_cotisations: number;
          montant_versement_liberatoire?: number | null;
          periode: string;
          taux_applique: number;
          user_id: string;
        };
        Update: {
          acre_applique?: boolean;
          created_at?: string;
          declaration_id?: string;
          id?: string;
          montant_cotisations?: number;
          montant_versement_liberatoire?: number | null;
          periode?: string;
          taux_applique?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotisations_declaration_id_fkey";
            columns: ["declaration_id"];
            isOneToOne: true;
            referencedRelation: "declarations";
            referencedColumns: ["id"];
          },
        ];
      };
      declarations: {
        Row: {
          activite_id: string | null;
          annee: number;
          created_at: string;
          id: string;
          mois: number;
          montant_ca: number;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activite_id?: string | null;
          annee: number;
          created_at?: string;
          id?: string;
          mois: number;
          montant_ca: number;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activite_id?: string | null;
          annee?: number;
          created_at?: string;
          id?: string;
          mois?: number;
          montant_ca?: number;
          regime?: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "declarations_activite_id_fkey";
            columns: ["activite_id"];
            isOneToOne: false;
            referencedRelation: "activites";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          acre: boolean;
          created_at: string;
          date_debut_activite: string;
          frequence_declaration: Database["public"]["Enums"]["frequence_declaration"];
          id: string;
          notifications_email: boolean;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at: string;
          user_id: string;
          versement_liberatoire: boolean;
        };
        Insert: {
          acre?: boolean;
          created_at?: string;
          date_debut_activite: string;
          frequence_declaration?: Database["public"]["Enums"]["frequence_declaration"];
          id?: string;
          notifications_email?: boolean;
          regime: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id: string;
          versement_liberatoire?: boolean;
        };
        Update: {
          acre?: boolean;
          created_at?: string;
          date_debut_activite?: string;
          frequence_declaration?: Database["public"]["Enums"]["frequence_declaration"];
          id?: string;
          notifications_email?: boolean;
          regime?: Database["public"]["Enums"]["regime_fiscal"];
          updated_at?: string;
          user_id?: string;
          versement_liberatoire?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      frequence_declaration: "mensuelle" | "trimestrielle";
      regime_fiscal: "bic_marchandises" | "bic_services" | "bnc";
      statut_abonnement: "actif" | "inactif" | "expire" | "annule";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      frequence_declaration: ["mensuelle", "trimestrielle"],
      regime_fiscal: ["bic_marchandises", "bic_services", "bnc"],
      statut_abonnement: ["actif", "inactif", "expire", "annule"],
    },
  },
} as const;
