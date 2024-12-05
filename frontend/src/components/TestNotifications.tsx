import React from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';

interface TestNotificationsProps {
  sendTestNotification: (type: 'sunlight' | 'coffee') => Promise<void>;
  notificationsEnabled: boolean;
}

const TestNotifications: React.FC<TestNotificationsProps> = ({
  sendTestNotification,
  notificationsEnabled
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Test Notifications
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Test the notifications to make sure they work on your device:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            1. Press one of the test buttons below
          </Typography>
          <Typography variant="body2" color="text.secondary">
            2. When you see the countdown message, turn off your screen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            3. Wait for the notification (10 seconds) - it should wake your device!
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<WbSunnyIcon />}
              onClick={() => sendTestNotification('sunlight')}
              disabled={!notificationsEnabled}
              sx={{
                color: 'primary.main',
                borderColor: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  color: 'primary.dark',
                }
              }}
            >
              Test Sunlight Alert
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CoffeeIcon />}
              onClick={() => sendTestNotification('coffee')}
              disabled={!notificationsEnabled}
            >
              Test Coffee Alert
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TestNotifications;