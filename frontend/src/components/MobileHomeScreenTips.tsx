import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ShareIcon from '@mui/icons-material/Share';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';

interface MobileHomeScreenTipsProps {
  isIOS: boolean;
  isAndroid: boolean;
  isMobileDevice: boolean;
  isInstallable: boolean;
  handleInstallClick: () => void;
}

const MobileHomeScreenTips: React.FC<MobileHomeScreenTipsProps> = ({
  isIOS,
  isAndroid,
  isMobileDevice,
  isInstallable,
  handleInstallClick
}) => {
  if (!isMobileDevice) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        <PhoneIphoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Get Mobile Notifications
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          For the best experience with notifications, add Light90 to your home screen:
        </Typography>
        {isIOS ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2">
              1. Tap the <ShareIcon sx={{ verticalAlign: 'middle', width: 20, height: 20 }} /> Share button
            </Typography>
            <Typography variant="body2">
              2. Scroll down and tap "Add to Home Screen"
            </Typography>
            <Typography variant="body2">
              3. Tap "Add" in the top right
            </Typography>
          </Box>
        ) : isAndroid ? (
          <>
            {isInstallable ? (
              <Button
                variant="outlined"
                startIcon={<AddToHomeScreenIcon />}
                onClick={handleInstallClick}
                sx={{ mb: 2 }}
              >
                Add to Home Screen
              </Button>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2">
                  1. Tap the three dots menu (⋮) in Chrome
                </Typography>
                <Typography variant="body2">
                  2. Tap "Add to Home screen"
                </Typography>
                <Typography variant="body2">
                  3. Tap "Add" when prompted
                </Typography>
              </Box>
            )}
          </>
        ) : null}
      </Box>
    </Box>
  );
};

export default MobileHomeScreenTips;