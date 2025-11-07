import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react'
import { initTokenRefresh, startTokenRefresh, stopTokenRefresh } from "@/utils/tokenRefresh"

function App() {
  useEffect(() => {
    // Initialize token refresh on app start
    initTokenRefresh();
    
    // Listen for storage changes to handle login/logout from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'access_token') {
        if (e.newValue) {
          startTokenRefresh();
        } else {
          stopTokenRefresh();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      stopTokenRefresh();
    };
  }, []);

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App 