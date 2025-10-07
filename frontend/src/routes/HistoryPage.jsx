import { useState } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material'
import { Visibility, Delete } from '@mui/icons-material'
import { authenticatedDelete } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { formatDate, formatTime, calculateDuration, getTotalSets, getTotalVolume } from '../utils/workoutHelpers'

const HistoryPage = () => {
  const navigate = useNavigate()
  const { exercises, exerciseVersions } = useExercises()
  const { workoutSessions, workoutPlans, loading, error, deleteWorkoutSession: removeFromContext } = useHistory()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Unknown Exercise'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
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
      removeFromContext(sessionToDelete.id)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (err) {
      console.error('Error deleting workout session:', err)
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
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => navigate(`/history/${session.id}`)}
              >
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

                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Duration
                      </Typography>
                      <Typography variant="body1">
                        {calculateDuration(session.start_time, session.end_time)}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Exercises
                      </Typography>
                      <Typography variant="body1">
                        {session.exercises?.length || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Sets
                      </Typography>
                      <Typography variant="body1">
                        {getTotalSets(session)}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Volume
                      </Typography>
                      <Typography variant="body1">
                        {getTotalVolume(session) > 0 ? `${getTotalVolume(session).toLocaleString()} lbs` : '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>

                <CardActions>
                  {!isCompleted && (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/workout/${session.id}`)
                      }}
                    >
                      Resume Workout
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(session)
                    }}
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
