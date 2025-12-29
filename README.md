# React Native WebView with Push Notifications

React Native + Expo를 사용하여 구축된 웹뷰 기반 모바일 애플리케이션입니다. 웹 애플리케이션을 네이티브 앱으로 래핑하고 푸시 알림 기능을 제공합니다.

## 프로젝트 개요

이 프로젝트는 Next.js 웹 애플리케이션(`https://nextjs-web-app-eight-fawn.vercel.app/`)을 네이티브 모바일 앱으로 변환하며, 웹뷰와 네이티브 간 양방향 통신을 통해 푸시 알림 기능을 구현합니다.

## 주요 기능

### 1. 웹뷰 통합
- React Native WebView를 통해 웹 애플리케이션 표시
- 웹과 네이티브 간 양방향 메시지 통신
- Safe Area 지원으로 노치 디바이스 대응

### 2. 푸시 알림
- Expo Notifications를 사용한 푸시 알림 구현
- 실제 디바이스에서 Expo Push Token 생성
- 웹에서 요청 시 즉시 로컬 알림 표시
- 알림 수신 및 응답 리스너

### 3. 네이티브-웹 통신
웹뷰와 네이티브 앱 간 메시지 프로토콜:

**네이티브 → 웹:**
- `PUSH_TOKEN_REGISTERED`: 앱 시작 시 푸시 토큰 전달 (현재 사용 중)
- `PUSH_TOKEN`: 웹 요청에 대한 푸시 토큰 응답 (구현됨, 선택적 사용)

**웹 → 네이티브:**
- `PUSH_TOKEN_REQUEST`: 푸시 토큰 요청 (구현됨, 선택적 사용)
- `PUSH_NOTIFICATION`: 로컬 푸시 알림 표시 요청 (현재 사용 중)

## 기술 스택

### 핵심 프레임워크
- **React Native** 0.81.5
- **Expo** ~54.0.30
- **Expo Router** ~6.0.21 (파일 기반 라우팅)
- **TypeScript** ~5.9.2

### 주요 라이브러리
- `react-native-webview` - 웹뷰 컴포넌트
- `expo-notifications` - 푸시 알림
- `expo-device` - 디바이스 정보
- `react-native-safe-area-context` - Safe Area 처리
- `@react-navigation/native` - 네비게이션

## 프로젝트 구조

```
native/
├── app/                          # 앱 화면
│   ├── _layout.tsx              # 루트 레이아웃 (다크모드 지원)
│   └── index.tsx                # 메인 화면 (웹뷰 + 푸시 알림)
├── hooks/                        # 커스텀 훅
│   └── use-color-scheme.ts      # 컬러 스킴 훅
├── utils/                        # 유틸리티 함수
│   └── pushNotifications.ts     # 푸시 알림 관련 함수
├── assets/                       # 이미지 및 리소스
├── app.json                      # Expo 설정
├── package.json                  # 의존성 관리
└── tsconfig.json                 # TypeScript 설정
```

## 핵심 코드 분석

### 1. 메인 화면 (app/index.tsx)

```typescript
export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // 앱 시작 시 푸시 토큰 등록 및 웹뷰에 전달
    registerForPushNotificationsAsync().then(token => {
      if (token && webViewRef.current) {
        setTimeout(() => {
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'PUSH_TOKEN_REGISTERED',
            token: token
          }));
        }, 1000);
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

  // 웹뷰 메시지 핸들러
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);

    switch (message.type) {
      case 'PUSH_TOKEN_REQUEST':
        // 웹에서 토큰 요청 시
        registerForPushNotificationsAsync().then(token => {
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'PUSH_TOKEN',
            token: token
          }));
        });
        break;

      case 'PUSH_NOTIFICATION':
        // 웹에서 알림 표시 요청 시
        showLocalNotification(
          message.data?.title || '알림',
          message.data?.message || '푸시알림성공!'
        );
        break;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://nextjs-web-app-eight-fawn.vercel.app/' }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
}
```

### 2. 푸시 알림 유틸리티 (utils/pushNotifications.ts)

**주요 함수:**

- `registerForPushNotificationsAsync()`: 푸시 알림 권한 요청 및 토큰 생성
- `showLocalNotification(title, message)`: 로컬 푸시 알림 즉시 표시
- `addNotificationReceivedListener(callback)`: 알림 수신 리스너
- `addNotificationResponseListener(callback)`: 알림 응답 리스너

**Android 설정:**
- Notification Channel 설정 (importance: MAX)
- 진동 패턴: [0, 250, 250, 250]
- LED 색상: #FF231F7C

