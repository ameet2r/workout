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
  DialogActions
} from '@mui/material'
import { ArrowBack, Delete } from '@mui/icons-material'
import { authenticatedDelete } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { formatDate, formatTime, calculateDuration, getTotalSets, getTotalVolume } from '../utils/workoutHelpers'

const WorkoutDetailPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { exercises, exerciseVersions } = useExercises()
  const { getWorkoutSession, workoutPlans, loading, deleteWorkoutSession: removeFromContext } = useHistory()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const session = getWorkoutSession(sessionId)
  const workoutPlan = session?.workout_plan_id ? workoutPlans[session.workout_plan_id] : null

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
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionId}`)
      removeFromContext(sessionId)
      setDeleteDialogOpen(false)
      navigate('/history')
    } catch (err) {
      console.error('Error deleting workout session:', err)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
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
          <Box>
            <Typography variant="h4" gutterBottom>
              {workoutPlan ? workoutPlan.name : 'Custom Workout'}
            </Typography>
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

export default WorkoutDetailPage
