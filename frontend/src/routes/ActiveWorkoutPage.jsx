import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { Add, Delete, Check, Close } from '@mui/icons-material'
import { authenticatedGet, authenticatedPatch, authenticatedPost, authenticatedDelete } from '../utils/api'

const ActiveWorkoutPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)
  const [workoutPlan, setWorkoutPlan] = useState(null)
  const [exerciseVersions, setExerciseVersions] = useState([])
  const [exercises, setExercises] = useState([])
  const [sessionExercises, setSessionExercises] = useState([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentReps, setCurrentReps] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [currentRpe, setCurrentRpe] = useState('')
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false)
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [oneRmMode, setOneRmMode] = useState(false)
  const [exerciseHistory, setExerciseHistory] = useState({ sessions: [], estimated_1rm: null, actual_1rm: null })

  useEffect(() => {
    fetchWorkoutData()
  }, [sessionId])

  useEffect(() => {
    // Fetch exercise history when current exercise changes
    const fetchExerciseHistory = async () => {
      if (sessionExercises[currentExerciseIndex]) {
        const versionId = sessionExercises[currentExerciseIndex].exercise_version_id
        try {
          const history = await authenticatedGet(`/api/workout-sessions/exercise-history/${versionId}`)
          setExerciseHistory(history)
        } catch (err) {
          console.error('Error fetching exercise history:', err)
          setExerciseHistory({ sessions: [], estimated_1rm: null, actual_1rm: null })
        }
      }
    }
    fetchExerciseHistory()
  }, [currentExerciseIndex, sessionExercises])

  useEffect(() => {
    // Auto-set reps to 1 when in 1RM mode
    if (oneRmMode) {
      setCurrentReps('1')
    }
  }, [oneRmMode])

  const fetchWorkoutData = async () => {
    try {
      setLoading(true)
      const [sessionData, versionsData, exercisesData] = await Promise.all([
        authenticatedGet(`/api/workout-sessions/${sessionId}`),
        authenticatedGet('/api/exercises/versions/my-versions'),
        authenticatedGet('/api/exercises')
      ])

      setSession(sessionData)
      setExerciseVersions(versionsData)
      setExercises(exercisesData)

      // Fetch workout plan if session has a plan
      if (sessionData.workout_plan_id) {
        const planData = await authenticatedGet(`/api/workout-plans/${sessionData.workout_plan_id}`)
        setWorkoutPlan(planData)

        // Initialize session exercises from plan if session exercises are empty
        if (!sessionData.exercises || sessionData.exercises.length === 0) {
          const initialExercises = planData.exercises.map(pe => ({
            exercise_version_id: pe.exercise_version_id,
            sets: [],
            plannedSets: pe.planned_sets,
            plannedReps: pe.planned_reps,
            plannedWeight: pe.planned_weight,
            isBodyweight: pe.is_bodyweight,
            instruction: pe.instruction,
            timers: pe.timers
          }))
          setSessionExercises(initialExercises)
        } else {
          // Map session exercises with plan data
          const mappedExercises = planData.exercises.map(pe => {
            const sessionEx = sessionData.exercises.find(
              se => se.exercise_version_id === pe.exercise_version_id
            )
            return {
              exercise_version_id: pe.exercise_version_id,
              sets: sessionEx?.sets || [],
              plannedSets: pe.planned_sets,
              plannedReps: pe.planned_reps,
              plannedWeight: pe.planned_weight,
              isBodyweight: pe.is_bodyweight,
              instruction: pe.instruction,
              timers: pe.timers
            }
          })
          setSessionExercises(mappedExercises)
        }
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Loading...'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
  }

  const handleAddSet = async () => {
    if (!currentReps) return

    const currentExercise = sessionExercises[currentExerciseIndex]
    const newSet = {
      reps: parseInt(currentReps),
      weight: currentWeight ? parseFloat(currentWeight) : null,
      completed_at: new Date().toISOString(),
      rpe: currentRpe ? parseInt(currentRpe) : null,
      notes: null
    }

    const updatedExercises = [...sessionExercises]
    updatedExercises[currentExerciseIndex] = {
      ...currentExercise,
      sets: [...currentExercise.sets, newSet]
    }
    setSessionExercises(updatedExercises)

    // Save to backend
    try {
      await authenticatedPatch(`/api/workout-sessions/${sessionId}`, {
        exercises: updatedExercises.map(ex => ({
          exercise_version_id: ex.exercise_version_id,
          sets: ex.sets
        }))
      })
    } catch (err) {
      console.error('Error saving set:', err)
    }

    // Reset inputs
    setCurrentReps('')
    setCurrentWeight('')
    setCurrentRpe('')

    // Keep 1RM mode active if it was on (allows multiple 1RM attempts)
    if (oneRmMode) {
      setCurrentReps('1')
    }
  }

  const handleDeleteSet = async (exerciseIndex, setIndex) => {
    const updatedExercises = [...sessionExercises]
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: updatedExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    }
    setSessionExercises(updatedExercises)

    // Save to backend
    try {
      await authenticatedPatch(`/api/workout-sessions/${sessionId}`, {
        exercises: updatedExercises.map(ex => ({
          exercise_version_id: ex.exercise_version_id,
          sets: ex.sets
        }))
      })
    } catch (err) {
      console.error('Error deleting set:', err)
    }
  }

  const handleCompleteWorkout = async () => {
    try {
      await authenticatedPost(`/api/workout-sessions/${sessionId}/complete`, {})
      setOpenCompleteDialog(false)
      navigate('/history')
    } catch (err) {
      console.error('Error completing workout:', err)
    }
  }

  const handleCancelWorkout = () => {
    setOpenCancelDialog(true)
  }

  const handleConfirmCancelWorkout = async () => {
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionId}`)
      setOpenCancelDialog(false)
      navigate('/plans')
    } catch (err) {
      console.error('Error cancelling workout:', err)
    }
  }

  const handleChangeExercise = (index) => {
    setCurrentExerciseIndex(index)
    setOneRmMode(false) // Reset 1RM mode when switching exercises
    setCurrentReps('')
    setCurrentWeight('')
    setCurrentRpe('')
  }

  const formatTimerDisplay = (duration, type) => {
    if (!duration) return ''
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    let timeStr = ''
    if (hours > 0) timeStr += `${hours}h`
    if (minutes > 0) timeStr += `${timeStr ? ' ' : ''}${minutes}m`
    if (seconds > 0 || !timeStr) timeStr += `${timeStr ? ' ' : ''}${seconds}s`

    return type === 'total' ? `${timeStr} total` : `${timeStr} per set`
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  if (!session || !workoutPlan) {
    return (
      <Box>
        <Alert severity="warning">
          Workout session not found or has no plan associated with it.
        </Alert>
      </Box>
    )
  }

  const currentExercise = sessionExercises[currentExerciseIndex]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{workoutPlan.name}</Typography>
        <Box>
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancelWorkout}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Check />}
            onClick={() => setOpenCompleteDialog(true)}
          >
            Complete Workout
          </Button>
        </Box>
      </Box>

      {workoutPlan.notes && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.lighter' }}>
          <Typography variant="body2" color="text.secondary">
            {workoutPlan.notes}
          </Typography>
        </Paper>
      )}

      {/* Exercise Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Exercise {currentExerciseIndex + 1} of {sessionExercises.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {sessionExercises.map((ex, index) => (
            <Chip
              key={index}
              label={`${index + 1}. ${getExerciseVersionName(ex.exercise_version_id).split(' - ')[0].substring(0, 15)}...`}
              onClick={() => handleChangeExercise(index)}
              color={index === currentExerciseIndex ? 'primary' : 'default'}
              variant={index === currentExerciseIndex ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      {/* Current Exercise */}
      {currentExercise && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {getExerciseVersionName(currentExercise.exercise_version_id)}
                </Typography>

                {currentExercise.plannedSets && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Target: {currentExercise.plannedSets} sets × {currentExercise.plannedReps || '?'} reps
                    {currentExercise.isBodyweight
                      ? ' @ Body weight'
                      : currentExercise.plannedWeight
                        ? ` @ ${currentExercise.plannedWeight}lbs`
                        : ''
                    }
                  </Typography>
                )}

                {currentExercise.instruction && (
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {currentExercise.instruction}
                    </Typography>
                  </Paper>
                )}

                {currentExercise.timers && currentExercise.timers.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {currentExercise.timers.map((timer, idx) => (
                      <Chip
                        key={idx}
                        label={formatTimerDisplay(timer.duration, timer.type)}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* 1RM Mode Toggle */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Log Set
                  </Typography>
                  <Button
                    variant={oneRmMode ? 'contained' : 'outlined'}
                    color={oneRmMode ? 'secondary' : 'primary'}
                    size="small"
                    onClick={() => setOneRmMode(!oneRmMode)}
                  >
                    {oneRmMode ? '1RM Mode Active' : '1RM Mode'}
                  </Button>
                </Box>

                {/* Display 1RM Stats when in 1RM mode */}
                {oneRmMode && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.lighter' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Your Current 1RM Stats:
                    </Typography>
                    <Grid container spacing={2}>
                      {exerciseHistory.actual_1rm && (
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Actual 1RM
                            </Typography>
                            <Typography variant="h6" color="primary">
                              {exerciseHistory.actual_1rm}lbs
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {exerciseHistory.estimated_1rm && (
                        <Grid item xs={6}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Est. 1RM
                            </Typography>
                            <Typography variant="h6">
                              {exerciseHistory.estimated_1rm}lbs
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {!exerciseHistory.actual_1rm && !exerciseHistory.estimated_1rm && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            No previous data for this exercise
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Reps"
                      type="number"
                      fullWidth
                      value={currentReps}
                      onChange={(e) => setCurrentReps(e.target.value)}
                      disabled={oneRmMode}
                      size="small"
                      helperText={oneRmMode ? 'Fixed at 1 for 1RM' : ''}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Weight (lbs)"
                      type="number"
                      fullWidth
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      disabled={currentExercise.isBodyweight}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>RPE</InputLabel>
                      <Select
                        value={currentRpe}
                        label="RPE"
                        onChange={(e) => setCurrentRpe(e.target.value)}
                      >
                        <MenuItem value="">None</MenuItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                          <MenuItem key={val} value={val}>{val}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddSet}
                      disabled={!currentReps}
                      fullWidth
                    >
                      Add Set
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Completed Sets ({currentExercise.sets.length})
                </Typography>

                {currentExercise.sets.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No sets logged yet
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {currentExercise.sets.map((set, index) => (
                      <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body1">
                              Set {index + 1}: {set.reps} reps
                              {set.weight && ` @ ${set.weight}lbs`}
                              {set.rpe && ` (RPE ${set.rpe})`}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSet(currentExerciseIndex, index)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleChangeExercise(Math.max(0, currentExerciseIndex - 1))}
                    disabled={currentExerciseIndex === 0}
                    fullWidth
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleChangeExercise(Math.min(sessionExercises.length - 1, currentExerciseIndex + 1))}
                    disabled={currentExerciseIndex === sessionExercises.length - 1}
                    fullWidth
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Complete Workout Dialog */}
      <Dialog open={openCompleteDialog} onClose={() => setOpenCompleteDialog(false)}>
        <DialogTitle>Complete Workout?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to complete this workout? This will end the session and save all logged sets.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompleteDialog(false)}>Cancel</Button>
          <Button onClick={handleCompleteWorkout} variant="contained" color="success">
            Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Workout Dialog */}
      <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)}>
        <DialogTitle>Cancel Workout?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this workout? This will delete the session and all logged sets will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelDialog(false)}>Keep Workout</Button>
          <Button onClick={handleConfirmCancelWorkout} variant="contained" color="error">
            Cancel Workout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ActiveWorkoutPage
