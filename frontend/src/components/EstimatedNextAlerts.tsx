import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HotelIcon from '@mui/icons-material/Hotel';
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate average wake time
  const averageWakeTime = user?.profile?.records?.length ? (() => {
    const last7Days = user.profile.records.slice(0, Math.min(7, user.profile.records.length));
    const totalMs = last7Days.reduce((sum: number, record: any) => {
      const wakeTime = new Date(record.end);
      return sum + wakeTime.getTime();
    }, 0);
    return new Date(totalMs / last7Days.length);
  })() : null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Today's Schedule
      </Typography>
      <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AccessTimeIcon />
            <Typography variant="h6">
              {format(currentTime, 'h:mm:ss a')}
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Wake Time */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <HotelIcon sx={{ color: 'info.main' }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'info.main' }}>
                  {averageWakeTime ? format(averageWakeTime, 'h a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Average Wake Time (last {Math.min(7, user?.profile?.records?.length || 0)} days)
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Sunlight Time */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <WbSunnyIcon sx={{ color: 'secondary.main' }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'secondary.main' }}>
                  {nextAlerts.sunlight ? format(nextAlerts.sunlight, 'h a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {nextAlerts.sunlight && `in ${formatCountdown(nextAlerts.sunlight)}`}
                </Typography>
              </Box>
            </Box>
            {sunTimes?.sunrise && (
              <Typography variant="caption" sx={{ pl: 6, color: 'text.secondary', display: 'block' }}>
                Sunrise: {format(new Date(sunTimes.sunrise), 'h a')}
                {' '}(adjusted -30min for first light)
              </Typography>
            )}
          </Box>

          {/* Coffee Time */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <CoffeeIcon sx={{ color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>
                  {nextAlerts.coffee ? format(nextAlerts.coffee, 'h a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {nextAlerts.coffee && `in ${formatCountdown(nextAlerts.coffee)}`}
                </Typography>
              </Box>
            </Box>
            {averageWakeTime && (
              <Typography variant="caption" sx={{ pl: 6, color: 'text.secondary', display: 'block' }}>
                90 minutes after average wake time ({format(averageWakeTime, 'h a')})
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EstimatedNextAlerts;