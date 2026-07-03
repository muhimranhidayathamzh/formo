/**
 * Tipe database Formo — ditulis tangan (bukan `supabase gen types`, karena migrasi
 * dijalankan di Supabase hosted tanpa CLI lokal). Harus tetap sinkron dengan
 * `supabase/migrations/0001_init.sql`. Dipasang sebagai generic ke Supabase client
 * agar semua query `.from(...)` ter-type penuh (zero `any`, aturan CLAUDE.md).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DocumentStatus = "draft" | "structured" | "exported";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          doc_type: string | null;
          source_content: string | null;
          auto_clean_wording: boolean;
          format_instruction_text: string | null;
          reference_file_path: string | null;
          document_model: Json | null;
          format_profile: Json | null;
          status: DocumentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          doc_type?: string | null;
          source_content?: string | null;
          auto_clean_wording?: boolean;
          format_instruction_text?: string | null;
          reference_file_path?: string | null;
          document_model?: Json | null;
          format_profile?: Json | null;
          status?: DocumentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          doc_type?: string | null;
          source_content?: string | null;
          auto_clean_wording?: boolean;
          format_instruction_text?: string | null;
          reference_file_path?: string | null;
          document_model?: Json | null;
          format_profile?: Json | null;
          status?: DocumentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_assets: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          ref_token: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          ref_token: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          ref_token?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// --- Alias konvenien ---
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
export type DocumentAssetRow =
  Database["public"]["Tables"]["document_assets"]["Row"];
