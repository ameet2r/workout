import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material'
import { LineChart } from '@mui/x-charts'
import { authenticatedGet } from '../../utils/api'

const AltitudeChart = ({ sessionId }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await authenticatedGet(
          `/api/workout-sessions/${sessionId}/time-series/altitude`
        )

        if (response.data && response.data.length > 0) {
          const chartData = response.data.map(point => ({
            time: new Date(point.timestamp),
            altitude: point.value
          }))
          setData(chartData)
        } else {
          setData([])
        }
      } catch (err) {
        console.error('Error fetching altitude data:', err)
        setError('Failed to load altitude data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sessionId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  if (data.length === 0) {
    return null
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const avgAltitude = Math.round(data.reduce((sum, d) => sum + d.altitude, 0) / data.length)
  const maxAltitude = Math.round(Math.max(...data.map(d => d.altitude)))
  const minAltitude = Math.round(Math.min(...data.map(d => d.altitude)))

  // Calculate elevation gain
  let elevationGain = 0
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].altitude - data[i - 1].altitude
    if (diff > 0) elevationGain += diff
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Altitude Profile
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Average
          </Typography>
          <Typography variant="h6">
            {avgAltitude} m
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Max
          </Typography>
          <Typography variant="h6">
            {maxAltitude} m
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Min
          </Typography>
          <Typography variant="h6">
            {minAltitude} m
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Gain
          </Typography>
          <Typography variant="h6">
            {Math.round(elevationGain)} m
          </Typography>
        </Box>
      </Box>

      <LineChart
        dataset={data}
        xAxis={[{
          dataKey: 'time',
          scaleType: 'time',
          valueFormatter: formatTime
        }]}
        series={[{
          dataKey: 'altitude',
          label: 'Altitude (m)',
          color: '#795548',
          showMark: false,
          curve: 'natural',
          area: true
        }]}
        height={300}
        margin={{ left: 50, right: 20, top: 20, bottom: 50 }}
        grid={{ vertical: true, horizontal: true }}
        slotProps={{
          popper: {
            sx: {
              '& .MuiChartsTooltip-table': {
                backgroundColor: 'background.paper'
              }
            }
          }
        }}
        axisHighlight={{
          x: 'line',
          y: 'none'
        }}
      />
    </Paper>
  )
}

export default AltitudeChart
