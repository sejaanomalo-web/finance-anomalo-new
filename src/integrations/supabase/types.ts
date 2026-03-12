export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type FinanceStatus = 'pending' | 'paid' | 'overdue';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          active?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          active?: boolean;
        };
      };
      user_organization_roles: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          role: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id: string;
          role: string;
          active?: boolean;
        };
        Update: {
          role?: string;
          active?: boolean;
        };
      };
      clients: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          document: string | null;
          status: string;
          avatar_url: string | null;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          document?: string | null;
          status?: string;
          avatar_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          document?: string | null;
          status?: string;
          avatar_url?: string | null;
          notes?: string | null;
          updated_by?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          type: string;
          color: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          type: string;
          color?: string | null;
          active?: boolean;
        };
        Update: {
          name?: string;
          type?: string;
          color?: string | null;
          active?: boolean;
        };
      };
      platforms: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          type: string | null;
          fee_value: number;
          fee_type: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          type?: string | null;
          fee_value?: number;
          fee_type?: string | null;
          notes?: string | null;
          active?: boolean;
        };
        Update: {
          name?: string;
          type?: string | null;
          fee_value?: number;
          fee_type?: string | null;
          notes?: string | null;
          active?: boolean;
        };
      };
      receivables: {
        Row: {
          id: string;
          org_id: string;
          client_id: string | null;
          description: string;
          amount: number;
          due_date: string;
          expected_date: string | null;
          issue_date: string | null;
          external_reference: string | null;
          payment_method: string | null;
          category_id: string | null;
          platform_id: string | null;
          notes: string | null;
          status: FinanceStatus;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: any;
        Update: any;
      };
      payables: {
        Row: {
          id: string;
          org_id: string;
          description: string;
          amount: number;
          due_date: string;
          issue_date: string | null;
          supplier_name: string | null;
          payment_method: string | null;
          category_id: string | null;
          platform_id: string | null;
          notes: string | null;
          status: FinanceStatus;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: any;
        Update: any;
      };
      cash_entries: {
        Row: {
          id: string;
          org_id: string;
          description: string;
          amount: number;
          type: string;
          entry_date: string;
          category_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      settlements: {
        Row: {
          id: string;
          org_id: string;
          source_type: string;
          source_id: string;
          direction: 'in' | 'out';
          amount: number;
          settlement_date: string;
          reference: string | null;
          notes: string | null;
          account_name: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      app_settings: {
        Row: {
          id: string;
          org_id: string;
          setting_key: string;
          setting_value: Json;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          setting_key: string;
          setting_value: Json;
          updated_by?: string | null;
        };
        Update: {
          setting_value?: Json;
          updated_by?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          entity_type: string;
          entity_id: string | null;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      finance_idempotency_keys: {
        Row: {
          id: string;
          org_id: string;
          actor_id: string;
          scope: string;
          idempotency_key: string;
          request_hash: string;
          response_payload: Json;
          created_at: string;
          expires_at: string;
        };
        Insert: any;
        Update: any;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      finance_mutate_receivable: {
        Args: {
          p_org_id: string;
          p_actor_id: string;
          p_action: 'create' | 'update' | 'delete';
          p_entity_id: string | null;
          p_payload: Json;
          p_idempotency_key: string;
          p_request_hash: string;
        };
        Returns: Json;
      };
      finance_mutate_payable: {
        Args: {
          p_org_id: string;
          p_actor_id: string;
          p_action: 'create' | 'update' | 'delete';
          p_entity_id: string | null;
          p_payload: Json;
          p_idempotency_key: string;
          p_request_hash: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
