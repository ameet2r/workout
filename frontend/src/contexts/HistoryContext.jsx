import { createContext, useContext, useState, useEffect } from 'react'
import { authenticatedGet } from '../utils/api'
import { useAuth } from './AuthContext'

const HistoryContext = createContext({})

// Local storage keys
const STORAGE_KEY = 'workout_history'
const STORAGE_TIMESTAMP_KEY = 'workout_history_timestamp'
const CACHE_DURATION = 1000 * 60 * 5 // 5 minutes

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

  // Helper function to save to local storage
  const saveToLocalStorage = (sessions, plans) => {
    try {
      const data = { sessions, plans }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString())
    } catch (err) {
      console.error('Error saving to local storage:', err)
    }
  }

  // Helper function to load from local storage
  const loadFromLocalStorage = () => {
    try {
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY)
      if (!timestamp) return null

      const age = Date.now() - parseInt(timestamp)
      if (age > CACHE_DURATION) {
        // Cache expired
        return null
      }

      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return null

      return JSON.parse(data)
    } catch (err) {
      console.error('Error loading from local storage:', err)
      return null
    }
  }

  // Helper function to clear local storage
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY)
    } catch (err) {
      console.error('Error clearing local storage:', err)
    }
  }

  const fetchHistory = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = loadFromLocalStorage()
        if (cached) {
          setWorkoutSessions(cached.sessions)
          setWorkoutPlans(cached.plans)
          setLoading(false)
          return
        }
      }

      // Fetch from API
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

      // Save to local storage
      saveToLocalStorage(sessionsData, plansMap)
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
      clearLocalStorage()
    }
  }, [currentUser])

  // Refetch all history (call this after completing a workout)
  const refreshHistory = async () => {
    await fetchHistory(true) // Force refresh from API
  }

  // Add a new workout session to the context
  const addWorkoutSession = (session) => {
    setWorkoutSessions(prev => {
      const updated = [session, ...prev]
      saveToLocalStorage(updated, workoutPlans)
      return updated
    })
  }

  // Update an existing workout session
  const updateWorkoutSession = (sessionId, updatedData) => {
    setWorkoutSessions(prev => {
      const updated = prev.map(session =>
        session.id === sessionId ? { ...session, ...updatedData } : session
      )
      saveToLocalStorage(updated, workoutPlans)
      return updated
    })
  }

  // Delete a workout session from the context
  const deleteWorkoutSession = (sessionId) => {
    setWorkoutSessions(prev => {
      const updated = prev.filter(session => session.id !== sessionId)
      saveToLocalStorage(updated, workoutPlans)
      return updated
    })
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
