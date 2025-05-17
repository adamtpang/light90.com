import { extendTheme } from '@chakra-ui/react';

const colors = {
    brand: {
        900: '#1a365d',
        800: '#153e75',
        700: '#2a69ac',
    },
    neutral: {
        50: '#F7FAFC',
        100: '#EDF2F7',
        200: '#E2E8F0',
        300: '#CBD5E0',
        400: '#A0AEC0',
        500: '#718096',
        600: '#4A5568',
        700: '#2D3748',
        800: '#1A202C',
        900: '#171923',
    },
    orange: {
        100: '#FFF5E7',
        200: '#FFE4C3',
        300: '#FFD3A0',
        400: '#FFC27C',
        500: '#FFB158',
        600: '#FF9F34',
        700: '#D47F1A',
        800: '#AA600F',
        900: '#80470B',
    },
    yellow: {
        100: '#FFFFE0',
        200: '#FFFACD',
        300: '#FAFAD2',
        400: '#FFEFD5',
        500: '#FFDAB9',
        600: '#FFDEAD',
        700: '#F0E68C',
        800: '#BDB76B',
        900: '#808000',
    }
};

const theme = extendTheme({
    colors,
    fonts: {
        heading: "'Montserrat', sans-serif",
        body: "'Roboto', sans-serif",
    },
    styles: {
        global: {
            'html, body': {
                backgroundColor: 'neutral.900',
                color: 'white',
                lineHeight: 'tall',
            },
            a: {
                color: 'orange.400',
                _hover: {
                    textDecoration: 'underline',
                },
            },
        },
    },
});

export default theme;