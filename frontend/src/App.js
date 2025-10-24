import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import axios from 'axios';
import apiClient from './apiClient';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import UploadTrack from './components/UploadTrack';
import BulkUpload from './components/BulkUpload';
import TrackDetails from './components/TrackDetails';
import Navbar from './components/Navbar';
import ManagerProfile from './components/ManagerProfile';
import AdminSettings from './components/AdminSettings';
import './App.css';

// const BACKEND_URL = window.BACKEND_URL || 'http://localhost:8000';
// const API = `${BACKEND_URL}/api`;

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create axios instance with interceptor for auth
const apiClient = axios.create({
  baseURL: API,
});

// --- THIS IS THE NEW PART THAT YOU NEED TO ADD ---
// It "intercepts" all responses from the server.
apiClient.interceptors.response.use(
  (response) => {
    // If the response is successful (e.g., status 200), just return it.
    return response;
  },
  (error) => {
    // If the server responds with an error...
    if (error.response && error.response.status === 401) {
      // ...and the error is specifically a 401 Unauthorized...
      console.error("SESSION EXPIRED (401). Forcing logout.");
      
      // ...then remove the bad token and redirect to the login page.
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // For all other errors, just let the component's .catch() handle it.
    return Promise.reject(error);
  }
);
// --- END OF THE NEW PART ---

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup axios interceptor
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Response interceptor for handling auth errors
    apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          setUser(null);
          toast.error('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );
  }, []);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          console.error('Auth check failed:', error);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(user);
      toast.success('Successfully logged in!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      await apiClient.post('/auth/register', { username, email, password });
      toast.success('Registration successful! Please log in.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {user && <Navbar user={user} onLogout={logout} />}
        
        <Routes>
          <Route 
            path="/auth" 
            element={
              user ? <Navigate to="/" replace /> : 
              <AuthPage onLogin={login} onRegister={register} />
            } 
          />
          <Route 
            path="/" 
            element={
              user ? <Dashboard apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/upload" 
            element={
              user ? <UploadTrack apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/bulk-upload" 
            element={
              user ? <BulkUpload apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/track/:id" 
            element={
              user ? <TrackDetails apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              user ? <ManagerProfile apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              user && user.user_type === 'admin' ? <AdminSettings apiClient={apiClient} /> : 
              <Navigate to="/auth" replace />
            } 
          />
        </Routes>
        
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;
