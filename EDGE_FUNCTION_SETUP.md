# Supabase Edge Function Setup Guide

## 개요
Slack 알림을 전송하는 Supabase Edge Function을 배포하는 방법입니다. Edge Function은 서버-사이드에서 안전하게 Slack Webhook을 호출합니다.

## 진행 상황

### ✅ 완료된 작업
- Edge Function 코드 작성: `/supabase/functions/send-slack-notification/index.ts`
- BookingForm 컴포넌트 수정: Edge Function으로 호출 변경
- 클라이언트-사이드 직접 Webhook 호출 제거

### 📋 수행할 작업

#### 1. Supabase 대시보드에서 Edge Function 배포

1. [Supabase 대시보드](https://app.supabase.com) 접속
2. 프로젝트 선택: `booking-hub` (URL: `https://ruzgwxupfykqvdaxvldw.supabase.co`)
3. 좌측 메뉴에서 **Edge Functions** 클릭
4. **Create a new function** 또는 **Deploy a new function** 클릭
5. 함수명: `send-slack-notification` 입력
6. 다음 코드를 붙여넣기:

```typescript
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
```

7. **Deploy** 클릭

#### 2. 환경 변수 설정

1. Supabase 대시보드에서 **Settings** → **Edge Functions** 또는 **Secrets** 메뉴로 이동
2. **New Secret** 클릭
3. 다음 정보 입력:
   - **Name**: `SLACK_WEBHOOK_URL`
   - **Value**: 본인의 Slack Incoming Webhook URL
4. **Save** 클릭

#### 3. Edge Function URL 확인

배포 후 Edge Function URL은 다음 형식입니다:
```
https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
```

#### 4. 테스트

Supabase 대시보드에서 Edge Function 페이지의 **Logs** 탭에서 실시간으로 호출을 확인할 수 있습니다.

## 코드 변경사항

### BookingForm.tsx 수정 내용
- 클라이언트-사이드 Slack 직접 호출 제거
- Supabase Edge Function으로 호출 변경
- `VITE_SUPABASE_ANON_KEY`를 Authorization 헤더에 포함

### 환경 변수 (이미 설정됨)
```env
VITE_SUPABASE_URL=https://ruzgwxupfykqvdaxvldw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 작동 원리

1. **BookingForm에서 예약 제출**
   - 주소 좌표 수집 (Nominatim API)
   - Supabase에 예약 데이터 저장

2. **Slack 알림 전송**
   - Edge Function 호출: `POST /functions/v1/send-slack-notification`
   - 요청 본문에 예약 정보 포함
   - 서버-사이드에서 Slack Webhook으로 전송

3. **보안 이점**
   - Webhook URL이 클라이언트 코드에 노출되지 않음
   - Edge Function 내 환경 변수에서만 관리
   - CORS 정책 준수

## 문제 해결

### Edge Function 호출 실패
1. Supabase 대시보드에서 Edge Function **Logs** 확인
2. Webhook URL이 올바르게 설정되었는지 확인
3. 네트워크 연결 확인

### Slack 메시지가 도착하지 않음
1. Webhook URL이 유효한지 확인
2. Slack 채널 권한 확인
3. 네트워크 요청 로그 확인

## 다음 단계

1. Vercel 또는 로컬 개발 서버에서 앱 실행
2. 새 예약 추가 시 Slack 메시지 수신 확인
3. Edge Function Logs에서 요청 상태 모니터링
