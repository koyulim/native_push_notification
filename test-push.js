// 푸시 알림 Edge Function 수동 테스트
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ovtlfhqdlcklpwgxldql.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dGxmaHFkbGNrbHB3Z3hsZHFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA0MDQ0NywiZXhwIjoyMDgxNjE2NDQ3fQ.EjkXapjQldE77pOB97wyjYajb4AdcAReu_zOoyBWNeY';

async function testPushNotification() {
  const userId = '17117a7c-905d-4079-8aa4-0d2268e610d2';

  console.log('=== 1단계: 저장된 토큰 확인 ===');
  const tokenResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/push_tokens?user_id=is.null`,
    {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    }
  );
  const tokens = await tokenResponse.json();
  console.log('저장된 토큰:', tokens);

  if (!tokens || tokens.length === 0) {
    console.log('❌ 토큰이 저장되지 않았습니다!');
    return;
  }

  console.log('\n=== 2단계: 푸시 알림 레코드 생성 ===');
  const notificationResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/push_notifications`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: '테스트 알림',
        message: '푸시 알림 테스트 메시지입니다!',
        user_id: null,
        status: 'pending'
      })
    }
  );
  const notification = await notificationResponse.json();
  console.log('생성된 알림:', notification);

  if (!notification || notification.length === 0) {
    console.log('❌ 알림 생성 실패');
    return;
  }

  const notificationId = notification[0].id;

  console.log('\n=== 3단계: Expo Push API 직접 호출 ===');
  
  const expoPushMessages = tokens.map((tokenData) => ({
    to: tokenData.token,
    sound: 'default',
    title: '테스트 알림',
    body: '푸시 알림 테스트 메시지입니다!',
    data: {
      notificationId: notificationId,
    },
  }));

  console.log('전송할 메시지:', expoPushMessages);

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expoPushMessages),
  });

  const expoResult = await expoResponse.json();
  console.log('Expo Push API 응답:', expoResult);

  // 상태 업데이트
  const hasErrors = expoResult.data?.some((ticket) => ticket.status === 'error');
  
  const updateResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/push_notifications?id=eq.${notificationId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: hasErrors ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
      }),
    }
  );

  const updateResult = await updateResponse.json();
  console.log('\n=== 최종 결과 ===');
  console.log('알림 상태 업데이트:', updateResult);
  console.log('✅ 푸시 알림 전송 완료!');
}

testPushNotification().catch(console.error);
