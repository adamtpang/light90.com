import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { styled } from '@mui/material/styles';
import { format, addHours, startOfDay, addMinutes, setHours, setMinutes, addDays } from 'date-fns';
import { VitalUser } from '../types';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';

const TimelineProgress = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  width: '0%',
  height: '3px',
  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  boxShadow: '0 0 8px rgba(0,0,0,0.1)',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  transition: 'width 0.1s linear'
}));

const TimelinePoint = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  '& svg': {
    width: '18px',
    height: '18px',
    color: 'white'
  },
  '&.active': {
    animation: 'pulse 2s infinite'
  }
}));

const TimelineContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '80px',
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(4),
  width: '100%',
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(255, 153, 51, 0.4)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(255, 153, 51, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(255, 153, 51, 0)'
    }
  }
}));

const TimeMarker = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -24,
  transform: 'translateX(-50%)',
  textAlign: 'center',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -20,
    left: '50%',
    height: '10px',
    width: '2px',
    backgroundColor: theme.palette.grey[300]
  }
}));

interface SimulatedTimelineProps {
  user: VitalUser | null;
  sunTimes: any;
  formatTimeIfValid: (date: Date | string | null | undefined) => string;
  adjustSunriseTime: (sunriseTime: Date) => Date;
}

const SimulatedTimeline: React.FC<SimulatedTimelineProps> = ({
  user,
  sunTimes,
  formatTimeIfValid,
  adjustSunriseTime
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setIsSimulating(false);
    setProgress(0);
    setSimulatedTime(null);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const calculateEstimates = useCallback(() => {
    if (!user?.profile?.records || user.profile.records.length === 0) return null;

    const last7Days = user.profile.records.slice(0, 7);
    const avgWakeMinutes = last7Days.reduce((sum, record) => {
      const wakeTime = new Date(record.end);
      const minutes = wakeTime.getHours() * 60 + wakeTime.getMinutes();
      return sum + minutes;
    }, 0) / last7Days.length;

    const tomorrow = startOfDay(addDays(new Date(), 1));
    const avgWakeHours = Math.floor(avgWakeMinutes / 60);
    const avgWakeRemainingMinutes = Math.floor(avgWakeMinutes % 60);
    const avgWakeTime = setMinutes(setHours(tomorrow, avgWakeHours), avgWakeRemainingMinutes);

    const tomorrowSunrise = sunTimes?.sunrise
      ? adjustSunriseTime(addDays(new Date(sunTimes.sunrise), 1))
      : null;
    const optimalCoffeeTime = avgWakeTime ? addMinutes(avgWakeTime, 90) : null;

    return {
      date: tomorrow,
      avgWakeTime,
      sunrise: tomorrowSunrise,
      optimalCoffeeTime
    };
  }, [user?.profile?.records, sunTimes?.sunrise, adjustSunriseTime]);

  const handleSimulate = useCallback(() => {
    cleanup();
    setIsSimulating(true);
    setProgress(0);

    const estimates = calculateEstimates();
    if (!estimates) return;

    const { date: tomorrow } = estimates;
    setSimulatedTime(tomorrow);

    simulationRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          cleanup();
          return 0;
        }
        return prev + 1;
      });

      setSimulatedTime(current => {
        if (!current) return tomorrow;
        return addMinutes(current, 7.2); // 12 hours / 100 steps ≈ 7.2 minutes per step
      });
    }, 100);

    setTimeout(cleanup, 10000);
  }, [cleanup, calculateEstimates]);

  const estimates = calculateEstimates();
  if (!estimates) return null;

  const { date: tomorrow, avgWakeTime, sunrise, optimalCoffeeTime } = estimates;

  const timePoints = Array.from({ length: 13 }, (_, i) => ({
    time: addHours(tomorrow, i),
    label: format(addHours(tomorrow, i), 'h a')
  }));

  const calculatePosition = (time: Date | null) => {
    if (!time) return 0;
    const start = tomorrow.getTime();
    const end = addHours(tomorrow, 12).getTime();
    const position = ((time.getTime() - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
        Tomorrow's Timeline Simulation
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Estimated wake time: {avgWakeTime ? format(avgWakeTime, 'h a') : 'N/A'} (based on last 7 days)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tomorrow's sunrise: {sunrise ? format(sunrise, 'h a') : 'N/A'} (adjusted for first light)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Optimal coffee time: {optimalCoffeeTime ? format(optimalCoffeeTime, 'h a') : 'N/A'} (90 mins after wake)
        </Typography>
        {simulatedTime && (
          <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
            Simulated time: {format(simulatedTime, 'h:mm:ss a')}
          </Typography>
        )}
      </Box>
      <TimelineContainer>
        <TimelineProgress sx={{ width: `${progress}%` }} />
        {timePoints.map((point, index) => (
          <TimeMarker
            key={index}
            sx={{ left: `${(index / (timePoints.length - 1)) * 100}%` }}
          >
            <Typography variant="caption" color="text.secondary">
              {point.label}
            </Typography>
          </TimeMarker>
        ))}
        <TimelinePoint
          className={progress >= calculatePosition(avgWakeTime) ? 'active' : ''}
          sx={{
            left: `${calculatePosition(avgWakeTime)}%`,
            backgroundColor: 'info.main',
            opacity: progress >= calculatePosition(avgWakeTime) ? 1 : 0.5
          }}
        >
          <BedtimeIcon />
        </TimelinePoint>
        <TimelinePoint
          className={progress >= calculatePosition(sunrise) ? 'active' : ''}
          sx={{
            left: `${calculatePosition(sunrise)}%`,
            backgroundColor: 'secondary.main',
            opacity: progress >= calculatePosition(sunrise) ? 1 : 0.5
          }}
        >
          <WbSunnyIcon />
        </TimelinePoint>
        <TimelinePoint
          className={progress >= calculatePosition(optimalCoffeeTime) ? 'active' : ''}
          sx={{
            left: `${calculatePosition(optimalCoffeeTime)}%`,
            backgroundColor: 'primary.main',
            opacity: progress >= calculatePosition(optimalCoffeeTime) ? 1 : 0.5
          }}
        >
          <CoffeeIcon />
        </TimelinePoint>
      </TimelineContainer>
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSimulate}
          startIcon={<PlayArrowIcon />}
          disabled={isSimulating}
          sx={{
            minWidth: 200,
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark'
            }
          }}
        >
          {isSimulating ? 'Simulating...' : 'Run 10 Sec Simulation'}
        </Button>
      </Box>
      {isSimulating && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {progress >= calculatePosition(avgWakeTime) && progress < calculatePosition(sunrise) &&
              "🛏️ Wake-up time! Getting ready for morning light..."
            }
            {progress >= calculatePosition(sunrise) && progress < calculatePosition(optimalCoffeeTime) &&
              "☀️ Time for morning sunlight! Get 10-30 minutes of exposure now."
            }
            {progress >= calculatePosition(optimalCoffeeTime) &&
              "☕ Perfect time for your first coffee! Cortisol has dropped naturally."
            }
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SimulatedTimeline;