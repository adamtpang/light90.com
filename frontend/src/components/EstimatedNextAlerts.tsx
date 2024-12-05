import React from 'react';
import { Box, Typography } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import { format } from 'date-fns';
import { NextAlerts } from '../types';

interface EstimatedNextAlertsProps {
  nextAlerts: NextAlerts;
  sunTimes: any;
  formatCountdown: (date: Date | null) => string;
  user: any;
}

const EstimatedNextAlerts: React.FC<EstimatedNextAlertsProps> = ({
  nextAlerts,
  sunTimes,
  formatCountdown,
  user
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Estimated Next Alerts
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sunlight alert is based on local sunrise time (adjusted earlier to catch the first light).
          Coffee alert is based on your average wake time from the last 7 days.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <WbSunnyIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Sunlight alert: {nextAlerts.sunlight ? (
                  <>
                    {format(nextAlerts.sunlight, 'h:mm a')}
                    <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                      (in {formatCountdown(nextAlerts.sunlight)})
                    </Box>
                  </>
                ) : 'Calculating...'}
              </Typography>
            </Box>
            {nextAlerts.sunlight && (
              <Typography variant="caption" sx={{ pl: 4, color: 'text.secondary', display: 'block' }}>
                Based on sunrise at {sunTimes?.sunrise ? format(new Date(sunTimes.sunrise), 'h:mm a') : '...'}
                (adjusted 30min earlier for first light)
              </Typography>
            )}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <CoffeeIcon sx={{ color: 'primary.main' }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Coffee alert: {nextAlerts.coffee ? (
                  <>
                    {format(nextAlerts.coffee, 'h:mm a')}
                    <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                      (in {formatCountdown(nextAlerts.coffee)})
                    </Box>
                  </>
                ) : 'Calculating...'}
              </Typography>
            </Box>
            {nextAlerts.coffee && (
              <Typography variant="caption" sx={{ pl: 4, color: 'text.secondary', display: 'block' }}>
                Based on average wake time from last {Math.min(7, user?.profile?.records?.length || 0)} days + 90min
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EstimatedNextAlerts;