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
  Divider
} from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { authenticatedGet } from '../utils/api'

const ProgressPage = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workoutSessions, setWorkoutSessions] = useState([])
  const [exerciseVersions, setExerciseVersions] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedExerciseVersionId, setSelectedExerciseVersionId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sessionsData, versionsData, exercisesData] = await Promise.all([
        authenticatedGet('/api/workout-sessions'),
        authenticatedGet('/api/exercises/versions/my-versions'),
        authenticatedGet('/api/exercises')
      ])

      // Only include completed sessions
      const completedSessions = sessionsData.filter(s => s.end_time)
      setWorkoutSessions(completedSessions)
      setExerciseVersions(versionsData)
      setExercises(exercisesData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Unknown Exercise'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
  }

  const calculateOverallStats = () => {
    const totalWorkouts = workoutSessions.length
    let totalVolume = 0
    let totalDuration = 0
    let totalSets = 0

    workoutSessions.forEach(session => {
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

    workoutSessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        if (exercise.exercise_version_id === exerciseVersionId) {
          exercise.sets?.forEach(set => {
            if (set.weight) {
              data.push({
                date: new Date(session.start_time),
                weight: set.weight,
                reps: set.reps,
                volume: set.weight * set.reps
              })
            }
          })
        }
      })
    })

    // Sort by date and group by session
    data.sort((a, b) => a.date - b.date)

    // Group by date and get max weight for each session
    const groupedByDate = {}
    data.forEach(point => {
      const dateKey = point.date.toISOString().split('T')[0]
      if (!groupedByDate[dateKey] || groupedByDate[dateKey].weight < point.weight) {
        groupedByDate[dateKey] = point
      }
    })

    return Object.values(groupedByDate)
  }

  const getPersonalRecords = () => {
    const records = {}

    workoutSessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        const versionId = exercise.exercise_version_id
        exercise.sets?.forEach(set => {
          if (set.weight) {
            if (!records[versionId] || records[versionId].weight < set.weight) {
              records[versionId] = {
                weight: set.weight,
                reps: set.reps,
                date: new Date(session.start_time)
              }
            }
          }
        })
      })
    })

    return records
  }

  const getWorkoutFrequencyData = () => {
    const weeklyData = {}

    workoutSessions.forEach(session => {
      const date = new Date(session.start_time)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]

      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
    })

    return Object.entries(weeklyData)
      .map(([date, count]) => ({ date: new Date(date), count }))
      .sort((a, b) => a.date - b.date)
      .slice(-12) // Last 12 weeks
  }

  // Get all unique exercise versions that have been performed
  const getPerformedExerciseVersions = () => {
    const performedIds = new Set()
    workoutSessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        if (exercise.sets?.some(set => set.weight)) {
          performedIds.add(exercise.exercise_version_id)
        }
      })
    })
    return exerciseVersions.filter(v => performedIds.has(v.id))
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

  if (workoutSessions.length === 0) {
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
  const personalRecords = getPersonalRecords()
  const frequencyData = getWorkoutFrequencyData()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Progress Analytics
      </Typography>

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

      {/* Workout Frequency Chart */}
      {frequencyData.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Workout Frequency (Last 12 Weeks)
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
              />
            </Box>
          )}

          {selectedExerciseVersionId && progressData.length === 0 && (
            <Typography color="text.secondary">
              No weight data available for this exercise
            </Typography>
          )}
        </Paper>
      )}

      {/* Personal Records */}
      {Object.keys(personalRecords).length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Personal Records
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Exercise</TableCell>
                  <TableCell align="right">Weight (lbs)</TableCell>
                  <TableCell align="right">Reps</TableCell>
                  <TableCell align="right">Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(personalRecords)
                  .sort((a, b) => b[1].weight - a[1].weight)
                  .map(([versionId, record]) => (
                    <TableRow key={versionId}>
                      <TableCell>{getExerciseVersionName(versionId)}</TableCell>
                      <TableCell align="right">{record.weight}</TableCell>
                      <TableCell align="right">{record.reps}</TableCell>
                      <TableCell align="right">
                        {record.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

export default ProgressPage
