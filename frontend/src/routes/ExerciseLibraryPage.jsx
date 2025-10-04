import { Box, Typography, Paper, Button } from '@mui/material'
import { Add } from '@mui/icons-material'

const ExerciseLibraryPage = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Exercise Library</Typography>
        <Button variant="contained" startIcon={<Add />}>
          Add Exercise
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No exercises in your library yet. Add exercises to get started!
        </Typography>
      </Paper>
    </Box>
  )
}

export default ExerciseLibraryPage
