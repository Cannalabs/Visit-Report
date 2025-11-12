import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Hardcoded bootstrap admin user (frontend only, for initial access)
      // This allows accessing the admin panel in production to create real users
      // Note: API calls that require authentication may fail with this user
      // since it doesn't have a valid backend token. Use this to access the UI,
      // then create a real admin user through the backend (DB script, etc.)
      // and use that real admin to create more users through the UI.
      const HARDCODED_ADMIN_EMAIL = "admin@canna.com";
      const HARDCODED_ADMIN_PASSWORD = "admin123";
      
      if (email.toLowerCase().trim() === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASSWORD) {
        // Create mock admin user object
        const hardcodedUser = {
          id: 0,
          email: HARDCODED_ADMIN_EMAIL,
          name: "Admin User",
          full_name: "Admin User",
          role: "admin",
          avatar_url: null
        };
        
        // Store user info
        localStorage.setItem('user', JSON.stringify(hardcodedUser));
        
        // Create a dummy token (not used for API calls, but needed for ProtectedRoute)
        // We'll need to handle API calls differently for this user
        const dummyToken = "hardcoded_admin_token_" + Date.now();
        localStorage.setItem('access_token', dummyToken);
        localStorage.setItem('is_hardcoded_admin', 'true');
        
        // Navigate to dashboard
        navigate("/Dashboard", { replace: true });
        return;
      }
      
      // Regular backend authentication for all other users
      const user = await User.signIn({ email, password });
      
      // Clear hardcoded admin flag if using real auth
      localStorage.removeItem('is_hardcoded_admin');
      
      // User info is already stored in signIn
      // Navigate to dashboard after successful login
      if (user) {
        navigate("/Dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl font-bold text-green-600">CANNA</div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

