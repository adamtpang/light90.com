import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme.ts';
import LandingPage from './components/LandingPage.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import Dashboard from './components/Dashboard.tsx';
import { AuthProvider } from './hooks/useAuth.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

function App() {
    return (
        <ChakraProvider theme={theme}>
            <AuthProvider>
                <Router>
                    <Box>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </Box>
                </Router>
            </AuthProvider>
        </ChakraProvider>
    );
}

export default App;