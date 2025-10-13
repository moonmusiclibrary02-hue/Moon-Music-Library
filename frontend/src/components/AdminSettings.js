import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Settings,
  Users,
  Key,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Mail
} from 'lucide-react';

const AdminSettings = ({ apiClient }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    notifyUser: true,
    showPassword: false
  });
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    user: null,
    loading: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const openPasswordModal = (user) => {
    setPasswordModal({
      isOpen: true,
      user: user,
      newPassword: '',
      confirmPassword: '',
      notifyUser: true,
      showPassword: false
    });
  };

  const closePasswordModal = () => {
    setPasswordModal({
      isOpen: false,
      user: null,
      newPassword: '',
      confirmPassword: '',
      notifyUser: true,
      showPassword: false
    });
  };

  const handlePasswordUpdate = async () => {
    if (!passwordModal.newPassword || !passwordModal.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordModal.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await apiClient.put(`/admin/users/${passwordModal.user.id}/password`, {
        user_id: passwordModal.user.id,
        new_password: passwordModal.newPassword,
        notify_user: passwordModal.notifyUser
      });

      toast.success(`Password updated for ${passwordModal.user.username}${passwordModal.notifyUser ? ' (notification sent)' : ''}`);
      closePasswordModal();
    } catch (error) {
      console.error('Error updating password:', error);
      const message = error.response?.data?.detail || 'Failed to update password';
      toast.error(message);
    }
  };

  const handlePasswordReset = async (user) => {
    setResetModal({ isOpen: true, user: user, loading: false });
  };

  const confirmPasswordReset = async () => {
    try {
      setResetModal(prev => ({ ...prev, loading: true }));
      const response = await apiClient.post(`/admin/users/${resetModal.user.id}/reset-password`);
      
      toast.success(`Password reset for ${resetModal.user.username}. New password: ${response.data.new_password}`);
      setResetModal({ isOpen: false, user: null, loading: false });
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = error.response?.data?.detail || 'Failed to reset password';
      toast.error(message);
      setResetModal(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordModal(prev => ({ 
      ...prev, 
      newPassword: password,
      confirmPassword: password 
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 fade-in">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white p-2 -ml-2"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Admin Settings</h1>
          <p className="text-gray-400 mt-2">Manage user passwords and system settings</p>
        </div>
      </div>

      {/* Password Management */}
      <Card className="glass border-gray-700 slide-in">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Password Management</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage user passwords, reset credentials, and handle account security
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-400">Loading users...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Created</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-gray-600">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={`${
                          user.user_type === 'admin' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {user.user_type === 'admin' ? 'Administrator' : 'Manager'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPasswordModal(user)}
                            className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                            data-testid={`update-password-${user.id}`}
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePasswordReset(user)}
                            className="border-orange-600 text-orange-400 hover:text-orange-300 hover:border-orange-500"
                            data-testid={`reset-password-${user.id}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Password Modal */}
      <Dialog open={passwordModal.isOpen} onOpenChange={closePasswordModal}>
        <DialogContent className="glass border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Key className="h-5 w-5 text-orange-500" />
              <span>Update Password</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update password for {passwordModal.user?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">New Password</Label>
              <div className="relative">
                <Input
                  type={passwordModal.showPassword ? "text" : "password"}
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="bg-gray-800/50 border-gray-600 text-white pr-20"
                  placeholder="Enter new password"
                  data-testid="new-password-input"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPasswordModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    {passwordModal.showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={generatePassword}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    title="Generate password"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Confirm Password</Label>
              <Input
                type={passwordModal.showPassword ? "text" : "password"}
                value={passwordModal.confirmPassword}
                onChange={(e) => setPasswordModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-gray-800/50 border-gray-600 text-white"
                placeholder="Confirm new password"
                data-testid="confirm-password-input"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={passwordModal.notifyUser}
                onCheckedChange={(checked) => setPasswordModal(prev => ({ ...prev, notifyUser: checked }))}
                data-testid="notify-user-switch"
              />
              <Label className="text-gray-300 flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Send notification to user</span>
              </Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={closePasswordModal}
                className="border-gray-600 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordUpdate}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                data-testid="update-password-confirm-btn"
              >
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetModal.isOpen} onOpenChange={() => !resetModal.loading && setResetModal({ isOpen: false, user: null, loading: false })}>
        <DialogContent className="glass border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Reset Password</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will generate a new random password for {resetModal.user?.username} and send it via notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="text-sm text-red-300">
                  <p className="font-medium mb-2">Security Notice:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• A new random password will be generated</li>
                    <li>• The user will be notified via email/system logs</li>
                    <li>• The old password will be immediately invalidated</li>
                    <li>• User should change the password after login</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setResetModal({ isOpen: false, user: null, loading: false })}
                disabled={resetModal.loading}
                className="border-gray-600 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmPasswordReset}
                disabled={resetModal.loading}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                data-testid="reset-password-confirm-btn"
              >
                {resetModal.loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;