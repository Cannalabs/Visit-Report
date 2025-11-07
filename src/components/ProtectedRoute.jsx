import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { User } from "@/api/entities";
import { Loader2 } from "lucide-react";
import { refreshAccessToken, getTokenExpiration } from "@/utils/tokenRefresh";

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only check once
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we have a token
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check if we have cached user data - use it for immediate auth
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          // If we have cached user AND token, assume authenticated and verify in background
          setIsAuthenticated(true);
          setIsLoading(false);
          
          // Verify token in background (don't block UI)
          // Use a timeout to prevent hanging if the request takes too long
          const verifyPromise = User.me().then(user => {
            if (user) {
              // Update cache with fresh data
              localStorage.setItem('user', JSON.stringify(user));
            }
            return user;
          }).catch(verifyError => {
            // Only clear if it's definitely an auth error
            if (verifyError.message === 'Not authenticated') {
              // Double-check token still exists before clearing
              const currentToken = localStorage.getItem('access_token');
              if (currentToken) {
                // Try to refresh token before clearing - but don't block
                refreshAccessToken().then(refreshed => {
                  if (!refreshed) {
                    // Only clear if refresh definitely failed AND token is expired
                    const expiration = getTokenExpiration(currentToken);
                    if (expiration && Date.now() >= expiration) {
                      console.warn('Token expired and refresh failed, clearing auth');
                      localStorage.removeItem('access_token');
                      localStorage.removeItem('user');
                      setIsAuthenticated(false);
                    } else {
                      // Token might still be valid, just keep authenticated
                      console.warn('Token validation failed but token not expired, keeping session');
                    }
                  } else {
                    console.log('Token refreshed during validation');
                  }
                }).catch(() => {
                  // Refresh error - don't clear, might be network issue
                  console.warn('Token refresh error, but keeping session');
                });
              }
            }
            // If it's a network error or other issue, keep authenticated with cached data
            return null;
          });
          
          // Don't await - let it run in background
          verifyPromise.catch(() => {
            // Silently handle any errors in background verification
          });
          
          return;
        } catch (e) {
          // Invalid cache, continue to fetch fresh
        }
      }

      // No cached user, fetch fresh
      // But first, set authenticated to true optimistically if we have a token
      // This prevents logout flash while we verify
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Fetch in background
      User.me().then(user => {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          // No user returned - clear auth
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      }).catch(fetchError => {
        // If fetch fails, check if it's an auth error
        if (fetchError.message === 'Not authenticated') {
          // Try to refresh token first
          const currentToken = localStorage.getItem('access_token');
          if (currentToken) {
            refreshAccessToken().then(refreshed => {
              if (!refreshed) {
                // Check if token is actually expired
                const expiration = getTokenExpiration(currentToken);
                if (expiration && Date.now() >= expiration) {
                  // Token is expired, clear everything
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('user');
                  setIsAuthenticated(false);
                } else {
                  // Token not expired, might be temporary issue - keep authenticated
                  console.warn('Auth error but token not expired, keeping session');
                }
              } else {
                console.log('Token refreshed successfully');
              }
            }).catch(() => {
              // Refresh error - don't clear, might be network issue
              console.warn('Token refresh error, but keeping session');
            });
          } else {
            // No token, clear auth
            setIsAuthenticated(false);
          }
        } else {
          // Network error or other issue - keep authenticated with token
          // User can retry later
          console.warn('Failed to verify token, but keeping session:', fetchError);
        }
      });
    } catch (error) {
      console.error('ProtectedRoute auth check failed:', error);
      // Only clear token if it's definitely an authentication error
      const token = localStorage.getItem('access_token');
      if (token && error.message === 'Not authenticated') {
        // Token exists but auth failed - clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      } else if (!token) {
        // No token at all
        setIsAuthenticated(false);
      } else {
        // Network error or other issue - if we have cached user, stay authenticated
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/Login" replace />;
  }

  return children;
}

