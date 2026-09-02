# Booking Hub - Supabase Edge Function 설정 가이드

> 이 문서는 Booking Hub 프로젝트에 Slack 알림을 처리하는 Supabase Edge Function을 설정하는 방법을 안내합니다.

## 📚 문서 구조

이 프로젝트에는 Edge Function 설정에 관련된 여러 문서가 있습니다:

### 빠른 시작 (먼저 읽기)
- **[QUICKSTART_EDGE_FUNCTION.md](./QUICKSTART_EDGE_FUNCTION.md)** ⭐ 추천
  - 배포 방법 (CLI, 대시보드, GitHub Actions)
  - 배포 후 테스트 방법
  - 로그 확인 방법
  - 문제 해결 가이드

### 상세 가이드
- **[EDGE_FUNCTION_SETUP.md](./EDGE_FUNCTION_SETUP.md)**
  - 완전한 설정 안내
  - 각 단계별 상세 설명
  - 보안 원칙

- **[EDGE_FUNCTION_DEPLOYMENT_CHECKLIST.md](./EDGE_FUNCTION_DEPLOYMENT_CHECKLIST.md)**
  - 체크리스트 형식
  - 단계별 확인 사항
  - 예상 시간

### 기술 문서
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**
  - 시스템 아키텍처 다이어그램
  - 데이터 흐름 분석
  - API 엔드포인트 명세

- **[CODE_CHANGES.md](./CODE_CHANGES.md)**
  - 코드 변경 사항 상세 분석
  - 변경 전/후 비교
  - 마이그레이션 경로

### 요약
- **[EDGE_FUNCTION_SUMMARY.txt](./EDGE_FUNCTION_SUMMARY.txt)**
  - 전체 작업 내용 요약
  - 남은 작업 목록
  - 배포 후 정보

---

## 🚀 시작하기 (3단계)

### 1단계: 로컬 준비 (이미 완료됨)
✅ Edge Function 코드 작성됨
✅ BookingForm 수정됨
✅ 필요한 모든 파일 준비됨

위치: `/supabase/functions/send-slack-notification/index.ts`

### 2단계: Supabase 배포 (지금 하기)
1. [QUICKSTART_EDGE_FUNCTION.md](./QUICKSTART_EDGE_FUNCTION.md) 의 배포 방법 따라하기
2. CLI 또는 웹 대시보드에서 함수 배포
3. 환경 변수 설정 (`SLACK_WEBHOOK_URL`)

**예상 소요 시간**: 5-10분

### 3단계: 테스트 (배포 후)
1. 앱 실행: `npm run dev`
2. 새 예약 추가
3. Slack 메시지 확인

---

## 📋 주요 정보

### Edge Function URL
```
https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
```

### 환경 변수

**클라이언트 (.env)**
```env
VITE_SUPABASE_URL=https://ruzgwxupfykqvdaxvldw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Edge Function (Supabase Secrets)**
```env
SLACK_WEBHOOK_URL=<YOUR_SLACK_WEBHOOK_URL>
```

### 요청 형식
```bash
POST https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification

Headers:
  Content-Type: application/json
  Authorization: Bearer {VITE_SUPABASE_ANON_KEY}

Body:
{
  "customer": "회사명",
  "service": "서비스명",
  "date": "2026-09-02",
  "time": "14:00",
  "address": "서울 강남구",
  "latitude": 37.4979,
  "longitude": 127.0276
}
```

---

## 🔍 로그 확인

Supabase 대시보드:
1. **Edge Functions** → **send-slack-notification** 선택
2. **Logs** 탭 클릭
3. 실시간 로그 확인

예상 성공 로그:
```
POST /functions/v1/send-slack-notification
200 OK
{ "success": true }
```

---

## ✨ 핵심 개선사항

| 항목 | 이전 | 현재 |
|------|------|------|
| 보안 | Webhook URL이 클라이언트에 노출 | 서버에서만 관리 |
| 아키텍처 | 클라이언트 중심 | 서버 중심 |
| 메시지 포맷팅 | 클라이언트에서 처리 | 서버에서 처리 |
| 유지보수 | 복잡 | 간단 |

---

## 🆘 문제 해결

### Edge Function 404 에러
→ 함수가 배포되었는지 확인
→ Supabase 대시보드에서 함수 목록 확인

### Webhook URL 설정 안 됨 (400 에러)
→ Supabase Secrets에서 `SLACK_WEBHOOK_URL` 설정 확인
→ 환경 변수 값이 올바른지 확인

### Slack 메시지 미수신
→ Webhook URL 유효성 확인
→ Slack 채널 권한 확인
→ Edge Function Logs에서 에러 메시지 확인

더 많은 문제 해결: [ARCHITECTURE.md](./ARCHITECTURE.md#문제-해결) 참고

---

## 📚 추가 리소스

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Slack Webhook 문서](https://api.slack.com/messaging/webhooks)
- [Deno 런타임](https://deno.land/)

---

## 🎯 체크리스트

배포 전:
- [ ] 이 문서 읽음
- [ ] Edge Function 코드 위치 확인: `/supabase/functions/send-slack-notification/index.ts`
- [ ] BookingForm.tsx 수정 확인

배포 중:
- [ ] Supabase 대시보드에서 함수 배포
- [ ] `SLACK_WEBHOOK_URL` 환경 변수 설정
- [ ] 배포 상태 확인 (Active/Running)

배포 후:
- [ ] 로컬에서 앱 실행 (`npm run dev`)
- [ ] 새 예약 추가
- [ ] Slack 채널에서 메시지 확인
- [ ] Edge Function Logs에서 성공 로그 확인

모두 완료:
- [ ] 프로덕션 배포 준비 (선택 사항)

---

## 💡 팁

1. **테스트용 Slack 채널**: 먼저 테스트용 채널에서 설정한 후 프로덕션 채널로 변경하는 것을 추천합니다.

2. **로그 모니터링**: 배포 직후에는 Edge Function Logs를 주시하면서 테스트하세요.

3. **환경 변수 보안**: 절대 Webhook URL을 클라이언트 코드에 넣지 마세요. 항상 환경 변수를 사용하세요.

4. **CORS 문제**: CORS 에러가 발생하면 Edge Function의 corsHeaders 설정을 확인하세요. (이미 포함됨)

---

## 📞 다음 단계

1. **[QUICKSTART_EDGE_FUNCTION.md](./QUICKSTART_EDGE_FUNCTION.md)** 읽기
2. 배포 방법 선택 (CLI 또는 대시보드)
3. 배포 실행
4. 테스트
5. 필요시 문제 해결

---

**준비 완료! 이제 배포하면 됩니다. 🎉**

---

**문서 버전**: 1.0
**마지막 업데이트**: 2026-09-02
**상태**: 배포 준비 완료
