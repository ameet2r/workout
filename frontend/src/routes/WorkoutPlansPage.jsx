import { Box, Typography, Button, Paper } from '@mui/material'
import { Add } from '@mui/icons-material'

const WorkoutPlansPage = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workout Plans</Typography>
        <Button variant="contained" startIcon={<Add />}>
          Create Plan
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No workout plans yet. Create your first plan to get started!
        </Typography>
      </Paper>
    </Box>
  )
}

export default WorkoutPlansPage
