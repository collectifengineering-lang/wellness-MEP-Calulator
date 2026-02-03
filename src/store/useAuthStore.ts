import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { isAdmin as checkIsAdmin } from '../lib/auth'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => checkIsAdmin(get().user?.email),
}))
