# Native Push Notification

Expo와 Supabase를 이용한 푸시 알림 구현 프로젝트입니다.

## 기능

- ✅ 로그인 없이 푸시 토큰 저장
- ✅ Expo Push API를 통한 푸시 알림 전송
- ✅ Supabase 데이터베이스 연동
- ✅ 모든 사용자에게 알림 전송 가능

## 설치 및 실행

```bash
npm install
npx expo start --tunnel
```

## 푸시 알림 테스트

```bash
node test-push.js
```

## 구조

- `lib/notifications.ts` - 푸시 알림 초기화 및 토큰 저장
- `lib/supabase.ts` - Supabase 클라이언트 설정
- `test-push.js` - 푸시 알림 테스트 스크립트
- `supabase/functions/send-push-notification/` - Edge Function

## 데이터베이스 테이블

- `push_tokens` - 사용자 푸시 토큰 저장
- `push_notifications` - 전송할 알림 정보

## 알림 전송 방법

Supabase에서 `push_notifications` 테이블에 레코드 삽입:

```sql
INSERT INTO push_notifications (title, message, user_id, status)
VALUES ('알림 제목', '알림 내용', NULL, 'pending');
```

`user_id`가 NULL이면 모든 사용자에게 알림이 전송됩니다.
