# 코드 변경 사항 상세 분석

## 파일 변경 요약

| 파일 | 상태 | 설명 |
|------|------|------|
| `/supabase/functions/send-slack-notification/index.ts` | 🆕 새로 생성 | Edge Function 코드 |
| `/src/components/BookingForm.tsx` | 📝 수정 | Slack 호출 방식 변경 |

---

## 1. Edge Function 생성 (새 파일)

### 위치
```
/supabase/functions/send-slack-notification/index.ts
```

### 목적
- 서버-사이드에서 Slack Webhook 호출
- Webhook URL을 환경 변수로 안전하게 관리
- 클라이언트에서 Webhook URL이 노출되지 않도록 보호

### 코드 구조

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. CORS 헤더 설정
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// 2. Edge Function 서버 시작
serve(async (req) => {
  // 3. OPTIONS 요청 처리 (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 4. 요청 본문에서 예약 정보 추출
    const { customer, service, date, time, address, latitude, longitude } = await req.json()

    // 5. Slack 메시지 포맷팅
    const message = {
      text: "새 예약이 추가되었습니다",
      blocks: [
        // 헤더
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📅 새 예약 알림",
          },
        },
        // 기본 정보 (4개 필드)
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*고객사*\n${customer}` },
            { type: "mrkdwn", text: `*서비스*\n${service}` },
            { type: "mrkdwn", text: `*날짜*\n${date}` },
            { type: "mrkdwn", text: `*시간*\n${time}` },
          ],
        },
        // 주소
        {
          type: "section",
          text: { type: "mrkdwn", text: `*주소*\n${address || "미입력"}` },
        },
        // 위도/경도 (있을 경우만)
        ...(latitude && longitude
          ? [{ type: "section", text: { type: "mrkdwn", text: `*위치*\n위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}` } }]
          : []),
      ],
    }

    // 6. 환경 변수에서 Webhook URL 로드
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL")
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 7. Slack으로 POST 요청
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    // 8. 성공 응답 반환
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    // 9. 에러 처리
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
```

### 주요 특징

1. **CORS 지원**: 크로스 오리진 요청 안전 처리
2. **환경 변수 활용**: Webhook URL을 `Deno.env.get()`으로 로드
3. **에러 처리**: 환경 변수 없을 때 400 에러 반환
4. **비동기 처리**: `async/await` 패턴 사용

---

## 2. BookingForm.tsx 수정

### 파일 경로
```
/src/components/BookingForm.tsx
```

### 변경 범위
- 함수: `sendSlackNotification()` (라인 85-163)

### 변경 전 (이전)

```typescript
const sendSlackNotification = async (bookingData: {
  customer: string
  service: string
  date: string
  time: string
  address: string
  latitude?: number
  longitude?: number
}) => {
  const webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL  // ❌ 클라이언트에 노출
  if (!webhookUrl) return

  try {
    const message = {  // ❌ 클라이언트에서 메시지 포맷팅
      text: '새 예약이 추가되었습니다',
      blocks: [
        // ... 메시지 구조
      ],
    }

    await fetch(webhookUrl, {  // ❌ 직접 Slack Webhook 호출
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
  } catch (err) {
    console.error('Slack notification failed:', err)
  }
}
```

**문제점**:
- Webhook URL이 클라이언트 코드에 노출됨
- 메시지 포맷팅이 클라이언트에서 중복
- Webhook URL이 네트워크 요청에 보임 (보안 위험)

### 변경 후 (현재)

```typescript
const sendSlackNotification = async (bookingData: {
  customer: string
  service: string
  date: string
  time: string
  address: string
  latitude?: number
  longitude?: number
}) => {
  try {
    // ✅ Edge Function URL 구성 (동적으로 생성)
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-slack-notification`

    // ✅ Edge Function으로 호출
    await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,  // ✅ JWT 인증
      },
      body: JSON.stringify(bookingData),  // ✅ 단순히 데이터만 전달
    })
  } catch (err) {
    console.error('Slack notification failed:', err)
  }
}
```

**개선 사항**:
- Webhook URL이 클라이언트에 노출되지 않음
- Edge Function URL은 공개 정보 (보안상 문제 없음)
- JWT 토큰으로 요청 인증
- 데이터만 전달, 모든 처리는 서버에서
- 코드가 더 간단하고 유지보수 용이

---

## 3. 요청/응답 흐름 비교

### 변경 전 (직접 Webhook)

```
클라이언트                          Slack
  │                                 │
  └─ POST https://hooks.slack.com   │
     ├─ Content-Type: application/json
     └─ Body:
        {
          text: "새 예약...",
          blocks: [ ... ]
        }
                                    ┌─ 메시지 처리
                                    └─ Slack 채널에 표시
