import { useState, useEffect, useCallback, useRef } from 'react'

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

  const deviceRef = useRef(null)
  const characteristicRef = useRef(null)

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

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false)
        setCurrentHeartRate(null)
        setDeviceName(null)
      })

      // Connect to GATT server
      const server = await device.gatt.connect()

      // Get heart rate service
      const service = await server.getPrimaryService('heart_rate')

      // Get heart rate measurement characteristic
      const characteristic = await service.getCharacteristic('heart_rate_measurement')
      characteristicRef.current = characteristic

      // Start notifications
      await characteristic.startNotifications()

      // Listen for heart rate changes
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChange)

      setIsConnected(true)

    } catch (err) {
      console.error('Bluetooth connection error:', err)

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
      if (characteristicRef.current) {
        characteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateChange)
        await characteristicRef.current.stopNotifications()
        characteristicRef.current = null
      }

      if (deviceRef.current && deviceRef.current.gatt.connected) {
        await deviceRef.current.gatt.disconnect()
      }

      deviceRef.current = null
      setIsConnected(false)
      setCurrentHeartRate(null)
      setDeviceName(null)
      setError(null)
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }, [handleHeartRateChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isSupported,
    isConnected,
    currentHeartRate,
    deviceName,
    error,
    connect,
    disconnect
  }
}
