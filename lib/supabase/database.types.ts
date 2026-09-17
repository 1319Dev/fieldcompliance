import type { OrganizationRole } from "@/lib/auth/roles";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: OrganizationRole;
          status: InvitationStatus;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: OrganizationRole;
          status?: InvitationStatus;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: OrganizationRole;
          status?: InvitationStatus;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          user_id: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
          organization_id: string;
          oq_expiring_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          oq_expiring_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          oq_expiring_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      organization_role: OrganizationRole;
      invitation_status: InvitationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
