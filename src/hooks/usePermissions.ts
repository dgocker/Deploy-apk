import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function usePermissions() {
  useEffect(() => {
    const requestPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;

      const hasRequested = localStorage.getItem('permissions_requested');
      if (hasRequested) return;

      try {
        // Request camera and microphone permissions by trying to access them
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Immediately stop the stream
        stream.getTracks().forEach(track => track.stop());
        console.log('Camera and Microphone permissions granted');
        localStorage.setItem('permissions_requested', 'true');
      } catch (err) {
        console.error('Camera/Microphone permissions denied or not available', err);
        alert('Для совершения звонков необходимо разрешить доступ к камере и микрофону в настройках приложения.');
        localStorage.setItem('permissions_requested', 'true');
      }
    };

    requestPermissions();
  }, []);
}
