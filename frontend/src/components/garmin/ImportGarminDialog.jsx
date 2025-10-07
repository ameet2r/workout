import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material'
import { Upload, CheckCircle } from '@mui/icons-material'
import { getAuth } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

const ImportGarminDialog = ({ open, onClose, onSuccess }) => {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
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
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setUploadProgress(30)

    try {
      const auth = getAuth()
      const token = await auth.currentUser.getIdToken()

      // Step 1: Create a new workout session
      setUploadProgress(40)
      const createResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_API}/api/workout-sessions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exercises: [],
            notes: `Imported from ${selectedFile.name}`
          })
        }
      )

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.detail || 'Failed to create workout session')
      }

      const newSession = await createResponse.json()
      const sessionId = newSession.id

      // Step 2: Upload Garmin file to the new session
      setUploadProgress(60)
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_API}/api/workout-sessions/${sessionId}/upload-garmin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      )

      setUploadProgress(90)

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      setUploadProgress(100)

      // Success! Navigate to the new session
      if (onSuccess) {
        onSuccess(newSession)
      }

      // Navigate to the workout detail page
      setTimeout(() => {
        navigate(`/history/${sessionId}`)
        handleClose()
      }, 500)

    } catch (err) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import workout')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null)
      setError(null)
      setUploadProgress(0)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Workout from Garmin</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload a .fit, .tcx, .gpx, or .zip file from your Garmin device. This will create a new workout session with all the data from your file.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            accept=".fit,.tcx,.gpx,.zip"
            style={{ display: 'none' }}
            id="import-garmin-file"
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label htmlFor="import-garmin-file">
            <Button
              variant="outlined"
              component="span"
              disabled={uploading}
              startIcon={<Upload />}
              fullWidth
            >
              Choose File
            </Button>
          </label>

          {selectedFile && (
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}

          {uploading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                {uploadProgress < 50 ? 'Creating workout session...' : 'Uploading and processing file...'}
              </Typography>
            </Box>
          )}

          {uploading && uploadProgress > 0 && (
            <LinearProgress variant="determinate" value={uploadProgress} />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!selectedFile || uploading}
        >
          {uploading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportGarminDialog
