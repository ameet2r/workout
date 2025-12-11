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
  DialogActions,
  TextField,
  ButtonGroup
} from '@mui/material'
import { Visibility, Delete, Upload } from '@mui/icons-material'
import { authenticatedDelete } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { formatDate, formatTime, calculateDuration, getTotalSets, getTotalVolume } from '../utils/workoutHelpers'
import ImportGarminDialog from '../components/garmin/ImportGarminDialog'

const HistoryPage = () => {
  const navigate = useNavigate()
  const { exercises, exerciseVersions } = useExercises()
  const {
    workoutSessions,
    workoutPlans,
    loading,
    error,
    startDate,
    endDate,
    updateDateRange,
    deleteWorkoutSession: removeFromContext,
    addWorkoutSession,
    getLocalDateString
  } = useHistory()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

    setDeleting(true)
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionToDelete.id}`)
      removeFromContext(sessionToDelete.id)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (err) {
      console.error('Error deleting workout session:', err)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleImportSuccess = (newSession) => {
    // Add the new session to the context instead of refetching all sessions
    addWorkoutSession(newSession)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Workout History
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import from Garmin
        </Button>
      </Box>

      {/* Date Range Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
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
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => updateDateRange(e.target.value, endDate)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
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

      <Grid container spacing={2}>
        {workoutSessions.map((session) => {
          const plan = session.workout_plan_id ? workoutPlans[session.workout_plan_id] : null
          const isCompleted = !!session.end_time

          return (
            <Grid size={12} key={session.id}>
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
                        {session.name || (plan ? plan.name : 'Custom Workout')}
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
                    <Grid size={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Duration
                      </Typography>
                      <Typography variant="body1">
                        {calculateDuration(session.start_time, session.end_time)}
                      </Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Exercises
                      </Typography>
                      <Typography variant="body1">
                        {session.exercises?.length || 0}
                      </Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Sets
                      </Typography>
                      <Typography variant="body1">
                        {getTotalSets(session)}
                      </Typography>
                    </Grid>
                    <Grid size={3}>
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

      <ImportGarminDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </Box>
  )
}

export default HistoryPage
