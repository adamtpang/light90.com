import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Typography,
  Button,
  Alert as MuiAlert,
  useMediaQuery,
  createTheme,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { format, addMinutes } from 'date-fns';
import { getTimes } from 'suncalc';
import { VitalUser, SleepData, Alert, NextAlerts } from './types';
import theme from './theme';

// Component imports
import WhatToExpect from './components/WhatToExpect';
import SimulatedTimeline from './components/SimulatedTimeline';
import EstimatedNextAlerts from './components/EstimatedNextAlerts';
import TestNotifications from './components/TestNotifications';
import NotificationSettings from './components/NotificationSettings';
import MobileHomeScreenTips from './components/MobileHomeScreenTips';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  // State variables
  const [user, setUser] = useState<VitalUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return Notification.permission === 'granted';
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nextAlerts, setNextAlerts] = useState<NextAlerts>({ sunlight: null, coffee: null });
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextAlertsRef = useRef<NextAlerts>({ sunlight: null, coffee: null });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Device detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobileDevice = isIOS || isAndroid;
  const isSmallScreen = useMediaQuery('(max-width:600px)');

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
        console.log('Checking auth status at:', `${API_URL}/auth/status`);
        const response = await fetch(`${API_URL}/auth/status`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log('Auth response status:', response.status);
        const data = await response.json();
        console.log('Auth data:', data);

        if (data.authenticated) {
          setUser(data.user);
          if (data.user?.profile?.records) {
            console.log('User has sleep records:', data.user.profile.records.length);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to check authentication');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [API_URL]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return 'denied';
    }

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

  const sendTestNotification = async (type: 'sunlight' | 'coffee') => {
    try {
      if (!notificationsEnabled) {
        addAlert('info', 'Please enable notifications in the settings below first.');
        return;
      }

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

      // Show countdown message
      const countdownId = addAlert(
        'info',
        'Test notification will appear in 10 seconds. Try turning off your screen to test if notifications work while your phone is locked!'
      );

      // Wait 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Remove countdown message and show actual alert
      removeAlert(countdownId);

      // Create and play looping audio
      const audio = new Audio('/notification.wav');
      audio.loop = true;
      await audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });

      // Add the actual notification with its audio
      addAlert(type, `${messages[type].title} ${messages[type].body}`, audio);

    } catch (error) {
      console.error('Error sending notification:', error);
      addAlert('info', 'There was an error sending the notification.');
    }
  };

  // Helper function to add a new alert
  const addAlert = (type: 'sunlight' | 'coffee' | 'info' | null, message: string, audio?: HTMLAudioElement) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, type, message, audio }]);
    return id;
  };

  // Helper function to remove an alert
  const removeAlert = (id: string) => {
    setAlerts(prev => {
      const alertToRemove = prev.find(alert => alert.id === id);
      if (alertToRemove?.audio) {
        alertToRemove.audio.pause();
        alertToRemove.audio.currentTime = 0;
      }
      return prev.filter(alert => alert.id !== id);
    });
  };

  // Helper functions
  const formatTimeIfValid = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Calculate average wake time from last 7 days
  const calculateAverageWakeTime = React.useCallback(() => {
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

  // Memoize the calculation function
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
  }, [user?.profile?.records, sunTimes?.sunrise, calculateAverageWakeTime, adjustSunriseTime]);

  // Update alerts only when necessary
  useEffect(() => {
    const updateAlerts = () => {
      const newAlerts = calculateNextAlerts();
      if (!newAlerts) return;

      // Only update if values have changed
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

    // Initial update
    updateAlerts();

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Set up new timer
    timerRef.current = setInterval(updateAlerts, 1000);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [calculateNextAlerts]);

  // Get user's location and calculate sun times
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got location:', position.coords);
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

  // Calculate sun times when location changes
  useEffect(() => {
    if (location) {
      console.log('Calculating sun times for location:', location);
      const times = getTimes(new Date(), location.lat, location.lon);
      console.log('Sun times:', times);
      setSunTimes(times);
    }
  }, [location]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
        <Container
          maxWidth={false}
          sx={{
            backgroundColor: 'background.default',
            minHeight: '100vh',
            py: 4,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
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
              <MuiAlert
                key={alert.id}
                severity="info"
                sx={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  borderRadius: 2,
                  backgroundColor: '#1976d2',
                  color: 'white',
                  '& .MuiAlert-icon': {
                    color: 'white'
                  },
                  '& .MuiAlert-action': {
                    color: 'white'
                  }
                }}
                onClose={() => removeAlert(alert.id)}
              >
                {alert.message}
              </MuiAlert>
            ))}
          </Box>

          {/* Main content */}
          <Container maxWidth="md" sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: '100%' }}>
              {/* Title section */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    color: 'primary.main',
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    wordBreak: 'break-word'
                  }}
                >
                  light90.com
                </Typography>
                <Typography
                  variant="h6"
                  component="h2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    maxWidth: '600px',
                    mx: 'auto',
                    wordBreak: 'break-word'
                  }}
                >
                  First light. First coffee.
                </Typography>
              </Box>

              {/* Main card */}
              <Card>
                <CardContent sx={{
                  p: { xs: 2, sm: 4 },
                  overflowX: 'hidden',
                  width: '100%'
                }}>
                  {!user ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={connectWhoop}
                        size="large"
                        sx={{
                          py: 1.5,
                          px: 4,
                          fontSize: '1.1rem',
                          backgroundColor: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        }}
                      >
                        Connect to WHOOP
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <WhatToExpect />
                      <Divider sx={{ my: 4 }} />
                      <SimulatedTimeline
                        user={user}
                        sunTimes={sunTimes}
                        formatTimeIfValid={formatTimeIfValid}
                        adjustSunriseTime={adjustSunriseTime}
                      />
                      <Divider sx={{ my: 4 }} />
                      <EstimatedNextAlerts
                        nextAlerts={nextAlerts}
                        sunTimes={sunTimes}
                        formatCountdown={formatCountdown}
                        user={user}
                      />
                      <Divider sx={{ my: 4 }} />
                      <TestNotifications
                        sendTestNotification={sendTestNotification}
                        notificationsEnabled={notificationsEnabled}
                      />
                      <Divider sx={{ my: 4 }} />
                      <NotificationSettings
                        notificationsEnabled={notificationsEnabled}
                        requestNotificationPermission={requestNotificationPermission}
                        setNotificationsEnabled={setNotificationsEnabled}
                      />
                      {isMobileDevice && (
                        <>
                          <Divider sx={{ my: 4 }} />
                          <MobileHomeScreenTips
                            isIOS={isIOS}
                            isAndroid={isAndroid}
                            isMobileDevice={isMobileDevice}
                            isInstallable={isInstallable}
                            handleInstallClick={handleInstallClick}
                          />
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Container>
        </Container>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
