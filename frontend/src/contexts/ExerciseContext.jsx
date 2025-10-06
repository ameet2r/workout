import { createContext, useContext, useState, useEffect } from 'react'
import { authenticatedGet } from '../utils/api'
import { useAuth } from './AuthContext'

const ExerciseContext = createContext({})

export const useExercises = () => {
  const context = useContext(ExerciseContext)
  if (!context) {
    throw new Error('useExercises must be used within ExerciseProvider')
  }
  return context
}

export const ExerciseProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const [exercises, setExercises] = useState([])
  const [exerciseVersions, setExerciseVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchExercises = async () => {
    try {
      setLoading(true)
      setError(null)
      const [exercisesData, versionsData] = await Promise.all([
        authenticatedGet('/api/exercises'),
        authenticatedGet('/api/exercises/versions/my-versions')
      ])
      setExercises(exercisesData)
      setExerciseVersions(versionsData)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch exercises when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchExercises()
    } else {
      // Clear data when user logs out
      setExercises([])
      setExerciseVersions([])
      setLoading(false)
    }
  }, [currentUser])

  // Refetch exercises (call this after creating/updating an exercise)
  const refreshExercises = async () => {
    await fetchExercises()
  }

  const value = {
    exercises,
    exerciseVersions,
    loading,
    error,
    refreshExercises
  }

  return <ExerciseContext.Provider value={value}>{children}</ExerciseContext.Provider>
}
