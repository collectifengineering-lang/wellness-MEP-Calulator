import { supabase, isSupabaseConfigured } from './supabase'

const ALLOWED_DOMAIN = 'collectif.nyc'

// Fallback admin emails (used if database not available)
const FALLBACK_ADMIN_EMAILS = [
  'rafael@collectif.nyc',
]

// Cache for admin emails from database
let cachedAdminEmails: string[] = []
let adminCacheLoaded = false

/**
 * Fetch admin emails from database
 */
export async function fetchAdminEmails(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_ADMIN_EMAILS
  }
  
  try {
    const { data, error } = await supabase
      .from('app_admins' as any)
      .select('email')
    
    if (error) {
      console.warn('Failed to fetch admins from database, using fallback:', error.message)
      return FALLBACK_ADMIN_EMAILS
    }
    
    cachedAdminEmails = (data as any[])?.map(a => a.email.toLowerCase()) || []
    adminCacheLoaded = true
    
    // Merge with fallback to ensure bootstrap admin always works
    const allAdmins = new Set([...cachedAdminEmails, ...FALLBACK_ADMIN_EMAILS.map(e => e.toLowerCase())])
    return Array.from(allAdmins)
  } catch {
    return FALLBACK_ADMIN_EMAILS
  }
}

/**
 * Check if email is an admin (uses cache, call fetchAdminEmails first)
 */
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const lowerEmail = email.toLowerCase()
  
  // Check fallback first (always works)
  if (FALLBACK_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(lowerEmail)) {
    return true
  }
  
  // Check cached database admins
  if (adminCacheLoaded && cachedAdminEmails.includes(lowerEmail)) {
    return true
  }
  
  return false
}

/**
 * Check if admin cache is loaded
 */
export function isAdminCacheLoaded(): boolean {
  return adminCacheLoaded
}

/**
 * Add a new admin (database)
 */
export async function addAdmin(email: string, name: string, addedBy: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' }
  }
  
  try {
    const { error } = await supabase
      .from('app_admins' as any)
      .insert({ email: email.toLowerCase(), name, added_by: addedBy } as any)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Refresh cache
    await fetchAdminEmails()
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/**
 * Remove an admin (database)
 */
export async function removeAdmin(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database not configured' }
  }
  
  // Prevent removing the last/bootstrap admin
  if (FALLBACK_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
    return { success: false, error: 'Cannot remove bootstrap admin' }
  }
  
  try {
    const { error } = await supabase
      .from('app_admins' as any)
      .delete()
      .eq('email', email.toLowerCase())
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Refresh cache
    await fetchAdminEmails()
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/**
 * Get all admins from database
 */
export async function getAllAdmins(): Promise<{ email: string; name: string; added_by: string; created_at: string }[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_ADMIN_EMAILS.map(email => ({
      email,
      name: email.split('@')[0],
      added_by: 'Hardcoded',
      created_at: new Date().toISOString()
    }))
  }
  
  try {
    const { data, error } = await supabase
      .from('app_admins' as any)
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.warn('Failed to fetch admins:', error.message)
      return []
    }
    
    return (data as any[]) || []
  } catch {
    return []
  }
}

export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile openid',
      redirectTo: `${window.location.origin}/`,
    },
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export function isAllowedDomain(email: string | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)
}

export function getDisplayName(email: string | undefined): string {
  if (!email) return 'User'
  const name = email.split('@')[0]
  return name
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
