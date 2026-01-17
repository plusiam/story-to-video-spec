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
      };
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Work = Database['public']['Tables']['works']['Row'];
export type ApprovalLog = Database['public']['Tables']['approval_logs']['Row'];
