import axios from 'axios';

// Create a navigation callback holder
let navigationCallback = null;

// Function to set the navigation callback
export const setNavigationCallback = (callback) => {
    navigationCallback = callback;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const userToken = localStorage.getItem('userToken');
        const captainToken = localStorage.getItem('captainToken');
        // Prioritize user token if available, otherwise use captain token
        const token = userToken || captainToken;
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('API call unauthorized (401). Clearing tokens and redirecting to login.');
            localStorage.removeItem('userToken');
            localStorage.removeItem('captainToken');
            // Use navigation callback if available, otherwise direct window redirect
            if (navigationCallback) {
                 // Determine if captain or user login is needed based on which token was present
                 const prevToken = localStorage.getItem('userToken') || localStorage.getItem('captainToken');
                 const loginPath = prevToken === localStorage.getItem('captainToken') ? '/captain-login' : '/login';
                 navigationCallback(loginPath);
            } else {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api; 