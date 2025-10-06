import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material'
import { ExpandMore, Visibility, Delete } from '@mui/icons-material'
import { authenticatedGet, authenticatedDelete } from '../utils/api'

const HistoryPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workoutSessions, setWorkoutSessions] = useState([])
  const [workoutPlans, setWorkoutPlans] = useState({})
  const [exerciseVersions, setExerciseVersions] = useState([])
  const [exercises, setExercises] = useState([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)

  useEffect(() => {
    fetchWorkoutHistory()
  }, [])

  const fetchWorkoutHistory = async () => {
    try {
      setLoading(true)
      const [sessionsData, plansData, versionsData, exercisesData] = await Promise.all([
        authenticatedGet('/api/workout-sessions'),
        authenticatedGet('/api/workout-plans'),
        authenticatedGet('/api/exercises/versions/my-versions'),
        authenticatedGet('/api/exercises')
      ])

      setWorkoutSessions(sessionsData)

      // Convert plans array to object for easy lookup
      const plansMap = {}
      plansData.forEach(plan => {
        plansMap[plan.id] = plan
      })
      setWorkoutPlans(plansMap)

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

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const calculateDuration = (startTime, endTime) => {
    if (!endTime) return 'In Progress'

    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end - start
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const getTotalSets = (session) => {
    if (!session.exercises) return 0
    return session.exercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0)
  }

  const getTotalVolume = (session) => {
    if (!session.exercises) return 0
    let volume = 0
    session.exercises.forEach(ex => {
      ex.sets?.forEach(set => {
        if (set.weight) {
          volume += set.weight * set.reps
        }
      })
    })
    return volume
  }

  const handleDeleteClick = (session) => {
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setSessionToDelete(null)
  }

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return

    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionToDelete.id}`)
      setWorkoutSessions(prevSessions =>
        prevSessions.filter(session => session.id !== sessionToDelete.id)
      )
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (err) {
      setError(err.message)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
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
          Workout History
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
          Workout History
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No workout history yet. Complete your first workout to see it here!
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Workout History
      </Typography>

      <Grid container spacing={2}>
        {workoutSessions.map((session) => {
          const plan = session.workout_plan_id ? workoutPlans[session.workout_plan_id] : null
          const isCompleted = !!session.end_time

          return (
            <Grid item xs={12} key={session.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {plan ? plan.name : 'Custom Workout'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(session.start_time)} at {formatTime(session.start_time)}
                      </Typography>
                    </Box>
                    <Chip
                      label={isCompleted ? 'Completed' : 'In Progress'}
                      color={isCompleted ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Duration
                      </Typography>
                      <Typography variant="body1">
                        {calculateDuration(session.start_time, session.end_time)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Sets
                      </Typography>
                      <Typography variant="body1">
                        {getTotalSets(session)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Volume
                      </Typography>
                      <Typography variant="body1">
                        {getTotalVolume(session) > 0 ? `${getTotalVolume(session).toLocaleString()} lbs` : '-'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {session.exercises && session.exercises.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="body2">
                          View Exercise Details ({session.exercises.length} exercises)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {session.exercises.map((exercise, index) => (
                            <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {getExerciseVersionName(exercise.exercise_version_id)}
                              </Typography>
                              {exercise.sets && exercise.sets.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {exercise.sets.map((set, setIndex) => (
                                    <Typography key={setIndex} variant="body2" color="text.secondary">
                                      Set {setIndex + 1}: {set.reps} reps
                                      {set.weight && ` @ ${set.weight}lbs`}
                                      {set.rpe && ` (RPE ${set.rpe})`}
                                    </Typography>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No sets logged
                                </Typography>
                              )}
                            </Paper>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {session.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        Notes:
                      </Typography>
                      <Typography variant="body2">
                        {session.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  {!isCompleted && (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/workout/${session.id}`)}
                    >
                      Resume Workout
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteClick(session)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Workout Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this workout session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HistoryPage
