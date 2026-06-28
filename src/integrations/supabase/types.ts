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
      agendamentos: {
        Row: {
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data: string
          duracao_historica: number | null
          expira_em: string | null
          hora: string
          id: string
          manicure_id: string
          servico_id: string | null
          servico_nome_historico: string | null
          serviço_nome_histórico: string | null
          status: Database["public"]["Enums"]["status_agendamento"]
          valor_cobrado: number | null
          valor_historico: number | null
          valor_reserva: number | null
          variacao: string | null
        }
        Insert: {
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data: string
          duracao_historica?: number | null
          expira_em?: string | null
          hora: string
          id?: string
          manicure_id: string
          servico_id?: string | null
          servico_nome_historico?: string | null
          serviço_nome_histórico?: string | null
          status?: Database["public"]["Enums"]["status_agendamento"]
          valor_cobrado?: number | null
          valor_historico?: number | null
          valor_reserva?: number | null
          variacao?: string | null
        }
        Update: {
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data?: string
          duracao_historica?: number | null
          expira_em?: string | null
          hora?: string
          id?: string
          manicure_id?: string
          servico_id?: string | null
          servico_nome_historico?: string | null
          serviço_nome_histórico?: string | null
          status?: Database["public"]["Enums"]["status_agendamento"]
          valor_cobrado?: number | null
          valor_historico?: number | null
          valor_reserva?: number | null
          variacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_manicure_id_fkey"
            columns: ["manicure_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_funcionamento: {
        Row: {
          ativo: boolean
          blocos: Json | null
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
          manicure_id: string
        }
        Insert: {
          ativo?: boolean
          blocos?: Json | null
          dia_semana: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          manicure_id: string
        }
        Update: {
          ativo?: boolean
          blocos?: Json | null
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          manicure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_funcionamento_manicure_id_fkey"
            columns: ["manicure_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          chave_pix: string | null
          created_at: string
          expires_at: string | null
          frase_boas_vindas: string | null
          id: string
          is_active: boolean
          nome: string
          plano_ativo: boolean | null
          slug: string
          taxa_reserva_ativo: boolean | null
          taxa_reserva_percentual: number | null
          telefone: string | null
          tempo_expiracao_min: number | null
          tipo_chave_pix: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          chave_pix?: string | null
          created_at?: string
          expires_at?: string | null
          frase_boas_vindas?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          plano_ativo?: boolean | null
          slug: string
          taxa_reserva_ativo?: boolean | null
          taxa_reserva_percentual?: number | null
          telefone?: string | null
          tempo_expiracao_min?: number | null
          tipo_chave_pix?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          chave_pix?: string | null
          created_at?: string
          expires_at?: string | null
          frase_boas_vindas?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          plano_ativo?: boolean | null
          slug?: string
          taxa_reserva_ativo?: boolean | null
          taxa_reserva_percentual?: number | null
          telefone?: string | null
          tempo_expiracao_min?: number | null
          tipo_chave_pix?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          duracao: number
          duracao_ambos: number | null
          duracao_mao: number | null
          duracao_pe: number | null
          id: string
          imagem_url: string | null
          manicure_id: string
          nome: string
          preco: number
          preco_ambos: number | null
          preco_mao: number | null
          preco_pe: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          duracao?: number
          duracao_ambos?: number | null
          duracao_mao?: number | null
          duracao_pe?: number | null
          id?: string
          imagem_url?: string | null
          manicure_id: string
          nome: string
          preco?: number
          preco_ambos?: number | null
          preco_mao?: number | null
          preco_pe?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          duracao?: number
          duracao_ambos?: number | null
          duracao_mao?: number | null
          duracao_pe?: number | null
          id?: string
          imagem_url?: string | null
          manicure_id?: string
          nome?: string
          preco?: number
          preco_ambos?: number | null
          preco_mao?: number | null
          preco_pe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_manicure_id_fkey"
            columns: ["manicure_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          chave_pix_suporte: string | null
          id: string
          updated_at: string | null
          valor_plano: number | null
          whatsapp_suporte: string | null
        }
        Insert: {
          chave_pix_suporte?: string | null
          id?: string
          updated_at?: string | null
          valor_plano?: number | null
          whatsapp_suporte?: string | null
        }
        Update: {
          chave_pix_suporte?: string | null
          id?: string
          updated_at?: string | null
          valor_plano?: number | null
          whatsapp_suporte?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "moderator" | "super_admin"
      status_agendamento: "pendente" | "confirmado" | "concluido" | "cancelado"
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
      app_role: ["admin", "moderator", "super_admin"],
      status_agendamento: ["pendente", "confirmado", "concluido", "cancelado"],
    },
  },
} as const
