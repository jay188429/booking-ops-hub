# Edge Function 배포 체크리스트

## 사전 준비
- Supabase 대시보드 접속 권한 확인
- Slack Webhook URL 준비됨: Supabase Secret에 실제 값을 저장합니다.

## 배포 단계

### Step 1: Edge Function 코드 생성
- [x] 로컬 저장소: `/supabase/functions/send-slack-notification/index.ts`
- [ ] Supabase 대시보드에서 함수 생성

**대시보드 경로**: https://app.supabase.com/project/ruzgwxupfykqvdaxvldw/functions

### Step 2: Supabase 대시보드 작업

#### 함수 생성
1. Edge Functions 메뉴 진입
2. "Create a new function" 클릭
3. 함수명: `send-slack-notification`
4. 코드: `/supabase/functions/send-slack-notification/index.ts` 의 내용 복붙

#### 환경 변수 설정
1. Settings → Edge Functions 또는 Secrets 로 이동
2. 새 Secret 추가:
   - Name: `SLACK_WEBHOOK_URL`
   - Value: 본인의 Slack Incoming Webhook URL
3. 저장

### Step 3: 배포
- [ ] Deploy 버튼 클릭
- [ ] 배포 완료 대기 (약 1-2분)

## 배포 후 정보

### Edge Function URL
```
https://ruzgwxupfykqvdaxvldw.supabase.co/functions/v1/send-slack-notification
```

### 테스트 방법
1. Supabase 대시보드 → Edge Functions → send-slack-notification
2. **Logs** 탭 확인
3. 앱에서 새 예약 추가
4. 실시간 로그에서 요청 확인

### 예상 동작
- POST 요청 수신
- Slack Webhook 호출
- 200 응답 반환

## 코드 변경사항 요약

### BookingForm.tsx
**이전**: 클라이언트에서 직접 Slack Webhook 호출
**현재**: Supabase Edge Function 호출

```typescript
// 새로운 호출 방식
const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-slack-notification`
await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify(bookingData),
})
```

## 주의사항

### 보안
- Webhook URL은 환경 변수에만 저장 (클라이언트 노출 안 함)
- 모든 예약 데이터는 Supabase를 통해 인증됨
- CORS 설정으로 안전한 크로스 오리진 요청 처리

### 성능
- Edge Function은 Supabase 리전 내에서 실행
- Webhook 호출은 비동기 (응답 지연 최소)

## 문제 해결

| 문제 | 해결 방법 |
|------|---------|
| Edge Function 404 에러 | 함수가 배포되었는지 대시보드에서 확인 |
| Webhook 호출 실패 | SLACK_WEBHOOK_URL 환경 변수 확인 |
| CORS 에러 | corsHeaders 설정 확인 (코드에 포함됨) |
| Slack 메시지 미수신 | Webhook URL의 채널 권한 확인 |

## 완료 기준
- [ ] Edge Function 배포됨
- [ ] 환경 변수 설정됨
- [ ] 앱에서 예약 추가 시 Slack 메시지 수신
- [ ] Edge Function Logs에서 성공 응답 확인 (status: 200)

---

**배포 예상 소요 시간**: 약 5-10분
**배포 날짜**: 2026-09-02
