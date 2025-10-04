import { Box, Typography, Paper } from '@mui/material'

const HistoryPage = () => {
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

export default HistoryPage
