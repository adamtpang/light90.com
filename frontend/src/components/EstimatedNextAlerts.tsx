import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
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
    <Box>
      {/* Schedule Grid */}
      <Grid container spacing={2}>
        {/* Wake Time */}
        <Grid item xs={12} sm={4}>
          <Card sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)'
          }}>
            <Box sx={{
              p: 2,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <HotelIcon sx={{ color: 'info.main', fontSize: 28 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" sx={{
                  color: 'info.main',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {averageWakeTime ? format(averageWakeTime, 'h:mm a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wake time
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Sunlight */}
        <Grid item xs={12} sm={4}>
          <Card sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)'
          }}>
            <Box sx={{
              p: 2,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <WbSunnyIcon sx={{ color: 'warning.main', fontSize: 28 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" sx={{
                  color: 'warning.main',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {nextAlerts.sunlight ? format(nextAlerts.sunlight, 'h:mm a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Sunlight
                </Typography>
                {nextAlerts.sunlight && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
                    in {formatCountdown(nextAlerts.sunlight)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Coffee */}
        <Grid item xs={12} sm={4}>
          <Card sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)'
          }}>
            <Box sx={{
              p: 2,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <CoffeeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {nextAlerts.coffee ? format(nextAlerts.coffee, 'h:mm a') : 'Calculating...'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Coffee
                </Typography>
                {nextAlerts.coffee && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
                    in {formatCountdown(nextAlerts.coffee)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EstimatedNextAlerts;