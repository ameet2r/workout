import { Box, Typography, Paper, Grid } from '@mui/material'
import { useTheme } from '../context/ThemeContext'

const BodyVisualization2D = ({ bodyPartFrequency = [] }) => {
  const { mode } = useTheme()
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

  // Helper to get frequency with fallback for alternative names
  const getFrequencyWithFallback = (primaryName, ...alternativeNames) => {
    if (frequencyMap[primaryName]) {
      return frequencyMap[primaryName]
    }
    for (const altName of alternativeNames) {
      if (frequencyMap[altName]) {
        return frequencyMap[altName]
      }
    }
    return 0
  }

  return (
    <Box>
      {/* Simple grid-based body visualization */}
      <Grid container spacing={1} sx={{ maxWidth: 400, margin: '0 auto' }}>
        {/* Upper body */}
        <Grid size={12}>
          <Typography variant="caption" align="center" display="block" gutterBottom>
            Upper Body
          </Typography>
        </Grid>

        {/* Shoulders */}
        <Grid size={12}>
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
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Shoulders {frequencyMap['Shoulders'] ? `(${frequencyMap['Shoulders']})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Chest and Back row */}
        <Grid size={6}>
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
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Chest {frequencyMap['Chest'] ? `(${frequencyMap['Chest']})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Traps', 'Back - Lats', 'Back - Traps', 'Back - Upper Back', 'Back - Lower Back'] })),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Back {getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Traps', 'Back - Lats', 'Back - Traps', 'Back - Upper Back', 'Back - Lower Back'] }) ? `(${getBodyPartFrequency({ muscles: ['Back', 'Lats', 'Traps', 'Back - Lats', 'Back - Traps', 'Back - Upper Back', 'Back - Lower Back'] })})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Arms row */}
        <Grid size={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Biceps', 'Arms - Biceps')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Biceps {getFrequencyWithFallback('Biceps', 'Arms - Biceps') ? `(${getFrequencyWithFallback('Biceps', 'Arms - Biceps')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Triceps', 'Arms - Triceps')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Triceps {getFrequencyWithFallback('Triceps', 'Arms - Triceps') ? `(${getFrequencyWithFallback('Triceps', 'Arms - Triceps')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Forearms', 'Arms - Forearms')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Forearms {getFrequencyWithFallback('Forearms', 'Arms - Forearms') ? `(${getFrequencyWithFallback('Forearms', 'Arms - Forearms')})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Core */}
        <Grid size={12}>
          <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }} gutterBottom>
            Core
          </Typography>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Abs', 'Core - Abs')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Abs {getFrequencyWithFallback('Abs', 'Core - Abs') ? `(${getFrequencyWithFallback('Abs', 'Core - Abs')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Obliques', 'Core - Obliques')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Obliques {getFrequencyWithFallback('Obliques', 'Core - Obliques') ? `(${getFrequencyWithFallback('Obliques', 'Core - Obliques')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={12}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(getFrequencyWithFallback('Lower Back', 'Back - Lower Back')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Lower Back {getFrequencyWithFallback('Lower Back', 'Back - Lower Back') ? `(${getFrequencyWithFallback('Lower Back', 'Back - Lower Back')})` : ''}
            </Typography>
          </Box>
        </Grid>

        {/* Lower body */}
        <Grid size={12}>
          <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }} gutterBottom>
            Lower Body
          </Typography>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Glutes', 'Legs - Glutes')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Glutes {getFrequencyWithFallback('Glutes', 'Legs - Glutes') ? `(${getFrequencyWithFallback('Glutes', 'Legs - Glutes')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 45,
              backgroundColor: getColor(getFrequencyWithFallback('Hip Flexors', 'Legs - Hip Flexors')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Hip Flexors {getFrequencyWithFallback('Hip Flexors', 'Legs - Hip Flexors') ? `(${getFrequencyWithFallback('Hip Flexors', 'Legs - Hip Flexors')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(getFrequencyWithFallback('Quadriceps', 'Quads', 'Legs - Quads')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Quads {getFrequencyWithFallback('Quadriceps', 'Quads', 'Legs - Quads') ? `(${getFrequencyWithFallback('Quadriceps', 'Quads', 'Legs - Quads')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              height: 50,
              backgroundColor: getColor(getFrequencyWithFallback('Hamstrings', 'Legs - Hamstrings')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Hamstrings {getFrequencyWithFallback('Hamstrings', 'Legs - Hamstrings') ? `(${getFrequencyWithFallback('Hamstrings', 'Legs - Hamstrings')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(getFrequencyWithFallback('Adductors', 'Hip Adductors', 'Legs - Hip Adductors')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Adductors {getFrequencyWithFallback('Adductors', 'Hip Adductors', 'Legs - Hip Adductors') ? `(${getFrequencyWithFallback('Adductors', 'Hip Adductors', 'Legs - Hip Adductors')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box
            sx={{
              height: 40,
              backgroundColor: getColor(getFrequencyWithFallback('Abductors', 'Hip Abductors', 'Legs - Hip Abductors')),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ccc'
            }}
          >
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Abductors {getFrequencyWithFallback('Abductors', 'Hip Abductors', 'Legs - Hip Abductors') ? `(${getFrequencyWithFallback('Abductors', 'Hip Abductors', 'Legs - Hip Abductors')})` : ''}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
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
            <Typography variant="body2" sx={{ color: mode === 'dark' ? 'black' : 'inherit' }}>
              Calves {frequencyMap['Calves'] ? `(${frequencyMap['Calves']})` : ''}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default BodyVisualization2D
