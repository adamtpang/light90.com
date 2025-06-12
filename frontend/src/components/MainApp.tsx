import React from 'react';
import { Box, Text, VStack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';
import LandingPage from './LandingPage.tsx';
import Dashboard from './Dashboard.tsx';

const MainApp: React.FC = () => {
    const { user, loading, error } = useAuth();

    // Enhanced mobile debugging
    React.useEffect(() => {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            hasUser: !!user,
            loading,
            hasError: !!error,
            userId: user?.profile?.id || 'N/A',
            profileRecords: user?.profile?.records?.length || 0,
            localStorage: {
                tempAuth: localStorage.getItem('light90_temp_auth'),
                tempUser: !!localStorage.getItem('light90_temp_user')
            }
        };

        console.log('📱 MainApp Mobile Debug:', debugInfo);

        // Also log to a global variable for mobile debugging
        (window as any).light90Debug = debugInfo;
    }, [user, loading, error]);

    // Error boundary fallback
    if (error) {
        console.error('🚨 MainApp: Error state detected:', error);
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack spacing={4} maxW="md" textAlign="center">
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Something went wrong</Text>
                            <Text fontSize="sm" mt={1}>
                                {error.message || 'An unexpected error occurred'}
                            </Text>
                        </Box>
                    </Alert>
                    <Text fontSize="sm" color="gray.500">
                        Try refreshing the page or check your connection
                    </Text>
                </VStack>
            </Box>
        );
    }

    // Enhanced loading state with timeout protection
    if (loading) {
        console.log('⏳ MainApp: Loading state active');
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack spacing={4}>
                    <Spinner size="xl" color="brand.500" thickness="4px" />
                    <Text color="gray.600">Loading your dashboard...</Text>
                </VStack>
            </Box>
        );
    }

    // If user is logged in, show dashboard with error boundary
    if (user) {
        console.log('✅ MainApp: Showing dashboard for user:', user.profile?.id || 'unknown');
        try {
            return <Dashboard />;
        } catch (dashboardError) {
            console.error('🚨 MainApp: Dashboard rendering error:', dashboardError);
            return (
                <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                    <Alert status="error" maxW="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Dashboard Error</Text>
                            <Text fontSize="sm" mt={1}>
                                Unable to load your dashboard. Please try refreshing.
                            </Text>
                        </Box>
                    </Alert>
                </Box>
            );
        }
    }

    // If user is not logged in, show landing page with error boundary
    console.log('🏠 MainApp: No user, showing landing page');
    try {
        return <LandingPage />;
    } catch (landingError) {
        console.error('🚨 MainApp: Landing page rendering error:', landingError);
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <Alert status="error" maxW="md">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">Loading Error</Text>
                        <Text fontSize="sm" mt={1}>
                            Unable to load the page. Please refresh and try again.
                        </Text>
                    </Box>
                </Alert>
            </Box>
        );
    }
};

export default MainApp;