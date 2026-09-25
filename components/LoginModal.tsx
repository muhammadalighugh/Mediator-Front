'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

interface LoginModalProps {
  onClose: () => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

type Tab = 'login' // | 'register'  — registration disabled
type ApiState = 'idle' | 'loading' | 'service_down'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function LoginModal({ onClose }: LoginModalProps) {
  const router = useRouter()
  const [tab] = useState<Tab>('login')   // tab switcher hidden; always login
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; api?: string }>({})
  const [apiState, setApiState] = useState<ApiState>('idle')
  const firstRef = useRef<HTMLInputElement>(null)

  // Focus first field on open / tab switch
  useEffect(() => {
    firstRef.current?.focus()
  }, [tab])

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function storeAndNavigate(token: string, user: { id?: string; name: string; email: string }) {
    localStorage.setItem('am_token', token)
    localStorage.setItem('am_user', JSON.stringify({ ...user, loginAt: new Date().toISOString() }))
    router.push('/start')
  }

  function clearErrors() {
    setErrors({})
  }

  async function handleSubmit() {
    const newErrors: typeof errors = {}

    // if (tab === 'register' && !name.trim()) newErrors.name = 'Name is required'
    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!isValidEmail(email)) newErrors.email = 'Enter a valid email address'
    if (!password) newErrors.password = 'Password is required'
    // else if (tab === 'register' && password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setApiState('loading')
    setErrors({})

    const endpoint = '/auth/login'
    // const endpoint = tab === 'register' ? '/auth/register' : '/auth/login'
    const body = { email: email.trim().toLowerCase(), password }
    // const body = tab === 'register'
    //   ? { name: name.trim(), email: email.trim().toLowerCase(), password }
    //   : { email: email.trim().toLowerCase(), password }

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setApiState('idle')

      if (res.status === 503) {
        setApiState('service_down')
        return
      }

      if (res.status === 409) {
        setErrors({ api: 'An account with this email already exists. Sign in instead.' })
        return
      }

      if (res.status === 401) {
        setErrors({ api: 'Incorrect email or password.' })
        return
      }

      if (res.status === 422) {
        const data = await res.json()
        setErrors({ api: data.detail ?? 'Validation error' })
        return
      }

      if (!res.ok) {
        setErrors({ api: 'Something went wrong. Please try again.' })
        return
      }

      const data = await res.json()
      storeAndNavigate(data.token, data.user)
    } catch {
      setApiState('service_down')
    }
  }

  const inputClass = (field?: string) =>
    `w-full bg-white border px-3 py-2.5 text-[#22303C] text-sm focus:outline-none transition-colors disabled:opacity-50 ${
      field
        ? 'border-[#FF6F59] focus:border-[#FF6F59] focus:ring-1 focus:ring-[#FF6F59]'
        : 'border-[#E2E8ED] focus:border-[#003017] focus:ring-1 focus:ring-[#003017]'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-[#22303C]/40" />

      {/* Modal card */}
      <div className="relative w-full max-w-sm bg-[#FDFDFD] border border-[#E2E8ED] p-7 shadow-[0_20px_60px_-12px_rgba(34,48,60,0.18)]">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8A9BAA] hover:text-[#5A6A75] text-lg leading-none transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="font-serif text-[1.4rem] text-[#22303C] mb-5">
          Sign in
        </h2>

        {/* Tab switcher — hidden while registration is disabled */}
        {/* <div className="flex border border-[#E2E8ED] mb-6 text-sm">
          <button
            onClick={() => { setTab('login'); clearErrors() }}
            className={`flex-1 py-2 font-medium transition-colors ${
              tab === 'login'
                ? 'bg-[#003017] text-white'
                : 'text-[#8A9BAA] hover:text-[#22303C]'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setTab('register'); clearErrors() }}
            className={`flex-1 py-2 font-medium transition-colors ${
              tab === 'register'
                ? 'bg-[#003017] text-white'
                : 'text-[#8A9BAA] hover:text-[#22303C]'
            }`}
          >
            Register
          </button>
        </div> */}

        {/* Service-down banner */}
        {apiState === 'service_down' && (
          <div className="mb-5 px-3 py-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            <p className="font-semibold">⚠️ Cannot reach the server</p>
            <p className="mt-1 text-red-600">Make sure the backend is running and try again.</p>
          </div>
        )}

        {/* API error */}
        {errors.api && (
          <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            {errors.api}
          </div>
        )}

        {/* Name field — register only (hidden while registration is disabled) */}
        {/* {tab === 'register' && (
          <div className="mb-4">
            <label className="text-xs text-[#5A6A75] mb-1.5 block">Your name</label>
            <input
              ref={firstRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="Maya"
              disabled={apiState === 'loading'}
              className={inputClass(errors.name)}
            />
            {errors.name && <p className="mt-1 text-[11px] text-[#FF6F59]">{errors.name}</p>}
          </div>
        )} */}

        {/* Email */}
        <div className="mb-4">
          <label className="text-xs text-[#5A6A75] mb-1.5 block">Email</label>
          <input
            ref={tab === 'login' ? firstRef : undefined}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="you@example.com"
            disabled={apiState === 'loading'}
            className={inputClass(errors.email)}
          />
          {errors.email && <p className="mt-1 text-[11px] text-[#FF6F59]">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="text-xs text-[#5A6A75] mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder={tab === 'register' ? 'At least 6 characters' : '••••••••'}
              disabled={apiState === 'loading'}
              className={`${inputClass(errors.password)} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9BAA] hover:text-[#5A6A75] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-[11px] text-[#FF6F59]">{errors.password}</p>}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={apiState === 'loading'}
          className="w-full bg-[#003017] hover:bg-[#004d26] active:bg-[#002d16] disabled:opacity-60 text-white font-semibold py-2.5 transition-colors text-sm flex items-center justify-center gap-2"
        >
          {apiState === 'loading' ? (
            <>
              <span className="animate-spin leading-none">⏳</span>
              <span>Signing in…</span>
            </>
          ) : (
            'Sign in →'
          )}
        </button>

        <p className="mt-5 text-[10px] text-[#C2CDD6] text-center leading-relaxed">
          Credentials stored securely in MongoDB Atlas. Passwords are hashed with bcrypt.
        </p>
      </div>
    </div>
  )
}
