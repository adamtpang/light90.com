import React from 'react';
import {
    Box,
    Container,
    Stack,
    Text,
    Link as ChakraLink,
    useColorModeValue,
    ButtonGroup,
    IconButton,
    SimpleGrid,
    Divider
} from '@chakra-ui/react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
    return (
        <Box
            bg={useColorModeValue('neutral.100', 'neutral.900')}
            color={useColorModeValue('neutral.700', 'neutral.200')}
            borderTop="1px"
            borderColor={useColorModeValue('neutral.200', 'neutral.700')}
            py={10}
        >
            <Container as={Stack} maxW={'7xl'} spacing={8}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8} mb={8}>
                    <Stack align={'flex-start'}>
                        <Text fontWeight={'semibold'} fontSize={'lg'} mb={2} color={useColorModeValue('brand.600', 'brand.300')} fontFamily="heading">
                            Light90
                        </Text>
                        <Text fontSize={'sm'} color={useColorModeValue('neutral.600', 'neutral.400')}>
                            Optimize your morning, optimize your life. Get your first light exposure right.
                        </Text>
                    </Stack>
                    <Stack align={'flex-start'}>
                        <Text fontWeight={'medium'} mb={2}>Product</Text>
                        <ChakraLink as={RouterLink} to="/features" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Features</ChakraLink>
                        <ChakraLink as={RouterLink} to="/pricing" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Pricing</ChakraLink>
                        <ChakraLink as={RouterLink} to="/how-it-works" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>How It Works</ChakraLink>
                    </Stack>
                    <Stack align={'flex-start'}>
                        <Text fontWeight={'medium'} mb={2}>Company</Text>
                        <ChakraLink as={RouterLink} to="/about" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>About Us</ChakraLink>
                        <ChakraLink as={RouterLink} to="/blog" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Blog</ChakraLink>
                        <ChakraLink as={RouterLink} to="/contact" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Contact</ChakraLink>
                    </Stack>
                    <Stack align={'flex-start'}>
                        <Text fontWeight={'medium'} mb={2}>Legal</Text>
                        <ChakraLink as={RouterLink} to="/privacy" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Privacy Policy</ChakraLink>
                        <ChakraLink as={RouterLink} to="/terms" _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}>Terms of Service</ChakraLink>
                    </Stack>
                </SimpleGrid>

                <Divider borderColor={useColorModeValue('neutral.300', 'neutral.600')} />

                <Stack
                    direction={{ base: 'column-reverse', md: 'row' }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={4}
                    pt={8}
                >
                    <Text fontSize="sm" color={useColorModeValue('neutral.600', 'neutral.400')}>
                        © {new Date().getFullYear()} Light90. All rights reserved.
                    </Text>
                    <ButtonGroup variant="ghost" color={useColorModeValue('neutral.600', 'neutral.400')}>
                        <IconButton
                            as="a"
                            href="#" // Replace with your Twitter link
                            aria-label="Twitter"
                            icon={<FaTwitter fontSize="1.25rem" />}
                            _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}
                        />
                        <IconButton
                            as="a"
                            href="#" // Replace with your GitHub link
                            aria-label="GitHub"
                            icon={<FaGithub fontSize="1.25rem" />}
                            _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}
                        />
                        <IconButton
                            as="a"
                            href="#" // Replace with your LinkedIn link
                            aria-label="LinkedIn"
                            icon={<FaLinkedin fontSize="1.25rem" />}
                            _hover={{ color: useColorModeValue('brand.500', 'brand.200') }}
                        />
                    </ButtonGroup>
                </Stack>
            </Container>
        </Box>
    );
};

export default Footer;