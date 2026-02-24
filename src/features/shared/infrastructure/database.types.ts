/**
 * Database types generated from Supabase schema
 * These types represent the actual database structure
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          settings: Json;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          settings?: Json;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          settings?: Json;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string | null;
          role: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
          display_name: string;
          date_of_birth: string | null;
          avatar_url: string | null;
          is_active: boolean;
          joined_at: string;
          invited_by: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id?: string | null;
          role?: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
          display_name: string;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          joined_at?: string;
          invited_by?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string | null;
          role?: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
          display_name?: string;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          joined_at?: string;
          invited_by?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      shopping_lists: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          created_by: string;
          created_by_member_id: string | null;
          created_at: string;
          updated_at: string | null;
          status: 'active' | 'archived';
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          created_by?: string;
          created_by_member_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          status?: 'active' | 'archived';
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          created_by_member_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          status?: 'active' | 'archived';
        };
        Relationships: [];
      };
      shopping_items: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          quantity: number;
          category: string;
          is_purchased: boolean;
          added_by: string;
          purchased_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          quantity?: number;
          category?: string;
          is_purchased?: boolean;
          added_by?: string;
          purchased_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          title?: string;
          quantity?: number;
          category?: string;
          is_purchased?: boolean;
          added_by?: string;
          purchased_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          share_slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          share_slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          is_public?: boolean;
          share_slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          title: string;
          description: string | null;
          link: string | null;
          price: number | null;
          currency: string;
          image_url: string | null;
          priority: 'low' | 'medium' | 'high';
          is_reserved: boolean;
          reserved_by_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          title: string;
          description?: string | null;
          link?: string | null;
          price?: number | null;
          currency?: string;
          image_url?: string | null;
          priority?: 'low' | 'medium' | 'high';
          is_reserved?: boolean;
          reserved_by_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          title?: string;
          description?: string | null;
          link?: string | null;
          price?: number | null;
          currency?: string;
          image_url?: string | null;
          priority?: 'low' | 'medium' | 'high';
          is_reserved?: boolean;
          reserved_by_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      user_is_household_member: {
        Args: {
          p_household_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_member_role: {
        Args: {
          p_household_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      has_min_role: {
        Args: {
          p_household_id: string;
          p_user_id: string;
          p_required_role: string;
        };
        Returns: boolean;
      };
      get_user_id_by_email: {
        Args: {
          lookup_email: string;
        };
        Returns: string;
      };
      get_email_by_user_id: {
        Args: {
          lookup_user_id: string;
        };
        Returns: string;
      };
      reserve_wishlist_item: {
        Args: {
          p_item_id: string;
          p_reserved: boolean;
          p_email?: string | null;
          p_name?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
