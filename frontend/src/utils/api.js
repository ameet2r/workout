import { auth, appCheck } from '../config/firebase'
import { getToken } from 'firebase/app-check'

const API_BASE_URL = import.meta.env.VITE_BACKEND_API

/**
 * Get authentication headers with Firebase ID token and App Check token
 */
const getAuthHeaders = async (includeContentType = true) => {
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
    throw new Error('App Check token is required')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Firebase-AppCheck': appCheckToken,
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
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

/**
 * Authenticated POST request for FormData (file uploads)
 * Note: Content-Type is omitted so browser sets it automatically with multipart boundary
 */
export const authenticatedFormDataPost = async (endpoint, formData) => {
  const headers = await getAuthHeaders(false) // Don't include Content-Type for FormData
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}
