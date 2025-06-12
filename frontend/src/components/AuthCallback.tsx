import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VStack, CircularProgress, Text, useToast, Box, Alert, AlertIcon } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuthStatus } = useAuth(); // Assuming checkAuthStatus will fetch and set user
    const toast = useToast();
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        const processAuth = async () => {
            try {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                console.log('🔍 AuthCallback: Starting auth process...', { isMobile });

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

                    // Add timeout for mobile networks
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for mobile

                    try {
                        // Verify the token with the backend
                        const response = await fetch(`${getBackendUrl()}/auth/verify-token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ token }),
                            signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error(`Token verification failed: ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('✅ AuthCallback: Token verified successfully:', result);

                        // If token verification succeeded, store user data temporarily with mobile safety
                        if (result.success && result.authenticated && result.user) {
                            console.log('🔍 AuthCallback: Storing user data temporarily');
                            try {
                                localStorage.setItem('light90_temp_user', JSON.stringify(result.user));
                                localStorage.setItem('light90_temp_auth', 'true');
                                localStorage.setItem('light90_jwt_token', token); // Store JWT token for API calls
                                console.log('✅ AuthCallback: JWT token stored for API calls');
                            } catch (storageError) {
                                console.error('🚨 AuthCallback: localStorage failed (mobile browser?):', storageError);
                                // Continue anyway, session might still work
                            }
                        }
                    } catch (fetchError) {
                        clearTimeout(timeoutId);
                        if (fetchError.name === 'AbortError') {
                            throw new Error('Token verification timed out. Please check your connection.');
                        }
                        throw fetchError;
                    }
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

                console.log('🔍 AuthCallback: Navigating to main app...');

                // Add small delay for mobile to ensure state updates
                if (isMobile) {
                    setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 100);
                } else {
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.error('🚨 Auth callback error:', error);
                const errorMessage = (error as Error)?.message || 'An error occurred during authentication. Please try again.';
                setError(errorMessage);

                toast({
                    title: 'Authentication Failed',
                    description: errorMessage,
                    status: 'error',
                    duration: 9000,
                    isClosable: true,
                    position: 'top-right'
                });

                console.log('🔍 AuthCallback: Error occurred, navigating to home...');

                // Add delay for mobile error handling
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 2000); // Give user time to read error
                } else {
                    navigate('/', { replace: true });
                }
            }
        };

        processAuth();
    }, [navigate, location, checkAuthStatus, toast]);

    // Show error state if there's an error
    if (error) {
        return (
            <VStack minH="80vh" justify="center" align="center" spacing={4} p={5}>
                <Alert status="error" maxW="md" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">Authentication Error</Text>
                        <Text fontSize="sm" mt={1}>{error}</Text>
                    </Box>
                </Alert>
                <Text color="neutral.500" textAlign="center">
                    Redirecting you back to the home page...
                </Text>
            </VStack>
        );
    }

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