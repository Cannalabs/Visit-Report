

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
import { User as UserEntity } from "@/api/entities";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => {
    loadUser();
    
    // Listen for the global user update event
    const handleUserUpdate = (event) => {
      // Check for the correct message type and ensure there's a payload
      if (event.data?.type === 'USER_UPDATED' && event.data.payload) {
        // Update state directly from the message payload to avoid re-fetching
        setUser(event.data.payload);
      }
    };

    window.addEventListener('message', handleUserUpdate);

    return () => {
      window.removeEventListener('message', handleUserUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const loadUser = async () => {
    try {
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
        console.log("Failed to refresh user data:", error.message);
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
      console.log("Error loading user:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await UserEntity.logout();
      navigate("/Login");
    } catch (error) {
      console.error("Logout error:", error);
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

      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className={`border-r border-gray-200 bg-white transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <SidebarHeader className="border-b border-gray-100 p-4 flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className={`flex justify-center transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              <div className="text-2xl font-bold text-green-600">
                CANNA
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hover:bg-green-50"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
                          hover:bg-green-50 hover:text-green-700 transition-all duration-200 rounded-xl py-3 px-4
                          ${location.pathname === item.url ? 'bg-green-50 text-green-700 border-l-4 border-green-600' : ''}
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

          <SidebarFooter className="border-t border-gray-100 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-green-50">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
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
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          {/* Mobile header */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-green-600">
                  CANNA
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div id="page-content" className="flex-1 overflow-auto bg-gray-50">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

