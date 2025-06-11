import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VStack, CircularProgress, Text, useToast, Box } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuthStatus } = useAuth(); // Assuming checkAuthStatus will fetch and set user
    const toast = useToast();

    useEffect(() => {
        const processAuth = async () => {
            try {
                console.log('🔍 AuthCallback: Starting auth process...');

                // Check if we have a token from the OAuth callback
                const urlParams = new URLSearchParams(location.search);
                const token = urlParams.get('token');

                if (token) {
                    console.log('🔍 AuthCallback: Found token, verifying with backend...');

                    // Auto-detect backend URL (same logic as useAuth)
                    const getBackendUrl = () => {
                        if (window.location.hostname === 'light90.com') {
                            return 'https://light90-backend-production.up.railway.app';
                        }
                        return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                    };

                    // Verify the token with the backend
                    const response = await fetch(`${getBackendUrl()}/auth/verify-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ token })
                    });

                    if (!response.ok) {
                        throw new Error(`Token verification failed: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('✅ AuthCallback: Token verified successfully:', result);
                }

                // Now check auth status to update frontend state
                console.log('🔍 AuthCallback: Checking auth status...');
                await checkAuthStatus();

                console.log('🔍 AuthCallback: Auth process completed');

                toast({
                    title: 'Authentication Successful',
                    description: "You're now logged in.",
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right'
                });

                console.log('🔍 AuthCallback: Navigating to dashboard...');
                navigate('/dashboard', { replace: true });
            } catch (error) {
                console.error('🚨 Auth callback error:', error);
                toast({
                    title: 'Authentication Failed',
                    description: (error as Error)?.message || 'An error occurred during authentication. Please try again.',
                    status: 'error',
                    duration: 9000,
                    isClosable: true,
                    position: 'top-right'
                });
                console.log('🔍 AuthCallback: Error occurred, navigating to home...');
                navigate('/', { replace: true }); // Redirect to home on error
            }
        };

        processAuth();
    }, [navigate, location, checkAuthStatus, toast]);

    return (
        <VStack minH="80vh" justify="center" align="center" spacing={4} p={5}>
            <CircularProgress isIndeterminate color="brand.500" size="lg" />
            <Text fontSize="xl" fontWeight="medium" color="neutral.700">
                Processing your authentication...
            </Text>
            <Text color="neutral.500">
                Please wait while we securely log you in.
            </Text>
        </VStack>
    );
};

export default AuthCallback;