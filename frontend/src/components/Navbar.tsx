import React from 'react';
import {
    Box,
    Flex,
    Avatar,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    useColorModeValue,
    Stack,
    Text,
    Link as ChakraLink,
    HStack,
    IconButton,
    useDisclosure,
    Collapse
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon, HamburgerIcon, CloseIcon, ChevronDownIcon } from '@chakra-ui/icons';
import useAuth from '../hooks/useAuth.ts';

const NavLink = ({ children, to }: { children: React.ReactNode; to: string }) => {
    const linkColor = useColorModeValue('neutral.700', 'neutral.200');
    const hoverBg = useColorModeValue('brand.50', 'brand.700');
    const hoverColor = useColorModeValue('brand.500', 'white');
    const activeLinkColor = useColorModeValue('brand.600', 'brand.300');

    return (
        <ChakraLink
            as={RouterLink}
            to={to}
            px={3}
            py={1}
            rounded={'md'}
            fontSize="sm"
            fontWeight="medium"
            fontFamily={"Roboto, sans-serif"}
            color={linkColor}
            _hover={{
                textDecoration: 'none',
                bg: hoverBg,
                color: hoverColor
            }}
            _activeLink={{
                fontWeight: 'semibold',
                color: activeLinkColor,
            }}
        >
            {children}
        </ChakraLink>
    );
}

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isOpen: isMobileNavOpen, onToggle: onMobileNavToggle } = useDisclosure();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Auto-detect backend URL based on environment
    const getBackendUrl = () => {
        // Force production URL when on production domain
        if (window.location.hostname === 'light90.com') {
            console.log('🚀 Navbar: light90.com detected, forcing Railway backend');
            return 'https://light90-backend-production.up.railway.app';
        }

        // If explicitly set, use that
        if (process.env.REACT_APP_BACKEND_URL) {
            return process.env.REACT_APP_BACKEND_URL;
        }

        // In production, use the Railway backend URL
        if (window.location.hostname !== 'localhost') {
            return 'https://light90-backend-production.up.railway.app';
        }

        // Default to localhost for development
        return 'http://localhost:5000';
    };

    const backendUrl = getBackendUrl();

    const navBg = useColorModeValue('white', 'neutral.900');
    const navBorderColor = useColorModeValue('neutral.200', 'neutral.700');
    const mobileNavToggleColor = useColorModeValue('neutral.600', 'neutral.300');
    const logoColor = useColorModeValue('brand.600', 'brand.300');

    const avatarBg = useColorModeValue('brand.100', 'brand.600');
    const avatarColor = useColorModeValue('brand.600', 'white');
    const userMenuTextColor = useColorModeValue('neutral.700', 'neutral.200');
    const chevronColor = useColorModeValue('neutral.600', 'neutral.300');
    const menuListBg = useColorModeValue('white', 'neutral.800');
    const menuListBorderColor = useColorModeValue('neutral.200', 'neutral.600');
    const menuItemHoverBg = useColorModeValue('neutral.100', 'neutral.700');
    const menuDividerBorderColor = useColorModeValue('neutral.200', 'neutral.600');
    const logoutItemColor = useColorModeValue('red.500', 'red.300');
    const logoutItemHoverBg = useColorModeValue('red.50', 'red.700');

    const mobileNavBorderColor = useColorModeValue("neutral.200", "neutral.700");

    return (
        <Box bg={navBg}
            px={{ base: 4, md: 8 }}
            py={2}
            borderBottom="1px"
            borderColor={navBorderColor}
            position="fixed"
            top={0}
            left={0}
            right={0}
            zIndex="sticky"
            boxShadow="sm"
        >
            <Flex h={12} alignItems={'center'} justifyContent={'space-between'} maxW="7xl" mx="auto">
                <IconButton
                    size={'md'}
                    icon={isMobileNavOpen ? <CloseIcon /> : <HamburgerIcon />}
                    aria-label={'Open Menu'}
                    display={{ md: 'none' }}
                    onClick={onMobileNavToggle}
                    variant="ghost"
                    color={mobileNavToggleColor}
                />
                <HStack spacing={{ base: 2, md: 6 }} alignItems={'center'}>
                    <ChakraLink as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
                        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color={logoColor} fontFamily="Montserrat, sans-serif">
                            Light90
                        </Text>
                    </ChakraLink>
                    <HStack as={'nav'} spacing={{ base: 2, md: 4 }} display={{ base: 'none', md: 'flex' }}>
                        <NavLink to="/">Home</NavLink>
                        {user && <NavLink to="/dashboard">Dashboard</NavLink>}
                        <NavLink to="/about">About</NavLink>
                    </HStack>
                </HStack>

                <Flex alignItems={'center'} spacing={{ base: 1, md: 3 }}>
                    {!user ? (
                        <Stack direction="row" spacing={{ base: 1, md: 2 }} alignItems="center">
                            <Button
                                as="a"
                                href={`${backendUrl}/auth/whoop`}
                                variant="outline"
                                colorScheme="brand"
                                size="xs"
                                fontSize="xs"
                                fontWeight="medium"
                                fontFamily={"Roboto, sans-serif"}
                            >
                                Sign In
                            </Button>
                            <Button
                                as="a"
                                href={`${backendUrl}/auth/whoop`}
                                colorScheme="brand"
                                size="xs"
                                fontSize="xs"
                                fontWeight="medium"
                                fontFamily={"Roboto, sans-serif"}
                                display={{ base: 'none', sm: 'inline-flex' }}
                            >
                                Sign Up
                            </Button>
                        </Stack>
                    ) : (
                        <Menu>
                            <MenuButton
                                as={Button}
                                rounded={'full'}
                                variant={'link'}
                                cursor={'pointer'}
                                minW={0}
                                _hover={{ textDecoration: 'none' }}
                                size="sm"
                            >
                                <HStack spacing={1}>
                                    <Avatar
                                        size={'xs'}
                                        bg={avatarBg}
                                        color={avatarColor}
                                    />
                                    <Text display={{ base: 'none', md: 'flex' }} fontSize="sm" fontWeight="medium" fontFamily={"Roboto, sans-serif"} color={userMenuTextColor}>{user.profile?.firstName || 'Account'}</Text>
                                    <ChevronDownIcon color={chevronColor} w={4} h={4} />
                                </HStack>
                            </MenuButton>
                            <MenuList
                                bg={menuListBg}
                                borderColor={menuListBorderColor}
                                boxShadow="lg"
                                py={1}
                                fontFamily={"Roboto, sans-serif"}
                            >
                                <MenuItem fontSize="sm" as={RouterLink} to="/profile" _hover={{ bg: menuItemHoverBg }} py={1}>Profile</MenuItem>
                                <MenuItem fontSize="sm" as={RouterLink} to="/settings" _hover={{ bg: menuItemHoverBg }} py={1}>Settings</MenuItem>
                                <MenuDivider borderColor={menuDividerBorderColor} my={1} />
                                <MenuItem fontSize="sm" onClick={() => {
                                    console.log('🔄 Clearing cache and re-authenticating...');

                                    // More aggressive cleanup for mobile
                                    try {
                                        // Clear localStorage
                                        localStorage.removeItem('light90_temp_user');
                                        localStorage.removeItem('light90_temp_auth');
                                        localStorage.removeItem('light90_jwt_token');

                                        // Also clear sessionStorage
                                        sessionStorage.clear();

                                        // Clear all localStorage items that might be related
                                        const keysToRemove = [];
                                        for (let i = 0; i < localStorage.length; i++) {
                                            const key = localStorage.key(i);
                                            if (key && key.includes('light90')) {
                                                keysToRemove.push(key);
                                            }
                                        }
                                        keysToRemove.forEach(key => localStorage.removeItem(key));

                                        console.log('✅ All storage cleared');
                                    } catch (e) {
                                        console.warn('Could not clear storage:', e);
                                    }

                                    // Force a hard reload to clear React state, then redirect
                                    const backendUrl = process.env.REACT_APP_BACKEND_URL ||
                                        (window.location.hostname !== 'localhost' ? 'https://light90-backend-production.up.railway.app' : 'http://localhost:5000');

                                    // Use window.location.replace for a hard navigation that clears everything
                                    window.location.replace(`${backendUrl}/auth/whoop`);
                                }} color={logoutItemColor} _hover={{ bg: logoutItemHoverBg }} py={1}>
                                    Reset Auth
                                </MenuItem>
                                <MenuItem fontSize="sm" onClick={logout} color={logoutItemColor} _hover={{ bg: logoutItemHoverBg }} py={1}>
                                    Sign out
                                </MenuItem>
                            </MenuList>
                        </Menu>
                    )}
                </Flex>
            </Flex>

            <Collapse in={isMobileNavOpen} animateOpacity>
                <Stack
                    as={"nav"}
                    spacing={2}
                    mt={2}
                    pb={3}
                    display={{ md: "none" }}
                    borderTop="1px"
                    borderColor={mobileNavBorderColor}
                    fontFamily={"Roboto, sans-serif"}
                >
                    <NavLink to="/">Home</NavLink>
                    {user && <NavLink to="/dashboard">Dashboard</NavLink>}
                    <NavLink to="/about">About</NavLink>
                    {user && (
                        <>
                            <Box borderTop="1px" borderColor={mobileNavBorderColor} pt={2} mt={2}>
                                <Button
                                    onClick={() => {
                                        console.log('🔄 Clearing cache and re-authenticating...');

                                        // More aggressive cleanup for mobile
                                        try {
                                            // Clear localStorage
                                            localStorage.removeItem('light90_temp_user');
                                            localStorage.removeItem('light90_temp_auth');
                                            localStorage.removeItem('light90_jwt_token');

                                            // Also clear sessionStorage
                                            sessionStorage.clear();

                                            // Clear all localStorage items that might be related
                                            const keysToRemove = [];
                                            for (let i = 0; i < localStorage.length; i++) {
                                                const key = localStorage.key(i);
                                                if (key && key.includes('light90')) {
                                                    keysToRemove.push(key);
                                                }
                                            }
                                            keysToRemove.forEach(key => localStorage.removeItem(key));

                                            console.log('✅ All storage cleared');
                                        } catch (e) {
                                            console.warn('Could not clear storage:', e);
                                        }

                                        // Force a hard reload to clear React state, then redirect
                                        const backendUrl = process.env.REACT_APP_BACKEND_URL ||
                                            (window.location.hostname !== 'localhost' ? 'https://light90-backend-production.up.railway.app' : 'http://localhost:5000');

                                        // Use window.location.replace for a hard navigation that clears everything
                                        window.location.replace(`${backendUrl}/auth/whoop`);
                                    }}
                                    variant="ghost"
                                    colorScheme="orange"
                                    size="sm"
                                    w="full"
                                    justifyContent="flex-start"
                                    fontFamily={"Roboto, sans-serif"}
                                >
                                    Reset Auth
                                </Button>
                                <Button
                                    onClick={logout}
                                    variant="ghost"
                                    colorScheme="red"
                                    size="sm"
                                    w="full"
                                    justifyContent="flex-start"
                                    fontFamily={"Roboto, sans-serif"}
                                    mt={1}
                                >
                                    Sign Out
                                </Button>
                            </Box>
                        </>
                    )}
                </Stack>
            </Collapse>
        </Box>
    );
}