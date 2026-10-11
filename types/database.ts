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
export type MembershipStatus = "INVITED" | "ACTIVE" | "REVOKED";
export type RelationStatus = "INVITED" | "ACTIVE" | "REVOKED";

/** Compact helper mirroring the shape Supabase generates per table. */
type DbTable<
  TRow,
  TInsert,
  TUpdate,
  TRelationships extends readonly unknown[] = [],
> = {
  Row: TRow;
  Insert: TInsert;
  Update: TUpdate;
  Relationships: TRelationships;
};

export interface Database {
  public: {
    Tables: {
      companies: DbTable<
        {
          id: string;
          name: string;
          type: CompanyType;
          support_email: string | null;
          deletion_grace_days: number;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          type: CompanyType;
          support_email?: string | null;
          deletion_grace_days?: number;
          created_by?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          name?: string;
          type?: CompanyType;
          support_email?: string | null;
          deletion_grace_days?: number;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      users: DbTable<
        {
          id: string;
          email: string;
          role: UserRole;
          active_company_id: string | null;
          is_platform_admin: boolean;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        },
        {
          id: string;
          email: string;
          role?: UserRole;
          active_company_id?: string | null;
          is_platform_admin?: boolean;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          email?: string;
          role?: UserRole;
          active_company_id?: string | null;
          is_platform_admin?: boolean;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }
      >;
      memberships: DbTable<
        {
          id: string;
          company_id: string;
          user_id: string | null;
          role: UserRole;
          status: MembershipStatus;
          invited_email: string;
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
        },
        {
          id?: string;
          company_id: string;
          user_id?: string | null;
          role?: UserRole;
          status?: MembershipStatus;
          invited_email: string;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
        },
        {
          id?: string;
          company_id?: string;
          user_id?: string | null;
          role?: UserRole;
          status?: MembershipStatus;
          invited_email?: string;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
        }
      >;
      company_relations: DbTable<
        {
          id: string;
          mining_id: string;
          provider_id: string;
          status: RelationStatus;
          invited_by: string | null;
          created_at: string;
          accepted_at: string | null;
        },
        {
          id?: string;
          mining_id: string;
          provider_id: string;
          status?: RelationStatus;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        },
        {
          id?: string;
          mining_id?: string;
          provider_id?: string;
          status?: RelationStatus;
          invited_by?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        }
      >;

      shifts: DbTable<
        {
          id: string;
          mining_id: string;
          driver_user_id: string;
          license_plate: string;
          starts_at: string;
          notes: string | null;
          matched_video_id: string | null;
          video_deleted_at: string | null;
          template_id: string | null;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          mining_id: string;
          driver_user_id: string;
          license_plate: string;
          starts_at: string;
          notes?: string | null;
          matched_video_id?: string | null;
          video_deleted_at?: string | null;
          template_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          mining_id?: string;
          driver_user_id?: string;
          license_plate?: string;
          starts_at?: string;
          notes?: string | null;
          matched_video_id?: string | null;
          video_deleted_at?: string | null;
          template_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      shift_templates: DbTable<
        {
          id: string;
          mining_id: string;
          driver_user_id: string;
          license_plate: string;
          weekday: number;
          start_time: string;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          mining_id: string;
          driver_user_id: string;
          license_plate: string;
          weekday: number;
          start_time: string;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          mining_id?: string;
          driver_user_id?: string;
          license_plate?: string;
          weekday?: number;
          start_time?: string;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      video_metadata: DbTable<
        {
          id: string;
          provider_id: string | null;
          mining_id: string | null;
          driver_email: string | null;
          license_plate: string;
          recorded_at: string;
          external_id: string | null;
          extra_info: Json | null;
          storage_path: string | null;
          storage_size: number | null;
          storage_mime: string | null;
          shift_id: string | null;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          provider_id?: string | null;
          mining_id?: string | null;
          driver_email?: string | null;
          license_plate: string;
          recorded_at: string;
          external_id?: string | null;
          extra_info?: Json | null;
          storage_path?: string | null;
          storage_size?: number | null;
          storage_mime?: string | null;
          shift_id?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          provider_id?: string | null;
          mining_id?: string | null;
          driver_email?: string | null;
          license_plate?: string;
          recorded_at?: string;
          external_id?: string | null;
          extra_info?: Json | null;
          storage_path?: string | null;
          storage_size?: number | null;
          storage_mime?: string | null;
          shift_id?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      deletion_requests: DbTable<
        {
          id: string;
          video_id: string;
          driver_id: string;
          status: DeletionStatus;
          created_at: string;
          resolved_at: string | null;
          shift_id: string | null;
          scheduled_deletion_at: string | null;
          auto_deleted_at: string | null;
          provider_id: string | null;
          provider_declared_at: string | null;
          provider_declared_by: string | null;
          provider_note: string | null;
        },
        {
          id?: string;
          video_id: string;
          driver_id: string;
          status?: DeletionStatus;
          created_at?: string;
          resolved_at?: string | null;
          shift_id?: string | null;
          scheduled_deletion_at?: string | null;
          auto_deleted_at?: string | null;
          provider_id?: string | null;
          provider_declared_at?: string | null;
          provider_declared_by?: string | null;
          provider_note?: string | null;
        },
        {
          id?: string;
          video_id?: string;
          driver_id?: string;
          status?: DeletionStatus;
          created_at?: string;
          resolved_at?: string | null;
          shift_id?: string | null;
          scheduled_deletion_at?: string | null;
          auto_deleted_at?: string | null;
          provider_id?: string | null;
          provider_declared_at?: string | null;
          provider_declared_by?: string | null;
          provider_note?: string | null;
        }
      >;
      user_invites: DbTable<
        {
          email: string;
          role: UserRole;
          company_id: string | null;
          created_at: string;
        },
        {
          email: string;
          role: UserRole;
          company_id?: string | null;
          created_at?: string;
        },
        {
          email?: string;
          role?: UserRole;
          company_id?: string | null;
          created_at?: string;
        }
      >;
      recording_access_log: DbTable<
        {
          id: string;
          video_id: string;
          user_id: string;
          company_id: string | null;
          action: string;
          created_at: string;
        },
        {
          id?: string;
          video_id: string;
          user_id: string;
          company_id?: string | null;
          action?: string;
          created_at?: string;
        },
        {
          id?: string;
          video_id?: string;
          user_id?: string;
          company_id?: string | null;
          action?: string;
          created_at?: string;
        }
      >;
      company_data_policies: DbTable<
        {
          company_id: string;
          content: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          company_id: string;
          content?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          company_id?: string;
          content?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
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
      current_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      create_company: {
        Args: { p_name: string; p_type: CompanyType };
        Returns: string;
      };
      process_due_deletions: {
        Args: Record<string, never>;
        Returns: number;
      };
      generate_shift_occurrences: {
        Args: {
          p_mining_id: string;
          p_from?: string | null;
          p_to?: string | null;
        };
        Returns: number;
      };
      prune_my_shift_occurrences: {
        Args: { p_older_than?: string | null };
        Returns: number;
      };
    };
    Enums: {
      company_type: CompanyType;
      user_role: UserRole;
      deletion_status: DeletionStatus;
      membership_status: MembershipStatus;
      relation_status: RelationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** Convenience aliases for the row shapes used across the UI. */
export type Company = Tables<"companies">;
export type UserProfile = Tables<"users">;
export type Membership = Tables<"memberships">;
export type CompanyRelation = Tables<"company_relations">;
export type Shift = Tables<"shifts">;
export type ShiftTemplate = Tables<"shift_templates">;
export type CompanyDataPolicy = Tables<"company_data_policies">;
export type VideoMetadata = Tables<"video_metadata">;
export type DeletionRequest = Tables<"deletion_requests">;
export type UserInvite = Tables<"user_invites">;
