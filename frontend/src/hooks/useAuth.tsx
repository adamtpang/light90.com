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

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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
            // Configure axios to send cookies with requests
            const response = await axios.get<{ authenticated: boolean; user: User | null }>(`${backendUrl}/auth/status`, { withCredentials: true });
            if (response.data.authenticated && response.data.user) {
                setUser(response.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            const newError = err instanceof Error ? err : new Error('Failed to fetch authentication status');
            setError(newError);
            setUser(null); // Clear user on auth check error
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
            value= {{
        user,
            loading,
            error,
            login,
            logout,
            checkAuthStatus,
            }
}
        >
    { children }
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