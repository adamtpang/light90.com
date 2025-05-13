import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Text, VStack, Fade, useTheme } from '@chakra-ui/react';
import LandingPage from './components/LandingPage.tsx';
import Dashboard from './components/Dashboard.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import useAuth from './hooks/useAuth.ts';
import Navbar from './components/Navbar.tsx';
import Footer from './components/Footer.tsx';

// Create a wrapper component to use useLocation for conditional Footer rendering
const AppContent = () => {
    const location = useLocation();
    const { user, loading, error } = useAuth();
    const theme = useTheme();

    if (loading) {
        return (
            <VStack minH="100vh" justify="center" align="center">
                <CircularProgress isIndeterminate color="orange.400" size="xl" />
                <Text mt={4} fontSize="lg" color="neutral.300">Loading your experience...</Text>
            </VStack>
        );
    }

    if (error) {
        return (
            <VStack minH="100vh" justify="center" align="center">
                <Text color="red.300" fontSize="xl" fontWeight="bold">Authentication Error</Text>
                <Text color="neutral.400" textAlign="center" px={4}>{error.message || 'Could not verify authentication status.'}</Text>
                <Text color="neutral.500" mt={2} fontSize="sm">Please try refreshing the page.</Text>
            </VStack>
        );
    }

    const showFooter = location.pathname !== '/dashboard';

    return (
        <Box display="flex" flexDirection="column" minHeight="100vh" bg={theme.colors.neutral[900]}>
            <Navbar />
            <Box flexGrow={1} pt={16}> {/* Add padding top to account for fixed Navbar */}
                <Fade in={true}>
                    <Routes>
                        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
                        <Route path="/auth/whoop/callback" element={<AuthCallback />} />
                        {/* Add other routes here */}
                    </Routes>
                </Fade>
            </Box>
            {showFooter && <Footer />}
        </Box>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;