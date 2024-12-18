import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { getTimes } from 'suncalc';
import { VitalUser, NotificationAlert, NextAlerts } from './types';
import theme from './theme';

// Component imports
import EstimatedNextAlerts from './components/EstimatedNextAlerts';
import NotificationSettings from './components/NotificationSettings';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  // State variables
  const [user, setUser] = useState<VitalUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return Notification.permission === 'granted';
  });
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [nextAlerts, setNextAlerts] = useState<NextAlerts>({ sunlight: null, coffee: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationDenied, setLocationDenied] = useState<boolean>(false);

  const nextAlertsRef = useRef<NextAlerts>({ sunlight: null, coffee: null });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Device detection for notifications
  const isMobileDevice = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

  // API URL
  const API_URL = process.env.REACT_APP_API_URL;

  // Connect to WHOOP
  const connectWhoop = () => {
    console.log('Connecting to WHOOP...');
    window.location.href = `${API_URL}/auth/whoop`;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/status`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to check authentication');
      }
    };

    checkAuth();
  }, [API_URL]);

  // Helper functions
  const addAlert = (type: 'sunlight' | 'coffee' | 'info' | null, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, type, message }]);
    return id;
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const adjustSunriseTime = (sunriseTime: Date) => {
    return new Date(sunriseTime.getTime() - 30 * 60 * 1000); // subtract 30 minutes
  };

  const formatCountdown = useCallback((targetDate: Date | null) => {
    if (!targetDate) return 'Calculating...';
    const diffMs = targetDate.getTime() - currentTime.getTime();
    if (diffMs < 0) return 'Due now';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [currentTime]);

  // Calculate average wake time from last 7 days
  const calculateAverageWakeTime = useCallback(() => {
    if (!user?.profile?.records || user.profile.records.length === 0) return null;

    const last7Days = user.profile.records.slice(0, 7);
    const totalMs = last7Days.reduce((sum, record) => {
      const wakeTime = new Date(record.end);
      const wakeHours = wakeTime.getHours();
      const wakeMinutes = wakeTime.getMinutes();
      return sum + (wakeHours * 60 + wakeMinutes) * 60 * 1000;
    }, 0);

    const avgMs = totalMs / last7Days.length;
    const now = new Date();
    const avgWakeTime = new Date(now.setHours(0, 0, 0, 0) + avgMs);

    return avgWakeTime;
  }, [user?.profile?.records]);

  // Calculate next alerts
  const calculateNextAlerts = useCallback(() => {
    if (!user?.profile?.records || !sunTimes?.sunrise) return null;

    const avgWakeTime = calculateAverageWakeTime();
    if (!avgWakeTime) return null;

    const now = new Date();
    let nextSunrise = adjustSunriseTime(new Date(sunTimes.sunrise));
    let nextCoffee = new Date(avgWakeTime.getTime() + 90 * 60 * 1000);

    if (nextSunrise < now) {
      nextSunrise = new Date(nextSunrise.setDate(nextSunrise.getDate() + 1));
    }
    if (nextCoffee < now) {
      nextCoffee = new Date(nextCoffee.setDate(nextCoffee.getDate() + 1));
    }

    return { nextSunrise, nextCoffee };
  }, [user?.profile?.records, sunTimes?.sunrise, calculateAverageWakeTime]);

  // Update alerts
  useEffect(() => {
    const updateAlerts = () => {
      const newAlerts = calculateNextAlerts();
      if (!newAlerts) return;

      if (
        newAlerts.nextSunrise?.getTime() !== nextAlertsRef.current.sunlight?.getTime() ||
        newAlerts.nextCoffee?.getTime() !== nextAlertsRef.current.coffee?.getTime()
      ) {
        nextAlertsRef.current = {
          sunlight: newAlerts.nextSunrise,
          coffee: newAlerts.nextCoffee
        };
        setNextAlerts(nextAlertsRef.current);
      }
    };

    updateAlerts();
    const timer = setInterval(updateAlerts, 1000);
    return () => clearInterval(timer);
  }, [calculateNextAlerts]);

  // Get location and calculate sun times
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
          if (error.code === 1) {
            setLocationDenied(true);
          }
          setError('Unable to get your location. Please enable location services in your browser settings.');
        }
      );
    }
  }, []);

  // Update sun times when location changes
  useEffect(() => {
    if (location) {
      const times = getTimes(new Date(), location.lat, location.lon);
      setSunTimes(times);
    }
  }, [location]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle notifications
  useEffect(() => {
    if (!notificationsEnabled || !nextAlerts.sunlight || !nextAlerts.coffee) return;

    const checkAndNotify = () => {
      const now = new Date();
      const messages = {
        sunlight: {
          title: '☀️ Time for Morning Sunlight!',
          body: 'Get 10-30 minutes of sunlight now to boost your energy and regulate your sleep cycle.'
        },
        coffee: {
          title: '☕ Perfect Time for Coffee!',
          body: 'Your cortisol has dropped - this is the optimal time for your first coffee.'
        }
      };

      if (nextAlerts.sunlight && nextAlerts.sunlight <= now) {
        const audio = new Audio('/notification.wav');
        audio.play().catch(console.error);

        if ('Notification' in window) {
          new Notification(messages.sunlight.title, {
            body: messages.sunlight.body,
            icon: '/logo192.svg'
          });
        }

        addAlert('sunlight', `${messages.sunlight.title} ${messages.sunlight.body}`);
      }

      if (nextAlerts.coffee && nextAlerts.coffee <= now) {
        const audio = new Audio('/notification.wav');
        audio.play().catch(console.error);

        if ('Notification' in window) {
          new Notification(messages.coffee.title, {
            body: messages.coffee.body,
            icon: '/logo192.svg'
          });
        }

        addAlert('coffee', `${messages.coffee.title} ${messages.coffee.body}`);
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 1000);
    return () => clearInterval(interval);
  }, [nextAlerts, notificationsEnabled]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  // Add a helper function to format time
  const formatTime = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    return format(date, 'h:mm a');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary
        fallback={
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              Something went wrong. Please try reloading the page.
            </Typography>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Box>
        }
      >
        <Container maxWidth={false} sx={{ backgroundColor: 'background.default', minHeight: '100vh', py: 4 }}>
          {/* Alert stack */}
          <Box sx={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: 600,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                severity="info"
                sx={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  borderRadius: 2,
                  backgroundColor: '#1976d2',
                  color: 'white',
                  '& .MuiAlert-icon': { color: 'white' },
                  '& .MuiAlert-action': { color: 'white' }
                }}
                onClose={() => removeAlert(alert.id)}
              >
                {alert.message}
              </Alert>
            ))}
          </Box>

          {/* Main content */}
          <Container maxWidth="md">
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 1
                }}
              >
                light90.com
              </Typography>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400
                }}
              >
                First light. First coffee.
              </Typography>
            </Box>

            {/* Main card */}
            <Card sx={{
              boxShadow: 3,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)'
            }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {!user ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    {locationDenied && (
                      <Alert
                        severity="warning"
                        sx={{
                          mb: 3,
                          maxWidth: 400,
                          mx: 'auto',
                          bgcolor: 'background.paper',
                          border: 1,
                          borderColor: 'rgba(255, 255, 255, 0.12)'
                        }}
                      >
                        Enable location to calculate sunrise times
                      </Alert>
                    )}
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={connectWhoop}
                      size="large"
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontSize: '1.1rem',
                        fontWeight: 500
                      }}
                    >
                      Connect WHOOP
                    </Button>
                  </Box>
                ) : (
                  <>
                    {/* Main Sections */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {/* Schedule Section */}
                      <Box>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            mb: 2
                          }}
                        >
                          Schedule
                        </Typography>
                        <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                          <EstimatedNextAlerts
                            nextAlerts={nextAlerts}
                            sunTimes={sunTimes}
                            formatCountdown={formatCountdown}
                            user={user}
                          />
                        </Box>
                      </Box>

                      <Divider />

                      {/* Settings Section */}
                      <Box>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            mb: 2
                          }}
                        >
                          Settings
                        </Typography>
                        <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                          <NotificationSettings
                            notificationsEnabled={notificationsEnabled}
                            requestNotificationPermission={requestNotificationPermission}
                            setNotificationsEnabled={setNotificationsEnabled}
                            isMobileDevice={isMobileDevice}
                          />
                        </Box>
                      </Box>

                      {/* Schedule Preview */}
                      {notificationsEnabled && (
                        <>
                          <Divider />
                          <Box>
                            <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.secondary',
                                  mb: 2
                                }}
                              >
                                Based on wake time: {user?.profile?.records ? format(calculateAverageWakeTime() || new Date(), 'h:mm a') : 'calculating...'}
                              </Typography>

                              <Box sx={{ mb: 3, pl: 2 }}>
                                <Box sx={{ mb: 2 }}>
                                  <Typography
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      color: 'text.primary',
                                      fontWeight: 500
                                    }}
                                  >
                                    ☀️ {formatTime(nextAlerts.sunlight)}
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        fontWeight: 400
                                      }}
                                    >
                                      30 min before sunrise
                                    </Typography>
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      color: 'text.primary',
                                      fontWeight: 500
                                    }}
                                  >
                                    ☕ {formatTime(nextAlerts.coffee)}
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        fontWeight: 400
                                      }}
                                    >
                                      90 min after wake
                                    </Typography>
                                  </Typography>
                                </Box>
                              </Box>

                              <Alert
                                severity="info"
                                sx={{
                                  mb: 2,
                                  bgcolor: 'background.paper',
                                  border: 1,
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  '& .MuiAlert-message': {
                                    color: 'info.main'
                                  }
                                }}
                              >
                                Times update based on your WHOOP sleep data
                              </Alert>
                              <Alert
                                severity="warning"
                                sx={{
                                  bgcolor: 'background.paper',
                                  border: 1,
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  '& .MuiAlert-message': {
                                    color: 'warning.main'
                                  }
                                }}
                              >
                                Keep tab open or add to home screen for notifications
                              </Alert>
                            </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Container>
        </Container>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
