

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserEntity, Configuration as ConfigEntity } from "@/api/entities";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard
  },
  {
    title: "New Visit Report",
    url: createPageUrl("NewVisit"),
    icon: FileText
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: TrendingUp
  },
  {
    title: "Customers & Contacts",
    url: createPageUrl("Customers"),
    icon: Users
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyLogo, setCompanyLogo] = React.useState(null);
  const [companyName, setCompanyName] = React.useState("CANNA");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [serverHealth, setServerHealth] = React.useState({ status: 'unknown', lastUpdated: null });
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => {
    loadUser();
    loadCompanySettings();
    checkServerHealth(); // Initial health check
    
    // Listen for the global user update event
    const handleUserUpdate = (event) => {
      // Check for the correct message type and ensure there's a payload
      if (event.data?.type === 'USER_UPDATED' && event.data.payload) {
        // Update state directly from the message payload to avoid re-fetching
        setUser(event.data.payload);
      }
    };

    window.addEventListener('message', handleUserUpdate);

    // Set up health check interval (every 5 seconds)
    const healthInterval = setInterval(() => {
      checkServerHealth();
    }, 5000);

    return () => {
      window.removeEventListener('message', handleUserUpdate);
      clearInterval(healthInterval);
    };
  }, []);

  const updateFavicon = (logoUrl) => {
    try {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach(link => link.remove());
      
      // Create new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      
      // If logo is a data URL, use it directly
      if (logoUrl.startsWith('data:image')) {
        // Extract image type from data URL
        const match = logoUrl.match(/data:image\/([^;]+)/);
        const imageType = match ? match[1] : 'png';
        link.type = `image/${imageType}`;
        link.href = logoUrl;
      } else {
        // If it's a URL, use the favicon endpoint (nginx will proxy to backend)
        link.type = 'image/png';
        link.href = '/favicon.ico';
      }
      
      document.head.appendChild(link);
    } catch (err) {
      // Silently fail if favicon update fails
    }
  };

  const loadCompanySettings = async () => {
    try {
      const configs = await ConfigEntity.list();
      const companyConfigs = configs.filter(c => c.config_type === "company_settings");
      
      // Extract company logo and name
      const logoConfig = companyConfigs.find(c => c.config_value === "company_logo");
      const nameConfig = companyConfigs.find(c => c.config_value === "company_name");
      
      if (logoConfig && logoConfig.config_name) {
        setCompanyLogo(logoConfig.config_name);
        
        // Update favicon with company logo
        updateFavicon(logoConfig.config_name);
      }
      
      if (nameConfig && nameConfig.config_name) {
        setCompanyName(nameConfig.config_name);
      }
    } catch (err) {
      // Keep default "CANNA" if loading fails
    }
  };

  const checkServerHealth = async () => {
    try {
      // Get base URL - auto-detect based on current hostname
      let baseUrl = 'http://localhost:8000';
      let healthPath = '/health';
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // If accessing through nginx (port 8003 or 80, or any port that's not 8002), use relative path and /api/health
        // This covers both production (nginx) and development scenarios
        if (port === '8003' || port === '80' || port === '' || (hostname !== 'localhost' && hostname !== '127.0.0.1' && port !== '8002')) {
          // Accessing through nginx frontend - use relative path
          baseUrl = '';
          healthPath = '/api/health';
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Local development - direct backend access
          baseUrl = 'http://localhost:8000';
          healthPath = '/health';
        } else {
          // Network IP with direct backend port
          baseUrl = `${protocol}//${hostname}:8002`;
          healthPath = '/health';
        }
      }
      
      // Add timeout to health check (5 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${baseUrl}${healthPath}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-cache', // Prevent caching of health check
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Backend returns 'up' or 'degraded', map to frontend status
        let healthStatus = 'healthy';
        if (data.status === 'up') {
          healthStatus = 'healthy';
        } else if (data.status === 'degraded') {
          healthStatus = 'unhealthy';
        } else {
          healthStatus = data.status || 'healthy';
        }
        setServerHealth({
          status: healthStatus,
          lastUpdated: new Date()
        });
      } else {
        setServerHealth({
          status: 'unhealthy',
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      // Check if it's an abort (timeout) or network error
      if (error.name === 'AbortError') {
        setServerHealth({
          status: 'offline',
          lastUpdated: new Date()
        });
      } else {
        // Network error or CORS error
        setServerHealth({
          status: 'offline',
          lastUpdated: new Date()
        });
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const loadUser = async () => {
    try {
      // Check for hardcoded admin (frontend-only bootstrap user)
      const isHardcodedAdmin = localStorage.getItem('is_hardcoded_admin') === 'true';
      if (isHardcodedAdmin) {
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            setUser(parsed);
            setIsLoading(false);
            return; // Skip backend fetch for hardcoded admin
          } catch (e) {
            // Invalid cache, continue
          }
        }
      }
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      // Try to get user from cache first for immediate display
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);
          setIsLoading(false);
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
      
      // Fetch fresh user data in background (don't block on this)
      try {
        const currentUser = await UserEntity.me();
        if (currentUser) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (error) {
        // Don't clear token here - let ProtectedRoute handle auth failures
        // This prevents race conditions where Layout clears token before ProtectedRoute can validate
        // Only clear if we have no cached user and the error is definitely auth-related
        if (!cachedUser && (error.message === 'Not authenticated' || error.message.includes('401'))) {
          // Wait a bit to see if ProtectedRoute handles it
          setTimeout(() => {
            const stillNoToken = !localStorage.getItem('access_token');
            if (stillNoToken) {
              // Token was cleared by ProtectedRoute, that's fine
              return;
            }
            // Token still exists but auth failed - might be a temporary network issue
            // Don't clear it, let user retry
          }, 1000);
        }
      }
    } catch (error) {
      // Error loading user
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await UserEntity.logout();
      navigate("/Login");
    } catch (error) {
      // Navigate to login even if logout fails
      navigate("/Login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --canna-green: #2E7D32;
          --canna-green-light: #4CAF50;
          --canna-green-accent: #81C784;
          --canna-green-hover: #1B5E20;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #page-content, #page-content * {
            visibility: visible;
          }
          #page-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <Sidebar className={`border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <SidebarHeader className={`border-b border-gray-100 dark:border-gray-800 p-4 flex items-center transition-all duration-300 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 transition-opacity duration-300 opacity-100">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="h-10 w-auto object-contain max-w-[120px]"
                    onError={(e) => {
                      // Fallback to text if logo fails to load
                      e.target.style.display = 'none';
                      const textFallback = e.target.nextElementSibling;
                      if (textFallback) textFallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <div className={`text-2xl font-bold text-green-600 dark:text-green-400 ${companyLogo ? 'hidden' : ''}`}>
                  {companyName}
                </div>
              </Link>
            )}
            {sidebarCollapsed && companyLogo && (
              <Link to={createPageUrl("Dashboard")} className="flex justify-center">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-8 w-8 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hover:bg-green-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 ${
                sidebarCollapsed 
                  ? 'w-10 h-10 mx-auto' 
                  : 'w-8 h-8 ml-auto'
              }`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`
                          hover:bg-green-50 dark:hover:bg-gray-800 hover:text-green-700 dark:hover:text-green-400 transition-all duration-200 rounded-xl py-3 px-4
                          ${location.pathname === item.url ? 'bg-green-50 dark:bg-gray-800 text-green-700 dark:text-green-400 border-l-4 border-green-600 dark:border-green-500' : 'text-gray-700 dark:text-gray-300'}
                        `}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          {!sidebarCollapsed && <span className="font-medium">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {isAdmin && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`
                            hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl py-3 px-4
                            ${location.pathname === createPageUrl("Configuration") ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : ''}
                          `}
                        >
                          <Link to={createPageUrl("Configuration")} className="flex items-center gap-3">
                            <Settings className="w-5 h-5" />
                            {!sidebarCollapsed && <span className="font-medium">Configuration</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`
                            hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-xl py-3 px-4
                            ${location.pathname === createPageUrl("Admin") ? 'bg-red-50 text-red-700 border-l-4 border-red-600' : ''}
                          `}
                        >
                          <Link to={createPageUrl("Admin")} className="flex items-center gap-3">
                            <Shield className="w-5 h-5" />
                            {!sidebarCollapsed && <span className="font-medium">Admin Panel</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
            {/* Server Health Indicator */}
            {!sidebarCollapsed ? (
              <div className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    serverHealth.status === 'healthy' 
                      ? 'bg-green-500 animate-pulse shadow-sm shadow-green-500/50' 
                      : serverHealth.status === 'unhealthy' 
                      ? 'bg-yellow-500 shadow-sm shadow-yellow-500/50' 
                      : 'bg-red-500 shadow-sm shadow-red-500/50'
                  }`} />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Server {serverHealth.status === 'healthy' ? 'Up' : serverHealth.status === 'unhealthy' ? 'Degraded' : 'Down'}
                  </span>
                </div>
                {serverHealth.lastUpdated && (
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 ml-5 font-medium">
                    Last updated: {serverHealth.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center mb-2">
                <div 
                  className={`w-2.5 h-2.5 rounded-full ${
                    serverHealth.status === 'healthy' 
                      ? 'bg-green-500 animate-pulse shadow-sm shadow-green-500/50' 
                      : serverHealth.status === 'unhealthy' 
                      ? 'bg-yellow-500 shadow-sm shadow-yellow-500/50' 
                      : 'bg-red-500 shadow-sm shadow-red-500/50'
                  }`} 
                  title={`Server ${serverHealth.status === 'healthy' ? 'Up' : serverHealth.status === 'unhealthy' ? 'Degraded' : 'Down'}${serverHealth.lastUpdated ? ` - Last updated: ${serverHealth.lastUpdated.toLocaleTimeString()}` : ''}`}
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-green-50 dark:hover:bg-gray-800">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-full flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-green-700 dark:text-green-300" />
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {user?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                          {user?.role || 'Sales Rep'}
                        </p>
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("Settings")} className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          {/* Mobile header */}
          <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="h-8 w-auto object-contain max-w-[100px]"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const textFallback = e.target.nextElementSibling;
                      if (textFallback) textFallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <div className={`text-xl font-bold text-green-600 dark:text-green-400 ${companyLogo ? 'hidden' : ''}`}>
                  {companyName}
                </div>
                {/* Server Health Indicator - Mobile */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    serverHealth.status === 'healthy' 
                      ? 'bg-green-500 animate-pulse' 
                      : serverHealth.status === 'unhealthy' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                    {serverHealth.status === 'healthy' ? 'Online' : serverHealth.status === 'unhealthy' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div id="page-content" className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

