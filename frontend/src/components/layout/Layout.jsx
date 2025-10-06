import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Chip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  FitnessCenter,
  History,
  TrendingUp,
  SportsGymnastics,
  AccountCircle,
  Logout,
  PlayArrow,
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { authenticatedGet } from '../../utils/api'

const drawerWidth = 240

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Workout Plans', icon: <FitnessCenter />, path: '/plans' },
  { text: 'History', icon: <History />, path: '/history' },
  { text: 'Progress', icon: <TrendingUp />, path: '/progress' },
  { text: 'Exercises', icon: <SportsGymnastics />, path: '/exercises' },
  { text: 'Profile', icon: <AccountCircle />, path: '/profile' },
]

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeWorkout, setActiveWorkout] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, currentUser } = useAuth()

  useEffect(() => {
    fetchActiveWorkout()
  }, [location.pathname])

  const fetchActiveWorkout = async () => {
    try {
      const sessions = await authenticatedGet('/api/workout-sessions')
      const active = sessions.find(session => !session.end_time)
      setActiveWorkout(active)
    } catch (err) {
      console.error('Error fetching active workout:', err)
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Workout Tracker
        </Typography>
      </Toolbar>
      <Divider />
      {activeWorkout && (
        <>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(`/workout/${activeWorkout.id}`)}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'primary.contrastText' }}>
                  <PlayArrow />
                </ListItemIcon>
                <ListItemText
                  primary="Active Workout"
                  secondary="In Progress"
                  secondaryTypographyProps={{
                    sx: { color: 'primary.contrastText', opacity: 0.8 }
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider />
        </>
      )}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavigation(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Workout Tracker
          </Typography>
          <Typography variant="body2">{currentUser?.email}</Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout
