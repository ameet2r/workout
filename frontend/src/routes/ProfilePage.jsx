import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  TextField
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { authenticatedDelete } from '../utils/api'

const ProfilePage = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [openDialog, setOpenDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDeleteClick = () => {
    setOpenDialog(true)
    setError('')
    setConfirmText('')
  }

  const handleClose = () => {
    setOpenDialog(false)
    setConfirmText('')
    setError('')
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authenticatedDelete(`/api/users/${currentUser.uid}`)

      // Logout and redirect to auth page
      await logout()
      navigate('/auth')
    } catch (err) {
      setError(err.message || 'Failed to delete account')
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Typography variant="body1">
          Email: {currentUser?.email}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Profile settings and preferences coming soon...
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, borderColor: 'error.main', border: 1 }}>
        <Typography variant="h6" gutterBottom color="error">
          Danger Zone
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Once you delete your account, there is no going back. All your workout data, plans, and history will be permanently deleted.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteClick}
        >
          Delete Account
        </Button>
      </Paper>

      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
          </DialogContentText>
          <DialogContentText component="ul" sx={{ mb: 2 }}>
            <li>All workout sessions and history</li>
            <li>All workout plans</li>
            <li>All exercise versions</li>
            <li>Your user profile</li>
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            Please type <strong>DELETE</strong> to confirm.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            error={Boolean(error)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={loading || confirmText !== 'DELETE'}
          >
            {loading ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProfilePage
