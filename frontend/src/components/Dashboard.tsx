import React, { useEffect, useState } from 'react';
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
    Button
} from '@chakra-ui/react';
import { FiCoffee, FiInfo, FiAlertTriangle, FiClock, FiZap, FiTrendingUp } from 'react-icons/fi';
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

    const theme = useTheme();
    const primaryTextColor = theme.colors.white;
    const secondaryTextColor = theme.colors.neutral[300];
    const tertiaryTextColor = theme.colors.neutral[400];
    const orangeColor = theme.colors.orange[400];
    const coffeeBrownColor = theme.colors.yellow[600];
    const yellowColor = theme.colors.yellow[400];
    const cardBackgroundColor = theme.colors.neutral[800];
    const cardBorderColor = theme.colors.neutral[700];
    const accentColor = theme.colors.teal[400];

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
                <VStack spacing={8} align="stretch">
                    <Heading as="h1" size="xl" color={primaryTextColor} textAlign="center" mb={4}>
                        Your Optimal First Coffee
                    </Heading>

                    {/* Main Caffeine Target Card */}
                    <Card
                        bg={cardBackgroundColor}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor={cardBorderColor}
                        boxShadow="xl"
                        overflow="hidden"
                    >
                        <CardBody p={8}>
                            <VStack spacing={5} textAlign="center">
                                <Icon as={FiCoffee} w={16} h={16} color={coffeeBrownColor} />
                                <Heading as="h2" size="lg" color={primaryTextColor}>
                                    Target Time
                                </Heading>
                                <Text fontSize={{ base: "4xl", md: "6xl" }} fontWeight="bold" color={orangeColor} lineHeight="1.1">
                                    {formattedCaffeineTargetTime}
                                </Text>
                                <Text fontSize="md" color={secondaryTextColor}>
                                    on {formattedCaffeineTargetDate}
                                </Text>
                                <Text fontSize="md" color={tertiaryTextColor} px={4}>
                                    Aim to have your first coffee or tea around this time to maximize energy and minimize sleep disruption.
                                </Text>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Supporting Info Grid */}
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

                    <Box textAlign="center" mt={6} px={4}>
                        <Text fontSize="sm" color={tertiaryTextColor}>
                            <Icon as={FiInfo} mr={2} color={yellowColor} verticalAlign="middle" />
                            Waiting at least 90 minutes after waking to consume caffeine can help prevent an afternoon crash and optimize your natural cortisol rhythm.
                        </Text>
                    </Box>

                    {/* Optional: Logout or other actions */}
                    <Box textAlign="center" mt={4}>
                        <Button
                            variant="link"
                            colorScheme="orange"
                            onClick={() => { /* TODO: Implement logout or other action */ }}
                            display="none" // Hidden for now, can be enabled later
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