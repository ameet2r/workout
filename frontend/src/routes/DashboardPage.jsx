import { Box, Typography, Grid, Paper, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { FitnessCenter, TrendingUp, History } from '@mui/icons-material'

const DashboardPage = () => {
  const navigate = useNavigate()

  const quickActions = [
    {
      title: 'Start Workout',
      icon: <FitnessCenter sx={{ fontSize: 40 }} />,
      path: '/workout/new',
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
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No recent workouts. Start your first workout to see your activity here!
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}

export default DashboardPage
