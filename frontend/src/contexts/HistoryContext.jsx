import { createContext, useContext, useState, useEffect } from 'react'
import { authenticatedGet } from '../utils/api'
import { useAuth } from './AuthContext'

const HistoryContext = createContext({})

export const useHistory = () => {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider')
  }
  return context
}

export const HistoryProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const [workoutSessions, setWorkoutSessions] = useState([])
  const [workoutPlans, setWorkoutPlans] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const [sessionsData, plansData] = await Promise.all([
        authenticatedGet('/api/workout-sessions'),
        authenticatedGet('/api/workout-plans')
      ])

      setWorkoutSessions(sessionsData)

      // Convert plans array to object for easy lookup
      const plansMap = {}
      plansData.forEach(plan => {
        plansMap[plan.id] = plan
      })
      setWorkoutPlans(plansMap)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch history when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchHistory()
    } else {
      // Clear data when user logs out
      setWorkoutSessions([])
      setWorkoutPlans({})
      setLoading(false)
    }
  }, [currentUser])

  // Refetch all history (call this after completing a workout)
  const refreshHistory = async () => {
    await fetchHistory()
  }

  // Add a new workout session to the context
  const addWorkoutSession = (session) => {
    setWorkoutSessions(prev => [session, ...prev])
  }

  // Update an existing workout session
  const updateWorkoutSession = (sessionId, updatedData) => {
    setWorkoutSessions(prev =>
      prev.map(session =>
        session.id === sessionId ? { ...session, ...updatedData } : session
      )
    )
  }

  // Delete a workout session from the context
  const deleteWorkoutSession = (sessionId) => {
    setWorkoutSessions(prev => prev.filter(session => session.id !== sessionId))
  }

  // Get a specific workout session by ID
  const getWorkoutSession = (sessionId) => {
    return workoutSessions.find(session => session.id === sessionId)
  }

  // Get recent workout sessions (limited to n)
  const getRecentWorkouts = (limit = 5) => {
    return workoutSessions.slice(0, limit)
  }

  const value = {
    workoutSessions,
    workoutPlans,
    loading,
    error,
    refreshHistory,
    addWorkoutSession,
    updateWorkoutSession,
    deleteWorkoutSession,
    getWorkoutSession,
    getRecentWorkouts
  }

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}
