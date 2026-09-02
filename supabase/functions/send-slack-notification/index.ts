import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { customer, service, date, time, address, latitude, longitude } = await req.json()

    const message = {
      text: "새 예약이 추가되었습니다",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📅 새 예약 알림",
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*고객사*\n${customer}` },
            { type: "mrkdwn", text: `*서비스*\n${service}` },
            { type: "mrkdwn", text: `*날짜*\n${date}` },
            { type: "mrkdwn", text: `*시간*\n${time}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*주소*\n${address || "미입력"}` },
        },
        ...(latitude && longitude
          ? [{ type: "section", text: { type: "mrkdwn", text: `*위치*\n위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}` } }]
          : []),
      ],
    }

    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL")
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
