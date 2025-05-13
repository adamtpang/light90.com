import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ChakraProvider, extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
    initialColorMode: 'dark',
    useSystemColorMode: false,
};

const theme = extendTheme({
    config,
    styles: {
        global: (props) => ({
            body: {
                bg: props.colorMode === 'dark' ? 'neutral.900' : 'white',
                color: props.colorMode === 'dark' ? 'white' : 'neutral.800',
                minHeight: '100vh',
                transition: 'background-color 0.2s ease-out',
            },
            '#root': {
                minHeight: '100vh',
            }
        }),
    },
    fonts: {
        heading: `'Poppins', sans-serif`,
        body: `'Poppins', sans-serif`,
    },
    colors: {
        brand: {
            50: '#E6FFFA', // Lightest teal for backgrounds or highlights
            100: '#B2F5EA', // Light teal
            200: '#81E6D9', // Teal
            300: '#4FD1C5', // Darker teal
            400: '#38B2AC', // Dark teal for accents
            500: '#319795', // Main brand teal (good for buttons, links)
            600: '#2C7A7B', // Darker brand teal
            700: '#285E61', // Even darker teal
            800: '#234E52', // Very dark teal (good for text on light backgrounds)
            900: '#1D4044', // Darkest teal (good for dark mode text or backgrounds)
        },
        secondary: {
            50: '#FFF9E6',  // Lightest gold/yellow
            100: '#FEF3C7', // Light gold/yellow
            200: '#FDE68A', // Gold/yellow
            300: '#FCD34D', // Darker gold/yellow
            400: '#FBBF24', // Dark gold/yellow for accents (MAIN YELLOW)
            500: '#F59E0B', // Main brand gold/yellow (MAIN ORANGE-ISH)
            600: '#D97706', // Darker brand gold/yellow
            700: '#B45309', // Even darker gold/yellow
            800: '#92400E', // Very dark gold/yellow
            900: '#78350F', // Darkest gold/yellow
        },
        orange: {
            50: '#FFF5E6',
            100: '#FFE0B3',
            200: '#FFCB80',
            300: '#FFB64D',
            400: '#FFA11A',
            500: '#F58B00',
            600: '#D97700',
            700: '#B35F00',
            800: '#924C00',
            900: '#783C00',
        },
        yellow: {
            50: '#FFFFE6',
            100: '#FFFFB3',
            200: '#FFFF80',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F5B000',
            600: '#D99E00',
            700: '#B38B00',
            800: '#927500',
            900: '#786000',
        },
        neutral: {
            50: '#F7FAFC',  // Off-white
            100: '#EDF2F7', // Light gray
            200: '#E2E8F0', // Gray
            300: '#CBD5E0', // Darker gray
            400: '#A0AEC0', // Dark gray
            500: '#718096', // Main text gray
            600: '#4A5568', // Darker text gray
            700: '#2D3748', // Very dark gray (good for headings)
            800: '#1A202C', // Almost black
            900: '#171923', // Black
        }
    },
    components: {
        Button: {
            baseStyle: {
                fontWeight: 'medium',
                borderRadius: 'lg',
            },
            variants: {
                solid: (props) => ({
                    bg: props.colorScheme === 'brand' ? 'brand.500' : undefined,
                    color: props.colorScheme === 'brand' ? 'white' : undefined,
                    _hover: {
                        bg: props.colorScheme === 'brand' ? 'brand.600' : undefined,
                    }
                }),
                outline: (props) => ({
                    borderColor: props.colorScheme === 'brand' ? 'brand.500' : undefined,
                    color: props.colorScheme === 'brand' ? 'brand.500' : undefined,
                    _hover: {
                        bg: props.colorScheme === 'brand' ? 'brand.50' : undefined,
                    }
                }),
            }
        }
    }
});

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <ChakraProvider theme={theme}>
            <App />
        </ChakraProvider>
    </React.StrictMode>
);