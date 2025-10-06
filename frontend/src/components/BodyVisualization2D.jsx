import { Box, Typography, Paper, Grid } from '@mui/material'

const BodyVisualization2D = ({ bodyPartFrequency = [] }) => {
  // Ensure we have valid data
  if (!Array.isArray(bodyPartFrequency) || bodyPartFrequency.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No body part data available
        </Typography>
      </Box>
    )
  }

  // Calculate max frequency for color scaling
  const maxFrequency = Math.max(...bodyPartFrequency.map(item => item.count), 1)

  // Get color based on frequency (heatmap)
  const getColor = (frequency) => {
    if (!frequency || frequency === 0) return '#e0e0e0' // gray for no training
    const intensity = frequency / maxFrequency

    if (intensity >= 0.8) return '#d32f2f' // dark red - very high
    if (intensity >= 0.6) return '#f44336' // red - high
    if (intensity >= 0.4) return '#ff9800' // orange - medium
    if (intensity >= 0.2) return '#ffc107' // amber - low
    return '#ffeb3b' // yellow - very low
  }

  // Create a map for easy lookup
  const frequencyMap = {}
  bodyPartFrequency.forEach(item => {
    frequencyMap[item.bodyPart] = item.count
  })

  // Helper to get combined frequency for multiple muscle groups
  const getBodyPartFrequency = (bodyPart) => {
    let totalFreq = 0
    bodyPart.muscles.forEach(muscle => {
      totalFreq += frequencyMap[muscle] || 0
    })
    return totalFreq
  }

  return (
    <Box>
      {/* Simple grid-based body visualization */}
      <Grid container spacing={1} sx={{ maxWidth: 400, margin: '0 auto' }}>
        {/* Upper body */}
        <Grid item xs={12}>
          <Typography variant="caption" align="center" display="block" gutterBottom>
            Upper Body
          </Typography>
        </Grid>

        {/* Shoulders */}
        <Grid item xs={12}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(frequencyMap['Shoulders']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Shoulders {frequencyMap['Shoulders'] ? `(${frequencyMap['Shoulders']})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Chest and Back row */}
        <Grid item xs={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(frequencyMap['Chest']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Chest {frequencyMap['Chest'] ? `(${frequencyMap['Chest']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Trapezius'] })),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Back {getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Trapezius'] }) ? `(${getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Trapezius'] })})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Arms row */}
        <Grid item xs={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Biceps']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Biceps {frequencyMap['Biceps'] ? `(${frequencyMap['Biceps']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Triceps']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Triceps {frequencyMap['Triceps'] ? `(${frequencyMap['Triceps']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Forearms']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Forearms {frequencyMap['Forearms'] ? `(${frequencyMap['Forearms']})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Core */}
        <Grid item xs={12}>
          <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }} gutterBottom>
            Core
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Abs']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Abs {frequencyMap['Abs'] ? `(${frequencyMap['Abs']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Obliques']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Obliques {frequencyMap['Obliques'] ? `(${frequencyMap['Obliques']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(frequencyMap['Lower Back']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Lower Back {frequencyMap['Lower Back'] ? `(${frequencyMap['Lower Back']})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Lower body */}
        <Grid item xs={12}>
          <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }} gutterBottom>
            Lower Body
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Glutes']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Glutes {frequencyMap['Glutes'] ? `(${frequencyMap['Glutes']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(frequencyMap['Hip Flexors']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Hip Flexors {frequencyMap['Hip Flexors'] ? `(${frequencyMap['Hip Flexors']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(frequencyMap['Quadriceps']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Quads {frequencyMap['Quadriceps'] ? `(${frequencyMap['Quadriceps']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(frequencyMap['Hamstrings']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Hamstrings {frequencyMap['Hamstrings'] ? `(${frequencyMap['Hamstrings']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(frequencyMap['Adductors']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Adductors {frequencyMap['Adductors'] ? `(${frequencyMap['Adductors']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(frequencyMap['Abductors']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Abductors {frequencyMap['Abductors'] ? `(${frequencyMap['Abductors']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(frequencyMap['Calves']),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2">
              Calves {frequencyMap['Calves'] ? `(${frequencyMap['Calves']})` : ''}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default BodyVisualization2D
