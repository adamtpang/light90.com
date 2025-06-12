import React from 'react';
import { Box, Text, VStack, Spinner, Alert, AlertIcon, Button, Badge, Code } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';
import LandingPage from './LandingPage.tsx';
import Dashboard from './Dashboard.tsx';

const MainApp: React.FC = () => {
    const { user, loading, error } = useAuth();
    const [loadingTimeout, setLoadingTimeout] = React.useState(false);
    const [forceShowContent, setForceShowContent] = React.useState(false);
    const [debugMode, setDebugMode] = React.useState(false);
    const [renderError, setRenderError] = React.useState<string | null>(null);

    // Enhanced mobile debugging with visible state
    const debugInfo = React.useMemo(() => {
        const info = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 50) + '...',
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

        console.log('📱 MainApp Mobile Debug:', info);
        (window as any).light90Debug = info;
        return info;
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

    // Catch any rendering errors
    React.useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('🚨 Global error caught:', event.error);
            setRenderError(`Global Error: ${event.error?.message || 'Unknown error'}`);
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            setRenderError(`Promise Error: ${event.reason?.message || 'Unknown promise error'}`);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    // Show debug mode if requested
    if (debugMode) {
        return (
            <Box minH="100vh" p={4} bg="gray.50">
                <VStack spacing={4} align="stretch">
                    <Button onClick={() => setDebugMode(false)} colorScheme="blue" size="sm">
                        Hide Debug Info
                    </Button>
                    <Alert status="info">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Debug Information</Text>
                            <Code display="block" whiteSpace="pre-wrap" fontSize="xs" mt={2}>
                                {JSON.stringify(debugInfo, null, 2)}
                            </Code>
                        </Box>
                    </Alert>
                    {renderError && (
                        <Alert status="error">
                            <AlertIcon />
                            <Text fontSize="sm">{renderError}</Text>
                        </Alert>
                    )}
                    <Button onClick={() => setForceShowContent(true)} colorScheme="green">
                        Force Show Content
                    </Button>
                </VStack>
            </Box>
        );
    }

    // Show render error if caught
    if (renderError) {
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack spacing={4} maxW="md" textAlign="center">
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Render Error Detected</Text>
                            <Text fontSize="sm" mt={1}>{renderError}</Text>
                        </Box>
                    </Alert>
                    <VStack spacing={2}>
                        <Button onClick={() => setDebugMode(true)} size="sm">
                            Show Debug Info
                        </Button>
                        <Button onClick={() => window.location.reload()} size="sm" variant="outline">
                            Refresh Page
                        </Button>
                    </VStack>
                </VStack>
            </Box>
        );
    }

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
                    <VStack spacing={2}>
                        <Button
                            colorScheme="blue"
                            onClick={() => setForceShowContent(true)}
                            size="sm"
                        >
                            Continue Anyway
                        </Button>
                        <Button onClick={() => setDebugMode(true)} size="sm" variant="outline">
                            Show Debug Info
                        </Button>
                    </VStack>
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
                        <Button onClick={() => setDebugMode(true)} size="sm" variant="outline">
                            Show Debug Info
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
                    <Badge colorScheme="blue" variant="outline" fontSize="xs">
                        Mobile: {debugInfo.isMobile ? 'Yes' : 'No'} | User: {debugInfo.hasUser ? 'Yes' : 'No'}
                    </Badge>
                    <Button onClick={() => setDebugMode(true)} size="xs" variant="ghost">
                        Debug Info
                    </Button>
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
            setRenderError(`Dashboard Error: ${dashboardError.message}`);
            return null; // This will trigger the renderError display above
        }
    }

    // If user is not logged in, show landing page with error boundary
    console.log('🏠 MainApp: No user, showing landing page');
    try {
        return <LandingPage />;
    } catch (landingError) {
        console.error('🚨 MainApp: Landing page rendering error:', landingError);
        setRenderError(`Landing Page Error: ${landingError.message}`);
        return null; // This will trigger the renderError display above
    }
};

export default MainApp;