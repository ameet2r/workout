import { Box, Typography, Paper } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

const ProfilePage = () => {
  const { currentUser } = useAuth()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
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
    </Box>
  )
}

export default ProfilePage
