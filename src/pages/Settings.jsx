
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { UserProfile } from "@/api/entities";
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
  CheckCircle,
  Edit,
  Lock
} from "lucide-react";
import SignaturePad from "@/components/visit-form/SignaturePad";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({
    full_name: "",
    email: "",
    role: "",
    department: "",
    territory: "",
    phone: ""
  });
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signatureSignerName, setSignatureSignerName] = useState("");
  const [isSignatureSigned, setIsSignatureSigned] = useState(false);
  const [signatureError, setSignatureError] = useState("");

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
        }
      } catch (error) {
        // Don't clear token here - let ProtectedRoute handle auth failures
        // Only show error if we don't have cached data
        if (!currentUser) {
          setError("Failed to load user data");
        }
      }

      // Load user profile to get department, territory, and phone
      if (currentUser && currentUser.id) {
        try {
          // Try to get profile by user_id
          let profile = null;
          try {
            profile = await UserProfile.getByUserId(currentUser.id);
          } catch (error) {
            // If getByUserId fails, try listing and finding
            const profileList = await UserProfile.list().catch(() => []);
            profile = profileList.find(p => p.user_id === currentUser.id);
          }
          
          if (profile) {
            setUserProfile(profile);
            const preferences = profile.preferences || {};
            setUserData({
              full_name: currentUser.full_name || profile.full_name || "",
              email: currentUser.email || "",
              role: currentUser.role || preferences.role || "",
              department: preferences.department || "",
              territory: preferences.territory || "",
              phone: profile.phone || ""
            });
            // Load signature if it exists
            if (profile.signature) {
              setSignature(profile.signature);
              setSignatureSignerName(profile.signature_signer_name || "");
              setIsSignatureSigned(true);
            }
          } else {
            // No profile found, use user data only
            setUserData({
              full_name: currentUser.full_name || "",
              email: currentUser.email || "",
              role: currentUser.role || "",
              department: "",
              territory: "",
              phone: ""
            });
          }
        } catch (error) {
          // If profile loading fails, use user data only
          setUserData({
            full_name: currentUser.full_name || "",
            email: currentUser.email || "",
            role: currentUser.role || "",
            department: "",
            territory: "",
            phone: ""
          });
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
      // Update User model (full_name only, role and department are readonly)
      await User.updateMyUserData({
        full_name: userData.full_name
      });

      // Save signature if it was updated
      if (signature && signatureSignerName.trim()) {
        try {
          await UserProfile.saveSignature(user.id, {
            signature: signature,
            signature_signer_name: signatureSignerName.trim()
          });
        } catch (err) {
          console.error("Failed to save signature:", err);
          // Continue with other updates even if signature save fails
        }
      }

      // Update UserProfile if it exists
      if (userProfile && userProfile.id) {
        const currentPreferences = userProfile.preferences || {};
        const updatedPreferences = {
          ...currentPreferences,
          // Keep existing territory, department and role in preferences (readonly)
          territory: currentPreferences.territory || userData.territory,
          department: currentPreferences.department || userData.department,
          role: currentPreferences.role || userData.role
        };

        await UserProfile.update(userProfile.id, {
          full_name: userData.full_name,
          phone: userData.phone,
          preferences: updatedPreferences
        });
      } else if (user && user.id) {
        // Create new profile if it doesn't exist
        const currentPreferences = {};
        const updatedPreferences = {
          ...currentPreferences,
          territory: userData.territory,
          department: userData.department,
          role: userData.role
        };

        await UserProfile.create({
          user_id: user.id,
          full_name: userData.full_name,
          phone: userData.phone,
          preferences: updatedPreferences
        });
      }

      // Re-fetch the user and profile to get the absolute latest state
      const updatedUser = await User.me().catch(() => user);
      const profileList = await UserProfile.list();
      const updatedProfile = profileList.find(p => p.user_id === updatedUser.id);
      
      // Update the local state immediately
      setUser(updatedUser);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
        const preferences = updatedProfile.preferences || {};
        setUserData({
          full_name: updatedUser.full_name || updatedProfile.full_name || "",
          email: updatedUser.email || "",
          role: updatedUser.role || preferences.role || "",
          department: preferences.department || "",
          territory: preferences.territory || "",
          phone: updatedProfile.phone || ""
        });
      } else {
        setUserData({
          full_name: updatedUser.full_name || "",
          email: updatedUser.email || "",
          role: updatedUser.role || "",
          department: "",
          territory: "",
          phone: ""
        });
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Trigger a global user update event with the new user data in the payload
      if (window.parent) {
        window.parent.postMessage({ type: 'USER_UPDATED', payload: updatedUser }, '*');
      }
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
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Profile Card Skeleton */}
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>

          {/* Signature Card Skeleton */}
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </Card>

          {/* Settings Card Skeleton */}
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
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
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={userData.role ? userData.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Role cannot be changed here
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={userData.department}
                    disabled
                    className="bg-gray-50"
                    placeholder="Not set"
                  />
                  <p className="text-xs text-gray-500">
                    Department cannot be changed here
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="territory">Sales Territory</Label>
                <Input
                  id="territory"
                  value={userData.territory}
                  disabled
                  className="bg-gray-50"
                  placeholder="Not set"
                />
                <p className="text-xs text-gray-500">
                  Sales Territory cannot be changed here
                </p>
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

        {/* Signature Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Digital Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Your signature will be automatically used in all visit reports. You can update it here at any time.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="signature_signer_name">Signer Name *</Label>
                <Input
                  id="signature_signer_name"
                  placeholder="Enter full name"
                  value={signatureSignerName}
                  onChange={(e) => {
                    setSignatureSignerName(e.target.value);
                    setSignatureError("");
                  }}
                  className={signatureError || (!signatureSignerName.trim() && isSignatureSigned) ? "border-red-300 bg-red-50" : ""}
                />
                {!signatureSignerName.trim() && isSignatureSigned && (
                  <p className="text-xs text-red-600">Signer name is required</p>
                )}
                {signatureError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-sm">{signatureError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {isSignatureSigned ? (
                <div className="space-y-4">
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Signature Saved</span>
                    </div>
                    <img src={signature} alt="signature" className="mx-auto border rounded max-w-full h-auto max-h-48"/>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsSignatureSigned(false);
                      setSignature(null);
                      setSignatureError("");
                    }}
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Update Signature
                  </Button>
                </div>
              ) : (
                <SignaturePad 
                  onSave={(signatureDataUrl) => {
                    if (!signatureSignerName || signatureSignerName.trim() === "") {
                      setSignatureError("Signer name is mandatory. Please enter the name before submitting.");
                      return false;
                    }
                    setSignatureError("");
                    setSignature(signatureDataUrl);
                    setIsSignatureSigned(true);
                    return true;
                  }}
                  signerName={signatureSignerName}
                  onError={(error) => setSignatureError(error)}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
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
              
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
