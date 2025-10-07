/**
 * Format a date string to a human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format a date string to a time string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Calculate the duration between start and end times
 * @param {string} startTime - ISO date string
 * @param {string|null} endTime - ISO date string or null
 * @returns {string} Formatted duration (e.g., "1h 30m" or "45m")
 */
export const calculateDuration = (startTime, endTime) => {
  if (!endTime) return 'In Progress'

  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end - start
  const minutes = Math.floor(durationMs / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}m`
}

/**
 * Get the total number of sets in a workout session
 * @param {object} session - Workout session object
 * @returns {number} Total number of sets
 */
export const getTotalSets = (session) => {
  if (!session.exercises) return 0
  return session.exercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0)
}

/**
 * Get the total volume (weight × reps) for a workout session
 * @param {object} session - Workout session object
 * @returns {number} Total volume in pounds
 */
export const getTotalVolume = (session) => {
  if (!session.exercises) return 0
  let volume = 0
  session.exercises.forEach(ex => {
    ex.sets?.forEach(set => {
      if (set.weight) {
        volume += set.weight * set.reps
      }
    })
  })
  return volume
}
