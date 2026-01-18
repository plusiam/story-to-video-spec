/**
 * Supabase Database Types
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nickname: string | null;
          avatar_url: string | null;
          provider: string;
          status: 'pending' | 'approved' | 'rejected' | 'suspended';
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          role: 'user' | 'admin';
          created_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          nickname?: string | null;
          avatar_url?: string | null;
          provider?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'suspended';
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          provider?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'suspended';
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          last_login_at?: string | null;
        };
        Relationships: [];
      };
      works: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          step: number;
          panels: Json;
          ai_generated: Json | null;
          is_public: boolean;
          status: 'draft' | 'complete';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          step?: number;
          panels?: Json;
          ai_generated?: Json | null;
          is_public?: boolean;
          status?: 'draft' | 'complete';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          step?: number;
          panels?: Json;
          ai_generated?: Json | null;
          is_public?: boolean;
          status?: 'draft' | 'complete';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "works_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      approval_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          admin_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          admin_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          admin_id?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_logs_admin_id_fkey";
            columns: ["admin_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Work = Database['public']['Tables']['works']['Row'];
export type ApprovalLog = Database['public']['Tables']['approval_logs']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type WorkInsert = Database['public']['Tables']['works']['Insert'];
export type ApprovalLogInsert = Database['public']['Tables']['approval_logs']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type WorkUpdate = Database['public']['Tables']['works']['Update'];
export type ApprovalLogUpdate = Database['public']['Tables']['approval_logs']['Update'];
