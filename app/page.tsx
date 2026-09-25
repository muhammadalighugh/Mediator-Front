'use client'

import { useState } from 'react'
import { Mic, Paperclip, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import LoginModal from '@/components/LoginModal'

const SVG_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 200 200'%3E%3Crect fill='%23003017' width='200' height='200'/%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='100' y1='33' x2='100' y2='-3'%3E%3Cstop offset='0' stop-color='%23000' stop-opacity='0'/%3E%3Cstop offset='1' stop-color='%23000' stop-opacity='1'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='100' y1='135' x2='100' y2='97'%3E%3Cstop offset='0' stop-color='%23000' stop-opacity='0'/%3E%3Cstop offset='1' stop-color='%23000' stop-opacity='1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg fill='%23002d16' fill-opacity='0.6'%3E%3Crect x='100' width='100' height='100'/%3E%3Crect y='100' width='100' height='100'/%3E%3C/g%3E%3Cg fill-opacity='0.5'%3E%3Cpolygon fill='url(%23a)' points='100 30 0 0 200 0'/%3E%3Cpolygon fill='url(%23b)' points='100 100 0 130 0 100 200 100 200 130'/%3E%3C/g%3E%3C/svg%3E")`

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#22303C]">

      {/* ================================================================
          NAV
          ================================================================ */}
      <SiteNav />

      {/* ================================================================
          HERO
          ================================================================ */}
      <section
        className="relative w-full min-h-[85vh] flex items-center"
        style={{
          backgroundImage: SVG_BG,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px',
        }}
      >
        <div className="flex flex-col items-center text-center px-6 pt-28 pb-20 max-w-3xl mx-auto w-full">

          {/* Badge */}
          <span className="inline-flex items-center gap-2 text-xs text-white/80 border border-white/20 bg-white/10 px-3 py-1 mb-8">
            Kodlify
            <span className="text-white/40">×</span>
            AssemblyAI
          </span>

          <h1 className="font-bebas text-[5.5rem] leading-[1] text-white mb-2 tracking-wide uppercase">
            Argument Mediator
          </h1>

          <p className="font-bebas text-[2.75rem] leading-[1.1] text-white/60 mb-8 tracking-wide uppercase">
            The AI that resolves clashes in your office
          </p>

          <p className="text-white/70 text-[1.1rem] leading-relaxed max-w-xl mb-10">
            An AI that listens to both sides, checks every claim against your
            evidence, and tells you what&apos;s actually supported.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white hover:bg-gray-100 active:bg-gray-200 text-[#003017] font-semibold px-8 rounded-sm py-3 transition-colors text-sm"
            >
              Sign in
            </button>
            <Link
              href="/demo"
              className="border border-white/20 text-white/60 hover:text-white hover:border-white/40 rounded-sm px-8 py-3 transition-colors text-sm"
            >
              Try demo
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
          ================================================================ */}
      <section id="how-it-works" className="w-full px-6 pt-16 pb-24">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-[#003017] uppercase tracking-widest mb-12 font-semibold">
            How it works
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Card 1 */}
            <div className="bg-white border border-[#E2E8ED] p-6">
              <div className="mb-4">
                <Mic size={28} color="#003017" strokeWidth={1.6} />
              </div>
              <h3 className="text-[#003017] font-semibold mb-2 text-[15px]">
                Speak freely
              </h3>
              <p className="text-[#5A6A75] text-sm leading-relaxed">
                Live transcription with speaker recognition captures every word
                from both sides in real time — no notes, no interruptions.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-[#E2E8ED] p-6">
              <div className="mb-4">
                <Paperclip size={28} color="#003017" strokeWidth={1.6} />
              </div>
              <h3 className="text-[#003017] font-semibold mb-2 text-[15px]">
                Upload your evidence
              </h3>
              <p className="text-[#5A6A75] text-sm leading-relaxed">
                Attach receipts, logs, messages, or any document. The system
                reads them and uses them as the ground truth for every verdict.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-[#E2E8ED] p-6">
              <div className="mb-4">
                <ClipboardList size={28} color="#003017" strokeWidth={1.6} />
              </div>
              <h3 className="text-[#003017] font-semibold mb-2 text-[15px]">
                Get the report
              </h3>
              <p className="text-[#5A6A75] text-sm leading-relaxed">
                Every claim is marked{' '}
                <span className="text-[#2ECC71] font-medium">supported</span>,{' '}
                <span className="text-[#F4A259] font-medium">contradicted</span>,
                or <span className="text-[#8A9BAA]">unverified</span> with a
                direct quote from your documents.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================
          PRINCIPLE STRIP
          ================================================================ */}
      <section className="w-full border-y border-[#E2E8ED] bg-white px-6 py-12">
        <blockquote className="max-w-2xl mx-auto text-center">
          <p className="text-[#003017] font-serif text-[1.25rem] leading-relaxed mb-3">
            &ldquo;It never declares a winner without evidence.&rdquo;
          </p>
          <p className="text-[#8A9BAA] text-sm leading-relaxed">
            Every quote in the report is mechanically verified against your documents.
            If it&apos;s not in the evidence, it&apos;s marked unverified — no exceptions.
          </p>
        </blockquote>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="w-full px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[#C2CDD6] text-xs text-center md:text-left leading-relaxed">
            Built for a hackathon. Not a legal product.
            <br />
            All processing happens locally — nothing leaves your machine.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {['AssemblyAI', 'FastAPI', 'Next.js'].map((badge) => (
              <span
                key={badge}
                className="text-[11px] text-[#8A9BAA] border border-[#E2E8ED] px-2.5 py-1"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
