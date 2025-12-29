# Supabase 푸시 알림 설정 체크리스트

## 가장 중요한 문제: Database Trigger가 없으면 Edge Function이 실행되지 않습니다!

### 확인 방법 1: Supabase Dashboard에서 Webhook 확인

1. Supabase Dashboard 접속: https://ovtlfhqdlcklpwgxldql.supabase.co
2. **Database** → **Webhooks** 메뉴 확인
3. `push_notifications` 테이블에 대한 webhook이 있는지 확인

**만약 Webhook이 없다면 생성 필요:**

- **Name**: `send-push-on-insert`
- **Table**: `push_notifications`
- **Events**: INSERT 체크
- **Type**: Supabase Edge Functions 선택
- **Edge Function**: `send-push-notification`
- **HTTP Method**: POST

---

### 확인 방법 2: SQL로 Trigger 확인

```sql
-- 트리거 목록 확인
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'push_notifications';
```

결과가 비어있다면 트리거가 없는 것입니다!

---

### 확인 방법 3: Edge Function이 배포되었는지 확인

Supabase Dashboard에서:
1. **Edge Functions** 메뉴 클릭
2. `send-push-notification` 함수가 있는지 확인
3. Status가 "Active"인지 확인

---

## 트리거가 없을 때 해결 방법

### 방법 A: Supabase Extension 사용 (권장)

```sql
-- pg_net extension 활성화 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger 함수 생성
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
  function_url text;
  service_role_key text;
BEGIN
  -- Edge Function URL 설정
  function_url := 'https://ovtlfhqdlcklpwgxldql.supabase.co/functions/v1/send-push-notification';

  -- Service Role Key는 Supabase 환경변수에서 가져와야 함
  -- 보안을 위해 직접 하드코딩하지 말 것

  -- HTTP POST 요청
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  ) INTO request_id;

  RETURN NEW;
END;
$$;

-- Trigger 생성
DROP TRIGGER IF EXISTS on_push_notification_insert ON push_notifications;

CREATE TRIGGER on_push_notification_insert
AFTER INSERT ON push_notifications
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION trigger_send_push_notification();
```

---

### 방법 B: Supabase Realtime으로 앱에서 직접 호출

앱 코드에서 Realtime 구독으로 처리:

```typescript
// app/(tabs)/index.tsx에 추가
useEffect(() => {
  const channel = supabase
    .channel('push_notifications_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'push_notifications',
        filter: `status=eq.pending`
      },
      async (payload) => {
        // Edge Function 직접 호출
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: { record: payload.new }
        });

        if (error) console.error('Error:', error);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 수동 테스트: Edge Function 직접 호출

터미널에서:

```bash
# Edge Function이 배포되었는지 확인
npx supabase functions list

# Edge Function 배포 (안 되어있다면)
npx supabase functions deploy send-push-notification
```

또는 curl로 직접 테스트:

```bash
curl -X POST \
  'https://ovtlfhqdlcklpwgxldql.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "record": {
      "id": "실제-알림-ID",
      "title": "테스트",
      "message": "수동 테스트",
      "user_id": "17117a7c-905d-4079-8aa4-0d2268e610d2",
      "status": "pending"
    }
  }'
```