```

**문제**:
- Webhook URL이 노출됨
- 메시지 포맷팅이 클라이언트에 있음

### 변경 후 (Edge Function 경유)

```
클라이언트                 Edge Function              Slack
  │                             │                      │
  └─ POST /functions/v1/...     │                      │
     ├─ Authorization: Bearer...│                      │
     └─ Body:                   │                      │
        {                       │                      │
          customer,             │                      │
          service,              │                      │
          date,                 │                      │
          time,                 │                      │
          address,              │                      │
          latitude,             │                      │
          longitude             │                      │
        }                       │                      │
                                ├─ Webhook URL 로드   │
                                ├─ 메시지 포맷팅      │
                                └─ POST webhookUrl ───┤
                                   ├─ blocks...       ├─ 메시지 처리
                                                      └─ Slack 채널에 표시
```

**이점**:
- Webhook URL이 환경 변수에만 저장
- 메시지 포맷팅이 서버에서 처리
- 클라이언트는 데이터만 전달
- 더 안전하고 유지보수 용이

---

## 4. 환경 변수 변경

### 클라이언트 (.env)

#### 제거됨
```env
# ❌ 제거됨 (더 이상 필요 없음)
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### 유지됨 (이미 있음)
```env
VITE_SUPABASE_URL=https://ruzgwxupfykqvdaxvldw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Function (Supabase Secrets)

#### 추가됨
```env
```

---

## 5. 파일 구조 변경

### 디렉토리 추가

```
booking-hub/
├── supabase/  (새로 생성)
│   └── functions/  (새로 생성)
│       └── send-slack-notification/  (새로 생성)
│           └── index.ts  (새로 생성)
└── src/
    ├── components/
    │   └── BookingForm.tsx  (수정됨)
    └── ...
```

---

## 6. 호환성

### 클라이언트 (React)
- ✅ React 19.2.8 이상 호환
- ✅ TypeScript 지원
- ✅ 기존 API 유지

### Edge Function (Deno)
- ✅ Deno std lib 0.168.0
- ✅ Slack API 호환
- ✅ CORS 표준 준수

### Supabase
- ✅ Edge Functions 지원 필요
- ✅ 환경 변수 (Secrets) 기능 필요
- ✅ JWT 인증 지원

---

## 7. 배포 영향도

### 클라이언트 앱
- 재컴파일 필요 (코드 변경)
- 기존 예약 데이터에 영향 없음
- 즉시 적용 가능

### Edge Function
- Supabase 배포 필요 (새로운 함수)
- 별도 배포 프로세스 (대시보드 또는 CLI)
- 환경 변수 설정 필요

### 데이터베이스
- 변경 없음 (기존 스키마 유지)

---

## 8. 마이그레이션 경로

### 기존 사용자에게 영향
- ❌ 기존 예약 데이터 변경 없음
- ✅ 새 예약은 새로운 방식으로 처리
- 부드러운 전환 가능

### 배포 순서
1. 클라이언트 코드 배포 (또는 로컬 테스트)
2. Edge Function 배포 (Supabase 대시보드)
3. 환경 변수 설정 (Supabase Secrets)
4. 테스트 (새 예약 추가)

---

## 9. 테스트 체크리스트

- [ ] 로컬에서 클라이언트 빌드 성공
- [ ] 타입스크립트 컴파일 오류 없음
- [ ] Edge Function 코드 문법 검증
- [ ] Supabase에 함수 배포 성공
- [ ] 환경 변수 설정 완료
- [ ] 새 예약 추가 시 Slack 메시지 수신
- [ ] 예약 정보가 정확하게 표시됨
- [ ] 주소/좌표 정보 포함 확인

---

## 10. 롤백 계획

필요시 이전 방식으로 복구:

### BookingForm.tsx 되돌리기
- Git에서 이전 버전 복구
- 직접 Slack Webhook 호출 코드 복원
- `VITE_SLACK_WEBHOOK_URL` 환경 변수 추가

### Edge Function 비활성화
- Supabase 대시보드에서 함수 삭제 또는 비활성화
- 환경 변수 제거

### 소요 시간
- 약 5-10분

---

## 요약

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 호출 방식 | 직접 Slack 호출 | Edge Function 경유 |
| Webhook URL 위치 | 클라이언트 | 서버 (환경 변수) |
| 인증 | 없음 (공개 Webhook) | JWT 토큰 |
| 메시지 포맷팅 | 클라이언트 | 서버 |
| 보안성 | 낮음 | 높음 |
| 복잡도 | 중간 | 낮음 |
| 유지보수 | 어려움 | 쉬움 |

---

**모든 코드 변경이 완료되었습니다. 이제 Supabase에 배포하기만 하면 됩니다!**
