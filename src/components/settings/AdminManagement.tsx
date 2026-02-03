/**
 * AdminManagement Component
 * 
 * Allows admins to view all users and manage admin privileges.
 * Features:
 * - View all users who have logged in
 * - Promote users to admin
 * - Remove admin privileges
 */

import { useState, useEffect } from 'react'
import { getAllAdmins, addAdmin, removeAdmin, fetchAdminEmails } from '../../lib/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface UserProfile {
  id: string
  email: string
  name: string
  last_login_at: string
  login_count: number
  is_admin: boolean
}

export default function AdminManagement() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    
    if (!isSupabaseConfigured()) {
      setUsers([])
      setLoading(false)
      return
    }
    
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('*')
        .order('last_login_at', { ascending: false })
      
      if (profilesError) {
        console.error('Failed to fetch profiles:', profilesError)
        setError('Failed to load users. Make sure you ran the user_profiles.sql script.')
        setLoading(false)
        return
      }
      
      // Get all admins
      const admins = await getAllAdmins()
      const adminEmails = new Set(admins.map(a => a.email.toLowerCase()))
      
      // Merge data
      const mergedUsers: UserProfile[] = (profiles as any[] || []).map(p => ({
        id: p.id,
        email: p.email,
        name: p.name || p.email.split('@')[0],
        last_login_at: p.last_login_at,
        login_count: p.login_count || 1,
        is_admin: adminEmails.has(p.email.toLowerCase())
      }))
      
      setUsers(mergedUsers)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users')
    }
    
    setLoading(false)
  }

  const handleToggleAdmin = async (userProfile: UserProfile) => {
    const action = userProfile.is_admin ? 'remove' : 'add'
    const confirmMsg = userProfile.is_admin
      ? `Remove admin privileges from ${userProfile.name}?`
      : `Make ${userProfile.name} an admin? They will be able to access Settings and modify global defaults.`
    
    if (!confirm(confirmMsg)) return
    
    setActionInProgress(userProfile.email)
    
    if (action === 'add') {
      const result = await addAdmin(
        userProfile.email,
        userProfile.name,
        user?.email || 'Unknown'
      )
      if (!result.success) {
        alert(result.error || 'Failed to add admin')
      }
    } else {
      const result = await removeAdmin(userProfile.email)
      if (!result.success) {
        alert(result.error || 'Failed to remove admin')
      }
    }
    
    await fetchAdminEmails() // Refresh cache
    await loadUsers()
    setActionInProgress(null)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const adminCount = users.filter(u => u.is_admin).length
  const userCount = users.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-surface-400 mt-1">
            {userCount} users • {adminCount} admins
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className="text-center py-12 text-surface-400">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-surface-800 rounded-xl border border-surface-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-surface-400 mb-2">No users found</p>
          <p className="text-surface-500 text-sm">Run the <code className="px-1 py-0.5 bg-surface-700 rounded">user_profiles.sql</code> script in Supabase</p>
        </div>
      ) : (
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-900/50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Logins
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        u.is_admin ? 'bg-primary-600' : 'bg-surface-600'
                      }`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-sm text-surface-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-surface-300 text-sm">
                    {formatDate(u.last_login_at)}
                  </td>
                  <td className="px-6 py-4 text-center text-surface-300">
                    {u.login_count}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 text-xs font-medium rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-surface-500">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.email.toLowerCase() === 'rafael@collectif.nyc' ? (
                      <span className="text-xs text-surface-500 px-2 py-1 bg-surface-700 rounded">
                        Bootstrap
                      </span>
                    ) : u.email.toLowerCase() === user?.email?.toLowerCase() ? (
                      <span className="text-xs text-surface-500 px-2 py-1 bg-surface-700 rounded">
                        You
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        disabled={actionInProgress === u.email}
                        className={`text-sm font-medium transition-colors ${
                          u.is_admin
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-primary-400 hover:text-primary-300'
                        } disabled:opacity-50`}
                      >
                        {actionInProgress === u.email ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : u.is_admin ? (
                          'Remove Admin'
                        ) : (
                          'Make Admin'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium">Admin Capabilities</p>
            <ul className="mt-1 text-blue-300/80 list-disc list-inside">
              <li>Access the Settings page</li>
              <li>Modify zone type defaults (saved to database for all users)</li>
              <li>Manage ASHRAE ventilation space types</li>
              <li>Promote or demote other users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
