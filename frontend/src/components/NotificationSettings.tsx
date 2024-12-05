import React from 'react';
import { Box, Typography, Switch } from '@mui/material';

interface NotificationSettingsProps {
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<string>;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Notification Settings
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Light90 Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Receive alerts for optimal sunlight and coffee timing
            </Typography>
          </Box>
          <Switch
            checked={notificationsEnabled}
            onChange={async (e) => {
              if (e.target.checked) {
                const permission = await requestNotificationPermission();
                setNotificationsEnabled(permission === 'granted');
              } else {
                setNotificationsEnabled(false);
              }
            }}
            color="primary"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationSettings;