import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupPushNotifications() {
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await savePushToken(token.data);
}

async function savePushToken(token: string) {
  const { Platform } = await import('react-native');
  const deviceType = Platform.OS;

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: user?.id || null,
      token: token,
      device_type: deviceType,
    }, {
      onConflict: 'token',
    });

  if (error) {
    return;
  }
}
