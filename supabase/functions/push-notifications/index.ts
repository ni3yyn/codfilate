import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    const payload = await req.json()
    const { record } = payload // Supabase Database Webhook sends the new record in 'record'

    if (!record || !record.user_id) {
      return new Response("Missing record data", { status: 400 })
    }

    const { user_id, title, body, data } = record

    // 1. Fetch tokens for this user
    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("expo_push_token, id")
      .eq("user_id", user_id)

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response("No tokens found for user", { status: 200 })
    }

    // 2. Prepare Expo messages
    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: "default",
      title: title,
      body: body,
      data: data || {},
      badge: 1,
    }))

    // 3. Send to Expo
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    })

    const result = await response.json()

    // 4. Handle Expo receipts (Cleanup invalid tokens)
    if (result.data) {
      const tokensToDelete = []
      result.data.forEach((ticket, index) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          tokensToDelete.push(tokens[index].id)
        }
      })

      if (tokensToDelete.length > 0) {
        await supabase.from("push_tokens").delete().in("id", tokensToDelete)
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
