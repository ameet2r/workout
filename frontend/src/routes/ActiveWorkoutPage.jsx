import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material'
import { Add, Delete, Check, Close, PlayArrow, Stop, Refresh, Favorite, Bluetooth, BluetoothDisabled, FileDownload } from '@mui/icons-material'
import { authenticatedGet, authenticatedPatch, authenticatedPost, authenticatedDelete } from '../utils/api'
import { useExercises } from '../contexts/ExerciseContext'
import { useHistory } from '../contexts/HistoryContext'
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor'
import logger from '../utils/workoutLogger'

// Check if debug mode is enabled
const isDebugEnabled = import.meta.env.VITE_DEBUG_HEART_RATE === 'true'

const ActiveWorkoutPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { exercises, exerciseVersions } = useExercises()
  const { refreshHistory, deleteWorkoutSession } = useHistory()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)
  const [workoutPlan, setWorkoutPlan] = useState(null)
  const [sessionExercises, setSessionExercises] = useState([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentReps, setCurrentReps] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [currentRpe, setCurrentRpe] = useState('')
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false)
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [oneRmMode, setOneRmMode] = useState(false)
  const [exerciseHistoryCache, setExerciseHistoryCache] = useState({}) // Cache by exercise_version_id
  const [activeTimerIndex, setActiveTimerIndex] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const timerIntervalRef = useRef(null)
  const audioRef = useRef(null)
  const [currentSetTimerRuns, setCurrentSetTimerRuns] = useState([]) // Timer runs for the current set
  const timerStartTimeRef = useRef(null) // Track when current timer started
  const timerPlannedDurationRef = useRef(null) // Track planned duration of current timer

  // Heart rate monitoring
  const { isSupported, isConnected, currentHeartRate, deviceName, error: hrError, connect, disconnect, reconnect } = useHeartRateMonitor()
  const [heartRateReadings, setHeartRateReadings] = useState([])
  const [includeHeartRate, setIncludeHeartRate] = useState(false)
  const lastHeartRateRef = useRef(null)

  useEffect(() => {
    fetchWorkoutData()
  }, [sessionId])

  // Monitor connection status changes
  useEffect(() => {
    if (isConnected) {
      if (isDebugEnabled) {
        logger.info('Workout', 'Heart rate monitor connected')
      }

      // Only initialize lastHeartRateRef if it's not already set
      // This prevents resetting it on every effect run
      if (!lastHeartRateRef.current) {
        lastHeartRateRef.current = Date.now()
      }

      // Set up a periodic check for stale heart rate data
      const intervalId = setInterval(() => {
        if (lastHeartRateRef.current) {
          const secondsSinceLastReading = (Date.now() - lastHeartRateRef.current) / 1000
          if (secondsSinceLastReading > 10 && isDebugEnabled) {
            logger.warn('Workout', `⚠️ No heart rate data received in ${secondsSinceLastReading.toFixed(0)}s - possible connection issue`)
          }
        }
      }, 10000) // Check every 10 seconds

      return () => clearInterval(intervalId)
    } else if (isConnected === false) {
      if (isDebugEnabled) {
        logger.info('Workout', 'Heart rate monitor disconnected')
      }
      // Reset the ref when disconnected so it can be reinitialized on next connection
      lastHeartRateRef.current = null
    }
  }, [isConnected])

  // Track when heart rate data is received
  useEffect(() => {
    if (currentHeartRate && isConnected) {
      lastHeartRateRef.current = Date.now()
    }
  }, [currentHeartRate, isConnected])

  // Load session exercises and heart rate data from localStorage on mount
  useEffect(() => {
    const storedExercises = localStorage.getItem(`workout_session_${sessionId}_exercises`)
    const storedHeartRate = localStorage.getItem(`workout_session_${sessionId}_heart_rate`)

    if (storedExercises) {
      try {
        const parsed = JSON.parse(storedExercises)
        setSessionExercises(parsed)
      } catch (err) {
        if (isDebugEnabled) {
          logger.error('Workout', 'Error parsing stored exercises:', err.message)
        }
      }
    }

    if (storedHeartRate) {
      try {
        const parsed = JSON.parse(storedHeartRate)
        setHeartRateReadings(parsed)
      } catch (err) {
        if (isDebugEnabled) {
          logger.error('Workout', 'Error parsing stored heart rate:', err.message)
        }
      }
    }
  }, [sessionId])

  // Save session exercises to localStorage whenever they change
  useEffect(() => {
    if (sessionExercises.length > 0) {
      localStorage.setItem(`workout_session_${sessionId}_exercises`, JSON.stringify(sessionExercises))
    }
  }, [sessionExercises, sessionId])

  // Record heart rate readings to localStorage
  useEffect(() => {
    if (currentHeartRate && isConnected) {
      const newReading = {
        timestamp: new Date().toISOString(),
        value: currentHeartRate
      }

      setHeartRateReadings(prev => {
        const updated = [...prev, newReading]

        // Check for gaps in data (more than 5 seconds since last reading)
        if (prev.length > 0 && isDebugEnabled) {
          const lastTimestamp = new Date(prev[prev.length - 1].timestamp)
          const currentTimestamp = new Date(newReading.timestamp)
          const gapSeconds = (currentTimestamp - lastTimestamp) / 1000
          if (gapSeconds > 5) {
            logger.warn('Workout', `⚠️ Gap detected in heart rate data: ${gapSeconds.toFixed(1)}s since last reading`)
          }
        }

        // Save to localStorage
        try {
          const dataStr = JSON.stringify(updated)
          localStorage.setItem(`workout_session_${sessionId}_heart_rate`, dataStr)
        } catch (err) {
          if (isDebugEnabled) {
            logger.error('Workout', '❌ Failed to save heart rate to localStorage:', err.message)
            if (err.name === 'QuotaExceededError') {
              logger.error('Workout', '❌ localStorage quota exceeded! Cannot save more heart rate data.')
            }
          }
        }

        return updated
      })
    }
  }, [currentHeartRate, isConnected, sessionId])

  useEffect(() => {
    // Auto-set reps to 1 when in 1RM mode
    if (oneRmMode) {
      setCurrentReps('1')
    }
  }, [oneRmMode])

  useEffect(() => {
    // Auto-populate fields on initial load
    if (sessionExercises.length > 0 && currentExerciseIndex === 0 && !currentReps && !oneRmMode) {
      const exercise = sessionExercises[0]
      if (exercise) {
        setCurrentReps(exercise.plannedReps ? exercise.plannedReps.toString() : '')
        setCurrentWeight(exercise.plannedWeight && !exercise.isBodyweight ? exercise.plannedWeight.toString() : '')
      }
    }
  }, [sessionExercises])

  const fetchWorkoutData = async () => {
    try {
      setLoading(true)
      const sessionData = await authenticatedGet(`/api/workout-sessions/${sessionId}`)

      setSession(sessionData)

      // Fetch workout plan if session has a plan
      if (sessionData.workout_plan_id) {
        const planData = await authenticatedGet(`/api/workout-plans/${sessionData.workout_plan_id}`)
        setWorkoutPlan(planData)

        // Initialize session exercises from plan if session exercises are empty
        if (!sessionData.exercises || sessionData.exercises.length === 0) {
          const initialExercises = planData.exercises.map(pe => ({
            exercise_version_id: pe.exercise_version_id,
            sets: [],
            plannedSets: pe.planned_sets,
            plannedReps: pe.planned_reps,
            plannedWeight: pe.planned_weight,
            isBodyweight: pe.is_bodyweight,
            instruction: pe.instruction,
            timers: pe.timers
          }))
          setSessionExercises(initialExercises)
        } else {
          // Map session exercises with plan data
          const mappedExercises = planData.exercises.map(pe => {
            const sessionEx = sessionData.exercises.find(
              se => se.exercise_version_id === pe.exercise_version_id
            )
            return {
              exercise_version_id: pe.exercise_version_id,
              sets: sessionEx?.sets || [],
              plannedSets: pe.planned_sets,
              plannedReps: pe.planned_reps,
              plannedWeight: pe.planned_weight,
              isBodyweight: pe.is_bodyweight,
              instruction: pe.instruction,
              timers: pe.timers
            }
          })
          setSessionExercises(mappedExercises)
        }
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getExerciseVersionName = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return 'Loading...'
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return `${exercise?.name || 'Unknown'}${version.version_name !== 'Default' ? ` - ${version.version_name}` : ''}`
  }

  const getExerciseDescription = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return null
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return exercise?.description || null
  }

  const getExerciseEquipment = (versionId) => {
    const version = exerciseVersions.find(v => v.id === versionId)
    if (!version) return null
    const exercise = exercises.find(e => e.id === version.exercise_id)
    return exercise?.equipment || null
  }

  const handleAddSet = () => {
    if (!currentReps) return

    const currentExercise = sessionExercises[currentExerciseIndex]
    const newSet = {
      reps: parseInt(currentReps),
      weight: currentWeight ? parseFloat(currentWeight) : null,
      completed_at: new Date().toISOString(),
      rpe: currentRpe ? parseInt(currentRpe) : null,
      notes: null,
      timer_runs: currentSetTimerRuns.length > 0 ? currentSetTimerRuns : undefined
    }

    const updatedExercises = [...sessionExercises]
    updatedExercises[currentExerciseIndex] = {
      ...currentExercise,
      sets: [...currentExercise.sets, newSet]
    }
    setSessionExercises(updatedExercises)
    // Note: Data is automatically saved to localStorage via useEffect

    // Reset inputs and timer runs
    setCurrentReps('')
    setCurrentWeight('')
    setCurrentRpe('')
    setCurrentSetTimerRuns([])

    // Keep 1RM mode active if it was on (allows multiple 1RM attempts)
    if (oneRmMode) {
      setCurrentReps('1')
    } else {
      // Auto-populate fields from plan for next set
      setCurrentReps(currentExercise.plannedReps ? currentExercise.plannedReps.toString() : '')
      setCurrentWeight(currentExercise.plannedWeight && !currentExercise.isBodyweight ? currentExercise.plannedWeight.toString() : '')
    }
  }

  const handleDeleteSet = (exerciseIndex, setIndex) => {
    const updatedExercises = [...sessionExercises]
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      sets: updatedExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    }
    setSessionExercises(updatedExercises)
    // Note: Data is automatically saved to localStorage via useEffect
  }

  const handleCompleteWorkout = async () => {
    try {
      setCompletingWorkout(true)

      if (isDebugEnabled) {
        logger.info('Workout', 'Completing workout...')
      }

      // Prepare exercise data for upload
      const exercisesData = sessionExercises.map(ex => ({
        exercise_version_id: ex.exercise_version_id,
        sets: ex.sets
      }))

      // Update session with exercises data
      await authenticatedPatch(`/api/workout-sessions/${sessionId}`, {
        exercises: exercisesData
      })

      // If user wants to include heart rate data
      if (includeHeartRate && heartRateReadings.length > 0) {
        // Calculate summary statistics
        const hrValues = heartRateReadings.map(r => r.value)
        const avgHeartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
        const maxHeartRate = Math.max(...hrValues)
        const minHeartRate = Math.min(...hrValues)

        const garminData = {
          avg_heart_rate: avgHeartRate,
          max_heart_rate: maxHeartRate,
          min_heart_rate: minHeartRate,
          has_heart_rate: true
        }

        // Upload summary data
        await authenticatedPatch(`/api/workout-sessions/${sessionId}`, {
          garmin_data: garminData
        })

        // Upload time-series heart rate data to subcollection
        // Batch heart rate readings into groups of 150 (matching backend BATCH_SIZE)
        const BATCH_SIZE = 150
        const batches = []
        for (let i = 0; i < heartRateReadings.length; i += BATCH_SIZE) {
          batches.push(heartRateReadings.slice(i, i + BATCH_SIZE))
        }

        // Create time-series documents
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          await authenticatedPost(`/api/workout-sessions/${sessionId}/heart-rate-batch/${i}`, {
            data: batch
          })
        }

        if (isDebugEnabled) {
          logger.info('Workout', '✅ All heart rate data uploaded successfully')
        }
      }

      // Mark workout as complete
      await authenticatedPost(`/api/workout-sessions/${sessionId}/complete`, {})

      // Clean up localStorage
      localStorage.removeItem(`workout_session_${sessionId}_exercises`)
      localStorage.removeItem(`workout_session_${sessionId}_heart_rate`)

      // Disconnect heart rate monitor if connected
      if (isConnected) {
        disconnect()
      }

      await refreshHistory()
      setOpenCompleteDialog(false)

      if (isDebugEnabled) {
        logger.info('Workout', '✅ Workout completed successfully')
      }

      navigate('/history')
    } catch (err) {
      setCompletingWorkout(false)
      if (isDebugEnabled) {
        logger.error('Workout', 'Error completing workout:', err.message)
      }
      alert(`Error completing workout: ${err.message}`)
    }
  }

  const handleCancelWorkout = () => {
    setOpenCancelDialog(true)
  }

  const handleConfirmCancelWorkout = async () => {
    try {
      await authenticatedDelete(`/api/workout-sessions/${sessionId}`)
      deleteWorkoutSession(sessionId)

      // Clean up localStorage
      localStorage.removeItem(`workout_session_${sessionId}_exercises`)
      localStorage.removeItem(`workout_session_${sessionId}_heart_rate`)

      // Disconnect heart rate monitor if connected
      if (isConnected) {
        disconnect()
      }

      setOpenCancelDialog(false)
      navigate('/plans')
    } catch (err) {
      console.error('Error cancelling workout:', err)
    }
  }

  const fetchExerciseHistory = async (versionId) => {
    // Check if already cached
    if (exerciseHistoryCache[versionId]) {
      return exerciseHistoryCache[versionId]
    }

    try {
      const history = await authenticatedGet(`/api/workout-sessions/exercise-history/${versionId}`)
      setExerciseHistoryCache(prev => ({
        ...prev,
        [versionId]: history
      }))
      return history
    } catch (err) {
      console.error('Error fetching exercise history:', err)
      const emptyHistory = { sessions: [], estimated_1rm: null, actual_1rm: null }
      setExerciseHistoryCache(prev => ({
        ...prev,
        [versionId]: emptyHistory
      }))
      return emptyHistory
    }
  }

  const handleToggle1RmMode = async () => {
    const newMode = !oneRmMode
    setOneRmMode(newMode)

    // Lazy load exercise history when 1RM mode is turned ON
    if (newMode && sessionExercises[currentExerciseIndex]) {
      const versionId = sessionExercises[currentExerciseIndex].exercise_version_id
      await fetchExerciseHistory(versionId)
    }
  }

  const handleChangeExercise = (index) => {
    setCurrentExerciseIndex(index)
    setOneRmMode(false) // Reset 1RM mode when switching exercises
    setCurrentSetTimerRuns([]) // Clear timer runs when switching exercises

    // Auto-populate fields from plan
    const exercise = sessionExercises[index]
    if (exercise) {
      setCurrentReps(exercise.plannedReps ? exercise.plannedReps.toString() : '')
      setCurrentWeight(exercise.plannedWeight && !exercise.isBodyweight ? exercise.plannedWeight.toString() : '')
      setCurrentRpe('')
    } else {
      setCurrentReps('')
      setCurrentWeight('')
      setCurrentRpe('')
    }

    // Stop any active timer when changing exercise
    handleStopTimer()
  }

  // Timer management functions
  const handleStartTimer = (timerIndex, duration) => {
    // Stop any existing timer first
    if (timerIntervalRef.current) {
      handleStopTimer()
    }

    setActiveTimerIndex(timerIndex)
    setTimeRemaining(duration)
    timerStartTimeRef.current = new Date()
    timerPlannedDurationRef.current = duration

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer complete - record the run
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
          setActiveTimerIndex(null)

          // Record completed timer run - capture values before clearing refs
          if (timerStartTimeRef.current && timerPlannedDurationRef.current) {
            const startedAt = timerStartTimeRef.current.toISOString()
            const plannedDuration = timerPlannedDurationRef.current

            setCurrentSetTimerRuns(prev => [...prev, {
              started_at: startedAt,
              duration_seconds: plannedDuration,
              planned_duration_seconds: plannedDuration,
              completed: true
            }])
          }

          timerStartTimeRef.current = null
          timerPlannedDurationRef.current = null
          playNotificationSound()
          showNotification()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleStopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null

      // Record stopped timer run (not completed) - capture values before clearing refs
      if (timerStartTimeRef.current && timerPlannedDurationRef.current && timeRemaining !== null) {
        const startedAt = timerStartTimeRef.current.toISOString()
        const actualDuration = timerPlannedDurationRef.current - timeRemaining
        const plannedDuration = timerPlannedDurationRef.current

        setCurrentSetTimerRuns(prev => [...prev, {
          started_at: startedAt,
          duration_seconds: actualDuration,
          planned_duration_seconds: plannedDuration,
          completed: false
        }])
      }

      timerStartTimeRef.current = null
      timerPlannedDurationRef.current = null
    }
    setActiveTimerIndex(null)
    setTimeRemaining(null)
  }

  const handleRestartTimer = (timerIndex, duration) => {
    handleStartTimer(timerIndex, duration)
  }

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const showNotification = () => {
    // Try to show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!', {
        body: 'Your exercise timer has finished.'
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Timer Complete!', {
            body: 'Your exercise timer has finished.'
          })
        }
      })
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  const formatTimerDisplay = (duration, type) => {
    if (!duration) return ''
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    let timeStr = ''
    if (hours > 0) timeStr += `${hours}h`
    if (minutes > 0) timeStr += `${timeStr ? ' ' : ''}${minutes}m`
    if (seconds > 0 || !timeStr) timeStr += `${timeStr ? ' ' : ''}${seconds}s`

    return type === 'total' ? `${timeStr} total` : `${timeStr} per set`
  }

  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimerRunDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

    return parts.join(' ')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  if (!session || !workoutPlan) {
    return (
      <Box>
        <Alert severity="warning">
          Workout session not found or has no plan associated with it.
        </Alert>
      </Box>
    )
  }

  const currentExercise = sessionExercises[currentExerciseIndex]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{workoutPlan.name}</Typography>
        <Box>
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancelWorkout}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Check />}
            onClick={() => setOpenCompleteDialog(true)}
          >
            Complete Workout
          </Button>
        </Box>
      </Box>

      {workoutPlan.notes && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.lighter' }}>
          <Typography variant="body2" color="text.secondary">
            {workoutPlan.notes}
          </Typography>
        </Paper>
      )}

      {/* Heart Rate Monitor Section */}
      {isSupported && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: isConnected ? 'success.lighter' : 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isConnected ? <Bluetooth color="success" /> : <BluetoothDisabled />}
              <Typography variant="h6">
                Heart Rate Monitor
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isDebugEnabled && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
                    logger.downloadLogs(`workout-logs-${timestamp}.txt`)
                  }}
                  startIcon={<FileDownload />}
                  title={`Download ${logger.getLogCount()} log entries (${logger.getStorageSize()} KB)`}
                >
                  Debug Logs ({logger.getLogCount()})
                </Button>
              )}
              <Button
                variant={isConnected ? 'outlined' : 'contained'}
                color={isConnected ? 'error' : 'primary'}
                onClick={isConnected ? disconnect : connect}
                startIcon={isConnected ? <BluetoothDisabled /> : <Bluetooth />}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </Box>
          </Box>

          {hrError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {hrError}
            </Alert>
          )}

          {isConnected && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                {currentHeartRate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Favorite color="error" sx={{ animation: 'pulse 1s infinite' }} />
                    <Typography variant="h4" color="error">
                      {currentHeartRate}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      BPM
                    </Typography>
                  </Box>
                )}
                {deviceName && (
                  <Typography variant="body2" color="text.secondary">
                    Device: {deviceName}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {heartRateReadings.length} reading{heartRateReadings.length !== 1 ? 's' : ''} collected
              </Typography>
            </Box>
          )}

          {deviceName && !isConnected && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>
                Device paired but not receiving data. Try reconnecting.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={reconnect}
                startIcon={<Refresh />}
                fullWidth
              >
                Reconnect to {deviceName}
              </Button>
            </Box>
          )}

          {!isConnected && !deviceName && (
            <Typography variant="body2" color="text.secondary">
              Connect a Bluetooth heart rate monitor to track your heart rate during this workout.
              Compatible with most Garmin, Polar, and standard BLE heart rate monitors.
            </Typography>
          )}

          <style>
            {`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
              }
            `}
          </style>
        </Paper>
      )}

      {/* Exercise Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Exercise {currentExerciseIndex + 1} of {sessionExercises.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {sessionExercises.map((ex, index) => (
            <Chip
              key={index}
              label={`${index + 1}. ${getExerciseVersionName(ex.exercise_version_id).split(' - ')[0].substring(0, 15)}...`}
              onClick={() => handleChangeExercise(index)}
              color={index === currentExerciseIndex ? 'primary' : 'default'}
              variant={index === currentExerciseIndex ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      {/* Current Exercise */}
      {currentExercise && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {getExerciseVersionName(currentExercise.exercise_version_id)}
                </Typography>

                {getExerciseEquipment(currentExercise.exercise_version_id) && (
                  <Box sx={{ mb: 1 }}>
                    <Chip
                      label={`Equipment: ${getExerciseEquipment(currentExercise.exercise_version_id)}`}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  </Box>
                )}

                {currentExercise.plannedSets && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Target: {currentExercise.plannedSets} sets × {currentExercise.plannedReps || '?'} reps
                    {currentExercise.isBodyweight
                      ? ' @ Body weight'
                      : currentExercise.plannedWeight
                        ? ` @ ${currentExercise.plannedWeight}lbs`
                        : ''
                    }
                  </Typography>
                )}

                {getExerciseDescription(currentExercise.exercise_version_id) && (
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50', borderLeft: 3, borderColor: 'primary.main' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      Exercise Description
                    </Typography>
                    <Typography variant="body2">
                      {getExerciseDescription(currentExercise.exercise_version_id)}
                    </Typography>
                  </Paper>
                )}

                {currentExercise.instruction && (
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.lighter', borderLeft: 3, borderColor: 'info.main' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      Workout Plan Notes
                    </Typography>
                    <Typography variant="body2">
                      {currentExercise.instruction}
                    </Typography>
                  </Paper>
                )}

                {currentExercise.timers && currentExercise.timers.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Timers
                    </Typography>
                    {currentExercise.timers.map((timer, idx) => {
                      const isActive = activeTimerIndex === idx
                      return (
                        <Paper
                          key={idx}
                          sx={{
                            p: 2,
                            mb: 1,
                            bgcolor: isActive ? 'info.lighter' : 'background.default',
                            border: isActive ? 2 : 1,
                            borderColor: isActive ? 'info.main' : 'divider'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2">
                              {formatTimerDisplay(timer.duration, timer.type)}
                            </Typography>
                            {isActive && (
                              <Typography variant="h6" color="info.main" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {formatTimeRemaining(timeRemaining)}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isActive ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<PlayArrow />}
                                onClick={() => handleStartTimer(idx, timer.duration)}
                                fullWidth
                              >
                                Start
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Stop />}
                                  onClick={handleStopTimer}
                                  fullWidth
                                >
                                  Stop
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<Refresh />}
                                  onClick={() => handleRestartTimer(idx, timer.duration)}
                                  fullWidth
                                >
                                  Restart
                                </Button>
                              </>
                            )}
                          </Box>
                        </Paper>
                      )
                    })}
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* 1RM Mode Toggle */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Log Set
                  </Typography>
                  <Button
                    variant={oneRmMode ? 'contained' : 'outlined'}
                    color={oneRmMode ? 'secondary' : 'primary'}
                    size="small"
                    onClick={handleToggle1RmMode}
                  >
                    {oneRmMode ? '1RM Mode Active' : '1RM Mode'}
                  </Button>
                </Box>

                {/* Display 1RM Stats when in 1RM mode */}
                {oneRmMode && (() => {
                  const currentVersionId = currentExercise?.exercise_version_id
                  const exerciseHistory = currentVersionId ? exerciseHistoryCache[currentVersionId] || { sessions: [], estimated_1rm: null, actual_1rm: null } : { sessions: [], estimated_1rm: null, actual_1rm: null }

                  return (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.lighter' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Current 1RM Stats:
                      </Typography>
                      <Grid container spacing={2}>
                        {exerciseHistory.actual_1rm && (
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Actual 1RM
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {exerciseHistory.actual_1rm}lbs
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {exerciseHistory.estimated_1rm && (
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Est. 1RM
                              </Typography>
                              <Typography variant="h6">
                                {exerciseHistory.estimated_1rm}lbs
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {!exerciseHistory.actual_1rm && !exerciseHistory.estimated_1rm && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              No previous data for this exercise
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  )
                })()}

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Reps"
                      type="number"
                      fullWidth
                      value={currentReps}
                      onChange={(e) => setCurrentReps(e.target.value)}
                      disabled={oneRmMode}
                      size="small"
                      helperText={oneRmMode ? 'Fixed at 1 for 1RM' : ''}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Weight (lbs)"
                      type="number"
                      fullWidth
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      disabled={currentExercise.isBodyweight}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>RPE</InputLabel>
                      <Select
                        value={currentRpe}
                        label="RPE"
                        onChange={(e) => setCurrentRpe(e.target.value)}
                      >
                        <MenuItem value="">None</MenuItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                          <MenuItem key={val} value={val}>{val}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddSet}
                      disabled={!currentReps || activeTimerIndex !== null}
                      fullWidth
                    >
                      {activeTimerIndex !== null ? 'Timer Running...' : 'Add Set'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Completed Sets ({currentExercise.sets.length})
                </Typography>

                {currentExercise.sets.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No sets logged yet
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {currentExercise.sets.map((set, index) => (
                      <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1">
                              Set {index + 1}: {set.reps} reps
                              {set.weight && ` @ ${set.weight}lbs`}
                              {set.rpe && ` (RPE ${set.rpe})`}
                            </Typography>
                            {set.timer_runs && set.timer_runs.length > 0 && (
                              <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: 'primary.light' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                  Timer History:
                                </Typography>
                                {set.timer_runs.map((run, runIndex) => (
                                  <Typography key={runIndex} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Run {runIndex + 1}: {formatTimerRunDuration(run.duration_seconds)} of {formatTimerRunDuration(run.planned_duration_seconds)}
                                    {run.completed ? ' ✓' : ' (stopped early)'}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSet(currentExerciseIndex, index)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleChangeExercise(Math.max(0, currentExerciseIndex - 1))}
                    disabled={currentExerciseIndex === 0}
                    fullWidth
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleChangeExercise(Math.min(sessionExercises.length - 1, currentExerciseIndex + 1))}
                    disabled={currentExerciseIndex === sessionExercises.length - 1}
                    fullWidth
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Complete Workout Dialog */}
      <Dialog open={openCompleteDialog} onClose={() => !completingWorkout && setOpenCompleteDialog(false)}>
        <DialogTitle>Complete Workout?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to complete this workout? This will end the session and save all logged sets.
          </Typography>

          {heartRateReadings.length > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeHeartRate}
                    onChange={(e) => setIncludeHeartRate(e.target.checked)}
                    color="primary"
                    disabled={completingWorkout}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Include heart rate data
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {heartRateReadings.length} reading{heartRateReadings.length !== 1 ? 's' : ''} collected
                      {heartRateReadings.length > 0 && ` • Avg: ${Math.round(heartRateReadings.reduce((a, b) => a + b.value, 0) / heartRateReadings.length)} BPM`}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompleteDialog(false)} disabled={completingWorkout}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteWorkout}
            variant="contained"
            color="success"
            disabled={completingWorkout}
            startIcon={completingWorkout ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {completingWorkout ? 'Completing...' : 'Complete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Workout Dialog */}
      <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)}>
        <DialogTitle>Cancel Workout?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this workout? This will delete the session and all logged sets will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelDialog(false)}>Keep Workout</Button>
          <Button onClick={handleConfirmCancelWorkout} variant="contained" color="error">
            Cancel Workout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ActiveWorkoutPage
