
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings as SettingsIcon,
  User as UserIcon,
  Bell,
  Shield,
  LogOut,
  Save,
  CheckCircle
} from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    full_name: "",
    email: "",
    department: "",
    territory: "",
    phone: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to get user from cache first
      let currentUser = null;
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          currentUser = JSON.parse(cachedUser);
          setUser(currentUser);
          setUserData({
            full_name: currentUser.full_name || "",
            email: currentUser.email || "",
            department: currentUser.department || "",
            territory: currentUser.territory || "",
            phone: currentUser.phone || ""
          });
        } catch (e) {
          // Invalid cache, will fetch fresh
        }
      }

      // Fetch fresh user data, fallback to cached if it fails
      try {
        const freshUser = await User.me();
        if (freshUser) {
          currentUser = freshUser;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUserData({
            full_name: freshUser.full_name || "",
            email: freshUser.email || "",
            department: freshUser.department || "",
            territory: freshUser.territory || "",
            phone: freshUser.phone || ""
          });
        }
      } catch (error) {
        // Don't clear token here - let ProtectedRoute handle auth failures
        // Only show error if we don't have cached data
        if (!currentUser) {
          setError("Failed to load user data");
        }
      }
    } catch (error) {
      // Error in loadUser
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      await User.updateMyUserData({
        full_name: userData.full_name,
        department: userData.department,
        territory: userData.territory,
        phone: userData.phone
      });

      // Re-fetch the user to get the absolute latest state
      const updatedUser = await User.me().catch(() => {
        // If API fails, return current user state
        return user;
      });
      
      // Update the local state immediately
      setUser(updatedUser);
      setUserData({
        full_name: updatedUser.full_name || "",
        email: updatedUser.email || "",
        department: updatedUser.department || "",
        territory: updatedUser.territory || "",
        phone: updatedUser.phone || ""
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Trigger a global user update event with the new user data in the payload
      // This is more reliable than forcing other components to re-fetch
      if (window.parent) {
        window.parent.postMessage({ type: 'USER_UPDATED', payload: updatedUser }, '*');
      }
      // Also dispatch a custom event for same-window components
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      
    } catch (err) {
      setError("Failed to save settings");
    }
    
    setIsSaving(false);
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.reload();
    } catch (error) {
      // Logout error
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your profile and application preferences
          </p>
        </motion.div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Settings saved successfully! Changes will reflect immediately.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={userData.full_name}
                    onChange={(e) => setUserData(prev => ({...prev, full_name: e.target.value}))}
                  />
                  <p className="text-xs text-gray-500">
                    Changes will reflect immediately in the app.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={userData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed here
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={userData.department}
                    onValueChange={(value) => setUserData(prev => ({...prev, department: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="territory">Sales Territory</Label>
                  <Input
                    id="territory"
                    value={userData.territory}
                    onChange={(e) => setUserData(prev => ({...prev, territory: e.target.value}))}
                    placeholder="e.g., Netherlands North"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={userData.phone}
                  onChange={(e) => setUserData(prev => ({...prev, phone: e.target.value}))}
                  placeholder="+31 20 123 4567"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Application Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications about visit reminders and updates
                  </p>
                </div>
                <div className="text-sm text-gray-500">Coming Soon</div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Report Templates</p>
                  <p className="text-sm text-gray-600">
                    Customize default visit report templates
                  </p>
                </div>
                <div className="text-sm text-gray-500">Coming Soon</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                Role: <span className="font-medium capitalize">{user?.role}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
