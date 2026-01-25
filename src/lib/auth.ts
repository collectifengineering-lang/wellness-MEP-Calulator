import { supabase } from './supabase'

const ALLOWED_DOMAIN = 'collectif.nyc'

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
