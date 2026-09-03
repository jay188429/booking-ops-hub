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

async function addEventToCalendar(
  bookingData: BookingData,
  accessToken: string
): Promise<string> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID")

  if (!calendarId) {
    throw new Error("Calendar ID not configured")
  }

  // Parse date and time to create ISO datetime
  const [year, month, day] = bookingData.date.split("-").map(Number)
  const [hours, minutes] = bookingData.time.split(":").map(Number)

  const startDateTime = new Date(year, month - 1, day, hours, minutes)
  const endDateTime = new Date(startDateTime)
  endDateTime.setHours(endDateTime.getHours() + 1) // Default 1 hour duration

  const eventBody = {
    summary: `${bookingData.customer} - ${bookingData.service}`,
    description: `
고객사: ${bookingData.customer}
서비스: ${bookingData.service}
주소: ${bookingData.address || "미입력"}
`.trim(),
    location: bookingData.address || undefined,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: "Asia/Seoul",
    },
    end: {
      dateTime: endDateTime.toISOString(),
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
      status: 500,
      headers: corsHeaders,
    })
  }
})