**알림 핸들러 설정:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,       // 알림 표시
    shouldPlaySound: true,       // 소리 재생
    shouldSetBadge: false,       // 배지 미사용
    shouldShowBanner: true,      // 배너 표시
    shouldShowList: true,        // 리스트 표시
  }),
});
```

### 3. 루트 레이아웃 (app/_layout.tsx)
- React Navigation의 ThemeProvider로 다크모드 지원
- Expo Router의 Stack 네비게이션 사용
- StatusBar 자동 스타일 적용

## Expo 설정 (app.json)

### 주요 설정:
- **New Architecture**: 활성화
- **EAS Project ID**: `9aa1d6a2-dd03-46d3-97e0-6d3a37a1aced`
- **Typed Routes**: 활성화
- **React Compiler**: 활성화 (실험적 기능)

### 플랫폼별 설정:

**iOS:**
- UIBackgroundModes: `remote-notification`
- 태블릿 지원

**Android:**
- Edge-to-Edge UI 활성화
- Adaptive Icon 설정
- Predictive Back Gesture 비활성화

**Web:**
- 정적 출력

### 플러그인:
- `expo-router`: 파일 기반 라우팅
- `expo-splash-screen`: 스플래시 화면 커스터마이징
- `expo-notifications`: 푸시 알림 설정

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
# iOS
npm run ios

# Android
npm run android

# 웹
npm run web

# 전체
npm start
```

### 3. 푸시 알림 테스트

푸시 알림은 **실제 디바이스에서만** 동작합니다. 시뮬레이터/에뮬레이터에서는 지원되지 않습니다.

**현재 동작 방식:**
1. 실제 디바이스에 앱 설치
2. 푸시 알림 권한 허용
3. 앱 실행 시:
   - 콘솔에 Push Token 출력
   - 웹뷰에 자동으로 `PUSH_TOKEN_REGISTERED` 메시지 전송 (1초 후)
4. 웹에서 푸시 알림 표시 요청 시 즉시 로컬 알림 표시

## 웹 애플리케이션 통신 예제

웹 애플리케이션에서 네이티브 앱과 통신하는 방법:

### 1. 푸시 토큰 수신 (필수 - 현재 사용 중)

앱 시작 시 자동으로 전달되는 토큰을 받습니다:

```javascript
// 네이티브에서 보낸 메시지 수신
window.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'PUSH_TOKEN_REGISTERED') {
    console.log('Push Token:', message.token);
    // 서버에 토큰 저장
  }
});
```

### 2. 푸시 알림 표시 요청 (필수 - 현재 사용 중)

웹에서 네이티브 로컬 알림을 표시합니다:

```javascript
// 네이티브에 푸시 알림 표시 요청
window.ReactNativeWebView?.postMessage(JSON.stringify({
  type: 'PUSH_NOTIFICATION',
  data: {
    title: '새 메시지',
    message: '안녕하세요!'
  }
}));
```

### 3. 푸시 토큰 재요청 (선택 - 필요시 사용)

토큰이 필요한 경우 다시 요청할 수 있습니다:

```javascript
// 네이티브에 푸시 토큰 요청
window.ReactNativeWebView?.postMessage(JSON.stringify({
  type: 'PUSH_TOKEN_REQUEST'
}));

// 응답 수신
window.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'PUSH_TOKEN') {
    console.log('Received Token:', message.token);
  }
});
```

## 환경 변수

이 프로젝트는 현재 환경 변수를 사용하지 않습니다. 모든 설정은 `app.json`에 하드코딩되어 있습니다.

필요시 `.env` 파일을 추가하여 관리할 수 있습니다:

```env
EXPO_PUBLIC_WEB_URL=https://your-web-app.com
EXPO_PUBLIC_API_URL=https://your-api.com
```

## 빌드

### EAS Build 사용

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# 모두
eas build --platform all
```

### 로컬 빌드

```bash
# Android APK
npx expo run:android --variant release

# iOS
npx expo run:ios --configuration Release
```

## 주의사항

1. **푸시 알림은 실제 디바이스에서만 작동**합니다
2. **웹뷰 URL**은 `app/index.tsx`에 하드코딩되어 있습니다
3. **EAS Project ID**는 푸시 토큰 생성에 필수입니다
4. **iOS Background Mode**가 활성화되어 있어 백그라운드 알림을 수신할 수 있습니다

## 문제 해결

### 푸시 토큰을 받을 수 없는 경우
- 실제 디바이스에서 실행 중인지 확인
- 알림 권한이 허용되었는지 확인
- `app.json`의 `extra.eas.projectId`가 설정되어 있는지 확인

### 웹뷰에서 메시지가 전달되지 않는 경우
- `javaScriptEnabled={true}` 설정 확인
- 웹 애플리케이션에서 `window.ReactNativeWebView` 사용 확인
- 메시지 형식이 JSON 문자열인지 확인

### 다크모드가 작동하지 않는 경우
- `app.json`의 `userInterfaceStyle: "automatic"` 설정 확인
- 디바이스 시스템 설정의 다크모드 확인

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 작성자

- Owner: koyulim
- EAS Project ID: 9aa1d6a2-dd03-46d3-97e0-6d3a37a1aced
