import React from 'react';
import {
    Box,
    VStack,
    Heading,
    Button,
    useTheme,
    Icon,
    Text,
    Container
} from '@chakra-ui/react';
import { FiLink } from 'react-icons/fi'; // Using a generic link icon for simplicity

const LandingPage: React.FC = () => {
    const backendUrl = 'http://localhost:5000'; // Direct URL, ensure this is correct for your setup
    const theme = useTheme();

    // Define colors from the theme, assuming dark mode is default
    const primaryTextColor = theme.colors.white;
    const buttonBgColor = theme.colors.white; // Or your desired button color, e.g., theme.colors.orange[400]
    const buttonTextColor = theme.colors.black; // Or theme.colors.white if using a dark button
    const pageBgColor = theme.colors.black; // Or your desired page background
    const accentColor = theme.colors.purple[400]; // Inspired by Luma's accent

    return (
        <Box
            bg={pageBgColor}
            minH="100vh"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            px={4}
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
        >
            <Container maxW="md" textAlign="center">
                <VStack spacing={8}>
                    {/* Optional: A subtle brand logo or icon if desired */}
                    {/* <Icon as={FiActivity} w={16} h={16} color={accentColor} mb={2} /> */}

                    <Heading
                        as="h1"
                        fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }}
                        fontWeight="bold"
                        color={primaryTextColor}
                        lineHeight="1.2"
                    >
                        Pair WHOOP
                    </Heading>

                    {/* Optional: A short descriptive text if needed
                    <Text fontSize={{ base: 'lg', md: 'xl' }} color={theme.colors.neutral[400]}>
                        Connect your WHOOP account to get started.
                    </Text>
                    */}

                    <Button
                        as="a"
                        href={`${backendUrl}/auth/whoop`}
                        bg={buttonBgColor}
                        color={buttonTextColor}
                        size="lg"
                        fontWeight="semibold"
                        px={12} // Increased padding for a larger button
                        py={7}  // Increased padding for a larger button
                        borderRadius="full" // Fully rounded like Luma's button
                        boxShadow={`0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)`}
                        transition="all 0.2s ease-in-out"
                        _hover={{
                            transform: 'translateY(-2px)',
                            boxShadow: `0 15px 30px -5px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.15)`,
                            // bg: theme.colors.gray[200] // Slight change on hover for white button
                        }}
                        _active={{
                            transform: 'translateY(0px)',
                            boxShadow: `0 5px 15px -5px rgba(0, 0, 0, 0.15), 0 5px 8px -5px rgba(0, 0, 0, 0.1)`,
                            // bg: theme.colors.gray[300]
                        }}
                        leftIcon={<Icon as={FiLink} />}
                    >
                        Connect
                    </Button>
                </VStack>
            </Container>

            {/* Optional: Footer with Luma-like branding if desired */}
            <Box position="absolute" bottom={8} textAlign="center" width="100%">
                <Text fontSize="sm" color={theme.colors.neutral[600]}>
                    Powered by <Box as="span" fontWeight="bold">Light90</Box>
                </Text>
            </Box>
        </Box>
    );
};

export default LandingPage;