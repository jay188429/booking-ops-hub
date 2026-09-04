import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface BookingData {
  customer: string
  service: string
  date: string
  time: string
  address: string
  latitude?: number
  longitude?: number
}

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN")

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = (await response.json()) as TokenResponse
  return data.access_token
}

async function requireAuthenticatedUser(req: Request): Promise<void> {
  const authorization = req.headers.get("Authorization")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")

  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Unauthorized")
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authorization,
    },
  })

  if (!response.ok) {
    throw new Error("Unauthorized")
  }
}

async function addEventToCalendar(
  bookingData: BookingData,
  accessToken: string
): Promise<string> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID")

  if (!calendarId) {
    throw new Error("Calendar ID not configured")
  }

  // Keep the form's Seoul wall-clock value as an RFC3339 value with an
  // explicit KST offset. Do not convert the start value through UTC.
  const startDateTime = `${bookingData.date}T${bookingData.time}:00+09:00`
  const endDate = new Date(startDateTime)
  endDate.setTime(endDate.getTime() + 60 * 60 * 1000)
  const endParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(endDate)
  const endValues = Object.fromEntries(endParts.map(({ type, value }) => [type, value]))
  const endDateTime = `${endValues.year}-${endValues.month}-${endValues.day}T${endValues.hour}:${endValues.minute}:${endValues.second}+09:00`
  const mapLink = bookingData.latitude !== undefined && bookingData.longitude !== undefined
    ? `https://www.google.com/maps/search/?api=1&query=${bookingData.latitude},${bookingData.longitude}`
    : undefined

  const eventBody = {
    summary: `${bookingData.customer} - ${bookingData.service}`,
    description: `
고객사: ${bookingData.customer}
서비스: ${bookingData.service}
주소: ${bookingData.address || "미입력"}
${mapLink ? `지도: ${mapLink}` : ""}
`.trim(),
    location: bookingData.address || undefined,
    start: {
      dateTime: startDateTime,
      timeZone: "Asia/Seoul",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Asia/Seoul",
    },
    reminders: {
      useDefault: true,
    },
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to add event to calendar: ${error}`)
  }

  const event = await response.json() as { id: string }
  return event.id
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    await requireAuthenticatedUser(req)

    const bookingData: BookingData = await req.json()

    // Validate required fields
    if (!bookingData.customer || !bookingData.service || !bookingData.date || !bookingData.time) {
      return new Response(
        JSON.stringify({ error: "Missing required booking fields" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    // Get access token
    const accessToken = await getAccessToken()

    // Add event to Google Calendar
    const eventId = await addEventToCalendar(bookingData, accessToken)

    return new Response(
      JSON.stringify({
        success: true,
        eventId,
        message: "Event added to Google Calendar",
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error in add-to-google-calendar:", errorMessage)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: errorMessage === "Unauthorized" ? 401 : 500,
      headers: corsHeaders,
    })
  }
})
