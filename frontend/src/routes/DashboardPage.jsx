import { Box, Typography, Grid, Paper, Button, CircularProgress, Card, CardContent, Chip, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { FitnessCenter, TrendingUp, History } from '@mui/icons-material'
import { useHistory } from '../contexts/HistoryContext'
import { formatDate, formatTime, calculateDuration, getTotalSets } from '../utils/workoutHelpers'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { getRecentWorkouts, workoutPlans, loading, error, refreshHistory } = useHistory()
  const recentWorkouts = getRecentWorkouts(5)

  const quickActions = [
    {
      title: 'Start Workout',
      icon: <FitnessCenter sx={{ fontSize: 40 }} />,
      path: '/plans',
      color: '#1976d2',
    },
    {
      title: 'View Progress',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      path: '/progress',
      color: '#2e7d32',
    },
    {
      title: 'Workout History',
      icon: <History sx={{ fontSize: 40 }} />,
      path: '/history',
      color: '#ed6c02',
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={4} key={action.title}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => navigate(action.path)}
            >
              <Box sx={{ color: action.color, mb: 2 }}>{action.icon}</Box>
              <Typography variant="h6">{action.title}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Recent Activity
          </Typography>
          {recentWorkouts.length > 0 && (
            <Button onClick={() => navigate('/history')} size="small">
              View All
            </Button>
          )}
        </Box>

        {loading ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Paper>
        ) : error ? (
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={refreshHistory}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        ) : recentWorkouts.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">
              No recent workouts. Start your first workout to see your activity here!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {recentWorkouts.map((session) => {
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
                    onClick={() => navigate(isCompleted ? `/history/${session.id}` : `/workout/${session.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
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

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Duration
                          </Typography>
                          <Typography variant="body2">
                            {calculateDuration(session.start_time, session.end_time)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Exercises
                          </Typography>
                          <Typography variant="body2">
                            {session.exercises?.length || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Total Sets
                          </Typography>
                          <Typography variant="body2">
                            {getTotalSets(session)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>
    </Box>
  )
}

export default DashboardPage
