'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * useRequireAuth
 * Redirects to "/" if there is no valid token/user in localStorage.
 * Returns the stored user (or null during the initial check).
 */
export function useRequireAuth(): { name: string; email: string } | null {
  const router = useRouter()

  useEffect(() => {
    try {
      const token = localStorage.getItem('am_token')
      const raw = localStorage.getItem('am_user')
      if (!token || !raw) {
        router.replace('/?signin=1')
        return
      }
      const user = JSON.parse(raw) as { name?: string; email?: string }
      if (!user?.name || !user?.email) {
        router.replace('/?signin=1')
      }
    } catch {
      router.replace('/?signin=1')
    }
  }, [router])

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('am_token') : null
    const raw = typeof window !== 'undefined' ? localStorage.getItem('am_user') : null
    if (!token || !raw) return null
    return JSON.parse(raw) as { name: string; email: string }
  } catch {
    return null
  }
}

/**
 * getAuthHeaders
 * Returns the Authorization header for fetch/WebSocket calls.
 */
export function getAuthToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('am_token') ?? ''
}
