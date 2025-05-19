import React from 'react';
import {
    Container,
    VStack,
    Heading,
    Text,
    Button,
    Icon,
    useTheme,
    Flex,
    Box,
    Grid,
    GridItem,
    HStack,
    Image,
    useBreakpointValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiCoffee, FiArrowRight, FiSunrise, FiActivity, FiClock, FiDroplet } from 'react-icons/fi';

// Animation keyframes
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const FeatureCard = ({ icon, title, description, delay }) => {
    const theme = useTheme();

    return (
        <Box
            p={6}
            borderRadius="xl"
            bg={theme.colors.neutral[800]}
            border="1px solid"
            borderColor={theme.colors.neutral[700]}
            boxShadow="xl"
            height="100%"
            transition="all 0.3s ease"
            _hover={{
                transform: "translateY(-5px)",
                boxShadow: "2xl",
                borderColor: theme.colors.orange[400],
            }}
            sx={{
                animation: `${fadeInUp} 0.6s ease-out forwards ${delay}s`,
                opacity: 0,
            }}
        >
            <Icon as={icon} w={10} h={10} color={theme.colors.orange[400]} mb={4} />
            <Heading as="h3" size="md" mb={3} fontFamily="Montserrat, sans-serif" color={theme.colors.white}>
                {title}
            </Heading>
            <Text color={theme.colors.neutral[400]}>
                {description}
            </Text>
        </Box>
    );
};

