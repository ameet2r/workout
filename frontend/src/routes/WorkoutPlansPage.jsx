import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert, List, ListItem, ListItemText, IconButton, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent, CardActions, Chip, Checkbox, FormControlLabel, Autocomplete } from '@mui/material'
import { Add, Delete, PlayArrow, Edit } from '@mui/icons-material'
import { authenticatedPost, authenticatedGet, authenticatedPatch } from '../utils/api'

const WorkoutPlansPage = () => {
  const navigate = useNavigate()
  const [openDialog, setOpenDialog] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exerciseVersions, setExerciseVersions] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedExercises, setSelectedExercises] = useState([])
  const [currentExerciseVersion, setCurrentExerciseVersion] = useState(null)
  const [currentSets, setCurrentSets] = useState('')
  const [currentReps, setCurrentReps] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [currentIsBodyweight, setCurrentIsBodyweight] = useState(false)
  const [currentInstruction, setCurrentInstruction] = useState('')
  const [currentTimers, setCurrentTimers] = useState([])
  const [currentTimerHours, setCurrentTimerHours] = useState('')
  const [currentTimerMinutes, setCurrentTimerMinutes] = useState('')
  const [currentTimerSeconds, setCurrentTimerSeconds] = useState('')
  const [currentTimerType, setCurrentTimerType] = useState('per_set')
  const [workoutPlans, setWorkoutPlans] = useState([])
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null)
  const [exerciseHistory, setExerciseHistory] = useState({ sessions: [], estimated_1rm: null, actual_1rm: null })

  useEffect(() => {
    fetchWorkoutPlans()
  }, [])

  useEffect(() => {
    if (openDialog) {
      fetchExerciseData()
    }
  }, [openDialog])

  useEffect(() => {
    // Fetch history when exercise is selected (but not when editing existing exercise)
    if (currentExerciseVersion && editingExerciseIndex === null && exerciseVersions.length > 0) {
      const version = exerciseVersions.find(v => v.exercise_id === currentExerciseVersion.id)
      if (version) {
        fetchExerciseHistory(version.id)
      } else {
        // If no version exists yet for this exercise, clear history
        setExerciseHistory({ sessions: [], estimated_1rm: null, actual_1rm: null })
      }
    }
  }, [currentExerciseVersion, editingExerciseIndex, exerciseVersions])

  const fetchWorkoutPlans = async () => {
    try {
      const data = await authenticatedGet('/api/workout-plans')
      setWorkoutPlans(data)
    } catch (err) {
      console.error('Error fetching workout plans:', err)
    }
  }

  const fetchExerciseData = async () => {
    try {
      const [versionsData, exercisesData] = await Promise.all([
        authenticatedGet('/api/exercises/versions/my-versions'),
        authenticatedGet('/api/exercises')
      ])
      setExerciseVersions(versionsData)
      setExercises(exercisesData)
    } catch (err) {
      console.error('Error fetching exercise data:', err)
    }
  }

  const handleCreatePlan = () => {
    setEditingPlanId(null)
    setOpenDialog(true)
    setError(null)
  }

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id)
    setPlanName(plan.name)
    setPlanDescription(plan.notes || '')
    setSelectedExercises(plan.exercises || [])
    setOpenDialog(true)
    setError(null)
  }

  const handleClose = () => {
    setOpenDialog(false)
    setPlanName('')
    setPlanDescription('')
    setSelectedExercises([])
    setCurrentExerciseVersion(null)
    setCurrentSets('')
    setCurrentReps('')
    setCurrentWeight('')
    setCurrentIsBodyweight(false)
    setCurrentInstruction('')
    setCurrentTimers([])
    setCurrentTimerHours('')
    setCurrentTimerMinutes('')
    setCurrentTimerSeconds('')
    setCurrentTimerType('per_set')
    setEditingPlanId(null)
    setError(null)
  }

  const handleAddTimer = () => {
    const hours = parseInt(currentTimerHours) || 0
    const minutes = parseInt(currentTimerMinutes) || 0
    const seconds = parseInt(currentTimerSeconds) || 0
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    if (totalSeconds > 0) {
      setCurrentTimers([...currentTimers, {
        duration: totalSeconds,
        type: currentTimerType
      }])
      setCurrentTimerHours('')
      setCurrentTimerMinutes('')
      setCurrentTimerSeconds('')
      setCurrentTimerType('per_set')
    }
  }

  const handleRemoveTimer = (index) => {
    setCurrentTimers(currentTimers.filter((_, i) => i !== index))
  }

  const fetchExerciseHistory = async (versionId) => {
    try {
      const history = await authenticatedGet(`/api/workout-sessions/exercise-history/${versionId}`)
      setExerciseHistory(history)
    } catch (err) {
      console.error('Error fetching exercise history:', err)
      setExerciseHistory({ sessions: [], estimated_1rm: null, actual_1rm: null })
    }
  }

  const handleEditExercise = async (index) => {
    const exercise = selectedExercises[index]
    setEditingExerciseIndex(index)

    // Find the exercise version object
    const version = exerciseVersions.find(v => v.id === exercise.exercise_version_id)
    const exerciseObj = exercises.find(e => e.id === version?.exercise_id)

    if (exerciseObj) {
      setCurrentExerciseVersion(exerciseObj)
    }

    setCurrentSets(exercise.planned_sets?.toString() || '')
    setCurrentReps(exercise.planned_reps || '')
    setCurrentWeight(exercise.planned_weight?.toString() || '')
    setCurrentIsBodyweight(exercise.is_bodyweight || false)
    setCurrentInstruction(exercise.instruction || '')
    setCurrentTimers(exercise.timers || [])

    // Fetch exercise history
    await fetchExerciseHistory(exercise.exercise_version_id)
  }

  const handleAddExercise = async () => {
    if (!currentExerciseVersion) return

    try {
      // Check if this is an exercise ID (not a version ID)
      const isExerciseId = exercises.some(e => e.id === currentExerciseVersion.id)
      let versionId = currentExerciseVersion.id

      // If it's an exercise ID, create a default version for the user
      if (isExerciseId) {
        const versionData = await authenticatedPost('/api/exercises/versions', {
          exercise_id: currentExerciseVersion.id,
          version_name: 'Default',
          target_sets: currentSets ? parseInt(currentSets) : null,
          target_reps: currentReps || null,
          notes: null
        })
        versionId = versionData.id
        // Refresh exercise versions
        await fetchExerciseData()
      }

      const exerciseData = {
        exercise_version_id: versionId,
        order: editingExerciseIndex !== null ? editingExerciseIndex : selectedExercises.length,
        planned_sets: currentSets ? parseInt(currentSets) : null,
        planned_reps: currentReps || null,
        planned_weight: currentWeight ? parseFloat(currentWeight) : null,
        is_bodyweight: currentIsBodyweight,
        instruction: currentInstruction || null,
        timers: currentTimers
      }

      if (editingExerciseIndex !== null) {
        // Update existing exercise
        const updated = [...selectedExercises]
        updated[editingExerciseIndex] = exerciseData
        setSelectedExercises(updated)
        setEditingExerciseIndex(null)
      } else {
        // Add new exercise
        setSelectedExercises([...selectedExercises, exerciseData])
      }

      setCurrentExerciseVersion(null)
      setCurrentSets('')
      setCurrentReps('')
      setCurrentWeight('')
      setCurrentIsBodyweight(false)
      setCurrentInstruction('')
      setCurrentTimers([])
      setCurrentTimerHours('')
      setCurrentTimerMinutes('')
      setCurrentTimerSeconds('')
      setCurrentTimerType('per_set')
      setExerciseHistory({ sessions: [], estimated_1rm: null, actual_1rm: null })
    } catch (err) {
      setError(`Failed to ${editingExerciseIndex !== null ? 'update' : 'add'} exercise: ${err.message}`)
    }
  }

  const handleCancelEditExercise = () => {
    setEditingExerciseIndex(null)
    setCurrentExerciseVersion(null)
    setCurrentSets('')
    setCurrentReps('')
    setCurrentWeight('')
    setCurrentIsBodyweight(false)
    setCurrentInstruction('')
    setCurrentTimers([])
    setCurrentTimerHours('')
    setCurrentTimerMinutes('')
    setCurrentTimerSeconds('')
    setCurrentTimerType('per_set')
    setExerciseHistory({ sessions: [], estimated_1rm: null, actual_1rm: null })
  }

  const handleRemoveExercise = (index) => {
    const updated = selectedExercises.filter((_, i) => i !== index)
    // Reorder remaining exercises
    const reordered = updated.map((ex, i) => ({ ...ex, order: i }))
    setSelectedExercises(reordered)
  }

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Loading...'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
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

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const payload = {
        name: planName,
        notes: planDescription || null,
        exercises: selectedExercises
      }

      if (editingPlanId) {
        await authenticatedPatch(`/api/workout-plans/${editingPlanId}`, payload)
      } else {
        await authenticatedPost('/api/workout-plans', payload)
      }

      handleClose()
      await fetchWorkoutPlans()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartWorkout = async (planId) => {
    try {
      const session = await authenticatedPost('/api/workout-sessions', {
        workout_plan_id: planId,
        exercises: []
      })
      navigate(`/workout/${session.id}`)
    } catch (err) {
      console.error('Error starting workout:', err)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workout Plans</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreatePlan}>
          Create Plan
        </Button>
      </Box>

      {workoutPlans.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No workout plans yet. Create your first plan to get started!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {workoutPlans.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {plan.name}
                  </Typography>
                  {plan.notes && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {plan.notes}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={`${plan.exercises?.length || 0} exercises`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<PlayArrow />} onClick={() => handleStartWorkout(plan.id)}>
                    Start Workout
                  </Button>
                  <Button size="small" startIcon={<Edit />} onClick={() => handleEditPlan(plan)}>
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingPlanId ? 'Edit Workout Plan' : 'Create Workout Plan'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Plan Name"
            type="text"
            fullWidth
            variant="outlined"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={planDescription}
            onChange={(e) => setPlanDescription(e.target.value)}
            disabled={loading}
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Exercises
          </Typography>

          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            {editingExerciseIndex !== null && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Editing exercise - update the values below and click "Update Exercise"
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={exercises}
                  getOptionLabel={(option) => option.name}
                  value={currentExerciseVersion}
                  onChange={(_, newValue) => setCurrentExerciseVersion(newValue)}
                  disabled={loading || editingExerciseIndex !== null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Exercise"
                      placeholder="Search exercises..."
                    />
                  )}
                />
                {currentExerciseVersion?.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {currentExerciseVersion.description}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField
                  size="small"
                  label="Sets"
                  type="number"
                  fullWidth
                  value={currentSets}
                  onChange={(e) => setCurrentSets(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField
                  size="small"
                  label="Reps"
                  fullWidth
                  value={currentReps}
                  onChange={(e) => setCurrentReps(e.target.value)}
                  placeholder="e.g. 8-12"
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField
                  size="small"
                  label="Weight"
                  type="number"
                  fullWidth
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  disabled={loading || currentIsBodyweight}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  size="small"
                  label="Instruction (optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={currentInstruction}
                  onChange={(e) => setCurrentInstruction(e.target.value)}
                  disabled={loading}
                  placeholder="Add specific instructions for this exercise in the plan..."
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Add Timer (optional)
                </Typography>
              </Grid>
              <Grid item xs={3} sm={2}>
                <TextField
                  size="small"
                  label="Hours"
                  type="number"
                  fullWidth
                  value={currentTimerHours}
                  onChange={(e) => setCurrentTimerHours(e.target.value)}
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={3} sm={2}>
                <TextField
                  size="small"
                  label="Minutes"
                  type="number"
                  fullWidth
                  value={currentTimerMinutes}
                  onChange={(e) => setCurrentTimerMinutes(e.target.value)}
                  disabled={loading}
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid item xs={3} sm={2}>
                <TextField
                  size="small"
                  label="Seconds"
                  type="number"
                  fullWidth
                  value={currentTimerSeconds}
                  onChange={(e) => setCurrentTimerSeconds(e.target.value)}
                  disabled={loading}
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" disabled={loading}>
                  <InputLabel>Timer Type</InputLabel>
                  <Select
                    value={currentTimerType}
                    label="Timer Type"
                    onChange={(e) => setCurrentTimerType(e.target.value)}
                  >
                    <MenuItem value="per_set">Per Set</MenuItem>
                    <MenuItem value="total">Total Exercise Time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddTimer}
                  disabled={loading}
                  fullWidth
                >
                  Add Timer
                </Button>
              </Grid>
              {currentTimers.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {currentTimers.map((timer, index) => (
                      <Chip
                        key={index}
                        label={formatTimerDisplay(timer.duration, timer.type)}
                        onDelete={() => handleRemoveTimer(index)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentIsBodyweight}
                  onChange={(e) => {
                    setCurrentIsBodyweight(e.target.checked)
                    if (e.target.checked) {
                      setCurrentWeight('')
                    }
                  }}
                  disabled={loading}
                />
              }
              label="Body weight exercise"
              sx={{ mt: 1 }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddExercise}
                disabled={!currentExerciseVersion || loading}
                size="small"
              >
                {editingExerciseIndex !== null ? 'Update Exercise' : 'Add Exercise'}
              </Button>
              {editingExerciseIndex !== null && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancelEditExercise}
                  disabled={loading}
                  size="small"
                >
                  Cancel Edit
                </Button>
              )}
            </Box>

            {/* Exercise History */}
            {(exerciseHistory.sessions.length > 0 || exerciseHistory.estimated_1rm || exerciseHistory.actual_1rm) && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Progress for this Exercise
                </Typography>

                {/* Stats Summary */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {exerciseHistory.estimated_1rm && (
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, bgcolor: 'background.paper', textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Est. 1RM
                        </Typography>
                        <Typography variant="h6">
                          {exerciseHistory.estimated_1rm}lbs
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {exerciseHistory.actual_1rm && (
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, bgcolor: 'primary.main', color: 'primary.contrastText', textAlign: 'center' }}>
                        <Typography variant="caption" display="block">
                          Actual 1RM
                        </Typography>
                        <Typography variant="h6">
                          {exerciseHistory.actual_1rm}lbs
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>

                {exerciseHistory.sessions.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Last {exerciseHistory.sessions.length} workout sessions:
                    </Typography>
                    {exerciseHistory.sessions.map((session, idx) => (
                      <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'background.paper' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(session.date).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                          {session.sets.map((set, setIdx) => (
                            <Typography key={setIdx} variant="body2">
                              Set {setIdx + 1}: {set.reps} reps
                              {set.weight && ` @ ${set.weight}lbs`}
                              {set.rpe && ` (RPE ${set.rpe})`}
                            </Typography>
                          ))}
                        </Box>
                      </Paper>
                    ))}
                  </>
                )}
              </Box>
            )}
          </Box>

          {selectedExercises.length > 0 && (
            <List dense>
              {selectedExercises.map((exercise, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <Box>
                      <IconButton onClick={() => handleEditExercise(index)} disabled={loading} sx={{ mr: 1 }}>
                        <Edit />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleRemoveExercise(index)} disabled={loading}>
                        <Delete />
                      </IconButton>
                    </Box>
                  }
                  sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 1 }}
                >
                  <ListItemText
                    primary={`${index + 1}. ${getExerciseVersionName(exercise.exercise_version_id)}`}
                    secondary={
                      <>
                        {`${exercise.planned_sets ? `${exercise.planned_sets} sets` : ''} ${exercise.planned_reps ? `× ${exercise.planned_reps} reps` : ''} ${exercise.is_bodyweight ? '@ Body weight' : exercise.planned_weight ? `@ ${exercise.planned_weight}lbs` : ''}`.trim() || 'No targets set'}
                        {exercise.timers && exercise.timers.length > 0 && (
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {exercise.timers.map((timer, idx) => (
                              <Chip
                                key={idx}
                                label={formatTimerDisplay(timer.duration, timer.type)}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                        {exercise.instruction && (
                          <Typography component="span" variant="body2" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {exercise.instruction}
                          </Typography>
                        )}
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!planName.trim() || loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {editingPlanId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WorkoutPlansPage
