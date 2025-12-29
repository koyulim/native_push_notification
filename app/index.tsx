import { addNotificationReceivedListener, addNotificationResponseListener, registerForPushNotificationsAsync, showLocalNotification } from '@/utils/pushNotifications';
import { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebViewMessageEvent } from 'react-native-webview';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // 앱 시작 시 push token 등록
    registerForPushNotificationsAsync().then(token => {
      console.log('Push token:', token);
      // 웹뷰에 푸시 토큰 전달
      if (token && webViewRef.current) {
        setTimeout(() => {
          const message = JSON.stringify({
            type: 'PUSH_TOKEN_REGISTERED',
            token: token
          });
          console.log('웹뷰로 메시지 전송:', message);
          webViewRef.current?.postMessage(message);
        }, 1000); // 웹뷰 로드 대기
      } else {
        console.log('토큰 또는 webViewRef가 없음:', { token, webViewRef: webViewRef.current });
      }
    });

    // 알림 리스너 등록
    const notificationListener = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = addNotificationResponseListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // 웹뷰로부터 메시지를 받는 핸들러
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('웹뷰에서 받은 메시지:', message);

      // 메시지 타입에 따라 처리
      switch (message.type) {
        case 'PUSH_TOKEN_REQUEST':
          // 웹뷰에서 푸시 토큰 요청 시
          registerForPushNotificationsAsync().then(token => {
            // 웹뷰로 푸시 토큰 전송
            webViewRef.current?.postMessage(JSON.stringify({
              type: 'PUSH_TOKEN',
              token: token
            }));
          });
          break;

        case 'PUSH_NOTIFICATION':
          // 웹뷰에서 푸시 알림 요청 시 즉시 표시
          showLocalNotification(
            message.data?.title || '알림',
            message.data?.message || '푸시알림성공!'
          );
          console.log('푸시 알림 표시:', message.data);
          break;

        default:
          console.log('알 수 없는 메시지:', message);
      }
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://nextjs-web-app-eight-fawn.vercel.app/' }}
        style={{ flex: 1 }}
        bounces={false}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
}
