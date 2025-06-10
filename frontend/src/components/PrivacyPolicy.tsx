import React from 'react';
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    Divider,
    Link,
    UnorderedList,
    ListItem
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    return (
        <Box minH="100vh" bg="gray.50">
            <Container maxW="4xl" py={12}>
                <VStack spacing={8} align="stretch">
                    <Box textAlign="center">
                        <Heading as="h1" size="2xl" color="blue.600" mb={4}>
                            Privacy Policy
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            Last updated: {new Date().toLocaleDateString()}
                        </Text>
                    </Box>

                    <Divider />

                    <VStack spacing={6} align="stretch">
                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                1. Introduction
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                Light90 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fitness tracking service that integrates with WHOOP devices and other health platforms.
                            </Text>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                2. Information We Collect
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8" mb={3}>
                                We collect information you provide directly and through third-party integrations:
                            </Text>
                            <UnorderedList spacing={2} color="gray.700" ml={6}>
                                <ListItem>Account information (name, email address)</ListItem>
                                <ListItem>Health and fitness data from connected devices (WHOOP, etc.)</ListItem>
                                <ListItem>Sleep, recovery, strain, and workout metrics</ListItem>
                                <ListItem>Usage data and analytics</ListItem>
                                <ListItem>Device and browser information</ListItem>
                            </UnorderedList>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                3. How We Use Your Information
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8" mb={3}>
                                We use collected information to:
                            </Text>
                            <UnorderedList spacing={2} color="gray.700" ml={6}>
                                <ListItem>Provide personalized fitness and health insights</ListItem>
                                <ListItem>Track your progress and performance metrics</ListItem>
                                <ListItem>Send notifications and updates about your data</ListItem>
                                <ListItem>Improve our service and user experience</ListItem>
                                <ListItem>Ensure the security and integrity of our platform</ListItem>
                            </UnorderedList>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                4. Data Sharing and Third Parties
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                We integrate with WHOOP and other fitness platforms through their official APIs. We do not sell your personal data. We may share data only with your explicit consent or as required by law. All third-party integrations follow their respective privacy policies and terms of service.
                            </Text>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                5. Data Security
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                We implement appropriate technical and organizational security measures to protect your information. This includes encryption, secure data transmission, and regular security assessments. However, no method of transmission over the internet is 100% secure.
                            </Text>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                6. Your Rights and Choices
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8" mb={3}>
                                You have the right to:
                            </Text>
                            <UnorderedList spacing={2} color="gray.700" ml={6}>
                                <ListItem>Access, update, or delete your personal information</ListItem>
                                <ListItem>Disconnect third-party integrations at any time</ListItem>
                                <ListItem>Opt out of non-essential communications</ListItem>
                                <ListItem>Request data portability</ListItem>
                                <ListItem>Contact us with privacy concerns</ListItem>
                            </UnorderedList>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                7. Data Retention
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                We retain your information for as long as your account is active or as needed to provide services. You may delete your account and data at any time through your dashboard settings.
                            </Text>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                8. Changes to This Policy
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                            </Text>
                        </Box>

                        <Box>
                            <Heading as="h2" size="lg" color="gray.800" mb={4}>
                                9. Contact Us
                            </Heading>
                            <Text color="gray.700" lineHeight="1.8">
                                If you have any questions about this Privacy Policy or our data practices, please contact us at:{' '}
                                <Link color="blue.600" href="mailto:privacy@light90.com">
                                    privacy@light90.com
                                </Link>
                            </Text>
                        </Box>
                    </VStack>

                    <Divider />

                    <Box textAlign="center">
                        <Link as={RouterLink} to="/" color="blue.600" fontSize="lg">
                            ← Back to Light90
                        </Link>
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
};

export default PrivacyPolicy;