const LandingPage: React.FC = () => {
    const backendUrl = 'http://localhost:5000';
    const theme = useTheme();

    // Define main colors from the theme for dark mode
    const orangeColor = theme.colors.orange[400];
    const yellowColor = theme.colors.yellow[400];
    const blackColor = theme.colors.neutral[900];
    const whiteColor = theme.colors.white;

    // Responsive adjustments
    const heroFontSize = useBreakpointValue({ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' });
    const subtitleFontSize = useBreakpointValue({ base: 'lg', md: 'xl', lg: '2xl' });

    return (
        <Box bg={blackColor} color={whiteColor} minH="100vh">
            {/* Hero Section */}
            <Box
                py={{ base: 20, md: 32 }}
                px={4}
                backgroundImage="linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1951&q=80')"
                backgroundSize="cover"
                backgroundPosition="center"
                position="relative"
                overflow="hidden"
            >
                <Container maxW="container.xl">
                    <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={10} alignItems="center">
                        <GridItem>
                            <VStack spacing={8} align="flex-start" textAlign={{ base: "center", lg: "left" }} mx={{ base: "auto", lg: 0 }} alignItems={{ base: "center", lg: "flex-start" }}>
                                <Box
                                    sx={{
                                        animation: `${fadeInUp} 0.5s ease-out forwards`,
                                    }}
                                >
                                    <Heading
                                        as="h1"
                                        fontFamily="Montserrat, sans-serif"
                                        fontSize={heroFontSize}
                                        fontWeight="extrabold"
                                        color={whiteColor}
                                        lineHeight="1.1"
                                        letterSpacing="tight"
                                    >
                                        <Box as="span" color={orangeColor}>Light90</Box> <br />
                                        <Box as="span">Optimize Your Energy</Box>
                                    </Heading>
                                </Box>

                                <Box
                                    sx={{
                                        animation: `${fadeInUp} 0.5s ease-out forwards 0.2s`,
                                        opacity: 0,
                                    }}
                                >
                                    <Text
                                        fontFamily="Montserrat, sans-serif"
                                        fontSize={subtitleFontSize}
                                        color={theme.colors.neutral[300]}
                                        maxW="650px"
                                        lineHeight="1.5"
                                    >
                                        Synchronize your light exposure and caffeine intake with your WHOOP data to enhance your circadian rhythm and optimize your energy levels.
                                    </Text>
                                </Box>

                                <Box
                                    sx={{
                                        animation: `${fadeInUp} 0.5s ease-out forwards 0.4s`,
                                        opacity: 0,
                                    }}
                                >
                                    <Button
                                        as="a"
                                        href={`${backendUrl}/auth/whoop`}
                                        bg={orangeColor}
                                        color={whiteColor}
                                        size="lg"
                                        fontFamily="Montserrat, sans-serif"
                                        fontWeight="bold"
                                        px={10}
                                        py={7}
                                        mt={2}
                                        rightIcon={<FiArrowRight />}
                                        boxShadow="0 0 20px rgba(251, 146, 60, 0.5)"
                                        borderRadius="full"
                                        _hover={{
                                            bg: theme.colors.orange[500],
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 0 30px rgba(251, 146, 60, 0.7)'
                                        }}
                                        _active={{
                                            bg: theme.colors.orange[600]
                                        }}
                                        sx={{
                                            animation: `${pulse} 2s infinite ease-in-out`,
                                            animationDelay: "1s"
                                        }}
                                    >
                                        Connect with WHOOP
                                    </Button>
                                </Box>
                            </VStack>
                        </GridItem>

                        <GridItem display={{ base: "none", lg: "block" }}>
                            <Box
                                borderRadius="3xl"
                                overflow="hidden"
                                boxShadow="0 20px 40px rgba(0,0,0,0.3)"
                                borderWidth="1px"
                                borderColor={theme.colors.neutral[800]}
                                sx={{
                                    animation: `${fadeInUp} 0.6s ease-out forwards 0.5s`,
                                    opacity: 0,
                                }}
                                transform="perspective(1000px) rotateY(-5deg) rotateX(5deg)"
                                maxW="500px"
                                mx="auto"
                                position="relative"
                            >
                                <Image
                                    src="https://images.pexels.com/photos/3020919/pexels-photo-3020919.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                    alt="Coffee and Fitness Tracking"
                                    width="100%"
                                    fallback={
                                        <Box
                                            height="300px"
                                            width="100%"
                                            bg={theme.colors.neutral[800]}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            <Icon as={FiCoffee} w={12} h={12} color={orangeColor} />
                                        </Box>
                                    }
                                />
                            </Box>
                        </GridItem>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Box py={{ base: 16, md: 24 }} px={4}>
                <Container maxW="container.xl">
                    <VStack spacing={16}>
                        <VStack spacing={5} textAlign="center" maxW="800px" mx="auto">
                            <Heading
                                fontFamily="Montserrat, sans-serif"
                                fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
                                fontWeight="bold"
                                sx={{
                                    animation: `${fadeInUp} 0.5s ease-out forwards`,
                                }}
                            >
                                How Light90 Transforms Your Day
                            </Heading>
                            <Text
                                fontSize={{ base: 'md', md: 'lg' }}
                                color={theme.colors.neutral[400]}
                                maxW="700px"
                                sx={{
                                    animation: `${fadeInUp} 0.5s ease-out forwards 0.1s`,
                                    opacity: 0,
                                }}
                            >
                                We analyze your WHOOP sleep data to provide personalized recommendations for light exposure and energy optimization.
                            </Text>
                        </VStack>

                        <Grid
                            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}
                            gap={8}
                            width="100%"
                        >
                            <FeatureCard
                                icon={FiSunrise}
                                title="Morning Light Alerts"
                                description="Get personalized alerts for optimal morning sunlight exposure to reset your circadian rhythm."
                                delay={0.2}
                            />
                            <FeatureCard
                                icon={FiCoffee}
                                title="Caffeine Timing"
                                description="Time your coffee or tea perfectly to avoid disrupting your sleep while maximizing energy."
                                delay={0.3}
                            />
                            <FeatureCard
                                icon={FiActivity}
                                title="Energy Tracking"
                                description="Track how light exposure correlates with your recovery and energy levels."
                                delay={0.4}
                            />
                            <FeatureCard
                                icon={FiClock}
                                title="Circadian Optimization"
                                description="Understand and optimize your body's natural rhythm for better sleep and energy."
                                delay={0.5}
                            />
                        </Grid>
                    </VStack>
                </Container>
            </Box>

            {/* Call to Action */}
            <Box py={16} px={4} bg={theme.colors.neutral[800]}>
                <Container maxW="container.lg">
                    <VStack
                        spacing={8}
                        p={{ base: 8, md: 12 }}
                        borderRadius="xl"
                        bg="linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(251, 146, 60, 0.05) 100%)"
                        border="1px solid"
                        borderColor={theme.colors.orange[900]}
                        textAlign="center"
                    >
                        <Heading
                            fontFamily="Montserrat, sans-serif"
                            fontSize={{ base: '2xl', md: '3xl' }}
                            fontWeight="bold"
                        >
                            Ready to Optimize Your Energy?
                        </Heading>
                        <Text
                            fontSize={{ base: 'md', md: 'lg' }}
                            color={theme.colors.neutral[400]}
                            maxW="700px"
                        >
                            Connect your WHOOP account now to start receiving personalized light and energy recommendations.
                        </Text>
                        <Button
                            as="a"
                            href={`${backendUrl}/auth/whoop`}
                            bg={orangeColor}
                            color={whiteColor}
                            size="lg"
                            fontFamily="Montserrat, sans-serif"
                            fontWeight="bold"
                            px={10}
                            py={6}
                            rightIcon={<FiArrowRight />}
                            boxShadow="xl"
                            _hover={{
                                bg: theme.colors.orange[500],
                                transform: 'translateY(-2px)',
                                boxShadow: '2xl'
                            }}
                            _active={{
                                bg: theme.colors.orange[600]
                            }}
                        >
                            Connect with WHOOP
                        </Button>
                    </VStack>
                </Container>
            </Box>

            {/* Footer */}
            <Box py={10} px={4} bg={blackColor}>
                <Container maxW="container.xl">
                    <Flex
                        direction={{ base: "column", md: "row" }}
                        justify="space-between"
                        align="center"
                        borderTop="1px solid"
                        borderColor={theme.colors.neutral[800]}
                        pt={8}
                    >
                        <HStack spacing={2}>
                            <Icon as={FiCoffee} w={5} h={5} color={orangeColor} />
                            <Text
                                fontFamily="Montserrat, sans-serif"
                                fontSize="lg"
                                fontWeight="bold"
                                color={whiteColor}
                            >
                                LIGHT90
                            </Text>
                        </HStack>
                        <Text
                            fontSize="sm"
                            color={theme.colors.neutral[600]}
                            mt={{ base: 4, md: 0 }}
                        >
                            © {new Date().getFullYear()} Light90. All rights reserved.
                        </Text>
                    </Flex>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage;