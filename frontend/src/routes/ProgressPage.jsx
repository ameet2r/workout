import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  TextField,
  TableSortLabel,
  Button,
  ButtonGroup
} from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { useNavigate } from 'react-router-dom'
import { authenticatedGet } from '../utils/api'
import BodyVisualization2D from '../components/BodyVisualization2D'
import FrequencyLegend from '../components/FrequencyLegend'

const ProgressPage = () => {
  const { exercises, exerciseVersions } = useExercises()
  const {
    workoutSessions,
    loading,
    error,
    startDate,
    endDate,
    updateDateRange,
    getLocalDateString
  } = useHistory()
  const navigate = useNavigate()
  const [selectedExerciseVersionId, setSelectedExerciseVersionId] = useState('')
  const [bodyPartSortOrder, setBodyPartSortOrder] = useState('desc')
  const [cardioSessions, setCardioSessions] = useState([])
  const [cardioLoading, setCardioLoading] = useState(false)

  // Fetch cardio sessions with garmin data
  useEffect(() => {
    const fetchCardioSessions = async () => {
      if (!startDate || !endDate) return

      setCardioLoading(true)
      try {
        const params = new URLSearchParams()
        if (startDate) params.append('start_date', startDate)
        if (endDate) params.append('end_date', endDate)
        const queryString = params.toString() ? `?${params.toString()}` : ''

        const sessions = await authenticatedGet(`/api/workout-sessions/cardio-summary/list${queryString}`)
        setCardioSessions(sessions)
      } catch (err) {
        console.error('Error fetching cardio sessions:', err)
        setCardioSessions([])
      } finally {
        setCardioLoading(false)
      }
    }

    fetchCardioSessions()
  }, [startDate, endDate])

  const handleQuickDateSelect = (range) => {
    const today = new Date()
    const todayString = getLocalDateString(today)

    switch (range) {
      case 'all':
        updateDateRange('', '')
        break
      case 'year':
        const yearAgo = new Date(today)
        yearAgo.setFullYear(today.getFullYear() - 1)
        updateDateRange(getLocalDateString(yearAgo), todayString)
        break
      case '3months':
        const threeMonthsAgo = new Date(today)
        threeMonthsAgo.setMonth(today.getMonth() - 3)
        updateDateRange(getLocalDateString(threeMonthsAgo), todayString)
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setDate(today.getDate() - 30)
        updateDateRange(getLocalDateString(monthAgo), todayString)
        break
      default:
        break
    }
  }

  // Only include completed sessions for progress analytics
  const completedSessions = workoutSessions.filter(s => s.end_time)

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Unknown Exercise'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
  }

  const calculateOverallStats = () => {
    const totalWorkouts = completedSessions.length
    let totalVolume = 0
    let totalDuration = 0
    let totalSets = 0

    completedSessions.forEach(session => {
      // Calculate volume
      session.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          if (set.weight) {
            totalVolume += set.weight * set.reps
          }
          totalSets++
        })
      })

      // Calculate duration
      if (session.end_time) {
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)
        totalDuration += (end - start) / 60000 // Convert to minutes
      }
    })

    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0

    return { totalWorkouts, totalVolume, avgDuration, totalSets }
  }

  const getExerciseProgressData = (exerciseVersionId) => {
    const data = []

    completedSessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        if (exercise.exercise_version_id === exerciseVersionId) {
          exercise.sets?.forEach(set => {
            // Include all sets, even those without weight (bodyweight exercises)
            data.push({
              date: new Date(session.start_time),
              weight: set.weight || 0,
              reps: set.reps || 0,
              volume: (set.weight || 0) * (set.reps || 0)
            })
          })
        }
      })
    })

    // Sort by date and group by session
    data.sort((a, b) => a.date - b.date)

    // Group by date and get max weight/reps for each session
    const groupedByDate = {}
    data.forEach(point => {
      const dateKey = point.date.toISOString().split('T')[0]
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = point
      } else {
        // For weighted exercises, track max weight. For bodyweight, track max reps
        if (point.weight > 0 && point.weight > groupedByDate[dateKey].weight) {
          groupedByDate[dateKey] = point
        } else if (point.weight === 0 && groupedByDate[dateKey].weight === 0 && point.reps > groupedByDate[dateKey].reps) {
          groupedByDate[dateKey] = point
        }
      }
    })

    return Object.values(groupedByDate)
  }

  const getWorkoutFrequencyData = () => {
    const weeklyData = {}

    completedSessions.forEach(session => {
      const date = new Date(session.start_time)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]

      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
    })

    return Object.entries(weeklyData)
      .map(([date, count]) => ({ date: new Date(date), count }))
      .sort((a, b) => a.date - b.date)
  }

  // Get all unique exercise versions that have been performed
  const getPerformedExerciseVersions = () => {
    const performedIds = new Set()
    completedSessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        if (exercise.sets && exercise.sets.length > 0) {
          performedIds.add(exercise.exercise_version_id)
        }
      })
    })
    return exerciseVersions.filter(v => performedIds.has(v.id))
  }

  const getBodyPartFrequency = () => {
    const bodyPartCounts = {}

    // Count muscle groups from exercises (using all completed sessions since they're already filtered by date)
    completedSessions.forEach(session => {
      session.exercises?.forEach(sessionExercise => {
        const version = exerciseVersions.find(v => v.id === sessionExercise.exercise_version_id)
        if (version) {
          const exercise = exercises.find(e => e.id === version.exercise_id)
          if (exercise?.muscle_groups) {
            exercise.muscle_groups.forEach(muscleGroup => {
              bodyPartCounts[muscleGroup] = (bodyPartCounts[muscleGroup] || 0) + 1
            })
          }
        }
      })
    })

    // Convert to array and sort
    return Object.entries(bodyPartCounts)
      .map(([bodyPart, count]) => ({ bodyPart, count }))
      .sort((a, b) => bodyPartSortOrder === 'desc' ? b.count - a.count : a.count - b.count)
  }

  const getCardioStats = () => {
    if (cardioSessions.length === 0) {
      return null
    }

    let totalDistance = 0
    let recentVO2Max = null

    cardioSessions.forEach(session => {
      const data = session.garmin_data
      totalDistance += data?.distance || 0

      // Get most recent VO2 max
      if (data?.vo2max && (!recentVO2Max || new Date(session.start_time) > new Date(recentVO2Max.date))) {
        recentVO2Max = {
          value: data.vo2max,
          date: session.start_time,
        }
      }
    })

    return {
      count: cardioSessions.length,
      totalDistance: totalDistance / 1000, // Convert to km
      recentVO2Max,
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Progress Analytics
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  if (completedSessions.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Progress Analytics
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No completed workouts yet. Complete your first workout to see progress analytics!
          </Typography>
        </Paper>
      </Box>
    )
  }

  const stats = calculateOverallStats()
  const performedVersions = getPerformedExerciseVersions()
  const progressData = selectedExerciseVersionId ? getExerciseProgressData(selectedExerciseVersionId) : []
  const frequencyData = getWorkoutFrequencyData()
  const bodyPartFrequency = getBodyPartFrequency()
  const cardioStats = getCardioStats()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Progress Analytics
      </Typography>

      {/* Date Range Filter */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Date Range
        </Typography>
        <Box sx={{ mb: 3 }}>
          <ButtonGroup variant="outlined" size="small" sx={{ mb: 2 }}>
            <Button onClick={() => handleQuickDateSelect('month')}>Last 30 Days</Button>
            <Button onClick={() => handleQuickDateSelect('3months')}>Last 3 Months</Button>
            <Button onClick={() => handleQuickDateSelect('year')}>Last Year</Button>
            <Button onClick={() => handleQuickDateSelect('all')}>All Time</Button>
          </ButtonGroup>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => updateDateRange(e.target.value, endDate)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => updateDateRange(startDate, e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Overall Statistics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Workouts
              </Typography>
              <Typography variant="h4">
                {stats.totalWorkouts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Volume
              </Typography>
              <Typography variant="h4">
                {stats.totalVolume.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                lbs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg Duration
              </Typography>
              <Typography variant="h4">
                {stats.avgDuration}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Sets
              </Typography>
              <Typography variant="h4">
                {stats.totalSets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cardio Overview */}
      {cardioStats && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <DirectionsRunIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Cardio Overview</Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/progress/cardio')}
            >
              View Details
            </Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Cardio Activities
                  </Typography>
                  <Typography variant="h5">
                    {cardioStats.count}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Distance
                  </Typography>
                  <Typography variant="h5">
                    {cardioStats.totalDistance.toFixed(2)} km
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TrendingUpIcon sx={{ mr: 0.5, fontSize: 20, color: 'text.secondary' }} />
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Recent VO2 Max
                    </Typography>
                  </Box>
                  {cardioStats.recentVO2Max ? (
                    <>
                      <Typography variant="h5">
                        {cardioStats.recentVO2Max.value.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ml/kg/min
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Workout Frequency Chart */}
      {frequencyData.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Workout Frequency by Week
          </Typography>
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: frequencyData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
            }]}
            series={[{
              data: frequencyData.map(d => d.count),
              label: 'Workouts per Week'
            }]}
            height={300}
          />
        </Paper>
      )}

      {/* Body Part Frequency */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Body Part Frequency
        </Typography>

        {bodyPartFrequency.length > 0 ? (
          <>
            {/* Body Visualization */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom align="center">
                Muscle Group Heatmap
              </Typography>
              <BodyVisualization2D bodyPartFrequency={bodyPartFrequency} />

              {/* Legend */}
              <FrequencyLegend maxFrequency={Math.max(...bodyPartFrequency.map(item => item.count))} />
            </Paper>

            {/* Data Table */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Detailed Breakdown
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Body Part / Muscle Group</TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={true}
                        direction={bodyPartSortOrder}
                        onClick={() => setBodyPartSortOrder(bodyPartSortOrder === 'desc' ? 'asc' : 'desc')}
                      >
                        Times Trained
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bodyPartFrequency.map((item) => (
                    <TableRow key={item.bodyPart}>
                      <TableCell>{item.bodyPart}</TableCell>
                      <TableCell align="right">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography color="text.secondary">
            No data available for the selected date range
          </Typography>
        )}
      </Paper>

      {/* Exercise Progress Charts */}
      {performedVersions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Exercise Progress
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Exercise</InputLabel>
            <Select
              value={selectedExerciseVersionId}
              label="Select Exercise"
              onChange={(e) => setSelectedExerciseVersionId(e.target.value)}
            >
              <MenuItem value="">
                <em>Choose an exercise</em>
              </MenuItem>
              {performedVersions.map(version => (
                <MenuItem key={version.id} value={version.id}>
                  {getExerciseVersionName(version.id)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedExerciseVersionId && progressData.length > 0 && (
            <Box>
              {/* Check if this is a bodyweight exercise (all weights are 0) */}
              {progressData.every(d => d.weight === 0) ? (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Reps Progression
                  </Typography>
                  <LineChart
                    xAxis={[{
                      scaleType: 'time',
                      data: progressData.map(d => d.date),
                      valueFormatter: (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }]}
                    series={[{
                      data: progressData.map(d => d.reps),
                      label: 'Reps',
                      showMark: true
                    }]}
                    height={300}
                    slotProps={{
                      popper: {
                        sx: {
                          '& .MuiChartsTooltip-table': {
                            backgroundColor: 'background.paper'
                          }
                        }
                      }
                    }}
                    axisHighlight={{
                      x: 'line',
                      y: 'none'
                    }}
                  />
                </>
              ) : (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Weight Progression
                  </Typography>
                  <LineChart
                    xAxis={[{
                      scaleType: 'time',
                      data: progressData.map(d => d.date),
                      valueFormatter: (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }]}
                    series={[{
                      data: progressData.map(d => d.weight),
                      label: 'Weight (lbs)',
                      showMark: true
                    }]}
                    height={300}
                    sx={{ mb: 3 }}
                    slotProps={{
                      popper: {
                        sx: {
                          '& .MuiChartsTooltip-table': {
                            backgroundColor: 'background.paper'
                          }
                        }
                      }
                    }}
                    axisHighlight={{
                      x: 'line',
                      y: 'none'
                    }}
                  />

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Volume Progression
                  </Typography>
                  <LineChart
                    xAxis={[{
                      scaleType: 'time',
                      data: progressData.map(d => d.date),
                      valueFormatter: (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }]}
                    series={[{
                      data: progressData.map(d => d.volume),
                      label: 'Volume (lbs × reps)',
                      showMark: true,
                      color: '#f57c00'
                    }]}
                    height={300}
                    slotProps={{
                      popper: {
                        sx: {
                          '& .MuiChartsTooltip-table': {
                            backgroundColor: 'background.paper'
                          }
                        }
                      }
                    }}
                    axisHighlight={{
                      x: 'line',
                      y: 'none'
                    }}
                  />
                </>
              )}
            </Box>
          )}

          {selectedExerciseVersionId && progressData.length === 0 && (
            <Typography color="text.secondary">
              No data available for this exercise
            </Typography>
          )}
        </Paper>
      )}

    </Box>
  )
}

export default ProgressPage
