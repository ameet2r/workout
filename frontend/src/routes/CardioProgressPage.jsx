import React, { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import PoolIcon from '@mui/icons-material/Pool';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useHistory } from '../contexts/HistoryContext';
import { authenticatedGet } from '../utils/api';

const CardioProgressPage = () => {
  const { startDate, endDate } = useHistory();
  const [activityFilter, setActivityFilter] = useState('all');
  const [cardioSessions, setCardioSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch cardio sessions with garmin data
  useEffect(() => {
    const fetchCardioSessions = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        const sessions = await authenticatedGet(`/api/workout-sessions/cardio-summary/list${queryString}`);
        setCardioSessions(sessions);
      } catch (err) {
        console.error('Error fetching cardio sessions:', err);
        setCardioSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCardioSessions();
  }, [startDate, endDate]);

  // Filter by activity type
  const filteredSessions = useMemo(() => {
    if (activityFilter === 'all') return cardioSessions;
    return cardioSessions.filter(session => {
      const activityType = session.garmin_data?.activity_type?.toLowerCase() || '';
      return activityType.includes(activityFilter);
    });
  }, [cardioSessions, activityFilter]);

  // Calculate overall cardio stats
  const calculateCardioStats = () => {
    const stats = {
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      recentVO2Max: null,
      byActivityType: {},
    };

    cardioSessions.forEach(session => {
      const data = session.garmin_data;
      if (!data) return;

      const activityType = data.activity_type || 'Other';

      // Accumulate totals
      stats.totalDistance += data.distance || 0;
      stats.totalDuration += data.duration || 0;
      stats.totalCalories += data.calories || 0;

      // Track by activity type
      if (!stats.byActivityType[activityType]) {
        stats.byActivityType[activityType] = {
          distance: 0,
          duration: 0,
          calories: 0,
          count: 0,
        };
      }
      stats.byActivityType[activityType].distance += data.distance || 0;
      stats.byActivityType[activityType].duration += data.duration || 0;
      stats.byActivityType[activityType].calories += data.calories || 0;
      stats.byActivityType[activityType].count += 1;

      // Get most recent VO2 max
      if (data.vo2max && (!stats.recentVO2Max || new Date(session.start_time) > new Date(stats.recentVO2Max.date))) {
        stats.recentVO2Max = {
          value: data.vo2max,
          date: session.start_time,
        };
      }
    });

    return stats;
  };

  // Get VO2 max trend data
  const getVO2MaxTrend = () => {
    const vo2Sessions = filteredSessions
      .filter(s => s.garmin_data?.vo2max)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return {
      dates: vo2Sessions.map(s => new Date(s.start_time)),
      values: vo2Sessions.map(s => s.garmin_data.vo2max),
      hasData: vo2Sessions.length >= 3,
      count: vo2Sessions.length,
    };
  };

  // Get heart rate trends
  const getHeartRateTrends = () => {
    const hrSessions = filteredSessions
      .filter(s => s.garmin_data?.avg_heart_rate)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return {
      dates: hrSessions.map(s => new Date(s.start_time)),
      avgHR: hrSessions.map(s => s.garmin_data.avg_heart_rate),
      maxHR: hrSessions.map(s => s.garmin_data.max_heart_rate),
      hasData: hrSessions.length >= 3,
      count: hrSessions.length,
    };
  };

  // Get pace progression for running
  const getPaceProgressionData = () => {
    const runningSessions = filteredSessions
      .filter(s => {
        const activityType = s.garmin_data?.activity_type?.toLowerCase() || '';
        return activityType.includes('run') && s.garmin_data?.pace;
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return {
      dates: runningSessions.map(s => new Date(s.start_time)),
      pace: runningSessions.map(s => s.garmin_data.pace),
      hasData: runningSessions.length >= 5,
      count: runningSessions.length,
    };
  };

  // Get power progression for cycling
  const getPowerProgressionData = () => {
    const cyclingSessions = filteredSessions
      .filter(s => {
        const activityType = s.garmin_data?.activity_type?.toLowerCase() || '';
        return activityType.includes('cycl') && s.garmin_data?.avg_power;
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return {
      dates: cyclingSessions.map(s => new Date(s.start_time)),
      power: cyclingSessions.map(s => s.garmin_data.avg_power),
      hasData: cyclingSessions.length >= 5,
      count: cyclingSessions.length,
    };
  };

  // Get training load data
  const getTrainingLoadData = () => {
    const trainingEffectSessions = filteredSessions
      .filter(s => s.garmin_data?.training_effect || s.garmin_data?.anaerobic_training_effect)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return {
      dates: trainingEffectSessions.map(s => new Date(s.start_time)),
      aerobic: trainingEffectSessions.map(s => s.garmin_data.training_effect || 0),
      anaerobic: trainingEffectSessions.map(s => s.garmin_data.anaerobic_training_effect || 0),
      recovery: trainingEffectSessions.map(s => s.garmin_data.recovery_time || 0),
      hasData: trainingEffectSessions.length >= 3,
      count: trainingEffectSessions.length,
    };
  };

  // Get weekly volume data
  const getWeeklyVolumeData = () => {
    const weeklyData = {};

    filteredSessions.forEach(session => {
      const date = new Date(session.start_time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          date: weekStart,
          distance: 0,
          duration: 0,
          byActivity: {},
        };
      }

      const activityType = session.garmin_data?.activity_type || 'Other';
      weeklyData[weekKey].distance += session.garmin_data?.distance || 0;
      weeklyData[weekKey].duration += session.garmin_data?.duration || 0;

      if (!weeklyData[weekKey].byActivity[activityType]) {
        weeklyData[weekKey].byActivity[activityType] = 0;
      }
      weeklyData[weekKey].byActivity[activityType] += session.garmin_data?.distance || 0;
    });

    const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date - b.date);

    return {
      weeks: sortedWeeks.map(w => w.date),
      distance: sortedWeeks.map(w => w.distance / 1000), // Convert to km
      duration: sortedWeeks.map(w => w.duration / 60), // Convert to minutes
      byActivity: sortedWeeks.map(w => w.byActivity),
    };
  };

  // Get activity distribution
  const getActivityDistribution = () => {
    const distribution = {};

    cardioSessions.forEach(session => {
      const activityType = session.garmin_data?.activity_type || 'Other';
      if (!distribution[activityType]) {
        distribution[activityType] = 0;
      }
      distribution[activityType] += 1;
    });

    return Object.entries(distribution).map(([activity, count]) => ({
      label: activity,
      value: count,
    }));
  };

  const stats = calculateCardioStats();
  const vo2MaxData = getVO2MaxTrend();
  const heartRateData = getHeartRateTrends();
  const paceData = getPaceProgressionData();
  const powerData = getPowerProgressionData();
  const trainingLoadData = getTrainingLoadData();
  const weeklyVolumeData = getWeeklyVolumeData();
  const activityDistribution = getActivityDistribution();

  // Format helpers
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (minPerKm) => {
    const mins = Math.floor(minPerKm);
    const secs = Math.floor((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  };

  // Grayed-out card component
  const InsufficientDataCard = ({ title, icon, message, currentCount, requiredCount }) => (
    <Card sx={{ opacity: 0.5, position: 'relative' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" ml={1}>
            {title}
          </Typography>
          <Tooltip title={message}>
            <InfoOutlinedIcon sx={{ ml: 'auto', fontSize: 20, color: 'text.secondary' }} />
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" align="center">
          Need {requiredCount - currentCount} more workouts to show trends
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          ({currentCount}/{requiredCount} workouts)
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Cardio Progress
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (cardioSessions.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Cardio Progress
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No cardio activities found
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={2}>
            Upload Garmin activities to see your cardio progress and analytics
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cardio Progress</Typography>
        <ToggleButtonGroup
          value={activityFilter}
          exclusive
          onChange={(e, newValue) => newValue && setActivityFilter(newValue)}
          size="small"
        >
          <ToggleButton value="all">
            <FitnessCenterIcon sx={{ mr: 0.5 }} fontSize="small" />
            All
          </ToggleButton>
          <ToggleButton value="run">
            <DirectionsRunIcon sx={{ mr: 0.5 }} fontSize="small" />
            Running
          </ToggleButton>
          <ToggleButton value="cycl">
            <DirectionsBikeIcon sx={{ mr: 0.5 }} fontSize="small" />
            Cycling
          </ToggleButton>
          <ToggleButton value="swim">
            <PoolIcon sx={{ mr: 0.5 }} fontSize="small" />
            Swimming
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Distance
              </Typography>
              <Typography variant="h4">
                {formatDistance(stats.totalDistance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cardioSessions.length} activities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Duration
              </Typography>
              <Typography variant="h4">
                {formatDuration(stats.totalDuration)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Calories
              </Typography>
              <Typography variant="h4">
                {Math.round(stats.totalCalories).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Recent VO2 Max
              </Typography>
              {stats.recentVO2Max ? (
                <>
                  <Typography variant="h4">
                    {stats.recentVO2Max.value.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ml/kg/min
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fitness Trends Section */}
      <Typography variant="h5" gutterBottom mt={4}>
        Fitness Trends
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          {vo2MaxData.hasData ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">VO2 Max Progression</Typography>
                </Box>
                {vo2MaxData.dates && vo2MaxData.dates.length > 0 && vo2MaxData.values && vo2MaxData.values.length > 0 ? (
                  <LineChart
                    height={300}
                    series={[
                      {
                        data: vo2MaxData.values,
                        label: 'VO2 Max (ml/kg/min)',
                        color: '#ff6b6b',
                      },
                    ]}
                    xAxis={[
                      {
                        data: vo2MaxData.dates,
                        scaleType: 'time',
                        valueFormatter: (date) => date.toLocaleDateString(),
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No VO2 max data available for selected activity type
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            <InsufficientDataCard
              title="VO2 Max Progression"
              icon={<TrendingUpIcon />}
              message="Need at least 3 activities with VO2 max data to show trends"
              currentCount={vo2MaxData.count}
              requiredCount={3}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {heartRateData.hasData ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <FavoriteIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Heart Rate Trends</Typography>
                </Box>
                {heartRateData.dates && heartRateData.dates.length > 0 && heartRateData.avgHR && heartRateData.avgHR.length > 0 ? (
                  <LineChart
                    height={300}
                    series={[
                      {
                        data: heartRateData.avgHR,
                        label: 'Avg Heart Rate',
                        color: '#e74c3c',
                      },
                      {
                        data: heartRateData.maxHR || [],
                        label: 'Max Heart Rate',
                        color: '#c0392b',
                      },
                    ]}
                    xAxis={[
                      {
                        data: heartRateData.dates,
                        scaleType: 'time',
                        valueFormatter: (date) => date.toLocaleDateString(),
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No heart rate data available for selected activity type
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            <InsufficientDataCard
              title="Heart Rate Trends"
              icon={<FavoriteIcon />}
              message="Need at least 3 activities with heart rate data to show trends"
              currentCount={heartRateData.count}
              requiredCount={3}
            />
          )}
        </Grid>
      </Grid>

      {/* Activity Volume Section */}
      <Typography variant="h5" gutterBottom mt={4}>
        Activity Volume
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Distance
              </Typography>
              {weeklyVolumeData.distance.length > 0 ? (
                <BarChart
                  height={300}
                  series={[
                    {
                      data: weeklyVolumeData.distance,
                      label: 'Distance (km)',
                      color: '#3498db',
                    },
                  ]}
                  xAxis={[
                    {
                      data: weeklyVolumeData.weeks,
                      scaleType: 'band',
                      valueFormatter: (date) => date.toLocaleDateString(),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No data available for selected activity type
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity Distribution
              </Typography>
              {activityDistribution.length > 0 ? (
                <PieChart
                  series={[
                    {
                      data: activityDistribution,
                      highlightScope: { faded: 'global', highlighted: 'item' },
                    },
                  ]}
                  height={300}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No activity data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics Section */}
      <Typography variant="h5" gutterBottom mt={4}>
        Performance Metrics
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          {paceData.hasData ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DirectionsRunIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Running Pace Progression</Typography>
                </Box>
                {paceData.dates && paceData.dates.length > 0 && paceData.pace && paceData.pace.length > 0 ? (
                  <LineChart
                    height={300}
                    series={[
                      {
                        data: paceData.pace,
                        label: 'Pace (min/km)',
                        color: '#2ecc71',
                        valueFormatter: (value) => formatPace(value),
                      },
                    ]}
                    xAxis={[
                      {
                        data: paceData.dates,
                        scaleType: 'time',
                        valueFormatter: (date) => date.toLocaleDateString(),
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No pace data available for selected activity type
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            <InsufficientDataCard
              title="Running Pace Progression"
              icon={<DirectionsRunIcon />}
              message="Need at least 5 running activities with pace data to show trends"
              currentCount={paceData.count}
              requiredCount={5}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {powerData.hasData ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DirectionsBikeIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Cycling Power Progression</Typography>
                </Box>
                {powerData.dates && powerData.dates.length > 0 && powerData.power && powerData.power.length > 0 ? (
                  <LineChart
                    height={300}
                    series={[
                      {
                        data: powerData.power,
                        label: 'Power (watts)',
                        color: '#f39c12',
                      },
                    ]}
                    xAxis={[
                      {
                        data: powerData.dates,
                        scaleType: 'time',
                        valueFormatter: (date) => date.toLocaleDateString(),
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No power data available for selected activity type
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            <InsufficientDataCard
              title="Cycling Power Progression"
              icon={<DirectionsBikeIcon />}
              message="Need at least 5 cycling activities with power data to show trends"
              currentCount={powerData.count}
              requiredCount={5}
            />
          )}
        </Grid>
      </Grid>

      {/* Training Load & Recovery Section */}
      <Typography variant="h5" gutterBottom mt={4}>
        Training Load & Recovery
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid size={12}>
          {trainingLoadData.hasData ? (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SpeedIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Training Effect</Typography>
                </Box>
                {trainingLoadData.dates && trainingLoadData.dates.length > 0 ? (
                  <LineChart
                    height={300}
                    series={[
                      {
                        data: trainingLoadData.aerobic || [],
                        label: 'Aerobic Training Effect',
                        color: '#3498db',
                      },
                      {
                        data: trainingLoadData.anaerobic || [],
                        label: 'Anaerobic Training Effect',
                        color: '#e74c3c',
                      },
                    ]}
                    xAxis={[
                      {
                        data: trainingLoadData.dates,
                        scaleType: 'time',
                        valueFormatter: (date) => date.toLocaleDateString(),
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No training effect data available for selected activity type
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            <InsufficientDataCard
              title="Training Effect"
              icon={<SpeedIcon />}
              message="Need at least 3 activities with training effect data to show trends"
              currentCount={trainingLoadData.count}
              requiredCount={3}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default CardioProgressPage;
