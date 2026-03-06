export const getApiUrl = () => {
  // Use environment variable if set, otherwise fallback to the production Render URL
  // This is crucial for the APK build where VITE_API_URL might not be injected properly
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // If we are running on localhost in a browser (not capacitor), use relative path
  if (typeof window !== 'undefined' && 
      window.location.hostname === 'localhost' && 
      window.location.protocol !== 'capacitor:') {
    return '';
  }
  
  return 'https://deploy-apk.onrender.com';
};
