import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "content_view"
  | "content_save"
  | "note_created"
  | "quote_pinned"
  | "devotional_entry_created"
  | "topic_subscribed";

type Payload = {
  content_id?: string | null;
  topic_id?: string | null;
  template_id?: string | null;
};

/**
 * Fire-and-forget analytics event insert. Silently no-ops for signed-out users
 * (RLS blocks insert without auth.uid()). Never awaited on the render path.
 */
export function trackEvent(event_type: EventType, payload: Payload = {}) {
  void (async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) return;
      await (supabase.from as any)("analytics_events").insert({
        user_id: userId,
        event_type,
        content_id: payload.content_id ?? null,
        topic_id: payload.topic_id ?? null,
        template_id: payload.template_id ?? null,
      });
    } catch {
      // swallow — analytics must never break the UX
    }
  })();
}
