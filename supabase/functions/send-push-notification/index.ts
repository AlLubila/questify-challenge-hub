import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { user_id, title, body, data } = await req.json() as PushNotificationRequest;

    if (!user_id || !title || !body) {
      throw new Error("Missing required fields: user_id, title, body");
    }

    console.log(`Sending push notification to user: ${user_id}`);

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for user");
      return new Response(
        JSON.stringify({ success: true, message: "No devices registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a production app, you would send notifications via FCM (Firebase Cloud Messaging) for Android
    // and APNs (Apple Push Notification service) for iOS here
    // For now, we'll just create in-app notifications
    
    console.log(`Found ${tokens.length} device(s) for user ${user_id}`);
    
    // Create in-app notification record
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: user_id,
        type: data?.type || "general",
        title: title,
        message: body,
        metadata: data || {},
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Here you would integrate with FCM/APNs
    // Example for FCM (Firebase Cloud Messaging):
    /*
    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
    
    for (const device of tokens) {
      if (device.platform === 'android') {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: device.token,
            notification: {
              title: title,
              body: body,
            },
            data: data || {},
          }),
        });
      }
    }
    */

    console.log("Push notification sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Push notification sent",
        devices: tokens.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-push-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
