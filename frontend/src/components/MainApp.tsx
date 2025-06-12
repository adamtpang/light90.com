import React from 'react';
import { Box, Text, VStack, Spinner, Alert, AlertIcon, Button } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';
import LandingPage from './LandingPage.tsx';
import Dashboard from './Dashboard.tsx';

const MainApp: React.FC = () => {
    const { user, loading, error } = useAuth();
    const [loadingTimeout, setLoadingTimeout] = React.useState(false);
    const [forceShowContent, setForceShowContent] = React.useState(false);

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

    // Loading timeout mechanism - if loading takes too long, show fallback
    React.useEffect(() => {
        if (loading) {
            const timeout = setTimeout(() => {
                console.log('⏰ MainApp: Loading timeout reached, showing fallback');
                setLoadingTimeout(true);
            }, 8000); // 8 second timeout

            return () => clearTimeout(timeout);
        } else {
            setLoadingTimeout(false);
        }
    }, [loading]);

    // Error boundary fallback
    if (error && !forceShowContent) {
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
                    <Button
                        colorScheme="blue"
                        onClick={() => setForceShowContent(true)}
                        size="sm"
                    >
                        Continue Anyway
                    </Button>
                    <Text fontSize="sm" color="gray.500">
                        Try refreshing the page or check your connection
                    </Text>
                </VStack>
            </Box>
        );
    }

    // Loading timeout fallback - show content anyway
    if (loadingTimeout && !forceShowContent) {
        console.log('⏰ MainApp: Showing loading timeout fallback');
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack spacing={4} maxW="md" textAlign="center">
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Taking longer than expected</Text>
                            <Text fontSize="sm" mt={1}>
                                The app is taking a while to load. This might be due to a slow connection.
                            </Text>
                        </Box>
                    </Alert>
                    <VStack spacing={2}>
                        <Button
                            colorScheme="blue"
                            onClick={() => setForceShowContent(true)}
                            size="sm"
                        >
                            Continue to App
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            size="sm"
                        >
                            Refresh Page
                        </Button>
                    </VStack>
                </VStack>
            </Box>
        );
    }

    // Enhanced loading state with timeout protection
    if (loading && !forceShowContent && !loadingTimeout) {
        console.log('⏳ MainApp: Loading state active');
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack spacing={4}>
                    <Spinner size="xl" color="brand.500" thickness="4px" />
                    <Text color="gray.600">Loading your dashboard...</Text>
                    <Text fontSize="sm" color="gray.500">
                        This usually takes just a few seconds
                    </Text>
                </VStack>
            </Box>
        );
    }

    // If user is logged in, show dashboard with error boundary
    if (user || forceShowContent) {
        console.log('✅ MainApp: Showing dashboard for user:', user?.profile?.id || 'forced');
        try {
            return <Dashboard />;
        } catch (dashboardError) {
            console.error('🚨 MainApp: Dashboard rendering error:', dashboardError);
            return (
                <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                    <VStack spacing={4}>
                        <Alert status="error" maxW="md">
                            <AlertIcon />
                            <Box>
                                <Text fontWeight="bold">Dashboard Error</Text>
                                <Text fontSize="sm" mt={1}>
                                    Unable to load your dashboard. Please try refreshing.
                                </Text>
                            </Box>
                        </Alert>
                        <Button onClick={() => window.location.reload()} size="sm">
                            Refresh Page
                        </Button>
                    </VStack>
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