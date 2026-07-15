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
      analytics_events: {
        Row: {
          content_id: string | null
          created_at: string
          event_type: string
          id: string
          template_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          template_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          template_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          content_id: string | null
          content_kind: string | null
          created_at: string
          id: string
          layout_slot: string
          position: number
          release_at: string | null
          release_week: number | null
          sort_order: number | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          content_id?: string | null
          content_kind?: string | null
          created_at?: string
          id?: string
          layout_slot?: string
          position?: number
          release_at?: string | null
          release_week?: number | null
          sort_order?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          content_id?: string | null
          content_kind?: string | null
          created_at?: string
          id?: string
          layout_slot?: string
          position?: number
          release_at?: string | null
          release_week?: number | null
          sort_order?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          banner_url: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          description_md: string | null
          devotional_template_id: string | null
          eyebrow: string | null
          featured_clip_content_id: string | null
          id: string
          intro_video_content_id: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tag_color: string | null
          title: string
          updated_at: string
          week_number: number | null
          writeup_body: string | null
          writeup_title: string | null
        }
        Insert: {
          banner_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          description_md?: string | null
          devotional_template_id?: string | null
          eyebrow?: string | null
          featured_clip_content_id?: string | null
          id?: string
          intro_video_content_id?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tag_color?: string | null
          title: string
          updated_at?: string
          week_number?: number | null
          writeup_body?: string | null
          writeup_title?: string | null
        }
        Update: {
          banner_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          description_md?: string | null
          devotional_template_id?: string | null
          eyebrow?: string | null
          featured_clip_content_id?: string | null
          id?: string
          intro_video_content_id?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tag_color?: string | null
          title?: string
          updated_at?: string
          week_number?: number | null
          writeup_body?: string | null
          writeup_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_devotional_template_id_fkey"
            columns: ["devotional_template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_featured_clip_content_id_fkey"
            columns: ["featured_clip_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_featured_clip_content_id_fkey"
            columns: ["featured_clip_content_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_intro_video_content_id_fkey"
            columns: ["intro_video_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_intro_video_content_id_fkey"
            columns: ["intro_video_content_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string
          duration_seconds: number | null
          excerpt: string | null
          external_url: string | null
          id: string
          is_seed: boolean
          media_url: string | null
          published_at: string | null
          scheduled_at: string | null
          scripture_reference: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          excerpt?: string | null
          external_url?: string | null
          id?: string
          is_seed?: boolean
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          scripture_reference?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          excerpt?: string | null
          external_url?: string | null
          id?: string
          is_seed?: boolean
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          scripture_reference?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
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
      daily_scriptures: {
        Row: {
          created_at: string
          id: string
          reference: string
          updated_at: string
          verse_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference: string
          updated_at?: string
          verse_text: string
        }
        Update: {
          created_at?: string
          id?: string
          reference?: string
          updated_at?: string
          verse_text?: string
        }
        Relationships: []
      }
      devotional_days: {
        Row: {
          apply_prompt: string | null
          created_at: string
          day_number: number
          focus_preview: string | null
          id: string
          is_override: boolean
          medium: Database["public"]["Enums"]["devotional_medium"]
          pray_prompt: string | null
          preview_carry: string | null
          preview_read: string | null
          preview_reflect: string | null
          reflect_prompt: string | null
          scripture_note: string | null
          scripture_reference: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          apply_prompt?: string | null
          created_at?: string
          day_number: number
          focus_preview?: string | null
          id?: string
          is_override?: boolean
          medium?: Database["public"]["Enums"]["devotional_medium"]
          pray_prompt?: string | null
          preview_carry?: string | null
          preview_read?: string | null
          preview_reflect?: string | null
          reflect_prompt?: string | null
          scripture_note?: string | null
          scripture_reference?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          apply_prompt?: string | null
          created_at?: string
          day_number?: number
          focus_preview?: string | null
          id?: string
          is_override?: boolean
          medium?: Database["public"]["Enums"]["devotional_medium"]
          pray_prompt?: string | null
          preview_carry?: string | null
          preview_read?: string | null
          preview_reflect?: string | null
          reflect_prompt?: string | null
          scripture_note?: string | null
          scripture_reference?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_entries: {
        Row: {
          apply_text: string | null
          created_at: string
          entry_date: string
          entry_subtitle: string | null
          entry_title: string | null
          further_reading_text: string | null
          id: string
          pray_text: string | null
          reflect_text: string | null
          scripture_reference: string | null
          scripture_text: string | null
          template_id: string | null
          todo_items: Json
          todo_text: string | null
          updated_at: string
          user_id: string
          where_text: string | null
        }
        Insert: {
          apply_text?: string | null
          created_at?: string
          entry_date?: string
          entry_subtitle?: string | null
          entry_title?: string | null
          further_reading_text?: string | null
          id?: string
          pray_text?: string | null
          reflect_text?: string | null
          scripture_reference?: string | null
          scripture_text?: string | null
          template_id?: string | null
          todo_items?: Json
          todo_text?: string | null
          updated_at?: string
          user_id: string
          where_text?: string | null
        }
        Update: {
          apply_text?: string | null
          created_at?: string
          entry_date?: string
          entry_subtitle?: string | null
          entry_title?: string | null
          further_reading_text?: string | null
          id?: string
          pray_text?: string | null
          reflect_text?: string | null
          scripture_reference?: string | null
          scripture_text?: string | null
          template_id?: string | null
          todo_items?: Json
          todo_text?: string | null
          updated_at?: string
          user_id?: string
          where_text?: string | null
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
      devotional_movements: {
        Row: {
          created_at: string
          day_end: number
          day_start: number
          description: string | null
          id: string
          position: number
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_end: number
          day_start: number
          description?: string | null
          id?: string
          position?: number
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_end?: number
          day_start?: number
          description?: string | null
          id?: string
          position?: number
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_movements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "devotional_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_templates: {
        Row: {
          accent_color: string | null
          apply_prompt: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          fill_mode: string
          id: string
          intro_video_url: string | null
          is_default: boolean
          is_featured: boolean
          is_seed: boolean
          overview_aim: string | null
          overview_belief: string | null
          overview_intro: string | null
          overview_philosophy: string | null
          overview_problem: string | null
          overview_text: string | null
          pray_items: Json
          pray_prompt: string | null
          reflect_prompt: string | null
          scheduled_at: string | null
          scripture_focus: string | null
          scripture_items: Json
          slug: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          todo_items_pool: Json
          topic_id: string | null
          updated_at: string
          widget_cta_label: string | null
          widget_heading: string | null
          widget_subheading: string | null
        }
        Insert: {
          accent_color?: string | null
          apply_prompt?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          fill_mode?: string
          id?: string
          intro_video_url?: string | null
          is_default?: boolean
          is_featured?: boolean
          is_seed?: boolean
          overview_aim?: string | null
          overview_belief?: string | null
          overview_intro?: string | null
          overview_philosophy?: string | null
          overview_problem?: string | null
          overview_text?: string | null
          pray_items?: Json
          pray_prompt?: string | null
          reflect_prompt?: string | null
          scheduled_at?: string | null
          scripture_focus?: string | null
          scripture_items?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          todo_items_pool?: Json
          topic_id?: string | null
          updated_at?: string
          widget_cta_label?: string | null
          widget_heading?: string | null
          widget_subheading?: string | null
        }
        Update: {
          accent_color?: string | null
          apply_prompt?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          fill_mode?: string
          id?: string
          intro_video_url?: string | null
          is_default?: boolean
          is_featured?: boolean
          is_seed?: boolean
          overview_aim?: string | null
          overview_belief?: string | null
          overview_intro?: string | null
          overview_philosophy?: string | null
          overview_problem?: string | null
          overview_text?: string | null
          pray_items?: Json
          pray_prompt?: string | null
          reflect_prompt?: string | null
          scheduled_at?: string | null
          scripture_focus?: string | null
          scripture_items?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          todo_items_pool?: Json
          topic_id?: string | null
          updated_at?: string
          widget_cta_label?: string | null
          widget_heading?: string | null
          widget_subheading?: string | null
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
      discipleships: {
        Row: {
          created_at: string
          disciple_id: string
          id: string
          mentor_id: string
          requester_id: string
          status: Database["public"]["Enums"]["discipleship_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          disciple_id: string
          id?: string
          mentor_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["discipleship_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          disciple_id?: string
          id?: string
          mentor_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["discipleship_status"]
          updated_at?: string
        }
        Relationships: []
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
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
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
      page_content: {
        Row: {
          created_at: string
          field_key: string
          field_value: string
          id: string
          page_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_value?: string
          id?: string
          page_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_value?: string
          id?: string
          page_key?: string
          updated_at?: string
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
          id: string
          member_since: string
          name: string | null
          streak_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          member_since?: string
          name?: string | null
          streak_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          member_since?: string
          name?: string | null
          streak_count?: number
          updated_at?: string
        }
        Relationships: []
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
      sticky_notes: {
        Row: {
          body: string
          color: string
          created_at: string
          id: string
          position: number
          rotation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          color?: string
          created_at?: string
          id?: string
          position?: number
          rotation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          position?: number
          rotation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_recommendations: {
        Row: {
          computed_at: string
          content_ids: string[]
          is_cold_start: boolean
          user_id: string
        }
        Insert: {
          computed_at?: string
          content_ids?: string[]
          is_cold_start?: boolean
          user_id: string
        }
        Update: {
          computed_at?: string
          content_ids?: string[]
          is_cold_start?: boolean
          user_id?: string
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
      workspace_items: {
        Row: {
          body: Json
          body_text: string
          created_at: string
          devotional_entry_id: string | null
          id: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: Json
          body_text?: string
          created_at?: string
          devotional_entry_id?: string | null
          id?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: Json
          body_text?: string
          created_at?: string
          devotional_entry_id?: string | null
          id?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_items_devotional_entry_id_fkey"
            columns: ["devotional_entry_id"]
            isOneToOne: false
            referencedRelation: "devotional_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      content_items_public: {
        Row: {
          author_name: string | null
          created_at: string | null
          duration_seconds: number | null
          excerpt: string | null
          external_url: string | null
          id: string | null
          published_at: string | null
          scripture_reference: string | null
          thumbnail_url: string | null
          title: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["content_type"] | null
          video_url: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          excerpt?: string | null
          external_url?: string | null
          id?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
          video_url?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          excerpt?: string | null
          external_url?: string | null
          id?: string | null
          published_at?: string | null
          scripture_reference?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
          video_url?: string | null
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
      compute_user_recommendations: { Args: never; Returns: undefined }
      get_popular_content_ids: { Args: { _limit?: number }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_scheduled_content: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_status: "draft" | "published"
      content_type:
        | "teaching"
        | "essay"
        | "podcast"
        | "blog"
        | "clip"
        | "promoted"
      devotional_medium: "scripture" | "podcast" | "reflect"
      discipleship_status: "pending" | "accepted"
      friendship_status: "pending" | "accepted"
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
      content_type: [
        "teaching",
        "essay",
        "podcast",
        "blog",
        "clip",
        "promoted",
      ],
      devotional_medium: ["scripture", "podcast", "reflect"],
      discipleship_status: ["pending", "accepted"],
      friendship_status: ["pending", "accepted"],
    },
  },
} as const
