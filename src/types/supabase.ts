export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          household_id: string;
          id: string;
          member_id: string | null;
          metadata: Json;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          household_id: string;
          id?: string;
          member_id?: string | null;
          metadata?: Json;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          household_id?: string;
          id?: string;
          member_id?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_logs_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_logs_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      families: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          family_id: string;
          id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          family_id: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          family_id?: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_active: boolean;
          migrated_from_family_id: string | null;
          name: string;
          settings: Json;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          is_active?: boolean;
          migrated_from_family_id?: string | null;
          name: string;
          settings?: Json;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          migrated_from_family_id?: string | null;
          name?: string;
          settings?: Json;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string;
          role: string;
          status: string;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          household_id: string;
          id?: string;
          invited_by: string;
          role?: string;
          status?: string;
          token: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string;
          role?: string;
          status?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      members: {
        Row: {
          avatar_url: string | null;
          date_of_birth: string | null;
          display_name: string;
          household_id: string;
          id: string;
          invited_by: string | null;
          is_active: boolean;
          joined_at: string;
          metadata: Json;
          migrated_from_family_member_id: string | null;
          role: string;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          date_of_birth?: string | null;
          display_name: string;
          household_id: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          joined_at?: string;
          metadata?: Json;
          migrated_from_family_member_id?: string | null;
          role?: string;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          date_of_birth?: string | null;
          display_name?: string;
          household_id?: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          joined_at?: string;
          metadata?: Json;
          migrated_from_family_member_id?: string | null;
          role?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_items: {
        Row: {
          added_by: string;
          added_by_member_id: string | null;
          category: string;
          created_at: string;
          id: string;
          is_purchased: boolean;
          list_id: string;
          purchased_at: string | null;
          purchased_by: string | null;
          purchased_by_member_id: string | null;
          quantity: number;
          title: string;
        };
        Insert: {
          added_by?: string;
          added_by_member_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_purchased?: boolean;
          list_id: string;
          purchased_at?: string | null;
          purchased_by?: string | null;
          purchased_by_member_id?: string | null;
          quantity?: number;
          title: string;
        };
        Update: {
          added_by?: string;
          added_by_member_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_purchased?: boolean;
          list_id?: string;
          purchased_at?: string | null;
          purchased_by?: string | null;
          purchased_by_member_id?: string | null;
          quantity?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_items_added_by_member_id_fkey';
            columns: ['added_by_member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'shopping_lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_items_purchased_by_member_id_fkey';
            columns: ['purchased_by_member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_lists: {
        Row: {
          created_at: string;
          created_by: string;
          created_by_member_id: string | null;
          description: string | null;
          family_id: string;
          household_id: string | null;
          id: string;
          status: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          created_by_member_id?: string | null;
          description?: string | null;
          family_id: string;
          household_id?: string | null;
          id?: string;
          status?: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          created_by_member_id?: string | null;
          description?: string | null;
          family_id?: string;
          household_id?: string | null;
          id?: string;
          status?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_lists_created_by_member_id_fkey';
            columns: ['created_by_member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_lists_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_lists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          is_reserved: boolean;
          link: string | null;
          price: number | null;
          priority: string;
          reserved_at: string | null;
          reserved_by_email: string | null;
          reserved_by_name: string | null;
          title: string;
          wishlist_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_reserved?: boolean;
          link?: string | null;
          price?: number | null;
          priority?: string;
          reserved_at?: string | null;
          reserved_by_email?: string | null;
          reserved_by_name?: string | null;
          title: string;
          wishlist_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_reserved?: boolean;
          link?: string | null;
          price?: number | null;
          priority?: string;
          reserved_at?: string | null;
          reserved_by_email?: string | null;
          reserved_by_name?: string | null;
          title?: string;
          wishlist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlist_items_wishlist_id_fkey';
            columns: ['wishlist_id'];
            isOneToOne: false;
            referencedRelation: 'wishlists';
            referencedColumns: ['id'];
          },
        ];
      };
      wishlists: {
        Row: {
          created_at: string;
          description: string | null;
          household_id: string | null;
          id: string;
          is_public: boolean;
          member_id: string | null;
          share_slug: string;
          title: string;
          updated_at: string | null;
          user_id: string;
          visibility: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          is_public?: boolean;
          member_id?: string | null;
          share_slug: string;
          title: string;
          updated_at?: string | null;
          user_id?: string;
          visibility?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          is_public?: boolean;
          member_id?: string | null;
          share_slug?: string;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          visibility?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlists_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_child_account: {
        Args: { p_member_id: string; p_user_id: string };
        Returns: boolean;
      };
      create_child_member: {
        Args: {
          p_avatar_url?: string;
          p_date_of_birth: string;
          p_household_id: string;
          p_name: string;
        };
        Returns: string;
      };
      create_household_with_owner:
        | {
            Args: { p_creator_display_name?: string; p_name: string };
            Returns: Json;
          }
        | {
            Args: {
              p_creator_display_name?: string;
              p_creator_user_id: string;
              p_name: string;
            };
            Returns: Json;
          };
      generate_household_slug: { Args: { p_name: string }; Returns: string };
      get_email_by_user_id: {
        Args: { lookup_user_id: string };
        Returns: string;
      };
      get_member_id: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: string;
      };
      get_member_role: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: string;
      };
      get_my_member_role: { Args: { p_household_id: string }; Returns: string };
      get_user_id_by_email: { Args: { lookup_email: string }; Returns: string };
      has_min_role: {
        Args: {
          p_household_id: string;
          p_required_role: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      invite_member: {
        Args: { p_email: string; p_household_id: string; p_role?: string };
        Returns: string;
      };
      is_active_member_of_household: {
        Args: { p_household_id: string };
        Returns: boolean;
      };
      is_owner_of_household: {
        Args: { p_household_id: string };
        Returns: boolean;
      };
      is_owner_or_admin_of_household: {
        Args: { p_household_id: string };
        Returns: boolean;
      };
      log_activity: {
        Args: {
          p_action: string;
          p_entity_id: string;
          p_entity_type: string;
          p_household_id: string;
          p_member_id: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      reserve_wishlist_item: {
        Args: {
          p_email?: string;
          p_item_id: string;
          p_name?: string;
          p_reserved: boolean;
        };
        Returns: undefined;
      };
      user_is_family_member: {
        Args: { p_family_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_is_family_owner: {
        Args: { p_family_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_is_household_member: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_is_household_owner: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
