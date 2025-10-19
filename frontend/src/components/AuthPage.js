import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { Music, Headphones, Upload, ArrowLeft } from 'lucide-react';

const AuthPage = ({ onLogin, onRegister }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '' });
  const [resetPasswordForm, setResetPasswordForm] = useState({ token: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await onLogin(loginForm.email, loginForm.password);
    setLoading(false);
    if (result.success) {
      window.location.href = '/';
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await onRegister(registerForm.username, registerForm.email, registerForm.password);
    if (result.success) {
      setRegisterForm({ username: '', email: '', password: '' });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordForm.email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        if (data.reset_token) {
          setResetToken(data.reset_token);
          setShowResetPassword(true);
          setShowForgotPassword(false);
          toast.info(data.instructions);
        }
      } else {
        toast.error(data.detail || 'Failed to process request');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetPasswordForm.token || resetToken,
          new_password: resetPasswordForm.new_password,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        setShowResetPassword(false);
        setShowForgotPassword(false);
        setResetPasswordForm({ token: '', new_password: '', confirm_password: '' });
        setResetToken('');
      } else {
        toast.error(data.detail || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 fade-in">
          <div className="flex justify-center items-center space-x-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-full">
              <Music className="h-8 w-8 text-white music-note" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">Moon Music</h1>
          </div>
          <p className="text-lg text-gray-300">
            Your Ultimate Music Production Inventory
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Headphones className="h-4 w-4" />
              <span>Track Metadata</span>
            </div>
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>File Management</span>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="glass border-gray-700 shadow-2xl slide-in">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                data-testid="login-tab"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                data-testid="register-tab"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <CardTitle className="text-white">Welcome Back</CardTitle>
                <CardDescription className="text-gray-400">
                  Sign in to access your music inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover-glow"
                    disabled={loading}
                    data-testid="login-submit-btn"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-orange-400 hover:text-orange-300 text-sm"
                      data-testid="forgot-password-link"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="register">
              <CardHeader>
                <CardTitle className="text-white">Create Account</CardTitle>
                <CardDescription className="text-gray-400">
                  Join the music production community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-gray-300">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Choose a username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="register-username-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-gray-300">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="register-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-gray-300">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="register-password-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover-glow"
                    disabled={loading}
                    data-testid="register-submit-btn"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="glass border-gray-700 shadow-2xl w-full max-w-md">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-gray-400 hover:text-white p-1 -ml-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-white">Forgot Password</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Enter your email address and we'll send you a password reset token
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-gray-300">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotPasswordForm.email}
                      onChange={(e) => setForgotPasswordForm({ email: e.target.value })}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="forgot-email-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    disabled={loading}
                    data-testid="forgot-password-submit-btn"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Send Reset Token'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="glass border-gray-700 shadow-2xl w-full max-w-md">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetPassword(false)}
                    className="text-gray-400 hover:text-white p-1 -ml-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-white">Reset Password</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Enter your reset token and new password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {!resetToken && (
                    <div className="space-y-2">
                      <Label htmlFor="reset-token" className="text-gray-300">Reset Token</Label>
                      <Input
                        id="reset-token"
                        type="text"
                        placeholder="Enter the reset token from your email"
                        value={resetPasswordForm.token}
                        onChange={(e) => setResetPasswordForm(prev => ({ ...prev, token: e.target.value }))}
                        required={!resetToken}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                        data-testid="reset-token-input"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter your new password"
                      value={resetPasswordForm.new_password}
                      onChange={(e) => setResetPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="new-password-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-gray-300">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your new password"
                      value={resetPasswordForm.confirm_password}
                      onChange={(e) => setResetPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      required
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                      data-testid="confirm-password-input"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    disabled={loading}
                    data-testid="reset-password-submit-btn"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Resetting...</span>
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Preview */}
        <div className="glass rounded-lg p-6 fade-in">
          <h3 className="text-lg font-semibold text-white mb-4">What You Can Do</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-start space-x-2">
              <div className="bg-orange-500/20 p-1 rounded">
                <Upload className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Upload & Store</p>
                <p className="text-gray-400">MP3 files and lyrics up to 500MB</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-orange-500/20 p-1 rounded">
                <Music className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Rich Metadata</p>
                <p className="text-gray-400">Track composer, singer, tempo & more</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;