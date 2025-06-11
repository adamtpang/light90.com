import React from 'react';
import { Box } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx';
import LandingPage from './LandingPage.tsx';
import Dashboard from './Dashboard.tsx';

const MainApp: React.FC = () => {
    const { user, loading } = useAuth();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
                {/* The loading state will be handled by individual components */}
            </Box>
        );
    }

    // If user is logged in, show dashboard
    if (user) {
        return <Dashboard />;
    }

    // If user is not logged in, show landing page
    return <LandingPage />;
};

export default MainApp;