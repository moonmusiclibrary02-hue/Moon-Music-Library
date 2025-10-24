// src/apiClient.js or wherever your apiClient is configured

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'YOUR_BACKEND_URL_HERE' // Make sure this is set
});

// --- THIS IS THE CRITICAL ADDITION ---
// Add a response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      console.error("Authentication Error (401): Token is invalid or expired. Logging out.");
      
      // Remove the expired token
      localStorage.removeItem('token');
      
      // Redirect to the login page
      // We use window.location.href to force a full page reload, clearing all state.
      window.location.href = '/login';
    }
    
    // Return a rejected promise to allow individual ".catch()" blocks to handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;