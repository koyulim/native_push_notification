import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

interface PushNotification {
  id: string;
  title: string;
  message: string;
  user_id: string;
  status: string;
}

interface PushToken {
  token: string;
}

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  try {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const { record } = await req.json();
    const notification = record as PushNotification;

    console.log("Processing notification:", notification);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", notification.user_id);

    if (tokenError) {
      console.error("Error fetching push tokens:", tokenError);
      throw tokenError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for user:", notification.user_id);

      await supabase
        .from("push_notifications")
        .update({ status: "failed", sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      return new Response(
        JSON.stringify({ error: "No push tokens found for user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const messages: ExpoPushMessage[] = tokens.map((tokenData: PushToken) => ({
      to: tokenData.token,
      sound: "default",
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
      },
    }));

    console.log("Sending push notifications:", messages);

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("Expo push response:", result);

    const hasErrors = result.data?.some(
      (ticket: { status: string }) => ticket.status === "error"
    );

    await supabase
      .from("push_notifications")
      .update({
        status: hasErrors ? "failed" : "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      }
    );
  }
});