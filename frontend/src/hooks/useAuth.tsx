import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import axios from 'axios';

interface UserProfile {
    // Define structure based on what your /auth/status or WHOOP profile returns
    id?: string;
    displayName?: string;
    email?: string;
    firstName?: string;
    // Add other relevant fields from user.profile
}

interface User {
    accessToken?: string;
    refreshToken?: string;
    tokenParams?: any;
    profile: UserProfile;
    // any other top-level user fields from your backend
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
    login: () => void;
    logout: () => Promise<void>;
    checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto-detect backend URL based on environment
const getBackendUrl = () => {
    // Debug logging
    console.log('Frontend environment detection:', {
        hostname: window.location.hostname,
        REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL
    });

    // Force production URL when on production domain
    if (window.location.hostname === 'light90.com') {
        console.log('🚀 light90.com detected (v2), forcing Railway backend at', new Date().toISOString());
        return 'https://light90-backend-production.up.railway.app';
    }

    // If explicitly set, use that
    if (process.env.REACT_APP_BACKEND_URL) {
        console.log('Using explicit REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
        return process.env.REACT_APP_BACKEND_URL;
    }

    // In production, use the Railway backend URL
    if (window.location.hostname !== 'localhost') {
        console.log('Production detected, using Railway backend');
        return 'https://light90-backend-production.up.railway.app';
    }

    // Default to localhost for development
    console.log('Development detected, using localhost backend');
    return 'http://localhost:5000';
};

const backendUrl = getBackendUrl();

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const checkAuthStatus = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Mobile debugging
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('🔍 useAuth: Starting auth check', { isMobile, timestamp: new Date().toISOString() });

        try {
            console.log('🔍 useAuth: Checking auth status at:', `${backendUrl}/auth/status`);

            // Add timeout for mobile networks
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            // Configure axios to send cookies with requests
            const response = await axios.get<{ authenticated: boolean; user: User | null }>(`${backendUrl}/auth/status`, {
                withCredentials: true,
                signal: controller.signal,
                timeout: 10000
            });

            clearTimeout(timeoutId);

            console.log('🔍 useAuth: Auth status response:', {
                status: response.status,
                authenticated: response.data.authenticated,
                hasUser: !!response.data.user,
                userId: response.data.user?.profile?.id || 'N/A'
            });

            if (response.data.authenticated && response.data.user) {
                console.log('✅ useAuth: User authenticated, setting user state');
                setUser(response.data.user);
                // Clear temporary data if session is working
                try {
                    localStorage.removeItem('light90_temp_user');
                    localStorage.removeItem('light90_temp_auth');
                } catch (storageError) {
                    console.warn('⚠️ useAuth: localStorage cleanup failed (mobile browser?):', storageError);
                }
            } else {
                console.log('❌ useAuth: User not authenticated via session, checking temporary data...');

                // Mobile-safe localStorage access
                let tempAuth: string | null = null;
                let tempUser: string | null = null;

                try {
                    tempAuth = localStorage.getItem('light90_temp_auth');
                    tempUser = localStorage.getItem('light90_temp_user');
                } catch (storageError) {
                    console.error('🚨 useAuth: localStorage access failed (mobile browser?):', storageError);
                    // On mobile Safari, localStorage might be disabled in private mode
                    setUser(null);
                    return;
                }

                if (tempAuth === 'true' && tempUser) {
                    console.log('✅ useAuth: Found temporary auth data, using it');
                    try {
                        const userData = JSON.parse(tempUser);
                        setUser(userData);
                        // Keep temp data for now, will be cleared on next successful session check
                    } catch (e) {
                        console.error('❌ useAuth: Failed to parse temporary user data:', e);
                        try {
                            localStorage.removeItem('light90_temp_user');
                            localStorage.removeItem('light90_temp_auth');
                        } catch (cleanupError) {
                            console.warn('⚠️ useAuth: localStorage cleanup failed:', cleanupError);
                        }
                        setUser(null);
                    }
                } else {
                    console.log('❌ useAuth: No temporary auth data, user not authenticated');
                    setUser(null);
                }
            }
        } catch (err) {
            console.error('🚨 useAuth: Auth check failed:', err);

            // Handle different types of errors
            let errorMessage = 'Failed to fetch authentication status';

            if (err.name === 'AbortError') {
                errorMessage = 'Authentication check timed out. Please check your connection.';
            } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (err.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            }

            const newError = new Error(errorMessage);
            setError(newError);

            // On mobile, try to fall back to localStorage if network fails
            if (isMobile) {
                console.log('📱 useAuth: Mobile network error, trying localStorage fallback...');
                try {
                    const tempAuth = localStorage.getItem('light90_temp_auth');
                    const tempUser = localStorage.getItem('light90_temp_user');

                    if (tempAuth === 'true' && tempUser) {
                        console.log('✅ useAuth: Using localStorage fallback on mobile');
                        const userData = JSON.parse(tempUser);
                        setUser(userData);
                        setError(null); // Clear error if we have fallback data
                        return;
                    }
                } catch (fallbackError) {
                    console.error('🚨 useAuth: Mobile localStorage fallback failed:', fallbackError);
                }
            }

            setUser(null); // Clear user on auth check error
            throw newError; // Re-throw so AuthCallback can catch it
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const login = () => {
        // Redirect to WHOOP OAuth URL
        const oauthUrl = `${backendUrl}/auth/whoop`;
        console.log('🔍 useAuth: Redirecting to OAuth URL:', oauthUrl);
        window.location.href = oauthUrl;
    };

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await axios.get(`${backendUrl}/auth/logout`, { withCredentials: true });
            setUser(null);
            setError(null);
        } catch (err) {
            console.error('Logout failed:', err);
            const newError = err instanceof Error ? err : new Error('Logout failed');
            setError(newError);
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                login,
                logout,
                checkAuthStatus,
            }
            }
        >
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default useAuth;