export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      content_items: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string
          excerpt: string | null
          id: string
          media_url: string | null
          published_at: string | null
          scripture_reference: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          media_url?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          media_url?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_entries: {
        Row: {
          apply_text: string | null
          created_at: string
          entry_date: string
          id: string
          pray_text: string | null
          reflect_text: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_text?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          pray_text?: string | null
          reflect_text?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_text?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          pray_text?: string | null
          reflect_text?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_templates: {
        Row: {
          apply_prompt: string | null
          created_at: string
          description: string | null
          id: string
          pray_prompt: string | null
          reflect_prompt: string | null
          scripture_focus: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          apply_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pray_prompt?: string | null
          reflect_prompt?: string | null
          scripture_focus?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          apply_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pray_prompt?: string | null
          reflect_prompt?: string | null
          scripture_focus?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_templates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          body: string
          created_at: string
          essay_id: string
          id: string
          is_admin_pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          essay_id: string
          id?: string
          is_admin_pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          essay_id?: string
          id?: string
          is_admin_pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          content_item_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          content_item_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_item_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          link_params: Json
          link_route: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          link_params?: Json
          link_route?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          link_params?: Json
          link_route?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_quotes: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          quote_text: string
          user_id: string
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          quote_text: string
          user_id: string
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          quote_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_quotes_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_quotes_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_template_id: string | null
          id: string
          member_since: string
          name: string | null
          streak_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_template_id?: string | null
          id: string
          member_since?: string
          name?: string | null
          streak_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_template_id?: string | null
          id?: string
          member_since?: string
          name?: string | null
          streak_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          content_item_id: string | null
          devotional_template_id: string | null
          id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          content_item_id?: string | null
          devotional_template_id?: string | null
          id?: string
          saved_at?: string
          user_id: string
        }
        Update: {
          content_item_id?: string | null
          devotional_template_id?: string | null
          id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_devotional_template_id_fkey"
            columns: ["devotional_template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_subscriptions: {
        Row: {
          created_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_subscriptions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          color_key: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color_key: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color_key?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      content_items_public: {
        Row: {
          author_name: string | null
          created_at: string | null
          excerpt: string | null
          id: string | null
          published_at: string | null
          scripture_reference: string | null
          thumbnail_url: string | null
          title: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["content_type"] | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
        }
        Update: {
          author_name?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_status: "draft" | "published"
      content_type: "teaching" | "essay" | "podcast" | "blog"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      content_status: ["draft", "published"],
      content_type: ["teaching", "essay", "podcast", "blog"],
    },
  },
} as const
