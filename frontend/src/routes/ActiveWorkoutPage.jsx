import { Box, Typography, Paper } from '@mui/material'

const ActiveWorkoutPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Active Workout
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Active workout tracking coming soon...
        </Typography>
      </Paper>
    </Box>
  )
}

export default ActiveWorkoutPage
