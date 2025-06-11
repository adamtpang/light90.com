import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
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
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const checkAuthStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🔍 useAuth: Checking auth status at:', `${backendUrl}/auth/status`);

            // Configure axios to send cookies with requests
            const response = await axios.get<{ authenticated: boolean; user: User | null }>(`${backendUrl}/auth/status`, { withCredentials: true });

            console.log('🔍 useAuth: Auth status response:', {
                status: response.status,
                authenticated: response.data.authenticated,
                hasUser: !!response.data.user,
                userId: response.data.user?.profile?.id || 'N/A'
            });

            if (response.data.authenticated && response.data.user) {
                console.log('✅ useAuth: User authenticated, setting user state');
                setUser(response.data.user);
            } else {
                console.log('❌ useAuth: User not authenticated, clearing user state');
                setUser(null);
            }
        } catch (err) {
            console.error('🚨 useAuth: Auth check failed:', err);
            const newError = err instanceof Error ? err : new Error('Failed to fetch authentication status');
            setError(newError);
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
        window.location.href = `${backendUrl}/auth/whoop`;
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