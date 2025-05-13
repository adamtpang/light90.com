import { useState, useEffect, useCallback } from 'react';
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

interface AuthState {
    user: User | null;
    loading: boolean;
    error: Error | null;
}

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
        error: null,
    });

    const checkAuthStatus = useCallback(async () => {
        setAuthState(prevState => ({ ...prevState, loading: true, error: null }));
        try {
            // Configure axios to send cookies with requests
            const response = await axios.get<{ authenticated: boolean; user: User | null }>(`${backendUrl}/auth/status`, { withCredentials: true });
            if (response.data.authenticated && response.data.user) {
                setAuthState({ user: response.data.user, loading: false, error: null });
            } else {
                setAuthState({ user: null, loading: false, error: null });
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            const error = err instanceof Error ? err : new Error('Failed to fetch authentication status');
            setAuthState({ user: null, loading: false, error });
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
        setAuthState(prevState => ({ ...prevState, loading: true }));
        try {
            await axios.get(`${backendUrl}/auth/logout`, { withCredentials: true });
            setAuthState({ user: null, loading: false, error: null });
        } catch (err) {
            console.error('Logout failed:', err);
            const error = err instanceof Error ? err : new Error('Logout failed');
            setAuthState(prevState => ({ ...prevState, loading: false, error }));
        }
    }, []);

    return { ...authState, login, logout, checkAuthStatus };
};

export default useAuth;