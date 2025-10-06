import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { theme } from './theme/theme'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './routes/LoginPage'
import DashboardPage from './routes/DashboardPage'
import WorkoutPlansPage from './routes/WorkoutPlansPage'
import ActiveWorkoutPage from './routes/ActiveWorkoutPage'
import HistoryPage from './routes/HistoryPage'
import ProgressPage from './routes/ProgressPage'
import ExerciseLibraryPage from './routes/ExerciseLibraryPage'
import ProfilePage from './routes/ProfilePage'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/auth" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="plans" element={<WorkoutPlansPage />} />
              <Route path="workout/:sessionId" element={<ActiveWorkoutPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="exercises" element={<ExerciseLibraryPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
