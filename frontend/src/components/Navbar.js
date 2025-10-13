import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Music, Home, Plus, LogOut, User, Settings } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            data-testid="home-link"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
              <Music className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Moon Music</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
              data-testid="dashboard-link"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/upload"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive('/upload') 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
              data-testid="upload-link"
            >
              <Plus className="h-4 w-4" />
              <span>Add Track</span>
            </Link>

            {/* Admin Settings Link - Only for Admins */}
            {user?.user_type === 'admin' && (
              <Link
                to="/admin/settings"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/admin/settings') 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
                data-testid="admin-settings-link"
              >
                <Settings className="h-4 w-4" />
                <span>Admin Settings</span>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-2 text-gray-300">
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.username}</span>
            </div>
            
            {/* Mobile Navigation */}
            <div className="flex md:hidden space-x-2">
              <Link
                to="/"
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/') 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="mobile-dashboard-link"
              >
                <Home className="h-5 w-5" />
              </Link>
              
              <Link
                to="/upload"
                className={`p-2 rounded-lg transition-colors ${
                  isActive('/upload') 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="mobile-upload-link"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>

            {/* Logout Button */}
            <Button
              onClick={onLogout}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-200"
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;