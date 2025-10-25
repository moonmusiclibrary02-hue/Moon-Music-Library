import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { User, Lock, Mail, Phone, Globe, Save } from 'lucide-react';

const ManagerProfile = ({ apiClient }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    username: '',
    phone: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/profile');
      setProfile(response.data);
      setProfileForm({
        username: response.data.username || '',
        phone: response.data.manager_details?.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      if (profileForm.username) formData.append('username', profileForm.username);
      if (profileForm.phone) formData.append('phone', profileForm.phone);

      await apiClient.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('old_password', passwordForm.oldPassword);
      formData.append('new_password', passwordForm.newPassword);

      await apiClient.put('/profile/password', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Password updated successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      const message = error.response?.data?.detail || 'Failed to update password';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto w-8 h-8 border-orange-500"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center space-y-4 fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Manager Profile</h1>
        <p className="text-lg text-gray-400">
          Manage your account information and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Profile Information
          </TabsTrigger>
          <TabsTrigger 
            value="password" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Change Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile && (
                <div className="space-y-6">
                  {/* Read-only Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/30 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-orange-500" />
                        <span className="text-gray-300 font-medium">Email:</span>
                        <span className="text-white">{profile.email}</span>
                      </div>
                      
                      {profile.manager_details && (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-orange-500" />
                          <span className="text-gray-300 font-medium">Language:</span>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(profile.manager_details.assigned_language) ? (
                              profile.manager_details.assigned_language.map((lang, index) => (
                                <Badge key={index} className="bg-orange-500/20 text-orange-400">
                                  {lang}
                                </Badge>
                              ))
                            ) : (
                              <Badge className="bg-orange-500/20 text-orange-400">
                                {profile.manager_details.assigned_language}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-orange-500" />
                        <span className="text-gray-300 font-medium">Account Type:</span>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {profile.user_type === 'manager' ? 'Manager' : 'Admin'}
                        </Badge>
                      </div>
                      
                      {profile.manager_details && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-300 font-medium">Status:</span>
                          <Badge className={profile.manager_details.is_active ? 
                            "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                            {profile.manager_details.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editable Form */}
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-username" className="text-gray-300">Full Name</Label>
                        <Input
                          id="profile-username"
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                          placeholder="Enter your full name"
                          className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="profile-phone" className="text-gray-300">Mobile Number</Label>
                        <Input
                          id="profile-phone"
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="Enter your mobile number"
                          className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Update Profile
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-gray-300">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    required
                    placeholder="Enter your current password"
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    placeholder="Enter your new password"
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-300">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    placeholder="Confirm your new password"
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerProfile;