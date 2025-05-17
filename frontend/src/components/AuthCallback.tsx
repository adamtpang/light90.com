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
                // The backend /auth/whoop/callback handles cookie setting.
                // We just need to re-check auth status to update the frontend state.
                await checkAuthStatus();

                toast({
                    title: 'Authentication Successful',
                    description: "You're now logged in.",
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right'
                });
                navigate('/dashboard', { replace: true });
            } catch (error) {
                console.error('Auth callback error:', error);
                toast({
                    title: 'Authentication Failed',
                    description: (error as Error)?.message || 'An error occurred during authentication. Please try again.',
                    status: 'error',
                    duration: 9000,
                    isClosable: true,
                    position: 'top-right'
                });
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