import React from 'react';
import { Box, Typography, Switch, Alert } from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

interface NotificationSettingsProps {
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<string>;
  setNotificationsEnabled: (enabled: boolean) => void;
  isMobileDevice: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
  isMobileDevice
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Notification Settings
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        {!isMobileDevice && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              💡 For reliable notifications that work even when your device is locked,
              please use Light90 on your mobile device and add it to your home screen.
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Light90 Notifications
              </Typography>
              {isMobileDevice && (
                <PhoneIphoneIcon sx={{ color: 'success.main', fontSize: 20 }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Get alerts for optimal sunlight and coffee timing
              {isMobileDevice ? ' (recommended for mobile)' : ''}
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