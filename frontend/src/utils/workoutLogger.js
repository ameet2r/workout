/**
 * Workout Logger Utility
 * Logs debugging information to localStorage and provides download functionality
 */

const MAX_LOGS = 5000 // Maximum number of log entries to keep
const STORAGE_KEY = 'workout_debug_logs'

// Check if debug mode is enabled via environment variable
// Defaults to false if not set or set to anything other than "true"
const isDebugEnabled = () => {
  const debugValue = import.meta.env.VITE_DEBUG_HEART_RATE
  return debugValue === 'true'
}

class WorkoutLogger {
  constructor() {
    this.logs = []
    this.loadFromStorage()
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (err) {
      console.error('Failed to load logs from storage:', err)
      this.logs = []
    }
  }

  saveToStorage() {
    try {
      // Keep only the last MAX_LOGS entries
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs))
    } catch (err) {
      console.error('Failed to save logs to storage:', err)
      // If storage is full, try to clear old logs
      if (err.name === 'QuotaExceededError') {
        this.logs = this.logs.slice(-1000) // Keep only last 1000
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs))
        } catch (e) {
          console.error('Could not save even after reducing logs:', e)
        }
      }
    }
  }

  log(category, level, message, ...args) {
    // Only log if debug mode is enabled
    if (!isDebugEnabled()) {
      return
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      category,
      level,
      message,
      data: args.length > 0 ? args : undefined
    }

    this.logs.push(logEntry)
    this.saveToStorage()

    // Also log to console with proper formatting
    const prefix = `[${category}]`
    const fullMessage = `${prefix} ${message}`

    switch (level) {
      case 'error':
        console.error(fullMessage, ...args)
        break
      case 'warn':
        console.warn(fullMessage, ...args)
        break
      case 'info':
        console.log(fullMessage, ...args)
        break
      default:
        console.log(fullMessage, ...args)
    }
  }

  info(category, message, ...args) {
    this.log(category, 'info', message, ...args)
  }

  warn(category, message, ...args) {
    this.log(category, 'warn', message, ...args)
  }

  error(category, message, ...args) {
    this.log(category, 'error', message, ...args)
  }

  downloadLogs(filename = 'workout-debug-logs.txt') {
    const logText = this.logs.map(entry => {
      const dataStr = entry.data ? ' ' + JSON.stringify(entry.data) : ''
      return `[${entry.timestamp}] [${entry.category}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}`
    }).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`Downloaded ${this.logs.length} log entries to ${filename}`)
  }

  clearLogs() {
    this.logs = []
    localStorage.removeItem(STORAGE_KEY)
    console.log('Logs cleared')
  }

  getLogCount() {
    return this.logs.length
  }

  getStorageSize() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (stored.length / 1024).toFixed(2) : '0'
    } catch (err) {
      return 'unknown'
    }
  }
}

// Singleton instance
const logger = new WorkoutLogger()

export default logger
