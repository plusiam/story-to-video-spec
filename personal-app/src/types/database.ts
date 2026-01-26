/**
 * Supabase Database Types
 * 실제 DB 스키마에 맞게 정의
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
          full_name: string | null;
          avatar_url: string | null;
          role: string | null;  // 'user' | 'judge' | 'admin' (text 타입)
          is_approved: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          is_approved?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          is_approved?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      works: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          theme: string | null;
          characters: string[] | null;
          panels: Json;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          theme?: string | null;
          characters?: string[] | null;
          panels?: Json;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          theme?: string | null;
          characters?: string[] | null;
          panels?: Json;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
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
      visual_dnas: {
        Row: {
          id: string;
          work_id: string;
          user_id: string;
          art_style: string | null;
          color_tone: string | null;
          lighting: string | null;
          environment: string | null;
          characters: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          work_id: string;
          user_id: string;
          art_style?: string | null;
          color_tone?: string | null;
          lighting?: string | null;
          environment?: string | null;
          characters?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          work_id?: string;
          user_id?: string;
          art_style?: string | null;
          color_tone?: string | null;
          lighting?: string | null;
          environment?: string | null;
          characters?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "visual_dnas_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visual_dnas_work_id_fkey";
            columns: ["work_id"];
            referencedRelation: "works";
            referencedColumns: ["id"];
          }
        ];
      };
      approval_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          admin_id: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          admin_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          admin_id?: string | null;
          reason?: string | null;
          created_at?: string;
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
export type VisualDna = Database['public']['Tables']['visual_dnas']['Row'];
export type ApprovalLog = Database['public']['Tables']['approval_logs']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type WorkInsert = Database['public']['Tables']['works']['Insert'];
export type VisualDnaInsert = Database['public']['Tables']['visual_dnas']['Insert'];
export type ApprovalLogInsert = Database['public']['Tables']['approval_logs']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type WorkUpdate = Database['public']['Tables']['works']['Update'];
export type VisualDnaUpdate = Database['public']['Tables']['visual_dnas']['Update'];
export type ApprovalLogUpdate = Database['public']['Tables']['approval_logs']['Update'];
