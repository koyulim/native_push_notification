import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    try {
      // projectId는 app.json의 extra.eas.projectId를 자동으로 사용
      const pushToken = await Notifications.getExpoPushTokenAsync();
      token = pushToken.data;

      // Save token to Supabase
      await savePushToken(token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 로그인 여부와 상관없이 토큰 저장
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user?.id || null, // 로그인 안 되어 있으면 null
        token: token,
        device_type: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'token',
      });

    if (error) {
      console.log('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.log('Error in savePushToken:', error);
  }
}

export async function createPushNotification(
  title: string,
  message: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 로그인 여부와 상관없이 알림 생성
    const { error } = await supabase
      .from('push_notifications')
      .insert({
        title,
        message,
        user_id: user?.id || null, // 로그인 안 되어 있으면 null
        status: 'pending',
      });

    if (error) {
      console.log('Error creating push notification:', error);
    } else {
      console.log('Push notification created successfully');
    }
  } catch (error) {
    console.log('Error in createPushNotification:', error);
  }
}

// 로컬에서 즉시 푸시 알림을 표시하는 함수 (서버 없이)
export async function showLocalNotification(
  title: string,
  message: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: message,
      sound: true,
    },
    trigger: null, // 즉시 표시
  });
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}