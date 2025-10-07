import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import { authenticatedGet } from '../../utils/api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const GpsMap = ({ sessionId }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await authenticatedGet(
          `/api/workout-sessions/${sessionId}/time-series/gps`
        )

        if (response.data && response.data.length > 0) {
          setData(response.data)

          // Calculate stats
          const elevations = response.data
            .map(p => p.elevation)
            .filter(e => e !== null && e !== undefined)

          let elevationGain = 0
          let elevationLoss = 0
          for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1]
            if (diff > 0) elevationGain += diff
            else elevationLoss += Math.abs(diff)
          }

          setStats({
            points: response.data.length,
            minElevation: elevations.length > 0 ? Math.min(...elevations) : null,
            maxElevation: elevations.length > 0 ? Math.max(...elevations) : null,
            elevationGain: elevationGain,
            elevationLoss: elevationLoss
          })
        } else {
          setData([])
        }
      } catch (err) {
        console.error('Error fetching GPS data:', err)
        setError('Failed to load GPS data')
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

  // Convert data to lat/lng array for Polyline
  const positions = data.map(point => [point.latitude, point.longitude])

  // Calculate center and bounds
  const lats = data.map(p => p.latitude)
  const lngs = data.map(p => p.longitude)
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

  const startPoint = data[0]
  const endPoint = data[data.length - 1]

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Route Map
      </Typography>

      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          {stats.elevationGain > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Elevation Gain
              </Typography>
              <Typography variant="h6">
                {Math.round(stats.elevationGain)} m
              </Typography>
            </Box>
          )}
          {stats.minElevation !== null && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Min Elevation
              </Typography>
              <Typography variant="h6">
                {Math.round(stats.minElevation)} m
              </Typography>
            </Box>
          )}
          {stats.maxElevation !== null && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Max Elevation
              </Typography>
              <Typography variant="h6">
                {Math.round(stats.maxElevation)} m
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ height: 400, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          <Polyline
            positions={positions}
            color="#2196f3"
            weight={4}
            opacity={0.7}
          />

          {/* Start marker */}
          <Marker position={[startPoint.latitude, startPoint.longitude]}>
            <Popup>
              <strong>Start</strong>
              <br />
              {startPoint.elevation && `Elevation: ${Math.round(startPoint.elevation)} m`}
            </Popup>
          </Marker>

          {/* End marker */}
          <Marker position={[endPoint.latitude, endPoint.longitude]}>
            <Popup>
              <strong>End</strong>
              <br />
              {endPoint.elevation && `Elevation: ${Math.round(endPoint.elevation)} m`}
            </Popup>
          </Marker>
        </MapContainer>
      </Box>
    </Paper>
  )
}

export default GpsMap
