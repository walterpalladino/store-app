import API, { resolveImageUrl } from '../config/api'
import { readError, readData } from './httpEnvelope'

// ---------------------------------------------------------------------------
// productImageService — the product images resource
// (`/api/products/:id/images`). Images are a separate resource from the product
// object: the derived `thumbnail`/`primaryImage`/`images` fields on a product
// are read-only, so binaries are created/removed here instead.
//
//   • GET    /images            — list (public)
//   • POST   /images            — upload, multipart/form-data (ADMIN)
//   • DELETE /images/:imageId   — delete (ADMIN)
//
// Writes go through `authFetch` (MerchantAuthContext.merchantFetch), which
// attaches the Bearer token. For the upload the body is a FormData, so the
// browser sets the multipart Content-Type (with boundary) itself — merchantFetch
// leaves it alone for FormData bodies.
// ---------------------------------------------------------------------------

/** The three image slots a product supports. */
export const IMAGE_TYPES = ['PRIMARY', 'THUMBNAIL', 'OTHER']

/** Normalise an image object from the API — ensure `url` is loadable. */
function normalizeImage(img) {
  if (!img || typeof img !== 'object') return img
  return { ...img, url: resolveImageUrl(img.url) }
}

/** GET all images for a product (public). Returns a (possibly empty) array. */
export async function fetchProductImages(productId) {
  const res = await fetch(API.products.images(productId))
  if (res.status === 404) return []
  if (!res.ok) throw new Error(await readError(res))
  const data = await readData(res)          // { images: [...] }
  const images = Array.isArray(data) ? data : (data?.images ?? [])
  return images.map(normalizeImage)
}

/**
 * Upload one image (ADMIN). `file` is a File/Blob; `imageType` is one of
 * IMAGE_TYPES (case-insensitive on the server). `altText` and `sortOrder` are
 * optional. Returns the created image object.
 */
export async function uploadProductImage(authFetch, productId, { file, altText, imageType, sortOrder } = {}) {
  if (!file) throw new Error('Please choose an image file to upload.')

  const form = new FormData()
  form.append('image', file, file.name ?? 'image')
  if (altText != null && String(altText).trim() !== '') form.append('altText', String(altText).trim())
  if (imageType) form.append('imageType', String(imageType).toUpperCase())
  if (sortOrder != null && sortOrder !== '') form.append('sortOrder', String(sortOrder))

  const res = await authFetch(API.products.images(productId), { method: 'POST', body: form })
  if (!res.ok) throw new Error(await uploadError(res))
  return normalizeImage(await readData(res))
}

/** DELETE one image (ADMIN). Returns the deleted image, or null on 404. */
export async function deleteProductImage(authFetch, productId, imageId) {
  const res = await authFetch(API.products.imageById(productId, imageId), { method: 'DELETE' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readError(res))
  return normalizeImage(await readData(res))
}

/**
 * Friendlier messages for the upload-specific status codes. The server's own
 * message wins when it has one; the fallback is used only when readError had
 * nothing better than its generic `Request failed (NNN)`.
 */
async function uploadError(res) {
  const base = await readError(res)
  const generic = /^Request failed \(\d+\)$/.test(base)
  if (!generic) return base
  if (res.status === 413) return 'Image is too large.'
  if (res.status === 415) return 'Upload must be multipart/form-data.'
  if (res.status === 422) return 'Unsupported image or invalid image type.'
  return base
}
