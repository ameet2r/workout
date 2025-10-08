import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '../utils/workoutLogger'

// Module-level storage to persist device connection across component mounts
let persistedDevice = null
let persistedCharacteristic = null

/**
 * Custom hook for connecting to Bluetooth heart rate monitors
 * Uses Web Bluetooth API to stream real-time heart rate data
 *
 * @returns {Object} Heart rate monitor state and controls
 */
export const useHeartRateMonitor = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [currentHeartRate, setCurrentHeartRate] = useState(null)
  const [deviceName, setDeviceName] = useState(null)
  const [error, setError] = useState(null)
  const [isSupported, setIsSupported] = useState(false)

  const deviceRef = useRef(persistedDevice)
  const characteristicRef = useRef(persistedCharacteristic)

  // Check if Web Bluetooth is supported
  useEffect(() => {
    const supported = navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function'
    setIsSupported(supported)

    if (!supported) {
      setError('Web Bluetooth is not supported in this browser. Try Chrome, Edge, or Opera.')
    }
  }, [])

  /**
   * Parse heart rate measurement characteristic value
   * Following Bluetooth Heart Rate Service specification
   */
  const parseHeartRate = useCallback((value) => {
    // First byte contains flags
    const flags = value.getUint8(0)
    // Check if heart rate is in UINT16 format (bit 0 of flags)
    const rate16Bits = flags & 0x01
    let heartRate

    if (rate16Bits) {
      // Heart rate is 16-bit value (uncommon)
      heartRate = value.getUint16(1, true) // true = little endian
    } else {
      // Heart rate is 8-bit value (most common)
      heartRate = value.getUint8(1)
    }

    return heartRate
  }, [])

  /**
   * Handle incoming heart rate notifications
   */
  const handleHeartRateChange = useCallback((event) => {
    const value = event.target.value
    const heartRate = parseHeartRate(value)
    logger.info('HR Monitor', `Heart rate received: ${heartRate} BPM`)
    setCurrentHeartRate(heartRate)
  }, [parseHeartRate])

  /**
   * Connect to a Bluetooth heart rate monitor
   */
  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported')
      return
    }

    try {
      setError(null)

      // Request device with heart_rate service
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'] // Optional: for battery level
      })

      setDeviceName(device.name || 'Unknown Device')
      deviceRef.current = device
      persistedDevice = device // Persist across component mounts
      logger.info('HR Monitor', `Device selected: ${device.name || 'Unknown Device'} (ID: ${device.id})`)

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        logger.warn('HR Monitor', 'Device disconnected unexpectedly')
        setIsConnected(false)
        setCurrentHeartRate(null)
        setDeviceName(null)
      })

      // Connect to GATT server
      logger.info('HR Monitor', 'Connecting to GATT server...')
      const server = await device.gatt.connect()
      logger.info('HR Monitor', 'GATT server connected')

      // Get heart rate service
      logger.info('HR Monitor', 'Getting heart rate service...')
      const service = await server.getPrimaryService('heart_rate')
      logger.info('HR Monitor', 'Heart rate service acquired')

      // Get heart rate measurement characteristic
      logger.info('HR Monitor', 'Getting heart rate measurement characteristic...')
      const characteristic = await service.getCharacteristic('heart_rate_measurement')
      characteristicRef.current = characteristic
      persistedCharacteristic = characteristic // Persist across component mounts
      logger.info('HR Monitor', 'Heart rate characteristic acquired')

      // Start notifications
      logger.info('HR Monitor', 'Starting notifications...')
      await characteristic.startNotifications()
      logger.info('HR Monitor', 'Notifications started successfully')

      // Listen for heart rate changes
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChange)

      setIsConnected(true)
      logger.info('HR Monitor', '✅ Connection complete and ready to receive heart rate data')

    } catch (err) {
      logger.error('HR Monitor', 'Bluetooth connection error:', err.message)

      if (err.name === 'NotFoundError') {
        setError('No heart rate monitor found. Make sure your device is powered on and in pairing mode.')
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth access denied. Please allow Bluetooth permissions.')
      } else {
        setError(`Connection failed: ${err.message}`)
      }

      setIsConnected(false)
      setCurrentHeartRate(null)
    }
  }, [isSupported, handleHeartRateChange])

  /**
   * Disconnect from the heart rate monitor
   */
  const disconnect = useCallback(async () => {
    try {
      logger.info('HR Monitor', 'Disconnecting...')
      if (characteristicRef.current) {
        characteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateChange)
        await characteristicRef.current.stopNotifications()
        characteristicRef.current = null
        persistedCharacteristic = null
        logger.info('HR Monitor', 'Notifications stopped')
      }

      if (deviceRef.current && deviceRef.current.gatt.connected) {
        await deviceRef.current.gatt.disconnect()
        logger.info('HR Monitor', 'GATT disconnected')
      }

      deviceRef.current = null
      persistedDevice = null
      setIsConnected(false)
      setCurrentHeartRate(null)
      setDeviceName(null)
      setError(null)
      logger.info('HR Monitor', 'Disconnect complete')
    } catch (err) {
      logger.error('HR Monitor', 'Disconnect error:', err.message)
    }
  }, [handleHeartRateChange])

  /**
   * Reconnect to a previously connected device
   */
  const reconnect = useCallback(async () => {
    if (!deviceRef.current) {
      logger.warn('HR Monitor', 'Cannot reconnect - no device reference')
      return
    }

    try {
      logger.info('HR Monitor', `Attempting to reconnect to ${deviceRef.current.name || 'Unknown Device'}`)
      setError(null)

      // Check if already connected
      if (deviceRef.current.gatt.connected) {
        logger.info('HR Monitor', 'Device already connected, re-establishing listeners')
      } else {
        // Reconnect to GATT server
        logger.info('HR Monitor', 'Reconnecting to GATT server...')
        await deviceRef.current.gatt.connect()
        logger.info('HR Monitor', 'GATT server reconnected')
      }

      // Get services and characteristics again
      const service = await deviceRef.current.gatt.getPrimaryService('heart_rate')
      const characteristic = await service.getCharacteristic('heart_rate_measurement')
      characteristicRef.current = characteristic
      persistedCharacteristic = characteristic // Persist the new characteristic

      // Start notifications
      await characteristic.startNotifications()
      logger.info('HR Monitor', 'Notifications restarted')

      // Re-add event listener
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChange)

      setIsConnected(true)
      logger.info('HR Monitor', '✅ Reconnection complete')
    } catch (err) {
      logger.error('HR Monitor', 'Reconnection failed:', err.message)
      setError(`Reconnection failed: ${err.message}`)
      setIsConnected(false)
    }
  }, [handleHeartRateChange])

  // Check for existing connection on mount
  useEffect(() => {
    logger.info('HR Monitor', 'Component mounted')

    // Restore persisted device info
    if (persistedDevice) {
      deviceRef.current = persistedDevice
      setDeviceName(persistedDevice.name || 'Unknown Device')
      logger.info('HR Monitor', `Restored device reference: ${persistedDevice.name || 'Unknown Device'}`)

      if (persistedDevice.gatt.connected) {
        logger.info('HR Monitor', 'Device still connected, re-establishing listeners...')
        reconnect()
      } else {
        logger.info('HR Monitor', 'Device reference exists but not connected (state shows paired but disconnected)')
        setIsConnected(false)
      }
    }
  }, [reconnect])

  // Cleanup on unmount - DO NOT disconnect, keep connection alive
  useEffect(() => {
    return () => {
      logger.info('HR Monitor', 'Component unmounting - keeping connection alive for navigation')
      // Don't disconnect! Just remove listeners to prevent memory leaks
      if (characteristicRef.current) {
        logger.info('HR Monitor', 'Removing event listener on unmount')
        characteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateChange)
      }
    }
  }, [handleHeartRateChange])

  return {
    isSupported,
    isConnected,
    currentHeartRate,
    deviceName,
    error,
    connect,
    disconnect,
    reconnect
  }
}
