import { Box, Typography, Paper } from '@mui/material'

const FrequencyLegend = ({ maxFrequency = 0 }) => {
  // Ensure maxFrequency is a valid number
  const validMaxFrequency = Number.isFinite(maxFrequency) ? maxFrequency : 0

  const legendItems = [
    { label: 'Very High (80-100%)', color: '#d32f2f', range: `${Math.ceil(validMaxFrequency * 0.8)}-${validMaxFrequency}` },
    { label: 'High (60-80%)', color: '#f44336', range: `${Math.ceil(validMaxFrequency * 0.6)}-${Math.ceil(validMaxFrequency * 0.8)}` },
    { label: 'Medium (40-60%)', color: '#ff9800', range: `${Math.ceil(validMaxFrequency * 0.4)}-${Math.ceil(validMaxFrequency * 0.6)}` },
    { label: 'Low (20-40%)', color: '#ffc107', range: `${Math.ceil(validMaxFrequency * 0.2)}-${Math.ceil(validMaxFrequency * 0.4)}` },
    { label: 'Very Low (0-20%)', color: '#ffeb3b', range: `0-${Math.ceil(validMaxFrequency * 0.2)}` },
    { label: 'Not Trained', color: '#e0e0e0', range: '0' }
  ]

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Training Frequency Legend
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {legendItems.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                backgroundColor: item.color,
                borderRadius: 1,
                border: '1px solid #ccc'
              }}
            />
            <Box>
              <Typography variant="caption" display="block">
                {item.label}
              </Typography>
              {validMaxFrequency > 0 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.range} times
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

export default FrequencyLegend
