import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme.ts';
import MainApp from './components/MainApp.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';
import { AuthProvider } from './hooks/useAuth.tsx';

function App() {
    return (
        <ChakraProvider theme={theme}>
            <AuthProvider>
                <Router>
                    <Box>
                        <Routes>
                            <Route path="/" element={<MainApp />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                        </Routes>
                    </Box>
                </Router>
            </AuthProvider>
        </ChakraProvider>
    );
}

export default App;