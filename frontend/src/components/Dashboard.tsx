import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    HStack,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Icon,
    Flex,
    useTheme,
    SimpleGrid,
    Card,
    CardBody,
    Divider,
    Button,
    useToast,
    CircularProgress,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Badge
} from '@chakra-ui/react';
import { FiCoffee, FiInfo, FiAlertTriangle, FiClock, FiZap, FiTrendingUp, FiBell, FiBellOff, FiRefreshCw } from 'react-icons/fi';
import useAuth from '../hooks/useAuth.tsx';

// Define interfaces for your data structures
interface SleepCycle {
    id: string;
    start_time: string;
    end_time: string;
    timezone_offset: string;
    score: number;
}

interface DashboardData {
    sleepCycles?: SleepCycle[];
}

const Dashboard: React.FC = () => {
    const { user, loading: authLoading, error: authError } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState<string | null>(null);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [notificationScheduled, setNotificationScheduled] = useState(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const theme = useTheme();
    const toast = useToast();

    // Track active toasts to prevent spam
    const activeToastRef = useRef<string | null>(null);

    // Circuit breaker for refresh attempts
    const refreshAttemptsRef = useRef<number>(0);
    const lastRefreshAttemptRef = useRef<number>(0);
    const [refreshBlocked, setRefreshBlocked] = useState<boolean>(false);

    const primaryTextColor = theme.colors.white;
    const secondaryTextColor = theme.colors.neutral[300];
    const tertiaryTextColor = theme.colors.neutral[400];
    const orangeColor = theme.colors.orange[400];
    const coffeeBrownColor = theme.colors.yellow[600];
    const yellowColor = theme.colors.yellow[400];
    const cardBackgroundColor = theme.colors.neutral[800];
    const cardBorderColor = theme.colors.neutral[700];
    const accentColor = theme.colors.teal[400];

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            toast({
                title: "Notifications not supported",
                description: "Your browser does not support desktop notifications.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setNotificationPermission('denied');
            return;
        }

        if (Notification.permission === 'granted') {
            setNotificationPermission('granted');
            toast({
                title: "Notifications already enabled!",
                status: "info",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                toast({
                    title: "Notifications Enabled!",
                    description: "You'll be notified when it's time for your coffee.",
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "Notifications Denied",
                    description: "You won't receive coffee time notifications.",
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } else {
            toast({
                title: "Notifications Blocked",
                description: "Please enable notifications in your browser settings if you want to use this feature.",
                status: "error",
                duration: 7000,
                isClosable: true,
            });
        }
    }, [toast]);

    const refreshSleepData = useCallback(async () => {
        if (refreshing) return; // Prevent multiple concurrent refreshes

        // Circuit breaker: prevent too many refresh attempts
        const now = Date.now();
        const timeSinceLastAttempt = now - lastRefreshAttemptRef.current;

        // Reset counter if it's been more than 5 minutes since last attempt
        if (timeSinceLastAttempt > 5 * 60 * 1000) {
            refreshAttemptsRef.current = 0;
            setRefreshBlocked(false);
        }

        // Block if too many attempts in short time
        if (refreshAttemptsRef.current >= 3 && timeSinceLastAttempt < 2 * 60 * 1000) {
            console.log('🚫 Refresh blocked due to too many attempts');
            setRefreshBlocked(true);

            if (activeToastRef.current !== 'refresh-blocked') {
                toast.closeAll();
                toast({
                    title: "Refresh Temporarily Blocked",
                    description: "Too many failed attempts. Use 'Reset Auth' in the menu to fix authentication issues.",
                    status: "warning",
                    duration: 10000,
                    isClosable: true,
                    onCloseComplete: () => {
                        activeToastRef.current = null;
                    }
                });
                activeToastRef.current = 'refresh-blocked';
            }
            return;
        }

        refreshAttemptsRef.current++;
        lastRefreshAttemptRef.current = now;

        setRefreshing(true);
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL ||
                (window.location.hostname !== 'localhost' ? 'https://light90-backend-production.up.railway.app' : 'http://localhost:5000');

            console.log('🔄 Refreshing sleep data...');

            // Debug: Check authentication state
            console.log('🔍 Debug - Authentication state:', {
                user: !!user,
                userId: user?.profile?.id || 'N/A',
                userRecords: user?.profile?.records?.length || 0
            });

            // Debug: Check localStorage contents
            console.log('🔍 Debug - localStorage contents:', {
                tempAuth: localStorage.getItem('light90_temp_auth'),
                tempUser: !!localStorage.getItem('light90_temp_user'),
                jwtToken: !!localStorage.getItem('light90_jwt_token')
            });

            // Get auth token from localStorage if available
            let authToken = null;
            try {
                authToken = localStorage.getItem('light90_jwt_token'); // Use JWT token for authentication
                if (!authToken) {
                    console.warn('No JWT token found in localStorage');
                }
            } catch (e) {
                console.warn('Could not get JWT token from localStorage:', e);
            }

            const requestOptions: RequestInit = {
                credentials: 'include'
            };

            // Add authorization header if we have a token
            if (authToken) {
                requestOptions.headers = {
                    'Authorization': `Bearer ${authToken}`
                };
                console.log('🔐 Including auth token in request');
            }

            const response = await fetch(`${backendUrl}/api/refresh-sleep-data`, requestOptions);

            if (!response.ok) {
                throw new Error(`Failed to refresh sleep data: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Sleep data refreshed:', data);

            // Update the dashboard data with fresh records
            if (data.records && data.records.length > 0) {
                const processedSleepCycles: SleepCycle[] = data.records.map((record: any) => ({
                    id: String(record.id),
                    start_time: String(record.start),
                    end_time: String(record.end),
                    timezone_offset: String(record.timezone_offset),
                    score: Number(record.score?.sleep_performance_percentage)
                }));

                // Sort sleep cycles by end_time to get the latest one
                processedSleepCycles.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

                setDashboardData({
                    sleepCycles: processedSleepCycles,
                });

                // Close any existing toasts and show success
                toast.closeAll();
                activeToastRef.current = null;

                toast({
                    title: "Sleep Data Refreshed!",
                    description: `Found ${data.recordsCount} sleep records. Showing latest data.`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                // Close any existing toasts and show info
                toast.closeAll();
                activeToastRef.current = null;

                toast({
                    title: "No New Sleep Data",
                    description: "No sleep records found. Make sure your WHOOP is syncing.",
                    status: "info",
                    duration: 3000,
                    isClosable: true,
                });
            }
        } catch (error) {
            console.error('❌ Failed to refresh sleep data:', error);

            // Only show error toast if one isn't already active
            if (activeToastRef.current !== 'refresh-error') {
                // Close any existing toasts first
                toast.closeAll();

                const toastId = toast({
                    title: "Refresh Failed",
                    description: "Could not fetch fresh sleep data from WHOOP. Try the Reset Auth button if this persists.",
                    status: "error",
                    duration: 8000,
                    isClosable: true,
                    onCloseComplete: () => {
                        activeToastRef.current = null;
                    }
                });

                activeToastRef.current = 'refresh-error';
            }
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, toast, user]);

    const testNotification = useCallback(async (minutes: number) => {
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL ||
                (window.location.hostname !== 'localhost' ? 'https://light90-backend-production.up.railway.app' : 'http://localhost:5000');

            // Get JWT token for authentication
            let authToken = null;
            try {
                authToken = localStorage.getItem('light90_jwt_token');
            } catch (e) {
                console.warn('Could not get JWT token for test notification:', e);
            }

            const requestOptions: RequestInit = {
                credentials: 'include'
            };

            // Add authorization header if we have a token
            if (authToken) {
                requestOptions.headers = {
                    'Authorization': `Bearer ${authToken}`
                };
            }

            const response = await fetch(`${backendUrl}/dev/simulate-wakeup?minutes=${minutes}`, requestOptions);
            const data = await response.json();

            if (data.shouldTriggerNotification && notificationPermission === 'granted' && 'Notification' in window) {
                // Trigger browser notification (no tag = each notification is unique)
                new Notification('☕ Light90 Coffee Time!', {
                    body: data.notificationMessage,
                    icon: '/favicon.ico'
                    // No tag = browser won't replace previous notifications
                });

                // Also show a toast
                toast({
                    title: "🔔 Notification Triggered!",
                    description: data.notificationMessage,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                // Just show toast with the result
                toast({
                    title: `Test Result (${minutes} min ago)`,
                    description: data.notificationMessage,
                    status: data.notificationAction === 'missed' ? 'warning' : 'info',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            // Only show error toast if one isn't already active
            if (activeToastRef.current !== 'test-error') {
                toast.closeAll();

                const toastId = toast({
                    title: "Test Failed",
                    description: "Could not run notification test",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                    onCloseComplete: () => {
                        activeToastRef.current = null;
                    }
                });

                activeToastRef.current = 'test-error';
            }
        }
    }, [notificationPermission, toast]);

    useEffect(() => {
        const updatePermission = () => {
            if ('Notification' in window) {
                setNotificationPermission(Notification.permission);
            }
        };
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
                permissionStatus.onchange = updatePermission;
            }).catch(() => {
                // Permissions API not supported, ignore
            });
        }
        return () => {
            if ('permissions' in navigator) {
                navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
                    permissionStatus.onchange = null;
                }).catch(() => { });
            }
        };
    }, []);

    useEffect(() => {
        if (user && user.profile) {
            const rawProfile = user.profile as any;
            const processedSleepCycles: SleepCycle[] = (rawProfile.records || []).map((record: any) => ({
                id: String(record.id),
                start_time: String(record.start),
                end_time: String(record.end),
                timezone_offset: String(record.timezone_offset),
                score: Number(record.score?.sleep_performance_percentage)
            }));

            // Sort sleep cycles by end_time to get the latest one
            processedSleepCycles.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

            setDashboardData({
                sleepCycles: processedSleepCycles,
            });
            setLoadingData(false);
        } else if (!authLoading && !user) {
            setErrorData("User not authenticated. Please sign in.");
            setLoadingData(false);
        }
    }, [user, authLoading]);

    // Auto-refresh sleep data when dashboard loads
    useEffect(() => {
        if (user && user.profile && !refreshing && !refreshBlocked) {
            // Check if the latest sleep data is from today or yesterday
            const rawProfile = user.profile as any;
            const records = rawProfile.records || [];

            if (records.length > 0) {
                const latestRecord = records[0];
                const latestSleepEnd = new Date(latestRecord.end);
                const now = new Date();
                const hoursSinceLastSleep = (now.getTime() - latestSleepEnd.getTime()) / (1000 * 60 * 60);

                // If the latest sleep was more than 12 hours ago, try to refresh (but only once)
                if (hoursSinceLastSleep > 12 && refreshAttemptsRef.current === 0) {
                    console.log(`🔄 Latest sleep was ${hoursSinceLastSleep.toFixed(1)} hours ago, refreshing...`);
                    refreshSleepData();
                } else {
                    console.log(`✅ Latest sleep was ${hoursSinceLastSleep.toFixed(1)} hours ago, no refresh needed`);
                }
            } else {
                // No records, try to refresh (but only once)
                if (refreshAttemptsRef.current === 0) {
                    console.log('🔄 No sleep records found, refreshing...');
                    refreshSleepData();
                }
            }
        }
    }, [user, refreshing, refreshSleepData, refreshBlocked]);

    // Show loading state
    if (loadingData) {
        return (
            <VStack minH="80vh" justify="center" align="center" spacing={4}>
                <CircularProgress isIndeterminate color="brand.500" size="lg" />
                <Text fontSize="xl" fontWeight="medium" color="neutral.700">
                    Loading your sleep data...
                </Text>
            </VStack>
        );
    }

    // Show error state
    if (errorData) {
        return (
            <VStack minH="80vh" justify="center" align="center" spacing={4} p={5}>
                <Alert status="error" maxW="md" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">Authentication Error</Text>
                        <Text fontSize="sm" mt={1}>{errorData}</Text>
                    </Box>
                </Alert>
                <Button
                    colorScheme="brand"
                    onClick={() => {
                        console.log('🔄 Re-authenticating user...');
                        window.location.href = `${process.env.REACT_APP_BACKEND_URL ||
                            (window.location.hostname !== 'localhost' ? 'https://light90-backend-production.up.railway.app' : 'http://localhost:5000')}/auth/whoop`;
                    }}
                >
                    Re-authenticate with WHOOP
                </Button>
            </VStack>
        );
    }

    if (!dashboardData || !dashboardData.sleepCycles || dashboardData.sleepCycles.length === 0) {
        return (
            <Container maxW="container.lg" py={8} px={4}>
                <VStack spacing={6} align="stretch">
                    <Text fontSize="2xl" fontWeight="bold" textAlign="center" color="white">
                        Your Light90 Dashboard
                    </Text>

                    {refreshBlocked && (
                        <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            <Box>
                                <Text fontWeight="bold">Refresh Temporarily Blocked</Text>
                                <Text fontSize="sm">Too many failed attempts. Use 'Reset Auth' in the menu to fix authentication issues.</Text>
                            </Box>
                        </Alert>
                    )}

                    <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">No Sleep Data Yet</Text>
                            <Text fontSize="sm">We couldn't find any recent WHOOP sleep data. Please ensure your WHOOP device is syncing correctly.</Text>
                        </Box>
                    </Alert>

                    <Button
                        onClick={refreshSleepData}
                        isLoading={refreshing}
                        loadingText="Refreshing..."
                        colorScheme="brand"
                        size="lg"
                        alignSelf="center"
                    >
                        Refresh Sleep Data
                    </Button>
                </VStack>
            </Container>
        );
    }

    const { sleepCycles } = dashboardData;
    const latestSleep = sleepCycles[0];
    const wakeUpTime = new Date(latestSleep.end_time);
    const caffeineTargetTime = new Date(wakeUpTime.getTime() + 90 * 60 * 1000);

    const formattedWakeUpTime = wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedWakeUpDate = wakeUpTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedCaffeineTargetTime = caffeineTargetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedCaffeineTargetDate = caffeineTargetTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <Container maxW="container.lg" py={8} px={4}>
            <VStack spacing={6} align="stretch">
                <HStack justify="space-between" align="center">
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                        Your Optimal First Coffee
                    </Text>
                    <Button
                        onClick={refreshSleepData}
                        isLoading={refreshing}
                        loadingText="Refreshing..."
                        variant="ghost"
                        colorScheme="orange"
                        size="sm"
                        title="Refresh sleep data from WHOOP"
                    >
                        Refresh
                    </Button>
                </HStack>

                {refreshBlocked && (
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <Text fontWeight="bold">Refresh Temporarily Blocked</Text>
                            <Text fontSize="sm">Too many failed attempts. Use 'Reset Auth' in the menu to fix authentication issues.</Text>
                        </Box>
                    </Alert>
                )}

                <Box bg="gray.800" borderRadius="xl" p={8} textAlign="center">
                    <VStack spacing={4}>
                        <Text fontSize="6xl">☕</Text>
                        <Text fontSize="lg" color="gray.300">Target Time</Text>
                        <Text fontSize="4xl" fontWeight="bold" color="orange.400">
                            {formattedCaffeineTargetTime}
                        </Text>
                        <Text color="gray.400">on {formattedCaffeineTargetDate}</Text>
                        <Text fontSize="sm" color="gray.500" maxW="md">
                            Aim to have your first coffee or tea around this time to maximize energy and minimize sleep disruption.
                        </Text>
                    </VStack>
                </Box>

                <HStack spacing={4}>
                    <Box bg="gray.800" borderRadius="lg" p={4} flex={1}>
                        <VStack spacing={2}>
                            <Text fontSize="sm" color="gray.400">Last Wake-up</Text>
                            <Text fontSize="xl" fontWeight="bold" color="white">{formattedWakeUpTime}</Text>
                            <Text fontSize="xs" color="gray.500">{formattedWakeUpDate}</Text>
                        </VStack>
                    </Box>
                    <Box bg="gray.800" borderRadius="lg" p={4} flex={1}>
                        <VStack spacing={2}>
                            <Text fontSize="sm" color="gray.400">WHOOP Sleep Score</Text>
                            <Text fontSize="xl" fontWeight="bold" color="white">{latestSleep.score || 'N/A'}</Text>
                            <Text fontSize="xs" color="gray.500">From last sleep cycle</Text>
                        </VStack>
                    </Box>
                </HStack>

                <Text fontSize="sm" color="gray.500" textAlign="center">
                    💡 Waiting at least 90 minutes after waking to consume caffeine can help prevent an afternoon crash and optimize your natural cortisol rhythm.
                </Text>
            </VStack>
        </Container>
    );
};

export default Dashboard;