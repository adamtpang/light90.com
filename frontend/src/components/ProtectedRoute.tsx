import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
    CircularProgress,
    Text,
    VStack,
    useTheme
} from '@chakra-ui/react';
import useAuth from '../hooks/useAuth.tsx'; // Changed .ts to .tsx

interface ProtectedRouteProps {
    children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading, error } = useAuth();
    const location = useLocation();
    const theme = useTheme();

    if (loading) {
        return (
            <VStack minH="100vh" justify="center" align="center" bg={theme.colors.neutral[900]}>
                <CircularProgress isIndeterminate color={theme.colors.orange[400]} size="xl" />
                <Text mt={4} fontSize="lg" color={theme.colors.neutral[300]}>
                    Loading session...
                </Text>
            </VStack>
        );
    }

    if (error) {
        return (
            <VStack minH="100vh" justify="center" align="center" bg={theme.colors.neutral[900]}>
                <Text color={theme.colors.red[300]} fontSize="xl" fontWeight="bold">Authentication Error</Text>
                <Text color={theme.colors.neutral[400]} textAlign="center" px={4}>
                    {error.message || 'Could not verify authentication status.'}
                </Text>
                <Text color={theme.colors.neutral[500]} mt={2} fontSize="sm">
                    Please try refreshing or logging in again.
                </Text>
            </VStack>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;