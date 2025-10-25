// src/apiClient.js

import axios from 'axios';

// 1. Define the base URL for your backend API
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'https://music-backend-service-175236630501.us-central1.run.app/api';

// 2. Create the single, central axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 3. Add the interceptor to handle 401 errors (session expired)
apiClient.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  (error) => {
    // If the server responded with an error
    if (error.response && error.response.status === 401) {
      // And the error is specifically a 401 Unauthorized
      console.error("SESSION EXPIRED (401). Forcing logout.");
      
      // Remove the bad token and redirect to the auth page
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    
    // For all other errors, let the component's .catch() handle it
    return Promise.reject(error);
  }
);

// 4. Export the single, configured instance for the rest of your app to use
export default apiClient;