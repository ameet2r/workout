import { auth, appCheck } from '../config/firebase'
import { getToken } from 'firebase/app-check'

const API_BASE_URL = import.meta.env.VITE_BACKEND_API

/**
 * Get authentication headers with Firebase ID token and App Check token
 */
const getAuthHeaders = async () => {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  const token = await user.getIdToken()

  // Get App Check token
  let appCheckToken = null
  try {
    const appCheckTokenResponse = await getToken(appCheck, /* forceRefresh= */ false)
    appCheckToken = appCheckTokenResponse.token
  } catch (error) {
    console.error('Failed to get App Check token:', error)
    throw new Error('Failed to verify app authenticity. Please try again.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Firebase-AppCheck': appCheckToken,
  }
}

export const authenticatedGet = async (endpoint) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const authenticatedPost = async (endpoint, data) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const authenticatedPatch = async (endpoint, data) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const authenticatedDelete = async (endpoint) => {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}
