// =========================================== 
// PERSONAL CALCULATIONS STORE
// Manages named calculation workspaces for users
// =========================================== 

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'
import type { PersonalCalculation } from '../types/hydronic'

// =========================================== 
// STORE STATE INTERFACE
// =========================================== 
interface PersonalCalcsState {
  // Data
  calculations: PersonalCalculation[]
  currentCalcId: string | null
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchUserCalculations: (calcType: 'hydronic' | 'pool_dehum' | 'duct' | 'psychrometric') => Promise<void>
  createCalculation: (name: string, calcType: 'hydronic' | 'pool_dehum' | 'duct' | 'psychrometric') => Promise<PersonalCalculation>
  renameCalculation: (id: string, name: string) => Promise<void>
  deleteCalculation: (id: string) => Promise<void>
  setCurrentCalc: (id: string | null) => void
  
  // Getters
  getCurrentCalc: () => PersonalCalculation | undefined
}

// =========================================== 
// CREATE STORE
// =========================================== 
export const usePersonalCalcsStore = create<PersonalCalcsState>((set, get) => ({
  // Initial state
  calculations: [],
  currentCalcId: null,
  isLoading: false,
  error: null,
  
  // =========================================== 
  // FETCH USER CALCULATIONS
  // =========================================== 
  fetchUserCalculations: async (calcType) => {
    if (!isSupabaseConfigured()) return
    
    const userId = useAuthStore.getState().user?.id
    if (!userId) {
      console.warn('Cannot fetch personal calculations: No user logged in')
      return
    }
    
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('personal_calculations')
        .select('*')
        .eq('user_id', userId)
        .eq('calc_type', calcType)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      
      const calculations: PersonalCalculation[] = (data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        name: d.name,
        calcType: d.calc_type,
        description: d.description,
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at),
      }))
      
      set({ calculations, isLoading: false })
      
      // Auto-select the most recent one if none selected
      const state = get()
      if (!state.currentCalcId && calculations.length > 0) {
        set({ currentCalcId: calculations[0].id })
      }
    } catch (error) {
      console.error('Failed to fetch personal calculations:', error)
      set({ error: 'Failed to load calculations', isLoading: false })
    }
  },
  
  // =========================================== 
  // CREATE CALCULATION
  // =========================================== 
  createCalculation: async (name, calcType) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) {
      throw new Error('No user logged in')
    }
    
    const id = uuidv4()
    const now = new Date()
    
    const newCalc: PersonalCalculation = {
      id,
      userId,
      name,
      calcType,
      createdAt: now,
      updatedAt: now,
    }
    
    // Add to local state immediately
    set(state => ({
      calculations: [newCalc, ...state.calculations],
      currentCalcId: id,
    }))
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('personal_calculations')
          .insert({
            id,
            user_id: userId,
            name,
            calc_type: calcType,
          })
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to save personal calculation:', error)
        // Revert on error
        set(state => ({
          calculations: state.calculations.filter(c => c.id !== id),
          currentCalcId: state.calculations.length > 1 ? state.calculations[1].id : null,
          error: 'Failed to create calculation',
        }))
        throw error
      }
    }
    
    return newCalc
  },
  
  // =========================================== 
  // RENAME CALCULATION
  // =========================================== 
  renameCalculation: async (id, name) => {
    // Update local state
    set(state => ({
      calculations: state.calculations.map(c =>
        c.id === id ? { ...c, name, updatedAt: new Date() } : c
      ),
    }))
    
    // Save to database
    if (isSupabaseConfigured()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('personal_calculations')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', id)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to rename personal calculation:', error)
        set({ error: 'Failed to rename calculation' })
      }
    }
  },
  
  // =========================================== 
  // DELETE CALCULATION
  // =========================================== 
  deleteCalculation: async (id) => {
    const state = get()
    const calcToDelete = state.calculations.find(c => c.id === id)
    if (!calcToDelete) return
    
    // Remove from local state
    const remainingCalcs = state.calculations.filter(c => c.id !== id)
    set({
      calculations: remainingCalcs,
      currentCalcId: state.currentCalcId === id 
        ? (remainingCalcs[0]?.id || null)
        : state.currentCalcId,
    })
    
    // Delete from database (cascade will delete associated systems)
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('personal_calculations')
          .delete()
          .eq('id', id)
        
        if (error) throw error
      } catch (error) {
        console.error('Failed to delete personal calculation:', error)
        // Revert on error
        set(state => ({
          calculations: [...state.calculations, calcToDelete].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          ),
          error: 'Failed to delete calculation',
        }))
      }
    }
  },
  
  // =========================================== 
  // SET CURRENT CALCULATION
  // =========================================== 
  setCurrentCalc: (id) => {
    set({ currentCalcId: id })
  },
  
  // =========================================== 
  // GETTERS
  // =========================================== 
  getCurrentCalc: () => {
    const state = get()
    if (!state.currentCalcId) return undefined
    return state.calculations.find(c => c.id === state.currentCalcId)
  },
}))
