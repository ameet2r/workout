import { createContext, useContext, useState, useEffect } from 'react'
import { authenticatedGet } from '../utils/api'
import { useAuth } from './AuthContext'

const HistoryContext = createContext({})

// Local storage keys
const STORAGE_KEY = 'workout_history'
const STORAGE_TIMESTAMP_KEY = 'workout_history_timestamp'
const DATE_RANGE_KEY = 'workout_date_range'
const CACHE_DURATION = 1000 * 60 * 5 // 5 minutes

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get default date range (last 30 days)
const getDefaultDateRange = () => {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  return {
    startDate: getLocalDateString(thirtyDaysAgo),
    endDate: getLocalDateString(today)
  }
}

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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Helper function to save to local storage with date range
  const saveToLocalStorage = (sessions, plans, dateStart, dateEnd) => {
    try {
      const data = {
        sessions,
        plans,
        startDate: dateStart,
        endDate: dateEnd
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString())
    } catch (err) {
      console.error('Error saving to local storage:', err)
    }
  }

  // Helper function to save date range to local storage
  const saveDateRangeToLocalStorage = (start, end) => {
    try {
      const dateRange = { startDate: start, endDate: end }
      localStorage.setItem(DATE_RANGE_KEY, JSON.stringify(dateRange))
    } catch (err) {
      console.error('Error saving date range to local storage:', err)
    }
  }

  // Helper function to load from local storage (with date range validation)
  const loadFromLocalStorage = (requestedStartDate, requestedEndDate) => {
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

      const parsed = JSON.parse(data)

      // Verify the cached date range matches the requested date range
      if (parsed.startDate !== requestedStartDate || parsed.endDate !== requestedEndDate) {
        // Date range doesn't match, cache is invalid
        return null
      }

      return parsed
    } catch (err) {
      console.error('Error loading from local storage:', err)
      return null
    }
  }

  // Helper function to load date range from local storage
  const loadDateRangeFromLocalStorage = () => {
    try {
      const data = localStorage.getItem(DATE_RANGE_KEY)
      if (!data) return null
      return JSON.parse(data)
    } catch (err) {
      console.error('Error loading date range from local storage:', err)
      return null
    }
  }

  // Helper function to clear local storage
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY)
      localStorage.removeItem(DATE_RANGE_KEY)
    } catch (err) {
      console.error('Error clearing local storage:', err)
    }
  }

  // Initialize date range from localStorage or defaults
  useEffect(() => {
    const savedDateRange = loadDateRangeFromLocalStorage()
    if (savedDateRange) {
      setStartDate(savedDateRange.startDate)
      setEndDate(savedDateRange.endDate)
    } else {
      const defaultRange = getDefaultDateRange()
      setStartDate(defaultRange.startDate)
      setEndDate(defaultRange.endDate)
      saveDateRangeToLocalStorage(defaultRange.startDate, defaultRange.endDate)
    }
  }, [])

  const fetchHistory = async (forceRefresh = false, useStartDate = null, useEndDate = null) => {
    try {
      setLoading(true)
      setError(null)

      // Use provided dates or fall back to context dates
      const fetchStartDate = useStartDate !== null ? useStartDate : startDate
      const fetchEndDate = useEndDate !== null ? useEndDate : endDate

      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = loadFromLocalStorage(fetchStartDate, fetchEndDate)
        if (cached) {
          setWorkoutSessions(cached.sessions)
          setWorkoutPlans(cached.plans)
          setLoading(false)
          return
        }
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (fetchStartDate) params.append('start_date', fetchStartDate)
      if (fetchEndDate) params.append('end_date', fetchEndDate)
      const queryString = params.toString() ? `?${params.toString()}` : ''

      // Fetch from API
      const [sessionsData, plansData] = await Promise.all([
        authenticatedGet(`/api/workout-sessions${queryString}`),
        authenticatedGet('/api/workout-plans')
      ])

      setWorkoutSessions(sessionsData)

      // Convert plans array to object for easy lookup
      const plansMap = {}
      plansData.forEach(plan => {
        plansMap[plan.id] = plan
      })
      setWorkoutPlans(plansMap)

      // Save to local storage with current date range
      saveToLocalStorage(sessionsData, plansMap, fetchStartDate, fetchEndDate)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch history when user logs in or date range changes
  useEffect(() => {
    if (currentUser && startDate && endDate) {
      fetchHistory(false, startDate, endDate)
    } else if (!currentUser) {
      // Clear data when user logs out
      setWorkoutSessions([])
      setWorkoutPlans({})
      setLoading(false)
      clearLocalStorage()
    }
  }, [currentUser, startDate, endDate])

  // Refetch all history (call this after completing a workout)
  const refreshHistory = async (useStartDate = null, useEndDate = null) => {
    await fetchHistory(true, useStartDate, useEndDate) // Force refresh from API
  }

  // Update the date range and save to localStorage
  const updateDateRange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
    saveDateRangeToLocalStorage(newStartDate, newEndDate)
  }

  // Helper to invalidate cache
  const invalidateCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY)
    } catch (err) {
      console.error('Error invalidating cache:', err)
    }
  }

  // Add a new workout session to the context
  const addWorkoutSession = (session) => {
    // Invalidate cache and refetch to ensure consistency
    invalidateCache()
    refreshHistory()
  }

  // Update an existing workout session
  const updateWorkoutSession = (sessionId, updatedData) => {
    // Invalidate cache and refetch to ensure consistency
    invalidateCache()
    refreshHistory()
  }

  // Delete a workout session from the context
  const deleteWorkoutSession = (sessionId) => {
    // Optimistically update UI
    setWorkoutSessions(prev => prev.filter(session => session.id !== sessionId))
    // Invalidate cache (will refetch on next load)
    invalidateCache()
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
    startDate,
    endDate,
    updateDateRange,
    fetchHistory,
    refreshHistory,
    addWorkoutSession,
    updateWorkoutSession,
    deleteWorkoutSession,
    getWorkoutSession,
    getRecentWorkouts,
    getLocalDateString
  }

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}
