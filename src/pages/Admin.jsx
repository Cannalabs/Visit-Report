
import React, { useState, useEffect, useCallback } from 'react';
import { User } from "@/api/entities";
import { UserProfile } from "@/api/entities"; // Added UserProfile import
import { AuditLog } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Users, 
  UserPlus, 
  Edit, 
  Key,
  Search,
  Filter,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  History
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]); // Added userProfiles state
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [newUserData, setNewUserData] = useState({
    full_name: "",
    email: "",
    role: "sales_rep",
    department: "",
    territory: "",
    phone: "",
    password: "",
    confirmPassword: "",
    require_password_change: true,
    status: "active" // This status refers to the initial desired status for the profile
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
    require_change_on_login: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const filterUsers = useCallback(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]); // Depend on memoized filterUsers

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (password.length < minLength) errors.push(`At least ${minLength} characters`);
    if (!hasUpper) errors.push("One uppercase letter");
    if (!hasLower) errors.push("One lowercase letter");
    if (!hasNumber) errors.push("One number");
    if (!hasSpecial) errors.push("One special character");
    
    return errors;
  };

  const getPasswordStrength = (password) => {
    const errors = validatePassword(password);
    if (errors.length === 0) return { strength: "Strong", color: "text-green-600" };
    if (errors.length <= 2) return { strength: "Medium", color: "text-yellow-600" };
    return { strength: "Weak", color: "text-red-600" };
  };

  const logAudit = async (action, targetUser, details = {}) => {
    try {
      await AuditLog.create({
        actor_user_id: currentUser.id,
        actor_email: currentUser.email,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        action,
        details,
        ip_address: "127.0.0.1", // Would need to get real IP from request
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error("Failed to log audit:", err);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate passwords match
      if (newUserData.password !== newUserData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Validate password strength
      const passwordErrors = validatePassword(newUserData.password);
      if (passwordErrors.length > 0) {
        setError(`Password must have: ${passwordErrors.join(", ")}`);
        return;
      }

      // Check if email already exists in Users
      const existingUsers = await User.list();
      const userExists = existingUsers.find(user => user.email === newUserData.email);
      if (userExists) {
        setError("A user with this email already exists in the system");
        return;
      }

      // First, create the User
      const userData = {
        email: newUserData.email,
        password: newUserData.password,
        full_name: newUserData.full_name,
        role: newUserData.role
      };

      const createdUser = await User.create(userData);

      // Then, create the UserProfile with the user_id
      const profileData = {
        user_id: createdUser.id,
        full_name: newUserData.full_name,
        phone: newUserData.phone || null,
        preferences: {
          department: newUserData.department || "",
          territory: newUserData.territory || "",
          password_reset_required: newUserData.require_password_change || false,
          status: "pending",
          last_password_reset: new Date().toISOString(),
          password_reset_by: currentUser.email
        }
      };

      const createdProfile = await UserProfile.create(profileData);
      
      // Log audit
      await logAudit("create_user", { email: newUserData.email, id: createdProfile.id }, {
        role: newUserData.role,
        department: newUserData.department,
        require_password_change: newUserData.require_password_change
      });

      setSuccess(`User profile created successfully. User can now be invited through the platform's user management.`);
      setShowCreateDialog(false);
      resetNewUserForm();
      loadData();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Failed to create user profile: " + err.message);
      console.error("Create user error:", err);
    }
  };

  const handleResetPassword = async () => {
    try {
      // Validate passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Validate password strength
      const passwordErrors = validatePassword(passwordData.newPassword);
      if (passwordErrors.length > 0) {
        setError(`Password must have: ${passwordErrors.join(", ")}`);
        return;
      }

      // Update user profile with new password
      if (selectedUser.profile_id) {
        await UserProfile.update(selectedUser.profile_id, {
          password_hash: `hash_${passwordData.newPassword}`, // Placeholder - real implementation would hash
          password_reset_required: passwordData.require_change_on_login,
          last_password_reset: new Date().toISOString(),
          password_reset_by: currentUser.email
        });

        // Log audit
        await logAudit("reset_password", selectedUser, {
          require_change_on_login: passwordData.require_change_on_login
        });

        setSuccess("Password reset successfully in user profile");
        setShowPasswordDialog(false);
        resetPasswordForm();
        loadData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Cannot reset password: User profile not found");
      }
    } catch (err) {
      setError("Failed to reset password: " + err.message);
      console.error("Reset password error:", err);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      
      // Update UserProfile if it exists
      if (userToUpdate.profile_id) {
        await UserProfile.update(userToUpdate.profile_id, {
          role: updates.role,
          department: updates.department,
          territory: updates.territory,
          phone: updates.phone,
          status: updates.status // Status might be updated via this dialog
        });
      } else {
        // Create new profile if it doesn't exist
        await UserProfile.create({
          user_email: userToUpdate.email,
          full_name: userToUpdate.full_name,
          role: updates.role || "sales_rep",
          department: updates.department || "",
          territory: updates.territory || "",
          phone: updates.phone || "",
          status: "active" // Default to active if creating a new profile this way
        });
      }
      
      // Log audit
      await logAudit("update_user", userToUpdate, updates);
      
      await loadData();
      setSuccess("User updated successfully");
      setShowUserDialog(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update user: " + err.message);
      console.error("Update user error:", err);
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate_user' : 'deactivate_user';
    
    try {
      if (user.profile_id) {
        await UserProfile.update(user.profile_id, { status: newStatus });
        await logAudit(action, user, { previous_status: user.status, new_status: newStatus });
        loadData();
        setSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Cannot update status: User profile not found");
      }
    } catch (err) {
      setError(`Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} user: ${err.message}`);
      console.error("Toggle status error:", err);
    }
  };

  const resetNewUserForm = () => {
    setNewUserData({
      full_name: "",
      email: "",
      role: "sales_rep",
      department: "",
      territory: "",
      phone: "",
      password: "",
      confirmPassword: "",
      require_password_change: true,
      status: "active"
    });
  };

  const resetPasswordForm = () => {
    setPasswordData({
      newPassword: "",
      confirmPassword: "",
      require_change_on_login: true
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: "bg-red-100 text-red-800 border-red-200",
      manager: "bg-blue-100 text-blue-800 border-blue-200",
      user: "bg-green-100 text-green-800 border-green-200"
    };
    return colors[role] || colors.user;
  };

  const getStatusBadgeColor = (status) => {
    if (status === 'active') {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (status === 'inactive') {
      return "bg-red-100 text-red-800 border-red-200";
    } else if (status === 'pending') {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const loadData = async () => {
    try {
      // Check for token before making API calls
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      // Try to get current user from cache first
      let currentUserData = null;
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          currentUserData = JSON.parse(cachedUser);
        } catch (e) {
          // Invalid cache, will fetch fresh
        }
      }

      const [userList, freshUserData, auditData, profileData] = await Promise.all([
        User.list(),
        User.me().catch(() => currentUserData), // Fallback to cached if API fails
        AuditLog.list("-created_date", 100),
        UserProfile.list()
      ]);

      // Use fresh user data if available, otherwise use cached
      if (freshUserData) {
        currentUserData = freshUserData;
        localStorage.setItem('user', JSON.stringify(freshUserData));
      }
      
      // Merge User data with UserProfile data
      const mergedUsers = userList.map(user => {
        const profile = profileData.find(p => p.user_email === user.email);
        return {
          ...user,
          ...profile,
          id: user.id, // Ensure we keep the original user ID from the User entity
          profile_id: profile?.id // Add profile_id to identify if a profile exists and its ID
        };
      });
      
      setUsers(mergedUsers);
      setUserProfiles(profileData);
      setCurrentUser(currentUserData);
      setAuditLogs(auditData);
    } catch (err) {
      setError("Failed to load data");
      console.error("Load data error:", err);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-2">
              Create user profiles and manage access locally.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAuditDialog(true)}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50"
            >
              <History className="w-4 h-4 mr-2" />
              Audit Log
            </Button>
            <Button
              onClick={() => {
                resetNewUserForm();
                setShowCreateDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User Profile
            </Button>
          </div>
        </div>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> This system manages user profiles locally. Users still need to be invited through the platform's user management system to access the application.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-green-200"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48 border-green-200">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales_rep">Sales Rep</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 border-green-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-green-100">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Profile Status</TableHead>
                  <TableHead>Login Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-green-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.full_name || user.email}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.password_reset_required && user.profile_id && ( // Only show if profile exists
                            <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">
                              Password Reset Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {(user.role?.charAt(0).toUpperCase() + user.role?.slice(1)) || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{user.department || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(user.status)}>
                        {user.status ? (user.status === 'active' ? 'Active Profile' : user.status === 'inactive' ? 'Inactive Profile' : 'Pending Profile') : 'No Profile'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge className={user.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                          {user.is_active ? 'Logged In' : 'Logged Out'}
                        </Badge>
                        <span className="text-sm text-gray-500 block">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDialog(true);
                          }}
                          className="border-green-200 hover:bg-green-50"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {user.profile_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              resetPasswordForm();
                              setShowPasswordDialog(true);
                            }}
                            className="border-blue-200 hover:bg-blue-50"
                          >
                            <Key className="w-3 h-3" />
                          </Button>
                        )}
                        {user.profile_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserStatus(user)}
                            className={user.status === 'active' 
                              ? "border-red-200 hover:bg-red-50 text-red-600"
                              : "border-green-200 hover:bg-green-50 text-green-600"
                            }
                          >
                            {user.status === 'active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newUserData.full_name}
                    onChange={(e) => setNewUserData({...newUserData, full_name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Role *</Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(value) => setNewUserData({...newUserData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Profile Status (Initial)</Label>
                  <Select
                    value={newUserData.status}
                    onValueChange={(value) => setNewUserData({...newUserData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Department *</Label>
                  <Select
                    value={newUserData.department}
                    onValueChange={(value) => setNewUserData({...newUserData, department: value})}
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
                <div>
                  <Label>Territory *</Label>
                  <Input
                    value={newUserData.territory}
                    onChange={(e) => setNewUserData({...newUserData, territory: e.target.value})}
                    placeholder="Sales territory"
                  />
                </div>
              </div>

              <div>
                <Label>Phone *</Label>
                <Input
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    placeholder="Enter password"
                  />
                  {newUserData.password && (
                    <div className="mt-1">
                      <span className={`text-sm ${getPasswordStrength(newUserData.password).color}`}>
                        {getPasswordStrength(newUserData.password).strength}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Confirm Password *</Label>
                  <Input
                    type="password"
                    value={newUserData.confirmPassword}
                    onChange={(e) => setNewUserData({...newUserData, confirmPassword: e.target.value})}
                    placeholder="Confirm password"
                  />
                  {newUserData.confirmPassword && (
                    <div className="mt-1">
                      <span className={`text-sm ${newUserData.password === newUserData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                        {newUserData.password === newUserData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require_password_change"
                  checked={newUserData.require_password_change}
                  onCheckedChange={(checked) => setNewUserData({...newUserData, require_password_change: checked})}
                />
                <Label htmlFor="require_password_change">Require password change on first login</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!newUserData.full_name || !newUserData.email || !newUserData.password || !newUserData.confirmPassword || !newUserData.department || !newUserData.territory || !newUserData.phone}
                >
                  Create User Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password for {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Password *</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
                {passwordData.newPassword && (
                  <div className="mt-1">
                    <span className={`text-sm ${getPasswordStrength(passwordData.newPassword).color}`}>
                      {getPasswordStrength(passwordData.newPassword).strength}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
                {passwordData.confirmPassword && (
                  <div className="mt-1">
                    <span className={`text-sm ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordData.newPassword === passwordData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require_change_on_login"
                  checked={passwordData.require_change_on_login}
                  onCheckedChange={(checked) => setPasswordData({...passwordData, require_change_on_login: checked})}
                />
                <Label htmlFor="require_change_on_login">Require password change on next login</Label>
              </div>

              {selectedUser?.last_password_reset && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Last reset: {new Date(selectedUser.last_password_reset).toLocaleString()}
                    {selectedUser.password_reset_by && (
                      <span> by {selectedUser.password_reset_by}</span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!passwordData.newPassword || !passwordData.confirmPassword}
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Edit Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User Permissions</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedUser.full_name || selectedUser.email}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={selectedUser.role}
                      onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select
                      value={selectedUser.department || ""}
                      onValueChange={(value) => setSelectedUser({...selectedUser, department: value})}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Territory</Label>
                    <Input
                      value={selectedUser.territory || ""}
                      onChange={(e) => setSelectedUser({...selectedUser, territory: e.target.value})}
                      placeholder="Sales territory"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={selectedUser.phone || ""}
                      onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                {selectedUser.profile_id && (
                  <div>
                    <Label>Profile Status</Label>
                    <Select
                      value={selectedUser.status || ""}
                      onValueChange={(value) => setSelectedUser({...selectedUser, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleUpdateUser(selectedUser.id, selectedUser)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Audit Log Dialog */}
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Management Audit Log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_date).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor_email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.target_email || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.details && Object.keys(log.details).length > 0 
                          ? JSON.stringify(log.details, null, 2).substring(0, 50) + (JSON.stringify(log.details, null, 2).length > 50 ? '...' : '')
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-gray-500">No audit logs found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
