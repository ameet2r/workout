import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  LinearProgress
} from '@mui/material'
import { Upload, CheckCircle } from '@mui/icons-material'
import { authenticatedFormDataPost } from '../../utils/api'

const GarminUpload = ({ sessionId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      const validExtensions = ['.fit', '.tcx', '.gpx', '.zip']
      const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]

      if (!validExtensions.includes(fileExtension)) {
        setError('Please upload a .fit, .tcx, .gpx, or .zip file')
        setSelectedFile(null)
        return
      }

      // Validate file size (10 MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 10 MB')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const updatedSession = await authenticatedFormDataPost(
        `/api/workout-sessions/${sessionId}/upload-garmin`,
        formData
      )

      setUploadProgress(100)

      // Count data points for success message
      const hasGarminData = updatedSession.garmin_data
      const hrCount = hasGarminData?.has_heart_rate ? 'with heart rate' : ''
      const gpsCount = hasGarminData?.has_gps ? 'GPS' : ''
      const features = [hrCount, gpsCount].filter(Boolean).join(', ')

      setSuccess(`Successfully uploaded! ${features || 'Garmin data uploaded'}`)
      setSelectedFile(null)

      // Call the success callback with the updated session
      if (onUploadSuccess) {
        onUploadSuccess(updatedSession)
      }

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Garmin Data
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload a .fit, .tcx, .gpx, or .zip file from your Garmin device to add heart rate, GPS, and other metrics to this workout.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          accept=".fit,.tcx,.gpx,.zip"
          style={{ display: 'none' }}
          id="garmin-file-upload"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="garmin-file-upload">
          <Button
            variant="outlined"
            component="span"
            disabled={uploading}
            startIcon={<Upload />}
          >
            Choose File
          </Button>
        </label>

        {selectedFile && (
          <Typography variant="body2" color="text.secondary">
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </Typography>
        )}

        {selectedFile && !uploading && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
          >
            Upload
          </Button>
        )}

        {uploading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Uploading and processing...
            </Typography>
          </Box>
        )}
      </Box>

      {uploading && uploadProgress > 0 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}
    </Paper>
  )
}

export default GarminUpload
