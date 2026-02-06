// IndexedDB-based image storage for Plan Scanner
// Stores images separately from localStorage to avoid size limits

const DB_NAME = 'plan-scanner-images'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface StoredImage {
  id: string // drawingId
  scanId: string
  data: string // base64 or blob URL
  timestamp: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('scanId', 'scanId', { unique: false })
      }
    }
  })
  
  return dbPromise
}

/**
 * Store an image in IndexedDB
 */
export async function storeImage(drawingId: string, scanId: string, imageData: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const record: StoredImage = {
      id: drawingId,
      scanId,
      data: imageData,
      timestamp: Date.now()
    }
    
    store.put(record)
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Failed to store image in IndexedDB:', error)
  }
}

/**
 * Retrieve an image from IndexedDB
 */
export async function getImage(drawingId: string): Promise<string | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(drawingId)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as StoredImage | undefined
        resolve(result?.data || null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get image from IndexedDB:', error)
    return null
  }
}

/**
 * Delete an image from IndexedDB
 */
export async function deleteImage(drawingId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    store.delete(drawingId)
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Failed to delete image from IndexedDB:', error)
  }
}

/**
 * Delete all images for a scan
 */
export async function deleteImagesForScan(scanId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('scanId')
    
    const request = index.getAllKeys(IDBKeyRange.only(scanId))
    
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result
        keys.forEach(key => store.delete(key))
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Failed to delete images for scan:', error)
  }
}

/**
 * Get all images for a scan
 */
export async function getImagesForScan(scanId: string): Promise<Map<string, string>> {
  const images = new Map<string, string>()
  
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('scanId')
    
    const request = index.getAll(IDBKeyRange.only(scanId))
    
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as StoredImage[]
        results.forEach(r => images.set(r.id, r.data))
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get images for scan:', error)
  }
  
  return images
}

/**
 * Clean up old images (older than 7 days)
 */
export async function cleanupOldImages(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    const request = store.openCursor()
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const record = cursor.value as StoredImage
        if (record.timestamp < sevenDaysAgo) {
          cursor.delete()
        }
        cursor.continue()
      }
    }
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Failed to cleanup old images:', error)
  }
}
