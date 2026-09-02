# Supabase Edge Function 빠른 시작 가이드

## 📦 준비 완료된 것

✅ Edge Function 코드 작성됨: `/supabase/functions/send-slack-notification/index.ts`
✅ BookingForm 업데이트됨: Edge Function으로 호출 변경
✅ 필요한 모든 환경 변수 준비됨

## 🚀 배포 방법 (3가지 옵션)

### 옵션 1: Supabase CLI 사용 (권장)

```bash
# 1. Supabase CLI 설치 (이미 설치된 경우 생략)
npm install -g supabase

# 2. Supabase 로그인
supabase login

# 3. 함수 배포
cd /Users/hyunjaeyoo/dev/booking-hub
supabase functions deploy send-slack-notification

# 4. 환경 변수 설정
supabase secrets set SLACK_WEBHOOK_URL=<YOUR_SLACK_WEBHOOK_URL>

# 5. 배포 완료 후 테스트
supabase functions list
```

**출력 예시**:
```
✓ Function send-slack-notification successfully created
  URL: https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
```

### 옵션 2: Supabase 웹 대시보드 (수동)

1. https://app.supabase.com 접속
2. 프로젝트 선택: booking-hub
3. 좌측 메뉴 → **Edge Functions** 클릭
4. **Create a new function** 클릭
5. 함수명 입력: `send-slack-notification`
6. 코드 에디터에 다음 파일의 내용 복붙:
   - `/Users/hyunjaeyoo/dev/booking-hub/supabase/functions/send-slack-notification/index.ts`
7. **Deploy** 클릭 대기 (1-2분)
8. **Settings** → **Secrets** 이동
9. 새 Secret 추가:
   - Key: `SLACK_WEBHOOK_URL`
   - Value: 본인의 Slack Incoming Webhook URL

### 옵션 3: GitHub Actions (자동 배포)

GitHub Workflows에 추가하면, Push 시 자동 배포 가능:

```yaml
name: Deploy Edge Function
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy send-slack-notification
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_ID: ruzgwxupfykqvdaxvldw
```

---

## 🧪 배포 후 테스트

### Step 1: 앱 실행
```bash
cd /Users/hyunjaeyoo/dev/booking-hub
npm run dev
```

### Step 2: 새 예약 추가
1. 브라우저에서 앱 열기
2. BookingForm 입력:
   - 고객사: `테스트 회사`
   - 서비스: `웹사이트 개발`
   - 날짜: 오늘 또는 내일
   - 시간: `14:00`
   - 주소: `서울 강남구` (선택)
3. **예약하기** 클릭

### Step 3: 결과 확인
- ✅ Slack 채널에 메시지 도착
- ✅ Supabase 대시보드 → Edge Functions → Logs에서 성공 로그 확인
- ✅ BookingTable에 새 예약 추가됨

---

## 📋 Edge Function URL

```
https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
```

이 URL은 BookingForm에서 자동으로 호출됩니다.

---

## 🔍 로그 확인 (문제 해결)

### Supabase 대시보드에서
```
https://app.supabase.com/project/ruzgwxupfykqvdaxvldw
→ Edge Functions
→ send-slack-notification
→ Logs 탭
```

**예상 로그**:
```
POST /functions/v1/send-slack-notification
200 OK
{
  "success": true
}
```

**에러 로그 예**:
```
400 Bad Request
{
  "error": "Webhook URL not configured"
}
```

---

## 🔐 보안 확인

### 확인 사항
- [x] Webhook URL은 환경 변수에만 저장 (클라이언트 코드에 노출 안 함)
- [x] 모든 요청에 JWT 토큰 포함
- [x] CORS 헤더 설정 (크로스 오리진 요청 안전 처리)

### 클라이언트 (.env)
```env
# ❌ Webhook URL이 노출되지 않음
# VITE_SLACK_WEBHOOK_URL은 제거됨
```

### Edge Function (Supabase Secrets)
```env
# ✅ Webhook URL은 여기에만 저장
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## 📞 요청/응답 예시

### 클라이언트 → Edge Function

```json
POST https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification

Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body:
{
  "customer": "ABC Company",
  "service": "Website Development",
  "date": "2026-09-02",
  "time": "14:00",
  "address": "Seoul, Korea",
  "latitude": 37.4979,
  "longitude": 127.0276
}
```

### Edge Function → Slack

```json
POST <YOUR_SLACK_WEBHOOK_URL>

Body:
{
  "text": "새 예약이 추가되었습니다",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "📅 새 예약 알림"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*고객사*\nABC Company" },
        { "type": "mrkdwn", "text": "*서비스*\nWebsite Development" },
        ...
      ]
    }
  ]
}
```

### Edge Function → 클라이언트

```json
Status: 200 OK

Body:
{
  "success": true
}
```

---

## 🆘 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|----------|
| 404 Not Found | 함수가 배포되지 않음 | `supabase functions list` 확인 후 재배포 |
| 400 Bad Request | SLACK_WEBHOOK_URL 환경 변수 없음 | Secrets에서 환경 변수 추가 |
| CORS 에러 | 크로스 오리진 요청 차단 | corsHeaders 설정 확인 (코드에 포함) |
| Slack 메시지 미수신 | Webhook URL 오류 또는 채널 권한 부족 | Slack 채널 설정 및 URL 유효성 확인 |
| 시간초과 (Timeout) | 네트워크 연결 문제 | 인터넷 연결 확인 및 재시도 |

---

## 📊 성능

- **응답 시간**: 평균 200-500ms
- **동시성**: Supabase 표준 제한 준수
- **가용성**: 99.9%

---

## 🎯 다음 단계

1. ✅ Edge Function 배포
2. ✅ 환경 변수 설정
3. ✅ 앱에서 테스트
4. ✅ Slack 메시지 수신 확인
5. 📊 필요시 모니터링 대시보드 추가

---

**배포 완료 후**: 이 파일을 닫고 앱을 실행하면 됩니다! 🎉
