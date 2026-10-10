/**
 * Hand-written Supabase database types.
 *
 * These mirror the SQL migrations in `supabase/migrations`. If you install the
 * Supabase CLI you can regenerate them with:
 *
 *   supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CompanyType = "MINING" | "PROVIDER";
export type UserRole = "DRIVER" | "PROVIDER" | "MINING";
export type DeletionStatus = "PENDING" | "DELETED";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          type: CompanyType;
          support_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: CompanyType;
          support_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: CompanyType;
          support_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          company_id: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          company_id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          company_id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      video_metadata: {
        Row: {
          id: string;
          provider_id: string;
          driver_email: string;
          license_plate: string;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          driver_email: string;
          license_plate: string;
          recorded_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          driver_email?: string;
          license_plate?: string;
          recorded_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_metadata_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      deletion_requests: {
        Row: {
          id: string;
          video_id: string;
          driver_id: string;
          status: DeletionStatus;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          video_id: string;
          driver_id: string;
          status?: DeletionStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          video_id?: string;
          driver_id?: string;
          status?: DeletionStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deletion_requests_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "video_metadata";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deletion_requests_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_invites: {
        Row: {
          email: string;
          role: Exclude<UserRole, "DRIVER">;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          role: Exclude<UserRole, "DRIVER">;
          company_id?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: Exclude<UserRole, "DRIVER">;
          company_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      current_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      company_type: CompanyType;
      user_role: UserRole;
      deletion_status: DeletionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** Convenience aliases for the row shapes used across the UI. */
export type Company = Tables<"companies">;
export type UserProfile = Tables<"users">;
export type VideoMetadata = Tables<"video_metadata">;
export type DeletionRequest = Tables<"deletion_requests">;
export type UserInvite = Tables<"user_invites">;
