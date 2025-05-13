import React from 'react';
import {
    Box,
    Container,
    VStack,
    Heading,
    Text,
    Button,
    Stack,
    Icon,
    SimpleGrid,
    Flex,
    useTheme
} from '@chakra-ui/react';
import { FiSunrise, FiArrowRight, FiUserPlus, FiShoppingCart, FiCoffee } from 'react-icons/fi';
// Removed FiWatch, FiBell, FiZap as they might be redundant or can be simplified

const Feature = ({ title, text, icon, iconBgColor, iconColor }: { title: string; text: string; icon: React.ElementType, iconBgColor: string, iconColor: string }) => {
    const theme = useTheme();
    return (
        <Stack direction="column" align="center" spacing={3} textAlign="center">
            <Flex
                w={16}
                h={16}
                align="center"
                justify="center"
                rounded="full"
                bg={iconBgColor}
                color={iconColor}
                mb={1}
            >
                <Icon as={icon} w={8} h={8} />
            </Flex>
            <Text fontWeight={600} fontFamily="Montserrat, sans-serif" color="white">{title}</Text>
            <Text fontFamily="Roboto, sans-serif" color="neutral.300">{text}</Text>
        </Stack>
    );
};

const LandingPage = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const theme = useTheme();

    // Define main colors directly from the theme for dark mode
    const orangeColor = theme.colors.orange[400]; // Adjusted for better visibility on dark
    const yellowColor = theme.colors.yellow[400];
    const blackColor = theme.colors.neutral[900]; // True black for backgrounds or contrast text
    const whiteColor = theme.colors.white;       // True white for text

    const featuresBg = theme.colors.neutral[800]; // Dark background for features section
    const darkTextColor = whiteColor;
    const lightTextColor = theme.colors.neutral[300]; // Light gray for secondary text

    return (
        <Box fontFamily="Roboto, sans-serif" bg={blackColor} color={whiteColor}>
            {/* Hero Section */}
            <Box bgGradient={`linear(to-br, ${yellowColor}, ${orangeColor})`} py={{ base: 24, md: 32 }} textAlign="center">
                <Container maxW="3xl">
                    <VStack spacing={6}>
                        <Icon as={FiSunrise} w={20} h={20} color={whiteColor} />
                        <Heading
                            as="h1"
                            fontFamily="Montserrat, sans-serif"
                            fontSize={{ base: '4xl', sm: '5xl', md: '6xl' }}
                            fontWeight="extrabold"
                            color={whiteColor}
                            lineHeight="1.1"
                        >
                            Morning Light, Peak Energy.
                            <Text
                                as="span"
                                display="block"
                                fontFamily="Montserrat, sans-serif"
                                fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }}
                                fontWeight="medium"
                                mt={2}
                            >
                                Sync with WHOOP. Shine with Light90.
                            </Text>
                        </Heading>
                        <Text
                            fontFamily="Roboto, sans-serif"
                            fontSize={{ base: 'lg', md: 'xl' }}
                            color={theme.colors.neutral[200]} // Lighter text on gradient
                            maxW="xl"
                        >
                            Perfectly timed morning light, guided by WHOOP. Align your rhythm, energize your day.
                        </Text>
                        <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} justifyContent="center" pt={4}>
                            <Button
                                as="a"
                                href={`${backendUrl}/auth/whoop`}
                                bg={whiteColor}
                                color={orangeColor}
                                size="lg"
                                fontFamily="Montserrat, sans-serif"
                                fontWeight="bold"
                                px={10}
                                py={7}
                                rightIcon={<FiArrowRight />}
                                boxShadow="xl"
                                _hover={{ transform: 'translateY(-2px)', boxShadow: '2xl', bg: "neutral.100" }}
                            >
                                Connect WHOOP & Get Started
                            </Button>
                        </Stack>
                    </VStack>
                </Container>
            </Box>

            {/* Features Section */}
            <Box py={{ base: 16, md: 24 }} bg={featuresBg}>
                <Container maxW="5xl">
                    <VStack spacing={4} textAlign="center" mb={{ base: 12, md: 20 }}>
                        <Text color={orangeColor} fontFamily="Montserrat, sans-serif" fontWeight="semibold" fontSize="sm" textTransform="uppercase">How It Works</Text>
                        <Heading
                            as="h2"
                            fontFamily="Montserrat, sans-serif"
                            fontSize={{ base: '3xl', md: '4xl' }}
                            fontWeight="bold"
                            color={darkTextColor}
                        >
                            Simple Steps to Optimal Energy
                        </Heading>
                        <Text fontFamily="Roboto, sans-serif" fontSize="lg" color={lightTextColor} maxW="2xl">
                            Unlock your peak performance with precisely timed caffeine.
                        </Text>
                    </VStack>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 8, md: 10 }}>
                        <Feature
                            icon={FiUserPlus}
                            iconBgColor={theme.colors.orange[700]}
                            iconColor={theme.colors.orange[100]}
                            title={"1. Signup"}
                            text={"Create your Light90 account."}
                        />
                        <Feature
                            icon={FiShoppingCart}
                            iconBgColor={theme.colors.yellow[700]}
                            iconColor={theme.colors.yellow[100]}
                            title={"2. Buy"}
                            text={"Choose your subscription plan."}
                        />
                        <Feature
                            icon={FiCoffee}
                            iconBgColor={theme.colors.orange[700]}
                            iconColor={theme.colors.orange[100]}
                            title={"3. Get Pings"}
                            text={"Receive alerts for optimal coffee timing."}
                        />
                    </SimpleGrid>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box py={{ base: 20, md: 28 }} bg={blackColor} textAlign="center">
                <Container maxW="xl">
                    <VStack spacing={8}>
                        <Icon as={FiSunrise} w={16} h={16} color={yellowColor} />
                        <Heading
                            as="h2"
                            fontFamily="Montserrat, sans-serif"
                            fontSize={{ base: '3xl', md: '4xl' }}
                            fontWeight="bold"
                            color={whiteColor}
                        >
                            Ready to Brighten Your Days?
                        </Heading>
                        <Text fontFamily="Roboto, sans-serif" fontSize={{ base: 'lg', md: 'xl' }} color={orangeColor} fontWeight="medium">
                            Better mornings start now.
                        </Text>
                        <Button
                            as="a"
                            href={`${backendUrl}/auth/whoop`}
                            bg={yellowColor}
                            color={blackColor}
                            size="lg"
                            fontFamily="Montserrat, sans-serif"
                            fontWeight="bold"
                            textTransform="uppercase"
                            px={12}
                            py={8}
                            rightIcon={<FiArrowRight />}
                            boxShadow="2xl"
                            _hover={{ transform: 'translateY(-3px)', boxShadow: 'dark-lg', bg: theme.colors.orange[400] }}
                        >
                            Connect Your WHOOP
                        </Button>
                    </VStack>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage;