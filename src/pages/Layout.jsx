

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
  Menu,
  Users,
  LogOut,
  HelpCircle,
  TrendingUp,
  AlertCircle
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
    title: "Follow-ups",
    url: createPageUrl("FollowUps"),
    icon: AlertCircle
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

      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50">
        <Sidebar className={`border-r border-gray-200/60 bg-white/95 backdrop-blur-sm shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <SidebarHeader className={`border-b border-gray-100/60 py-3 flex flex-row items-center bg-gradient-to-r from-green-50/30 to-transparent ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4 gap-2.5'}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hover:bg-green-50 h-8 w-8 flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("Dashboard")} className={`flex items-center transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-12"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/ee07bf17f_1200-524-max.png"
                  alt="CANNA Logo"
                  className="h-12"
                />
              )}
            </Link>
          </SidebarHeader>

          <SidebarContent className={`${sidebarCollapsed ? 'px-2' : 'px-4'} py-4`}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-3">
                  {navigationItems.map((item, index) => {
                    const gradients = [
                      { from: 'from-emerald-500', via: 'via-green-500', to: 'to-teal-500', text: 'text-white', bg: 'bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50', hoverBg: 'hover:from-emerald-100 hover:via-green-100 hover:to-teal-100', icon: 'text-emerald-600', border: 'border-emerald-300' },
                      { from: 'from-blue-500', via: 'via-indigo-500', to: 'to-violet-500', text: 'text-white', bg: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50', hoverBg: 'hover:from-blue-100 hover:via-indigo-100 hover:to-violet-100', icon: 'text-blue-600', border: 'border-blue-300' },
                      { from: 'from-purple-500', via: 'via-fuchsia-500', to: 'to-pink-500', text: 'text-white', bg: 'bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50', hoverBg: 'hover:from-purple-100 hover:via-fuchsia-100 hover:to-pink-100', icon: 'text-purple-600', border: 'border-purple-300' },
                      { from: 'from-orange-500', via: 'via-amber-500', to: 'to-yellow-500', text: 'text-white', bg: 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50', hoverBg: 'hover:from-orange-100 hover:via-amber-100 hover:to-yellow-100', icon: 'text-orange-600', border: 'border-orange-300' },
                      { from: 'from-cyan-500', via: 'via-sky-500', to: 'to-blue-500', text: 'text-white', bg: 'bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50', hoverBg: 'hover:from-cyan-100 hover:via-sky-100 hover:to-blue-100', icon: 'text-cyan-600', border: 'border-cyan-300' }
                    ];
                    const gradient = gradients[index % gradients.length];
                    const isActive = location.pathname === item.url;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`
                            ${isActive 
                              ? sidebarCollapsed
                                ? `bg-white ${gradient.icon} shadow-sm`
                                : `bg-gradient-to-r ${gradient.from} ${gradient.via} ${gradient.to} ${gradient.text} shadow-lg scale-105 border-2 border-transparent`
                              : sidebarCollapsed 
                                ? `bg-white text-gray-700`
                                : `${gradient.bg} text-gray-700 ${gradient.hoverBg} hover:shadow-md hover:scale-[1.02] border border-gray-200/60`
                            }
                            ${sidebarCollapsed 
                              ? 'rounded-full w-10 h-10 p-0 justify-center flex-shrink-0' 
                              : 'rounded-2xl py-2.5 px-3 h-8'
                            }
                            transition-all duration-300 relative overflow-hidden flex items-center
                          `}
                        >
                          <Link to={item.url} className={`flex items-center ${sidebarCollapsed ? 'justify-center w-10 h-10' : 'gap-3 relative w-full'}`}>
                            <div className="relative z-10 flex items-center justify-center">
                              <item.icon className={`w-5 h-5 ${isActive && !sidebarCollapsed ? 'text-white' : gradient.icon} transition-transform duration-300`} />
                            </div>
                            {!sidebarCollapsed && <span className={`font-semibold ${isActive ? 'text-white' : 'text-gray-800'} relative z-10 whitespace-nowrap`}>{item.title}</span>}
                            {isActive && !sidebarCollapsed && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse relative z-10" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  {isAdmin && (
                    <>
                      <div className="pt-3 mt-3 border-t border-gray-200/50">
                        <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3 ${sidebarCollapsed ? 'hidden' : ''}`}>Admin</p>
                      </div>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`
                            ${location.pathname === createPageUrl("Configuration")
                              ? sidebarCollapsed
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-white shadow-lg scale-105 border-2 border-transparent'
                              : sidebarCollapsed
                                ? 'bg-white text-gray-700'
                                : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 text-gray-700 hover:from-blue-100 hover:via-indigo-100 hover:to-violet-100 hover:shadow-md hover:scale-[1.02] border border-gray-200/60'
                            }
                            ${sidebarCollapsed 
                              ? 'rounded-full w-10 h-10 p-0 justify-center flex-shrink-0' 
                              : 'rounded-2xl py-2.5 px-3 h-8'
                            }
                            transition-all duration-300 relative overflow-hidden flex items-center
                          `}
                        >
                          <Link to={createPageUrl("Configuration")} className={`flex items-center ${sidebarCollapsed ? 'justify-center w-10 h-10' : 'gap-3 relative w-full'}`}>
                            <div className="relative z-10 flex items-center justify-center">
                              <Settings className={`w-5 h-5 ${location.pathname === createPageUrl("Configuration") && !sidebarCollapsed ? 'text-white' : 'text-blue-600'} transition-transform duration-300`} />
                            </div>
                            {!sidebarCollapsed && <span className={`font-semibold ${location.pathname === createPageUrl("Configuration") ? 'text-white' : 'text-gray-800'} relative z-10 whitespace-nowrap`}>Configuration</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`
                            ${location.pathname === createPageUrl("Admin")
                              ? sidebarCollapsed
                                ? 'bg-white text-rose-600 shadow-sm'
                                : 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-lg scale-105 border-2 border-transparent'
                              : sidebarCollapsed
                                ? 'bg-white text-gray-700'
                                : 'bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 text-gray-700 hover:from-rose-100 hover:via-red-100 hover:to-orange-100 hover:shadow-md hover:scale-[1.02] border border-gray-200/60'
                            }
                            ${sidebarCollapsed 
                              ? 'rounded-full w-10 h-10 p-0 justify-center flex-shrink-0' 
                              : 'rounded-2xl py-2.5 px-3 h-8'
                            }
                            transition-all duration-300 relative overflow-hidden flex items-center
                          `}
                        >
                          <Link to={createPageUrl("Admin")} className={`flex items-center ${sidebarCollapsed ? 'justify-center w-10 h-10' : 'gap-3 relative w-full'}`}>
                            <div className="relative z-10 flex items-center justify-center">
                              <Shield className={`w-5 h-5 ${location.pathname === createPageUrl("Admin") && !sidebarCollapsed ? 'text-white' : 'text-rose-600'} transition-transform duration-300`} />
                            </div>
                            {!sidebarCollapsed && <span className={`font-semibold ${location.pathname === createPageUrl("Admin") ? 'text-white' : 'text-gray-800'} relative z-10 whitespace-nowrap`}>Admin Panel</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className={`border-t border-gray-100/60 py-3 bg-gradient-to-r from-gray-50/30 to-transparent ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
            {/* Server Health Indicator - Hidden but functional */}
            {!sidebarCollapsed && (
              <div className="px-2 py-1.5 rounded-md bg-gray-50/50 space-y-1 mb-2 opacity-0 h-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    serverHealth.status === 'healthy' 
                      ? 'bg-green-500' 
                      : serverHealth.status === 'unhealthy' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-600">
                    {serverHealth.status === 'healthy' ? 'Online' : serverHealth.status === 'unhealthy' ? 'Degraded' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex flex-col items-center gap-1 mb-2 opacity-0 h-0 overflow-hidden">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    serverHealth.status === 'healthy' 
                      ? 'bg-green-500' 
                      : serverHealth.status === 'unhealthy' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`} 
                  title={`Server ${serverHealth.status === 'healthy' ? 'Up' : serverHealth.status === 'unhealthy' ? 'Degraded' : 'Down'}${serverHealth.lastUpdated ? ` - ${serverHealth.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}`}
                />
              </div>
            )}

            <div className={`${sidebarCollapsed ? 'flex justify-center' : ''}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`${sidebarCollapsed ? 'w-10 h-10 p-0 rounded-full flex items-center justify-center flex-shrink-0' : 'w-full justify-start p-0 h-auto hover:bg-gradient-to-r hover:from-green-50 hover:to-green-50/50 rounded-xl'} transition-all duration-200`}>
                    <div className={`flex items-center justify-center ${sidebarCollapsed ? 'w-10 h-10' : 'gap-2.5 w-full p-1.5'}`}>
                      <div className={`w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center ${sidebarCollapsed ? '' : 'ring-2 ring-emerald-200 ring-offset-2'}`}>
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {user?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {user?.role || 'Sales Rep'}
                        </p>
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align={sidebarCollapsed ? "center" : "end"} 
                side={sidebarCollapsed ? "top" : "bottom"}
                className={sidebarCollapsed ? "w-auto p-2 rounded-full min-w-[48px]" : "w-56"}
              >
                <DropdownMenuItem asChild className={sidebarCollapsed ? "rounded-full" : ""}>
                  <Link to={createPageUrl("Settings")} className={`flex items-center ${sidebarCollapsed 
                    ? `justify-center w-10 h-10 p-0 rounded-full ${location.pathname === createPageUrl("Settings") ? 'bg-black text-white' : 'hover:bg-gray-100'}` 
                    : 'gap-2'}`}>
                    <Settings className="w-4 h-4" />
                    {!sidebarCollapsed && <span>Settings</span>}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className={`flex items-center ${sidebarCollapsed ? 'justify-center w-10 h-10 p-0 rounded-full hover:bg-gray-100' : 'gap-2'} ${sidebarCollapsed ? 'rounded-full' : ''}`}>
                  <HelpCircle className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Help</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator className={sidebarCollapsed ? "my-1" : ""} />
                <DropdownMenuItem onClick={handleLogout} className={`flex items-center ${sidebarCollapsed ? 'justify-center w-10 h-10 p-0 rounded-full hover:bg-red-50' : 'gap-2'} ${sidebarCollapsed ? 'rounded-full' : ''} text-red-600`}>
                  <LogOut className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          {/* Mobile header */}
          <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/60 px-4 py-3 md:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="h-8"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/ee07bf17f_1200-524-max.png"
                    alt="CANNA Logo"
                    className="h-8"
                  />
                )}
                <div className={`w-1.5 h-1.5 rounded-full ${
                  serverHealth.status === 'healthy' 
                    ? 'bg-green-500' 
                    : serverHealth.status === 'unhealthy' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`} />
              </div>
            </div>
          </header>

          {/* Main content */}
          <div id="page-content" className="flex-1 overflow-auto scrollbar-thin">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

