import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material'
import { ArrowBack, Delete, DeleteOutline, Edit, Check, Close } from '@mui/icons-material'
import { authenticatedDelete } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { formatDate, formatTime, calculateDuration, getTotalSets, getTotalVolume } from '../utils/workoutHelpers'
import { authenticatedPatch } from '../utils/api'
import TextField from '@mui/material/TextField'
import GarminUpload from '../components/garmin/GarminUpload'
import HeartRateChart from '../components/garmin/HeartRateChart'
import GpsMap from '../components/garmin/GpsMap'
import TemperatureChart from '../components/garmin/TemperatureChart'
import CadenceChart from '../components/garmin/CadenceChart'
import PowerChart from '../components/garmin/PowerChart'
import AltitudeChart from '../components/garmin/AltitudeChart'

const WorkoutDetailPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { exercises, exerciseVersions } = useExercises()
  const { getWorkoutSession, workoutPlans, loading, deleteWorkoutSession: removeFromContext, refreshHistory } = useHistory()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteGarminDialogOpen, setDeleteGarminDialogOpen] = useState(false)
  const [deletingGarmin, setDeletingGarmin] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [garminDataKey, setGarminDataKey] = useState(0) // Key to force re-render of Garmin components
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

  const session = getWorkoutSession(sessionId)
  const workoutPlan = session?.workout_plan_id ? workoutPlans[session.workout_plan_id] : null

  const handleGarminUploadSuccess = async () => {
    // Refresh the workout session data
    await refreshHistory()
    // Force re-render of Garmin data components
    setGarminDataKey(prev => prev + 1)
  }

  const handleDeleteGarminData = async () => {
    setDeletingGarmin(true)
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionId}/garmin-data`)
      await refreshHistory()
      setGarminDataKey(prev => prev + 1)
      setDeleteGarminDialogOpen(false)
    } catch (err) {
      console.error('Error deleting Garmin data:', err)
      setDeleteGarminDialogOpen(false)
    } finally {
      setDeletingGarmin(false)
    }
  }

  const handleEditNameClick = () => {
    setEditedName(session?.name || workoutPlan?.name || 'Custom Workout')
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    try {
      await authenticatedPatch(`/api/workout-sessions/${sessionId}`, { name: editedName })
      await refreshHistory()
      setIsEditingName(false)
    } catch (err) {
      console.error('Error updating workout name:', err)
    }
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setEditedName('')
  }

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Unknown Exercise'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionId}`)
      removeFromContext(sessionId)
      setDeleteDialogOpen(false)
      navigate('/history')
    } catch (err) {
      console.error('Error deleting workout session:', err)
      setDeleteDialogOpen(false)
      setDeleting(false)
    }
    // Note: Don't set deleting to false on success, keep it true until navigation completes
  }

  if (loading || deleting) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/history')}
          sx={{ mb: 2 }}
        >
          Back to History
        </Button>
        <Alert severity="warning">Workout session not found</Alert>
      </Box>
    )
  }

  const isCompleted = !!session.end_time

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/history')}
        >
          Back to History
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isCompleted && (
            <Button
              variant="contained"
              onClick={() => navigate(`/workout/${sessionId}`)}
            >
              Resume Workout
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            {isEditingName ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TextField
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  autoFocus
                />
                <IconButton onClick={handleSaveName} color="primary" size="small">
                  <Check />
                </IconButton>
                <IconButton onClick={handleCancelEditName} color="error" size="small">
                  <Close />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4">
                  {session.name || (workoutPlan ? workoutPlan.name : 'Custom Workout')}
                </Typography>
                <IconButton onClick={handleEditNameClick} size="small">
                  <Edit />
                </IconButton>
              </Box>
            )}
            <Typography variant="body1" color="text.secondary">
              {formatDate(session.start_time)} at {formatTime(session.start_time)}
            </Typography>
          </Box>
          <Chip
            label={isCompleted ? 'Completed' : 'In Progress'}
            color={isCompleted ? 'success' : 'warning'}
            size="medium"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Duration
                </Typography>
                <Typography variant="h5">
                  {calculateDuration(session.start_time, session.end_time)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Total Sets
                </Typography>
                <Typography variant="h5">
                  {getTotalSets(session)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Total Volume
                </Typography>
                <Typography variant="h5">
                  {getTotalVolume(session) > 0 ? `${getTotalVolume(session).toLocaleString()} lbs` : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {session.notes && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body1">
                {session.notes}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Garmin Data Upload */}
        {isCompleted && (
          <GarminUpload sessionId={sessionId} onUploadSuccess={handleGarminUploadSuccess} />
        )}

        {/* Garmin Data Visualizations */}
        {session.garmin_data && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Garmin Data
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutline />}
                onClick={() => setDeleteGarminDialogOpen(true)}
              >
                Remove Garmin Data
              </Button>
            </Box>

            {/* Activity Type and Notes */}
            {(session.garmin_data.activity_type || session.garmin_data.activity_notes) && (
              <Box sx={{ mb: 2 }}>
                {session.garmin_data.activity_type && (
                  <Chip label={session.garmin_data.activity_type} sx={{ mr: 1 }} />
                )}
                {session.garmin_data.activity_notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {session.garmin_data.activity_notes}
                  </Typography>
                )}
              </Box>
            )}

            {/* Summary Stats */}
            {session.garmin_data && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Heart Rate */}
                {session.garmin_data.avg_heart_rate && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg Heart Rate
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.avg_heart_rate} bpm
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {session.garmin_data.max_heart_rate && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Max Heart Rate
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.max_heart_rate} bpm
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Calories */}
                {session.garmin_data.calories && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Calories
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.calories}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Distance and Pace */}
                {session.garmin_data.distance && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Distance
                        </Typography>
                        <Typography variant="h6">
                          {(session.garmin_data.distance / 1000).toFixed(2)} km
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {session.garmin_data.pace && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Pace
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.pace.toFixed(2)} min/km
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Elevation */}
                {session.garmin_data.ascent && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Ascent
                        </Typography>
                        <Typography variant="h6">
                          {Math.round(session.garmin_data.ascent)} m
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {session.garmin_data.descent && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Descent
                        </Typography>
                        <Typography variant="h6">
                          {Math.round(session.garmin_data.descent)} m
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {session.garmin_data.avg_altitude && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg Altitude
                        </Typography>
                        <Typography variant="h6">
                          {Math.round(session.garmin_data.avg_altitude)} m
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Cadence */}
                {session.garmin_data.avg_cadence && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg Cadence
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.avg_cadence} {session.garmin_data.activity_type === 'Biking' ? 'rpm' : 'spm'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Power */}
                {session.garmin_data.avg_power && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg Power
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.avg_power} W
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {session.garmin_data.max_power && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Max Power
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.max_power} W
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Steps */}
                {session.garmin_data.total_steps && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Total Steps
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.total_steps.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Temperature */}
                {session.garmin_data.avg_temperature && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Avg Temperature
                        </Typography>
                        <Typography variant="h6">
                          {session.garmin_data.avg_temperature.toFixed(1)}°C
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Advanced Running Dynamics (FIT files) */}
            {session.garmin_data.has_running_dynamics && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Running Dynamics
                </Typography>
                <Grid container spacing={2}>
                  {session.garmin_data.avg_vertical_oscillation && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Vertical Oscillation
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.avg_vertical_oscillation.toFixed(1)} mm
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.avg_ground_contact_time && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Ground Contact Time
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.avg_ground_contact_time} ms
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.avg_stride_length && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Avg Stride Length
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.avg_stride_length.toFixed(2)} m
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* Training Metrics (FIT files) */}
            {session.garmin_data.has_training_metrics && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Training Metrics
                </Typography>
                <Grid container spacing={2}>
                  {session.garmin_data.training_effect && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Aerobic Training Effect
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.training_effect.toFixed(1)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.anaerobic_training_effect && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Anaerobic Training Effect
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.anaerobic_training_effect.toFixed(1)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.vo2max_estimate && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            VO2 Max Estimate
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.vo2max_estimate}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.lactate_threshold_heart_rate && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Lactate Threshold HR
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.lactate_threshold_heart_rate} bpm
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {session.garmin_data.recovery_time && (
                    <Grid item xs={6} sm={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Recovery Time
                          </Typography>
                          <Typography variant="h6">
                            {session.garmin_data.recovery_time} hrs
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* Charts and Map */}
            {session.garmin_data.has_gps && (
              <GpsMap key={`gps-${garminDataKey}`} sessionId={sessionId} />
            )}

            {session.garmin_data.has_heart_rate && (
              <HeartRateChart key={`hr-${garminDataKey}`} sessionId={sessionId} />
            )}

            {session.garmin_data.has_altitude && (
              <AltitudeChart key={`altitude-${garminDataKey}`} sessionId={sessionId} />
            )}

            {session.garmin_data.has_cadence && (
              <CadenceChart
                key={`cadence-${garminDataKey}`}
                sessionId={sessionId}
                activityType={session.garmin_data.activity_type}
              />
            )}

            {session.garmin_data.has_power && (
              <PowerChart key={`power-${garminDataKey}`} sessionId={sessionId} />
            )}

            {session.garmin_data.has_temperature && (
              <TemperatureChart key={`temp-${garminDataKey}`} sessionId={sessionId} />
            )}
          </Box>
        )}

        <Typography variant="h6" gutterBottom>
          Exercises
        </Typography>

        {session.exercises && session.exercises.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {session.exercises.map((exercise, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {getExerciseVersionName(exercise.exercise_version_id)}
                  </Typography>
                  {exercise.sets && exercise.sets.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {exercise.sets.map((set, setIndex) => (
                        <Box
                          key={setIndex}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            p: 1,
                            bgcolor: setIndex % 2 === 0 ? 'background.default' : 'transparent',
                            borderRadius: 1
                          }}
                        >
                          <Typography variant="body1">
                            <strong>Set {setIndex + 1}</strong>
                          </Typography>
                          <Typography variant="body1">
                            {set.reps} reps
                            {set.weight && ` @ ${set.weight} lbs`}
                            {set.rpe && ` • RPE ${set.rpe}`}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No sets logged
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography color="text.secondary">
              No exercises logged for this workout
            </Typography>
          </Paper>
        )}
      </Paper>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && handleDeleteCancel()}
      >
        <DialogTitle>Delete Workout Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this workout session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteGarminDialogOpen}
        onClose={() => !deletingGarmin && setDeleteGarminDialogOpen(false)}
      >
        <DialogTitle>Remove Garmin Data</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove all Garmin data from this workout? This will delete heart rate, GPS, temperature, and all other metrics. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGarminDialogOpen(false)} disabled={deletingGarmin}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteGarminData}
            color="error"
            variant="contained"
            disabled={deletingGarmin}
            startIcon={deletingGarmin ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deletingGarmin ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WorkoutDetailPage
