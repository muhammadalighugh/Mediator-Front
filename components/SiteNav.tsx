'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LoginModal from '@/components/LoginModal'

function SiteNavInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    try {
      const token = localStorage.getItem('am_token')
      const raw = localStorage.getItem('am_user')
      if (token && raw) {
        const user = JSON.parse(raw)
        if (user?.name) setAlreadyLoggedIn(true)
      }
    } catch {
      // ignore malformed data
    }
  }, [])

  // Auto-open modal when ?signin=1 is in the URL
  useEffect(() => {
    if (searchParams.get('signin') === '1' && !alreadyLoggedIn) {
      setShowModal(true)
    }
  }, [searchParams, alreadyLoggedIn])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleGetStarted() {
    if (alreadyLoggedIn) {
      router.push('/start')
    } else {
      setShowModal(true)
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-6 pt-5 transition-all duration-300">
        <nav className={`flex items-center justify-between gap-8 bg-[#003017]/95 backdrop-blur-sm rounded-sm shadow-lg border border-[#002d16] transition-all duration-300 ${
          scrolled ? 'w-full max-w-[537px] px-5 py-1.5' : 'w-full max-w-3xl px-5 py-2.5'
        }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            
              <img src="/logo.png" alt="MediFact logo" className="w-10 h-10 " />
           
            <span className={`text-white text-sm font-semibold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${
              scrolled ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
            }`}>
              MediFact
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/#how-it-works" className="text-white/60 hover:text-white text-sm transition-colors">How it works</a>
            <a href="/#how-it-works" className="text-white/60 hover:text-white text-sm transition-colors">Features</a>
            <Link href="/business" className="text-white/60 hover:text-white text-sm transition-colors">Business</Link>
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            className="flex-shrink-0 bg-white hover:bg-gray-100 active:bg-gray-200 text-[#003017] text-sm font-semibold px-4 py-1.5 rounded-sm transition-colors"
          >
            {alreadyLoggedIn ? 'Open app' : 'Sign in'}
          </button>
        </nav>
      </header>

      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </>
  )
}

export default function SiteNav() {
  return (
    <Suspense>
      <SiteNavInner />
    </Suspense>
  )
}
