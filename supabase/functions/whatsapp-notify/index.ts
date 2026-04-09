import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WHATSAPP_API_URL = "https://graph.facebook.com/v17.0"
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

/**
 * Status to WhatsApp Template Mapping
 */
const STATUS_TEMPLATES = {
  "pending": "order_received",
  "confirmed": "order_confirmed",
  "shipped": "order_shipped",
  "in_transit": "order_shipped",
  "delivered": "order_delivered",
  "cancelled": "order_cancelled",
};

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    const payload = await req.json()
    const { order_id, new_status, customer_phone, customer_name, store_id } = payload

    // 1. Check if store has WhatsApp enabled
    const { data: store } = await supabase
      .from("stores")
      .select("whatsapp_notifications_enabled, name")
      .eq("id", store_id)
      .single()

    if (!store?.whatsapp_notifications_enabled) {
      return new Response(JSON.stringify({ message: "WhatsApp not enabled for this store" }), { status: 200 })
    }

    // 2. Identify template
    const templateName = STATUS_TEMPLATES[new_status]
    if (!templateName) {
      return new Response(JSON.stringify({ message: "No template for this status" }), { status: 200 })
    }

    // 3. Format Phone (Ensure it's in international format without +)
    let formattedPhone = customer_phone.replace(/\D/g, "")
    if (!formattedPhone.startsWith("213")) {
      formattedPhone = "213" + formattedPhone.replace(/^0/, "")
    }

    // 4. Resolve Tracking Link
    const trackingLink = `https://codfilate.com/track/${order_id}`

    // 5. Send to Meta WhatsApp API
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "ar" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: customer_name },
                { type: "text", text: store.name },
                { type: "text", text: trackingLink },
              ],
            },
          ],
        },
      }),
    })

    const result = await response.json()

    // 6. Log the notification
    await supabase.from("notification_logs").insert({
      order_id,
      recipient: formattedPhone,
      type: "whatsapp",
      status: response.ok ? "sent" : "failed",
      payload: result,
      error_message: response.ok ? null : result.error?.message,
    })

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: response.status,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
