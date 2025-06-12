import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.tsx';
import theme from './theme.ts';
import MainApp from './components/MainApp.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import PrivacyPolicy from './components/PrivacyPolicy.tsx';

// Error Boundary Component
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🚨 React Error Boundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '400px',
                        textAlign: 'center',
                        border: '1px solid #e53e3e',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: '#fed7d7'
                    }}>
                        <h2 style={{ color: '#c53030', marginBottom: '10px' }}>
                            🚨 App Crashed
                        </h2>
                        <p style={{ color: '#742a2a', marginBottom: '15px', fontSize: '14px' }}>
                            {this.state.error?.message || 'Something went wrong with the React app'}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#3182ce',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#38a169',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                        <details style={{ marginTop: '15px', textAlign: 'left' }}>
                            <summary style={{ cursor: 'pointer', color: '#742a2a' }}>
                                Technical Details
                            </summary>
                            <pre style={{
                                fontSize: '10px',
                                backgroundColor: '#f7fafc',
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                marginTop: '5px'
                            }}>
                                {this.state.error?.stack || 'No stack trace available'}
                            </pre>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function App() {
    return (
        <ErrorBoundary>
            <ChakraProvider theme={theme}>
                <AuthProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<MainApp />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                        </Routes>
                    </Router>
                </AuthProvider>
            </ChakraProvider>
        </ErrorBoundary>
    );
}

export default App;