import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export function usePermissions() {
  const [permissionsGranted, setPermissionsGranted] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        setChecking(false);
        return;
      }

      try {
        // Check Camera/Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());

        // Check Push Notifications
        const pushStatus = await PushNotifications.checkPermissions();
        
        if (pushStatus.receive === 'granted') {
          setPermissionsGranted(true);
        } else {
          setPermissionsGranted(false);
        }
      } catch (err) {
        setPermissionsGranted(false);
      } finally {
        setChecking(false);
      }
    };

    checkPermissions();
  }, []);

  const requestAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Request Camera/Microphone
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Request Push Notifications
      const pushStatus = await PushNotifications.requestPermissions();
      
      if (pushStatus.receive === 'granted') {
        setPermissionsGranted(true);
      } else {
        alert('Пожалуйста, предоставьте все разрешения в настройках приложения для корректной работы.');
      }
    } catch (err) {
      alert('Не удалось получить разрешения. Пожалуйста, включите их вручную в настройках.');
    }
  };

  return { permissionsGranted, checking, requestAllPermissions };
}
