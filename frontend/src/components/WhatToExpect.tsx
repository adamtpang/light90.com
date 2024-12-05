import React from 'react';
import { Box, Typography } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';

const WhatToExpect: React.FC = () => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        What to Expect
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          Based on your WHOOP wake-up time, Light90 will notify you:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WbSunnyIcon sx={{ color: 'secondary.main' }} />
            <Typography>When to get your morning sunlight</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CoffeeIcon sx={{ color: 'primary.main' }} />
            <Typography>When to have your first cup of coffee</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default WhatToExpect;