/**
 * apiUtils.js
 *
 * All responses from the backend use the envelope:
 *   Success: { "success": true,  "data": { ... } }
 *   Error:   { "success": false, "error": { "code": "...", "message": "..." } }
 *
 * These helpers centralise parsing so individual files never deal
 * with the envelope directly.
 */

import logger from './logger'

/**
 * Parse a fetch Response:
 *   - Throws an Error with the backend's error.message on failure
 *   - Returns data on success
 */
export async function unwrap(response) {
  let body
  try {
    body = await response.json()
  } catch {
    logger.error(`unwrap: non-JSON response from ${response.url} (${response.status})`)
    throw new Error(`Server error (${response.status})`)
  }

  if (body.success === false) {
    const message = body.error?.message || `Request failed (${response.status})`
    logger.error(`unwrap: API error from ${response.url} (${response.status}):`, message)
    throw new Error(message)
  }

  // 2xx with success:true
  return body.data
}

/**
 * Safe version — returns { data, error } and never throws.
 * Used by components that want to handle failure inline (e.g. purchase history fallback).
 */
export async function safeUnwrap(response) {
  try {
    const data = await unwrap(response)
    return { data, error: null }
  } catch (err) {
    logger.error('API request failed:', err.message || err)
    return { data: null, error: err.message || 'Unknown error' }
  }
}

/**
 * fetch + unwrap in one call.
 * Throws on network error or API error.
 */
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  return unwrap(res)
}

/**
 * Safe fetch + unwrap — returns { data, error }, never throws.
 */
export async function safeApiFetch(url, options = {}) {
  try {
    const data = await apiFetch(url, options)
    return { data, error: null }
  } catch (err) {
    logger.error('API request failed:', err.message || err)
    return { data: null, error: err.message || 'Unknown error' }
  }
}
