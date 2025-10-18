import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ExerciseProvider } from './contexts/ExerciseContext'
import { HistoryProvider } from './contexts/HistoryContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './routes/LoginPage'
import DashboardPage from './routes/DashboardPage'
import WorkoutPlansPage from './routes/WorkoutPlansPage'
import ActiveWorkoutPage from './routes/ActiveWorkoutPage'
import HistoryPage from './routes/HistoryPage'
import WorkoutDetailPage from './routes/WorkoutDetailPage'
import ProgressPage from './routes/ProgressPage'
import CardioProgressPage from './routes/CardioProgressPage'
import ExerciseLibraryPage from './routes/ExerciseLibraryPage'
import ProfilePage from './routes/ProfilePage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ExerciseProvider>
          <HistoryProvider>
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
                  <Route path="history/:sessionId" element={<WorkoutDetailPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="progress/cardio" element={<CardioProgressPage />} />
                  <Route path="exercises" element={<ExerciseLibraryPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Routes>
            </Router>
          </HistoryProvider>
        </ExerciseProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
