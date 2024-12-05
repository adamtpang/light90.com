import React from 'react';
import { Box, Typography } from '@mui/material';
import { useCountdown } from '../hooks/useCountdown';

interface TodaysTimelineProps {
  sleepData: any[];
  loading: boolean;
  error: string | null;
}

const TodaysTimeline: React.FC<TodaysTimelineProps> = ({ sleepData, loading, error }) => {
  const { hours, minutes, seconds } = useCountdown(sleepData[0]?.wake_time);

  if (loading) {
    return <Typography>Loading timeline...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!sleepData.length) {
    return <Typography>No sleep data available</Typography>;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Today's Timeline
      </Typography>
      <Typography>
        Next wake time in: {hours}h {minutes}m {seconds}s
      </Typography>
    </Box>
  );
};

export default TodaysTimeline;