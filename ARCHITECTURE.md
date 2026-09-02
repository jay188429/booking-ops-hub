# Booking Hub - Architecture & Data Flow

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
│                     (booking-hub React App)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BookingForm Component                                   │   │
│  │  - 고객사, 서비스, 날짜, 시간, 주소 입력                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬──────────────────────────────────────┬──┘
                         │                                        │
                    1. 좌표 변환                           2. 예약 저장
                    (Nominatim API)                     (Supabase DB)
                         │                                        │
                         ▼                                        ▼
        ┌─────────────────────────────┐    ┌──────────────────────────────┐
        │  Nominatim OpenStreetMap    │    │   Supabase (PostgreSQL DB)   │
        │  - Address → Latitude       │    │   - Table: bookings          │
        │  - Address → Longitude      │    │   - Auth: JWT (Anon Key)     │
        └─────────────────────────────┘    └──────────────────────────────┘
                         │                           │
                         └────────┬──────────────────┘
                                  │
                    3. Edge Function 호출
                    (예약 데이터 + 좌표 전달)
                                  │
                    ┌─────────────▼──────────────┐
                    │  Supabase Edge Function    │
                    │  /v1/send-slack-          │
                    │   notification             │
                    │  - 환경변수에서            │
                    │    Webhook URL 로드        │
                    │  - Slack 메시지 포맷팅     │
                    │  - Webhook 호출            │
                    └─────────────┬──────────────┘
                                  │
                    4. Slack Webhook 호출
                    (POST /services/...)
                                  │
                    ┌─────────────▼──────────────┐
                    │  Slack Workspace           │
                    │  - #bookings 채널          │
                    │  - 포맷된 메시지 표시      │
                    └────────────────────────────┘
```

## 데이터 흐름

### 1. 예약 추가 플로우

```
사용자 입력 (BookingForm)
  │
  ├─ 필드 검증
  │  ├─ customer (필수)
  │  ├─ service (필수)
  │  ├─ date (필수)
  │  ├─ time (필수)
  │  └─ address (선택)
  │
  ├─ 주소 좌표 변환 (address가 있을 경우)
  │  │
  │  └─ Nominatim API
  │     ├─ Request: address text
  │     └─ Response: { lat, lon }
  │
  ├─ Supabase DB에 예약 저장
  │  │
  │  └─ supabase.from('bookings').insert()
  │     ├─ customer
  │     ├─ service
  │     ├─ date
  │     ├─ time
  │     ├─ address
  │     ├─ latitude (optional)
  │     ├─ longitude (optional)
  │     ├─ status: 'pending'
  │     └─ via: 'form'
  │
  └─ Slack 알림 전송
     │
     └─ Edge Function 호출
        POST /functions/v1/send-slack-notification
        {
          customer,
          service,
          date,
          time,
          address,
          latitude,
          longitude
        }
```

### 2. Edge Function 처리 흐름

```
Edge Function 수신
  │
  ├─ CORS 헤더 설정 (OPTIONS 요청 처리)
  │
  ├─ 요청 본문 파싱
  │  └─ JSON: { customer, service, date, time, address, latitude, longitude }
  │
  ├─ Slack 메시지 포맷팅
  │  ├─ 헤더: "📅 새 예약 알림"
  │  ├─ 섹션: 고객사, 서비스, 날짜, 시간
  │  ├─ 섹션: 주소
  │  └─ 섹션: 위도/경도 (있을 경우)
  │
  ├─ 환경 변수에서 Webhook URL 로드
  │  └─ Deno.env.get("SLACK_WEBHOOK_URL")
  │
  ├─ Slack으로 POST 요청
  │  POST https://hooks.slack.com/services/...
  │  Header: Content-Type: application/json
  │  Body: message blocks
  │
  └─ 응답 반환
     ├─ 성공: { success: true } (200)
     └─ 실패: { error: message } (400/500)
```

## 보안 모델

### 클라이언트 ↔ Supabase DB
```
認証: JWT Token (VITE_SUPABASE_ANON_KEY)
通信: HTTPS
権限: Row Level Security (RLS)
```

### 클라이언트 ↔ Edge Function
```
認証: JWT Token (Authorization: Bearer {ANON_KEY})
通信: HTTPS
권한: 모든 사용자가 호출 가능 (public)
```

### Edge Function ↔ Slack
```
認証: Webhook URL (환경 변수에 저장)
通信: HTTPS
권限: 환경 변수에만 URL 노출 (클라이언트 미노출)
```

## 환경 변수 관리

### 클라이언트 (.env)
```env
VITE_SUPABASE_URL=https://ruzgwxupfykqvdaxvldw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAIL=you18676@gmail.com
VITE_GEOAPIFY_API_KEY=4c4f64d5085f4a5e94dc879bb2b65fd6
VITE_SLACK_WEBHOOK_URL=... (deprecated - 클라이언트에서 제거됨)
```

### Edge Function (Supabase Secrets)
```env
```

## 주요 컴포넌트

### BookingForm.tsx
**역할**: 예약 양식 제공 및 데이터 수집
- 주소 검증 (Nominatim)
- 예약 저장 (Supabase)
- Slack 알림 트리거 (Edge Function)

### Edge Function
**역할**: 서버-사이드 Slack 알림 처리
- Webhook URL 관리 (환경 변수)
- 메시지 포맷팅
- Slack 호출

### Supabase
**역할**: 데이터 저장 및 인증
- 예약 테이블 저장소
- 사용자 인증 (Google OAuth)
- Edge Function 호스팅

## API 엔드포인트

### Nominatim OpenStreetMap API
```
GET https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1
Response: [{ lat, lon, ... }]
```

### Supabase Database API
```
POST https://ruzgwxupfykqvdaxvldw.supabase.co/rest/v1/bookings
Header: Authorization: Bearer {ANON_KEY}
Body: { customer, service, date, time, address, latitude, longitude, status, via }
```

### Supabase Edge Function
```
POST https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
Header: Authorization: Bearer {ANON_KEY}
Header: Content-Type: application/json
Body: { customer, service, date, time, address, latitude?, longitude? }
```

### Slack Webhook
```
Header: Content-Type: application/json
Body: { text, blocks: [...] }
```

## 에러 처리

### 예약 저장 실패
```
→ UI에 에러 메시지 표시
→ 형식: "예약 추가에 실패했습니다" + error.message
```

### 주소 검증 실패
```
→ UI에 경고 표시 (border-red-500)
→ 주소 없이 계속 진행 가능 (선택 사항)
```

### Edge Function 호출 실패
```
→ 콘솔 에러 로깅
→ 사용자 경험 영향 없음 (비동기, fail-silent)
```

### Slack Webhook 실패
```
→ Edge Function에서 500 에러 반환
→ 클라이언트에서 catch (조용히 처리)
```

## 배포 체크리스트

- [x] 로컬 Edge Function 코드 작성
- [x] BookingForm 수정 (Edge Function 호출로 변경)
- [ ] Supabase 대시보드에서 함수 배포
- [ ] 환경 변수 (SLACK_WEBHOOK_URL) 설정
- [ ] 테스트: 새 예약 추가 → Slack 메시지 수신
- [ ] Edge Function Logs 모니터링
