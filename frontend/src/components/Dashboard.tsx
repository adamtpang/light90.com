import React, { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Icon,
    Flex,
    useTheme
} from '@chakra-ui/react';
import { FiSunrise, FiInfo, FiAlertTriangle } from 'react-icons/fi';
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

// Simplified StatCard for dark mode, or we can inline its logic for MVP
const AlertStatCard = ({ title, value, icon, helpText, iconColor }: {
    title: string;
    value: string;
    icon: React.ElementType;
    helpText: string;
    iconColor: string;
}) => {
    const theme = useTheme();
    // Using direct theme values for dark mode
    const cardBackgroundColor = theme.colors.neutral[800]; // A dark grey, not pure black
    const primaryTextColor = theme.colors.white;
    const secondaryTextColor = theme.colors.neutral[400];
    const statBorderColor = theme.colors.neutral[700];

    return (
        <Stat
            p={6}
            shadow="xl" // Enhanced shadow for dark mode
            border="1px"
            borderColor={statBorderColor}
            borderRadius="xl"
            bg={cardBackgroundColor}
            textAlign="center"
        >
            <Flex direction="column" alignItems="center" justifyContent="center">
                <Icon as={icon} w={12} h={12} color={iconColor} mb={4} />
                <StatLabel fontWeight="medium" fontSize="lg" color={secondaryTextColor}>{title}</StatLabel>
                <StatNumber fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold" color={primaryTextColor} mt={1}>
                    {value}
                </StatNumber>
                <StatHelpText color={secondaryTextColor} mt={1}>{helpText}</StatHelpText>
            </Flex>
        </Stat>
    );
};

const Dashboard = () => {
    const { user, loading: authLoading, error: authError } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState<string | null>(null);

    const theme = useTheme();
    const primaryTextColor = theme.colors.white; // For headings
    const secondaryTextColor = theme.colors.neutral[300]; // For supporting text
    const orangeColor = theme.colors.orange[400]; // From your palette
    const yellowColor = theme.colors.yellow[400]; // From your palette
    // General page background is set globally via theme.styles.global
    const cardBackgroundColor = theme.colors.neutral[800]; // Darker cards
    const cardBorderColor = theme.colors.neutral[700];

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
            <Container centerContent py={10} minH="80vh" display="flex" flexDirection="column" justifyContent="center">
                <Spinner size="xl" color={orangeColor} thickness="4px" speed="0.65s" />
                <Text fontSize="xl" color={secondaryTextColor} mt={4}>Loading your Light90 data...</Text>
            </Container>
        );
    }

    if (authError) {
        return (
            <Container centerContent py={10} minH="80vh" display="flex" flexDirection="column" justifyContent="center">
                <Alert
                    status="error"
                    variant="subtle"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    bg={cardBackgroundColor}
                    borderColor={cardBorderColor}
                    borderWidth="1px"
                    borderRadius="xl"
                    p={6}
                    color={primaryTextColor}
                >
                    <AlertIcon as={FiAlertTriangle} boxSize="40px" mr={0} color={theme.colors.red[400]} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">
                        Authentication Error
                    </AlertTitle>
                    <AlertDescription maxWidth="sm">
                        {authError.message || "Could not load user data. Please try signing out and back in."}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }
    if (errorData) { // For other data processing errors
        return (
            <Container centerContent py={10} minH="80vh" display="flex" flexDirection="column" justifyContent="center">
                <Alert
                    status="warning" // Changed to warning for general data errors
                    variant="subtle"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    bg={cardBackgroundColor}
                    borderColor={cardBorderColor}
                    borderWidth="1px"
                    borderRadius="xl"
                    p={6}
                    color={primaryTextColor}
                >
                    <AlertIcon as={FiInfo} boxSize="40px" mr={0} color={yellowColor} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">
                        Data Issue
                    </AlertTitle>
                    <AlertDescription maxWidth="sm">
                        {errorData}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!dashboardData || !dashboardData.sleepCycles || dashboardData.sleepCycles.length === 0) {
        return (
            <Container centerContent py={10} minH="80vh" display="flex" flexDirection="column" justifyContent="center">
                <Alert
                    status="info"
                    variant="subtle"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    bg={cardBackgroundColor}
                    borderColor={cardBorderColor}
                    borderWidth="1px"
                    borderRadius="xl"
                    p={6}
                    color={primaryTextColor}
                >
                    <AlertIcon as={FiInfo} boxSize="40px" mr={0} color={orangeColor} />
                    <AlertTitle mt={4} mb={1} fontSize="xl" fontWeight="bold">
                        No Sleep Data Yet
                    </AlertTitle>
                    <AlertDescription maxWidth="sm">
                        We couldn't find any recent WHOOP sleep data to calculate your Light90 alert.
                        Please ensure your WHOOP device is syncing correctly.
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    const { sleepCycles } = dashboardData;
    const latestSleep = sleepCycles[0]; // We know sleepCycles has at least one item here
    const wakeUpTime = new Date(latestSleep.end_time);
    const lightNotificationTime = new Date(wakeUpTime.getTime() + 90 * 60 * 1000);

    return (
        <Container maxW={{ base: "xl", md: "2xl" }} py={{ base: 8, md: 16 }} px={{ base: 4, md: 6 }} minH="80vh" display="flex" flexDirection="column" justifyContent="center">
            <VStack spacing={6} align="center" textAlign="center" w="100%">
                <Heading as="h1" size="xl" color={primaryTextColor} fontFamily="heading">
                    Your Light90 Target
                </Heading>

                <Text fontSize="lg" color={secondaryTextColor} maxW="lg">
                    Based on your last WHOOP-detected wake-up at <Text as="strong" color={primaryTextColor}>{wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> on <Text as="strong" color={primaryTextColor}>{wakeUpTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>.
                </Text>

                <AlertStatCard
                    title="Aim for Morning Light Around"
                    value={lightNotificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    icon={FiSunrise}
                    iconColor={orangeColor} // Using orange from palette
                    helpText={`On ${lightNotificationTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`}
                />

                <Box
                    p={5}
                    bg={theme.colors.neutral[700]} // Slightly lighter dark for info box
                    borderRadius="lg"
                    w="100%"
                    mt={2}
                >
                    <Text fontSize="md" color={secondaryTextColor}>
                        <Icon as={FiInfo} mr={2} color={yellowColor} verticalAlign="middle" />
                        Get 10-30 minutes of direct sunlight (no sunglasses, not through a window) around this time to help anchor your circadian rhythm and improve your sleep performance (Score: <Text as="strong" color={primaryTextColor}>{latestSleep.score || 'N/A'}</Text>).
                    </Text>
                </Box>

            </VStack>
        </Container>
    );
};

export default Dashboard;