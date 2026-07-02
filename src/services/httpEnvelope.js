// ---------------------------------------------------------------------------
// Shared helpers for the JSON the backend returns: success bodies use the
// `{ success, data }` envelope, while errors are a flat `{ message }` (or the
// `{ error: { message } }` rate-limit shape).
// ---------------------------------------------------------------------------

/** Read a human-readable error message from a non-OK response. */
export async function readError(res) {
  const body = await res.json().catch(() => null)
  return body?.message || body?.error?.message || `Request failed (${res.status})`
}

/** Unwrap a successful `{ success, data }` envelope (falls back to the raw body). */
export async function readData(res) {
  const body = await res.json()
  return body?.data ?? body
}
