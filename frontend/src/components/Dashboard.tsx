import React, { useEffect, useState, useCallback } from 'react';
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
    useToast
} from '@chakra-ui/react';
import { FiCoffee, FiInfo, FiAlertTriangle, FiClock, FiZap, FiTrendingUp, FiBell, FiBellOff } from 'react-icons/fi';
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
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [notificationScheduled, setNotificationScheduled] = useState(false);

    const theme = useTheme();
    const toast = useToast();

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

    const testNotification = useCallback(async (minutes: number) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/dev/simulate-wakeup?minutes=${minutes}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.shouldTriggerNotification && notificationPermission === 'granted') {
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
            toast({
                title: "Test Failed",
                description: "Could not run notification test",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    }, [notificationPermission, toast]);

    useEffect(() => {
        const updatePermission = () => setNotificationPermission(Notification.permission);
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
                permissionStatus.onchange = updatePermission;
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

    useEffect(() => {
        if (notificationPermission === 'granted' && dashboardData?.sleepCycles && dashboardData.sleepCycles.length > 0 && !notificationScheduled) {
            const latestSleep = dashboardData.sleepCycles[0];
            const wakeUpTime = new Date(latestSleep.end_time);
            const caffeineTargetTime = new Date(wakeUpTime.getTime() + 90 * 60 * 1000);
            const now = new Date();

            const timeToNotification = caffeineTargetTime.getTime() - now.getTime();

            if (timeToNotification > 0) {
                const timerId = setTimeout(() => {
                    new Notification('Time for your Coffee! ☕️', {
                        body: `It's approx. 90 minutes since you woke up. Enjoy your brew!`,
                        icon: '/logo192.png',
                        tag: 'coffee-time'
                    });
                    setNotificationScheduled(false);
                }, timeToNotification);
                setNotificationScheduled(true);
                toast({
                    title: "Coffee notification scheduled!",
                    description: `We'll ping you at ${caffeineTargetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
                return () => clearTimeout(timerId);
            } else if (!notificationScheduled) {
                toast({
                    title: "Coffee target time has passed.",
                    description: `Your calculated coffee time was ${caffeineTargetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    status: "info",
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    }, [notificationPermission, dashboardData, toast, notificationScheduled]);

    if (authLoading || loadingData) {
        return (
            <Container centerContent py={10} minH="100vh" display="flex" flexDirection="column" justifyContent="center" bg={theme.colors.neutral[900]}>
                <Spinner size="xl" color={orangeColor} thickness="4px" speed="0.65s" />
                <Text fontSize="xl" color={secondaryTextColor} mt={4}>Loading your Light90 data...</Text>
            </Container>
        );
    }

    if (authError) {
        return (
            <Container centerContent py={10} minH="100vh" display="flex" flexDirection="column" justifyContent="center" bg={theme.colors.neutral[900]}>
                <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" bg={cardBackgroundColor} borderColor={cardBorderColor} borderWidth="1px" borderRadius="xl" p={6} color={primaryTextColor}>
                    <AlertIcon as={FiAlertTriangle} boxSize="40px" mr={0} color={theme.colors.red[400]} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">Authentication Error</AlertTitle>
                    <AlertDescription maxWidth="sm">{authError.message || "Could not load user data. Please try signing out and back in."}</AlertDescription>
                </Alert>
            </Container>
        );
    }
    if (errorData) {
        return (
            <Container centerContent py={10} minH="100vh" display="flex" flexDirection="column" justifyContent="center" bg={theme.colors.neutral[900]}>
                <Alert status="warning" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" bg={cardBackgroundColor} borderColor={cardBorderColor} borderWidth="1px" borderRadius="xl" p={6} color={primaryTextColor}>
                    <AlertIcon as={FiInfo} boxSize="40px" mr={0} color={yellowColor} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">Data Issue</AlertTitle>
                    <AlertDescription maxWidth="sm">{errorData}</AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!dashboardData || !dashboardData.sleepCycles || dashboardData.sleepCycles.length === 0) {
        return (
            <Container centerContent py={10} minH="100vh" display="flex" flexDirection="column" justifyContent="center" bg={theme.colors.neutral[900]}>
                <Alert status="info" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" bg={cardBackgroundColor} borderColor={cardBorderColor} borderWidth="1px" borderRadius="xl" p={6} color={primaryTextColor}>
                    <AlertIcon as={FiInfo} boxSize="40px" mr={0} color={orangeColor} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">No Sleep Data Yet</AlertTitle>
                    <AlertDescription maxWidth="sm">We couldn't find any recent WHOOP sleep data to calculate your caffeine target. Please ensure your WHOOP device is syncing correctly.</AlertDescription>
                </Alert>
            </Container>
        );
    }

    const { sleepCycles } = dashboardData;
    const latestSleep = sleepCycles[0]; // Assuming sleepCycles is sorted descending by end_time
    const wakeUpTime = new Date(latestSleep.end_time);
    const caffeineTargetTime = new Date(wakeUpTime.getTime() + 90 * 60 * 1000);

    const formattedWakeUpTime = wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedWakeUpDate = wakeUpTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedCaffeineTargetTime = caffeineTargetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedCaffeineTargetDate = caffeineTargetTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <Box bg={theme.colors.neutral[900]} minH="100vh" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
            <Container maxW="container.md">
                <VStack spacing={6} align="stretch">
                    <Heading as="h1" size="xl" color={primaryTextColor} textAlign="center" mb={2}>
                        Your Optimal First Coffee
                    </Heading>

                    {notificationPermission !== 'granted' && (
                        <Button
                            onClick={requestNotificationPermission}
                            colorScheme={notificationPermission === 'denied' ? "red" : "orange"}
                            leftIcon={<Icon as={notificationPermission === 'denied' ? FiBellOff : FiBell} />}
                            w="fit-content"
                            alignSelf="center"
                            mb={4}
                        >
                            {notificationPermission === 'denied' ? 'Enable Notifications (Blocked)' : 'Enable Coffee Notifications'}
                        </Button>
                    )}
                    {notificationPermission === 'granted' && !notificationScheduled && caffeineTargetTime.getTime() <= new Date().getTime() && (
                        <Text textAlign="center" color={tertiaryTextColor} fontSize="sm" mb={4}>
                            Your coffee target time has passed. Notification was not set for this session.
                        </Text>
                    )}
                    {notificationPermission === 'granted' && notificationScheduled && (
                        <Text textAlign="center" color={accentColor} fontSize="sm" mb={4}>
                            <Icon as={FiBell} mr={1} verticalAlign="middle" /> Coffee notification is scheduled!
                        </Text>
                    )}

                    <Card
                        bg={cardBackgroundColor}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor={cardBorderColor}
                        boxShadow="xl"
                        overflow="hidden"
                    >
                        <CardBody p={{ base: 6, md: 8 }}>
                            <VStack spacing={4} textAlign="center">
                                <Icon as={FiCoffee} w={{ base: 12, md: 16 }} h={{ base: 12, md: 16 }} color={coffeeBrownColor} />
                                <Heading as="h2" size={{ base: "md", md: "lg" }} color={primaryTextColor}>
                                    Target Time
                                </Heading>
                                <Text fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }} fontWeight="bold" color={orangeColor} lineHeight="1.1">
                                    {formattedCaffeineTargetTime}
                                </Text>
                                <Text fontSize={{ base: "sm", md: "md" }} color={secondaryTextColor}>
                                    on {formattedCaffeineTargetDate}
                                </Text>
                                <Text fontSize={{ base: "sm", md: "md" }} color={tertiaryTextColor} px={{ base: 2, md: 4 }}>
                                    Aim to have your first coffee or tea around this time to maximize energy and minimize sleep disruption.
                                </Text>
                            </VStack>
                        </CardBody>
                    </Card>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                        <Card bg={cardBackgroundColor} borderRadius="lg" borderWidth="1px" borderColor={cardBorderColor} boxShadow="lg">
                            <CardBody>
                                <HStack spacing={4} align="center">
                                    <Icon as={FiClock} w={8} h={8} color={accentColor} />
                                    <Box>
                                        <Text fontSize="sm" color={tertiaryTextColor}>Last Wake-up</Text>
                                        <Text fontSize="xl" fontWeight="semibold" color={primaryTextColor}>{formattedWakeUpTime}</Text>
                                        <Text fontSize="xs" color={secondaryTextColor}>{formattedWakeUpDate}</Text>
                                    </Box>
                                </HStack>
                            </CardBody>
                        </Card>
                        <Card bg={cardBackgroundColor} borderRadius="lg" borderWidth="1px" borderColor={cardBorderColor} boxShadow="lg">
                            <CardBody>
                                <HStack spacing={4} align="center">
                                    <Icon as={FiTrendingUp} w={8} h={8} color={accentColor} />
                                    <Box>
                                        <Text fontSize="sm" color={tertiaryTextColor}>WHOOP Sleep Score</Text>
                                        <Text fontSize="xl" fontWeight="semibold" color={primaryTextColor}>{latestSleep.score || 'N/A'}</Text>
                                        <Text fontSize="xs" color={secondaryTextColor}>From last sleep cycle</Text>
                                    </Box>
                                </HStack>
                            </CardBody>
                        </Card>
                    </SimpleGrid>

                    <Box textAlign="center" mt={4} px={4}>
                        <Text fontSize="sm" color={tertiaryTextColor}>
                            <Icon as={FiInfo} mr={2} color={yellowColor} verticalAlign="middle" />
                            Waiting at least 90 minutes after waking to consume caffeine can help prevent an afternoon crash and optimize your natural cortisol rhythm.
                        </Text>
                    </Box>

                    {process.env.NODE_ENV === 'development' && (
                        <Card bg={cardBackgroundColor} borderRadius="lg" borderWidth="1px" borderColor={cardBorderColor} boxShadow="lg" mt={6}>
                            <CardBody>
                                <VStack spacing={4}>
                                    <Text fontSize="lg" fontWeight="semibold" color={primaryTextColor}>
                                        🧪 Notification Tests (Dev Only)
                                    </Text>
                                    <Text fontSize="sm" color={tertiaryTextColor} textAlign="center">
                                        Test notifications for different wake-up scenarios
                                    </Text>
                                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
                                        <Button
                                            size="sm"
                                            colorScheme="green"
                                            onClick={() => testNotification(90)}
                                            leftIcon={<Icon as={FiBell} />}
                                        >
                                            It's Time! (90m)
                                        </Button>
                                        <Button
                                            size="sm"
                                            colorScheme="blue"
                                            onClick={() => testNotification(30)}
                                        >
                                            Future (30m)
                                        </Button>
                                        <Button
                                            size="sm"
                                            colorScheme="orange"
                                            onClick={() => testNotification(120)}
                                        >
                                            Past (120m)
                                        </Button>
                                        <Button
                                            size="sm"
                                            colorScheme="red"
                                            onClick={() => testNotification(180)}
                                        >
                                            Way Past (180m)
                                        </Button>
                                    </SimpleGrid>
                                </VStack>
                            </CardBody>
                        </Card>
                    )}

                    <Box textAlign="center" mt={4}>
                        <Button
                            variant="link"
                            colorScheme="orange"
                            onClick={() => { /* TODO: Implement logout or other action */ }}
                            display="none"
                        >
                            View Sleep History (Coming Soon)
                        </Button>
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
};

export default Dashboard;