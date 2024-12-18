import React from 'react';
import { Box, Typography, Switch } from '@mui/material';
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
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Notifications
            </Typography>
            {isMobileDevice && (
              <PhoneIphoneIcon sx={{ color: 'success.main', fontSize: 20 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Get alerts for sunlight and coffee timing
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
  );
};

export default NotificationSettings;