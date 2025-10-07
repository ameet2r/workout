import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material'
import { LineChart } from '@mui/x-charts'
import { authenticatedGet } from '../../utils/api'

const HeartRateChart = ({ sessionId }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await authenticatedGet(
          `/api/workout-sessions/${sessionId}/time-series/heart_rate`
        )

        if (response.data && response.data.length > 0) {
          // Convert timestamp strings to Date objects and format for chart
          const chartData = response.data.map(point => ({
            time: new Date(point.timestamp),
            heartRate: point.value
          }))
          setData(chartData)
        } else {
          setData([])
        }
      } catch (err) {
        console.error('Error fetching heart rate data:', err)
        setError('Failed to load heart rate data')
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

  const avgHeartRate = Math.round(data.reduce((sum, d) => sum + d.heartRate, 0) / data.length)
  const maxHeartRate = Math.max(...data.map(d => d.heartRate))
  const minHeartRate = Math.min(...data.map(d => d.heartRate))

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Heart Rate
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Average
          </Typography>
          <Typography variant="h6">
            {avgHeartRate} bpm
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Max
          </Typography>
          <Typography variant="h6">
            {maxHeartRate} bpm
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Min
          </Typography>
          <Typography variant="h6">
            {minHeartRate} bpm
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
          dataKey: 'heartRate',
          label: 'Heart Rate (bpm)',
          color: '#f44336',
          showMark: false,
          curve: 'natural'
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

export default HeartRateChart
