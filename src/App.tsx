import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Card,
  CardContent,
  useMediaQuery
} from '@mui/material';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import { format, addMinutes } from 'date-fns';
import { getTimes } from 'suncalc';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffd700',
    },
    secondary: {
      main: '#6d4c41',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

interface SleepData {
  startTime: string;
  endTime: string;
  qualityScore: number;
}

interface LightExposure {
  date: string;
  duration: number;
}

const App: React.FC = () => {
  const [whoopAccessToken, setWhoopAccessToken] = useState<string | null>(localStorage.getItem('whoopAccessToken'));
  const [sleepData, setSleepData] = useState<SleepData | null>(null);
  const [lightExposure, setLightExposure] = useState<LightExposure | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    }
  }, []);

  useEffect(() => {
    if (location) {
      const times = getTimes(new Date(), location.lat, location.lon);
      setSunTimes(times);
    }
  }, [location]);

  const handleWhoopLogin = () => {
    const clientId = 'your-whoop-client-id';
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('offline read:recovery read:sleep read:workout');

    window.location.href = `https://api-7.whoop.com/oauth/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('whoopAccessToken');
    setWhoopAccessToken(null);
    setSleepData(null);
    setLightExposure(null);
  };

  const fetchSleepData = async () => {
    if (!whoopAccessToken) return;

    try {
      const response = await fetch('https://api-7.whoop.com/v1/activities/sleep', {
        headers: {
          'Authorization': `Bearer ${whoopAccessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sleep data');
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        const latestSleep = data.records[0];
        setSleepData({
          startTime: latestSleep.start,
          endTime: latestSleep.end,
          qualityScore: latestSleep.score
        });
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setError('Error fetching sleep data. Please try again.');
    }
  };

  const calculateOptimalSunlight = () => {
    if (!sleepData || !sunTimes) return null;

    const wakeTime = new Date(sleepData.endTime);
    const sunrise = new Date(sunTimes.sunrise);
    const sunset = new Date(sunTimes.sunset);

    const morningStart = wakeTime;
    const morningEnd = addMinutes(wakeTime, 120);

    const nextBedtime = new Date(sleepData.startTime);
    nextBedtime.setDate(nextBedtime.getDate() + 1);
    const afternoonStart = addMinutes(nextBedtime, -360);
    const afternoonEnd = addMinutes(nextBedtime, -240);

    return {
      morning: {
        start: morningStart,
        end: morningEnd,
        possible: morningStart >= sunrise && morningEnd <= sunset
      },
      afternoon: {
        start: afternoonStart,
        end: afternoonEnd,
        possible: afternoonStart >= sunrise && afternoonEnd <= sunset
      }
    };
  };

  const calculateOptimalCoffee = () => {
    if (!sleepData) return null;

    const wakeTime = new Date(sleepData.endTime);
    const optimalStart = addMinutes(wakeTime, 90);
    const optimalEnd = addMinutes(wakeTime, 120);

    return {
      start: optimalStart,
      end: optimalEnd
    };
  };

  const renderTimeRecommendation = (time: Date) => {
    return format(time, 'h:mm a');
  };

  const optimalTimes = calculateOptimalSunlight();
  const optimalCoffee = calculateOptimalCoffee();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" className="App">
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!whoopAccessToken ? (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Welcome to Light90
                </Typography>
                <Typography variant="body1" paragraph>
                  Connect your WHOOP to get personalized recommendations for optimal sunlight exposure and coffee timing.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleWhoopLogin}
                  startIcon={<WbSunnyIcon />}
                >
                  Connect WHOOP
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => setShowSettings(!showSettings)}
                  startIcon={<SettingsIcon />}
                >
                  Settings
                </Button>
                <Button
                  size="small"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                >
                  Logout
                </Button>
              </Box>

              {error && (
                <Paper sx={{ p: 2, bgcolor: 'error.dark' }}>
                  <Typography color="error">{error}</Typography>
                </Paper>
              )}

              {optimalTimes && optimalCoffee && sleepData && (
                <>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WbSunnyIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Morning Sunlight</Typography>
                      </Box>
                      <Typography variant="body1">
                        {optimalTimes.morning.possible ? (
                          `Get 10-30 minutes of sunlight between ${renderTimeRecommendation(optimalTimes.morning.start)} and ${renderTimeRecommendation(optimalTimes.morning.end)}`
                        ) : (
                          'Not possible due to sunrise/sunset times'
                        )}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CoffeeIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Optimal Coffee Time</Typography>
                      </Box>
                      <Typography variant="body1">
                        Have your coffee between {renderTimeRecommendation(optimalCoffee.start)} and {renderTimeRecommendation(optimalCoffee.end)}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WbSunnyIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Afternoon Sunlight</Typography>
                      </Box>
                      <Typography variant="body1">
                        {optimalTimes.afternoon.possible ? (
                          `Get 10-30 minutes of sunlight between ${renderTimeRecommendation(optimalTimes.afternoon.start)} and ${renderTimeRecommendation(optimalTimes.afternoon.end)}`
                        ) : (
                          'Not possible due to sunrise/sunset times'
                        )}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BedtimeIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Sleep Schedule</Typography>
                      </Box>
                      <Typography variant="body1">
                        Last night's sleep: {format(new Date(sleepData.startTime), 'h:mm a')} - {format(new Date(sleepData.endTime), 'h:mm a')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sleep quality score: {sleepData.qualityScore}
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
