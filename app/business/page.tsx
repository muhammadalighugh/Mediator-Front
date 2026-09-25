'use client'

import { ArrowDown, CheckCircle2, Users, FileText, Search, GitBranch, Shield, Building2, Globe, Layers, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'

// ─── Reusable primitives ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#003017] uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-3xl font-bold text-[#003017] leading-snug mb-4">
      {children}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#E2E8ED] p-5 ${className}`}>
      {children}
    </div>
  )
}

function DarkCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#003017] border border-[#002d16] p-5 text-white ${className}`}>
      {children}
    </div>
  )
}

function Tag({ children, variant = 'green' }: { children: React.ReactNode; variant?: 'green' | 'outline' | 'amber' }) {
  const styles = {
    green:   'bg-[#003017] text-white border-[#002d16]',
    outline: 'bg-white text-[#003017] border-[#003017]',
    amber:   'bg-[#FFF4E8] text-[#c76b0a] border-[#F4A259]/50',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold border tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  )
}

function Arrow() {
  return (
    <div className="flex justify-center my-1">
      <ArrowDown size={14} className="text-[#003017]/40" strokeWidth={2} />
    </div>
  )
}

function FlowStep({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="inline-block bg-[#003017] text-white text-[11px] font-semibold px-3 py-1.5 rounded-sm border border-[#002d16]">
        {label}
      </div>
      {sub && <p className="text-[10px] text-[#9EAAB8] mt-1">{sub}</p>}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#22303C]">

      {/* ── Navbar ── */}
      <SiteNav />

      {/* ── Hero ── */}
      <section className="bg-[#003017] border-b border-[#002d16] px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <Tag variant="outline">Business Opportunity</Tag>
          <h1 className="font-bebas text-[3.5rem] md:text-[5rem] leading-[1] text-white mt-6 mb-4 tracking-wide uppercase">
            From Arguments to Evidence
          </h1>
          <p className="text-white/60 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            A structured evidence layer for conflicting human information — built for workplaces where decisions need to be defensible.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#problem" className="bg-white text-[#003017] font-semibold px-6 py-2.5 rounded-sm text-sm hover:bg-gray-100 transition-colors">
              See the opportunity
            </a>
            <a href="#roadmap" className="border border-white/30 text-white/80 hover:text-white hover:border-white px-6 py-2.5 rounded-sm text-sm transition-colors">
              View roadmap
            </a>
          </div>
        </div>
      </section>

      {/* ── Section 1: The Problem ── */}
      <section id="problem" className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>The Problem</SectionLabel>
        <SectionHeading>Organizations run on conflicting information.</SectionHeading>
        <p className="text-[#5A6A75] text-base leading-relaxed max-w-2xl mb-12">
          Companies regularly face situations where multiple people provide conflicting accounts of the same events —
          and the information needed to resolve those conflicts is scattered across conversations, messages, documents, and records.
        </p>

        {/* Conflict types grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-14">
          {[
            'Employee disputes', 'Workplace complaints', 'Expense disagreements', 'Project responsibility',
            'Timeline conflicts', 'Manager/employee friction', 'Client & vendor disputes', 'Incident reviews',
            'Policy violations', 'Internal investigations', 'Customer escalations', 'Conflicting reports',
          ].map((item) => (
            <div key={item} className="bg-white border border-[#E2E8ED] px-3 py-2.5 text-xs text-[#22303C] font-medium">
              {item}
            </div>
          ))}
        </div>

        {/* Evidence spread */}
        <div className="bg-[#F7F9FB] border border-[#E2E8ED] p-6 mb-10">
          <p className="text-xs text-[#003017] uppercase tracking-widest font-semibold mb-4">Where the information lives</p>
          <div className="flex flex-wrap gap-2">
            {['Conversations', 'Emails', 'Messages', 'Documents', 'Reports', 'Logs', 'Timelines', 'Payment records', 'Project records', 'Informal notes'].map((s) => (
              <span key={s} className="bg-white border border-[#E2E8ED] text-xs text-[#5A6A75] px-2.5 py-1">{s}</span>
            ))}
          </div>
        </div>

        {/* Pull quote */}
        <div className="border-l-4 border-[#003017] pl-5 py-1">
          <p className="text-lg md:text-xl font-bold text-[#003017] leading-snug">
            "The problem isn't always missing information.<br />
            Sometimes it's conflicting information."
          </p>
          <p className="text-sm text-[#9EAAB8] mt-2 leading-relaxed">
            The challenge is that conflicting information is fragmented, difficult to reconstruct objectively, and expensive to resolve manually.
          </p>
        </div>
      </section>

      {/* ── Section 2: Evolution ── */}
      <section className="bg-[#003017] border-y border-[#002d16] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel><span className="text-white/60">Commercial Evolution</span></SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-12">
            From argument mediator<br />to workplace evidence platform.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                phase: 'Today',
                title: 'Real-time Argument Mediation',
                desc: 'Two people. One dispute. Live transcription, claim extraction, contradiction detection, evidence matching, structured report.',
                tag: 'Available now',
                tagVariant: 'outline' as const,
              },
              {
                phase: 'Business Product',
                title: 'Workplace Dispute Analysis',
                desc: 'Authorized reviewers submit workplace cases. Multiple accounts, structured evidence, case record, human-reviewed report.',
                tag: 'Near-term',
                tagVariant: 'amber' as const,
              },
              {
                phase: 'Enterprise',
                title: 'Auditable Decision-Support Infrastructure',
                desc: 'Case management, audit trails, organizational integrations, multi-team workflows, advanced permissions.',
                tag: 'Roadmap',
                tagVariant: 'amber' as const,
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-5">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-2">{item.phase}</p>
                <h3 className="text-white font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{item.desc}</p>
                <Tag variant={item.tagVariant}>{item.tag}</Tag>
              </div>
            ))}
          </div>

          <div className="mt-10 border border-white/10 bg-white/5 p-5">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-2">Core philosophy — unchanged at every stage</p>
            <p className="text-white text-base md:text-lg font-semibold leading-snug">
              "Do not decide based on who sounds more convincing.<br className="hidden md:block" />
              Establish what the available evidence supports."
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Use Cases ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Workplace Use Cases</SectionLabel>
        <SectionHeading>Where the platform applies.</SectionHeading>
        <p className="text-[#5A6A75] text-base leading-relaxed max-w-xl mb-10">
          Any situation where authorized reviewers need to understand conflicting accounts against available evidence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: <Users size={18} strokeWidth={1.6} />,
              title: 'Employee Disputes',
              desc: 'Compare conflicting accounts of workplace incidents. Identify which statements are supported, contradicted, or unresolved against available records.',
            },
            {
              icon: <Search size={18} strokeWidth={1.6} />,
              title: 'Internal Investigations',
              desc: 'Help authorized investigators organize statements, evidence, timelines, and contradictions into a structured case record before a final decision.',
            },
            {
              icon: <FileText size={18} strokeWidth={1.6} />,
              title: 'Expense & Payment Disputes',
              desc: 'Compare statements about payments, reimbursements, invoices, and financial responsibilities against available records and documents.',
            },
            {
              icon: <GitBranch size={18} strokeWidth={1.6} />,
              title: 'Project Accountability',
              desc: 'Analyze disagreements about deadlines, responsibilities, approvals, deliverables, and handoffs against project records.',
            },
            {
              icon: <Shield size={18} strokeWidth={1.6} />,
              title: 'HR Case Review',
              desc: 'Help authorized HR teams structure conflicting statements and supporting documentation before making a human decision.',
            },
            {
              icon: <Building2 size={18} strokeWidth={1.6} />,
              title: 'Client & Vendor Disputes',
              desc: 'Reconstruct disagreements involving commitments, delivery dates, payments, approvals, or scope against available evidence.',
            },
            {
              icon: <Layers size={18} strokeWidth={1.6} />,
              title: 'Incident Review',
              desc: 'Compare accounts of operational incidents against logs, records, timelines, and other available evidence.',
            },
            {
              icon: <Globe size={18} strokeWidth={1.6} />,
              title: 'Customer Escalations',
              desc: 'Structure conflicting customer and employee accounts and identify what can actually be established from available records.',
            },
          ].map((uc, i) => (
            <Card key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-sm bg-[#003017] flex items-center justify-center flex-shrink-0 text-white mt-0.5">
                {uc.icon}
              </div>
              <div>
                <h3 className="text-[#003017] font-semibold text-sm mb-1">{uc.title}</h3>
                <p className="text-[#5A6A75] text-xs leading-relaxed">{uc.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section 4: How it helps ── */}
      <section className="bg-[#F7F9FB] border-y border-[#E2E8ED] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel>Workflow</SectionLabel>
          <SectionHeading>How it helps an organization.</SectionHeading>
          <p className="text-[#5A6A75] text-base leading-relaxed max-w-xl mb-12">
            The platform reduces the manual work required to reconstruct disputed events — without replacing the final human decision.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-0 items-start">
            {[
              { step: 'Conversation / Complaint', desc: 'An event is reported or a dispute begins' },
              null,
              { step: 'Multiple Accounts', desc: 'Each party states their version of events' },
              null,
              { step: 'Evidence Collection', desc: 'Documents, records, and messages are submitted' },
              null,
              { step: 'Claim & Contradiction Mapping', desc: 'The system extracts and structures every checkable statement' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="hidden md:flex items-center justify-center pt-4">
                  <ChevronRight size={16} className="text-[#003017]/30" />
                </div>
              ) : (
                <div key={i} className="bg-white border border-[#E2E8ED] p-3 text-center">
                  <p className="text-[10px] font-bold text-[#003017] uppercase tracking-wide mb-1">{item.step}</p>
                  <p className="text-[10px] text-[#9EAAB8] leading-snug">{item.desc}</p>
                </div>
              )
            )}
          </div>

          <div className="hidden md:flex justify-center my-2">
            <ArrowDown size={16} className="text-[#003017]/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-0 items-start">
            {[
              { step: 'Evidence Verification', desc: 'Each claim is checked against submitted documents' },
              null,
              { step: 'Structured Case Report', desc: 'Verdicts, contradictions, agreements, and uncertainty are surfaced' },
              null,
              { step: 'Human Review', desc: 'Authorized reviewer inspects the full record' },
              null,
              { step: 'Organization Decides', desc: 'Responsible human authority makes the final call with full information' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="hidden md:flex items-center justify-center pt-4">
                  <ChevronRight size={16} className="text-[#003017]/30" />
                </div>
              ) : (
                <div key={i} className={`border border-[#E2E8ED] p-3 text-center ${item.step === 'Organization Decides' ? 'bg-[#003017] text-white border-[#002d16]' : 'bg-white'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${item.step === 'Organization Decides' ? 'text-white' : 'text-[#003017]'}`}>{item.step}</p>
                  <p className={`text-[10px] leading-snug ${item.step === 'Organization Decides' ? 'text-white/60' : 'text-[#9EAAB8]'}`}>{item.desc}</p>
                </div>
              )
            )}
          </div>

          <div className="mt-8 border border-[#E2E8ED] bg-white p-5">
            <p className="text-sm text-[#5A6A75] leading-relaxed">
              <span className="font-semibold text-[#003017]">The platform does not replace the final decision-maker.</span>{' '}
              It reduces the manual reconstruction work, surfaces what the evidence shows, and makes the basis of any consequential decision more transparent and reviewable.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 5: Preventing poor decisions ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Decision Quality</SectionLabel>
        <SectionHeading>Reducing information risk in consequential decisions.</SectionHeading>
        <p className="text-[#5A6A75] text-base leading-relaxed max-w-2xl mb-10">
          Organizations can make poor decisions when they rely on incomplete, informal, or unverified information.
          The platform helps create a more complete, inspectable record before a decision is made.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div>
            <p className="text-xs text-[#003017] uppercase tracking-widest font-semibold mb-3">Common information risks</p>
            <div className="space-y-2">
              {[
                'Relying on a single person\'s account',
                'Incomplete or missing records',
                'Decisions based on memory',
                'Informal assumptions treated as facts',
                'Selective or partial evidence',
                'Misinterpreted messages',
                'Incorrect attribution of statements',
                'Unverified claims presented as established',
              ].map((r) => (
                <div key={r} className="flex items-start gap-2 bg-[#FFF4E8] border border-[#F4A259]/30 px-3 py-2">
                  <span className="text-[#F4A259] font-bold text-xs flex-shrink-0 mt-0.5">—</span>
                  <span className="text-xs text-[#22303C]">{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-[#003017] uppercase tracking-widest font-semibold mb-3">What the platform records</p>
            <div className="space-y-2">
              {[
                'Who said what — with speaker attribution',
                'What was claimed — extracted and structured',
                'What evidence exists for each claim',
                'What evidence contradicts the claim',
                'What remains uncertain or unresolved',
                'What cannot currently be established',
                'What the reviewer saw and when',
                'What decision was made and on what basis',
              ].map((r) => (
                <div key={r} className="flex items-start gap-2 bg-[#edfaf3] border border-[#b6f0d0] px-3 py-2">
                  <CheckCircle2 size={12} className="text-[#1a9e5a] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-xs text-[#22303C]">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DarkCard>
          <p className="text-sm md:text-base font-semibold leading-relaxed">
            "The system does not replace organizational judgment.<br className="hidden md:block" />
            It makes the information behind that judgment easier to inspect."
          </p>
        </DarkCard>
      </section>

      {/* ── Section 6: Human in the loop ── */}
      <section className="bg-[#F7F9FB] border-y border-[#E2E8ED] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel>Human-in-the-Loop</SectionLabel>
          <SectionHeading>The human always decides.</SectionHeading>
          <p className="text-[#5A6A75] text-base leading-relaxed max-w-xl mb-12">
            The system can help an authorized reviewer understand the case — but the final organizational decision remains with the responsible human authority. This is especially important for sensitive workplace matters.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Flow */}
            <div className="bg-white border border-[#E2E8ED] p-6">
              <p className="text-[10px] font-semibold text-[#003017] uppercase tracking-widest mb-5">Decision flow</p>
              <div className="space-y-1">
                <FlowStep label="AI analyzes" sub="Transcription, claim extraction, evidence matching" />
                <Arrow />
                <FlowStep label="Evidence is surfaced" sub="Supported, contradicted, uncertain — with citations" />
                <Arrow />
                <FlowStep label="Human reviews" sub="Authorized reviewer inspects the full record" />
                <Arrow />
                <FlowStep label="Organization decides" sub="Responsible authority makes the final call" />
              </div>
            </div>

            {/* Review questions */}
            <div className="bg-white border border-[#E2E8ED] p-6">
              <p className="text-[10px] font-semibold text-[#003017] uppercase tracking-widest mb-5">Questions a reviewer can now answer</p>
              <div className="space-y-3">
                {[
                  'Is the evidence complete, or is additional information required?',
                  'Are there unresolved contradictions that need further investigation?',
                  'Does the evidence actually support the stated claim?',
                  'Are there multiple plausible interpretations of the evidence?',
                  'Should additional people or records be consulted?',
                  'What remains genuinely uncertain at this stage?',
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[#003017] font-bold text-[10px] flex-shrink-0 mt-0.5 w-4">{i + 1}.</span>
                    <p className="text-xs text-[#5A6A75] leading-snug">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Auditability ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Auditability</SectionLabel>
        <SectionHeading>Decisions should be traceable.</SectionHeading>
        <p className="text-[#5A6A75] text-base leading-relaxed max-w-2xl mb-10">
          A commercially valuable version of the platform would maintain a structured case history — so that any decision can be traced back to the information that informed it.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            'Original statements', 'Speaker attribution', 'Extracted claims', 'Evidence references',
            'Contradictions', 'Supporting records', 'Unresolved questions', 'Human review actions',
            'Final decision', 'Decision rationale', 'Reviewer identity', 'Timestamp record',
          ].map((item) => (
            <div key={item} className="bg-white border border-[#E2E8ED] px-3 py-2.5 text-xs text-[#22303C] font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#003017] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <div className="border-l-4 border-[#003017] pl-5 py-1">
          <p className="text-lg font-bold text-[#003017] leading-snug">
            "A decision should be traceable back to the information that informed it."
          </p>
          <p className="text-sm text-[#9EAAB8] mt-2">
            Evidence citations are verifiable against underlying source material. The AI does not become the legal or organizational authority — it maintains the record.
          </p>
        </div>
      </section>

      {/* ── Section 8: Business Model ── */}
      <section className="bg-[#003017] border-y border-[#002d16] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel><span className="text-white/60">Business Model</span></SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-12">
            Potential commercial models.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'B2B SaaS',
                desc: 'Organizations subscribe based on users, active cases, evidence storage, and analysis volume.',
                items: ['Per seat or per case', 'Monthly / annual plans', 'Usage-based tiers', 'Organization size'],
              },
              {
                title: 'Enterprise',
                desc: 'Larger organizations receive dedicated environments and advanced organizational controls.',
                items: ['Dedicated environments', 'Advanced access controls', 'Organizational integrations', 'Custom retention & audit'],
              },
              {
                title: 'Usage-Based',
                desc: 'Organizations pay proportionally to how they actually use the platform.',
                items: ['Per mediation session', 'Per investigation case', 'Per audio hour processed', 'Per evidence document'],
              },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-5">
                <h3 className="text-white font-semibold text-base mb-2">{m.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{m.desc}</p>
                <div className="space-y-1.5">
                  {m.items.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/30 text-xs mt-6 italic">
            These are potential future commercial models. Pricing has not been finalized.
          </p>
        </div>
      </section>

      {/* ── Section 9: Target Customers ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Target Customers</SectionLabel>
        <SectionHeading>Who benefits most.</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              segment: 'Initial Market',
              tag: 'Now',
              tagVariant: 'green' as const,
              items: ['Small & medium businesses', 'Startups & agencies', 'Remote teams', 'Distributed organizations', 'Companies without formal HR'],
              note: 'Begin with simple workplace disputes. Fast time-to-value with minimal setup.',
            },
            {
              segment: 'Expansion',
              tag: 'Near-term',
              tagVariant: 'outline' as const,
              items: ['HR departments', 'Operations teams', 'Customer support orgs', 'Project management teams', 'Compliance functions', 'Internal investigation teams'],
              note: 'Structured workflows for teams that handle cases regularly.',
            },
            {
              segment: 'Enterprise',
              tag: 'Roadmap',
              tagVariant: 'amber' as const,
              items: ['Large organizations', 'Multi-location companies', 'Companies with formal case workflows', 'Legal & compliance departments', 'Regulated industries'],
              note: 'Full case management, audit trail, integrations, and enterprise administration.',
            },
          ].map((seg, i) => (
            <Card key={i} className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#003017] uppercase tracking-wide">{seg.segment}</p>
                <Tag variant={seg.tagVariant}>{seg.tag}</Tag>
              </div>
              <div className="space-y-1.5 flex-1">
                {seg.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#22303C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#003017] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#9EAAB8] mt-4 pt-3 border-t border-[#E2E8ED] italic leading-snug">{seg.note}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section 10: Platform potential ── */}
      <section className="bg-[#F7F9FB] border-y border-[#E2E8ED] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel>Platform Potential</SectionLabel>
          <SectionHeading>A structured evidence layer for conflicting human information.</SectionHeading>
          <p className="text-[#5A6A75] text-base leading-relaxed max-w-xl mb-12">
            The long-term opportunity is not simply AI mediation. It is a reusable platform that any organization can use to understand, structure, and act on conflicting information.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { mod: 'Conversation Analysis', avail: 'Now' },
              { mod: 'Evidence Analysis', avail: 'Now' },
              { mod: 'Claim Graph', avail: 'Now' },
              { mod: 'Structured Report', avail: 'Now' },
              { mod: 'Case Management', avail: 'Roadmap' },
              { mod: 'Investigation Workspace', avail: 'Roadmap' },
              { mod: 'Decision Audit Trail', avail: 'Roadmap' },
              { mod: 'Organizational Knowledge', avail: 'Roadmap' },
            ].map((m) => (
              <div key={m.mod} className={`border p-4 ${m.avail === 'Now' ? 'bg-white border-[#003017]/20' : 'bg-[#F7F9FB] border-[#E2E8ED]'}`}>
                <p className={`text-xs font-semibold mb-1.5 ${m.avail === 'Now' ? 'text-[#003017]' : 'text-[#9EAAB8]'}`}>{m.mod}</p>
                <Tag variant={m.avail === 'Now' ? 'green' : 'amber'}>{m.avail}</Tag>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 11: Differentiation ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Differentiation</SectionLabel>
        <SectionHeading>What changes when the platform is involved.</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <p className="text-xs font-bold text-[#c76b0a] uppercase tracking-widest mb-4">Traditional approach</p>
            <p className="text-xs text-[#9EAAB8] mb-3">People manually:</p>
            <div className="space-y-2">
              {[
                'Listen to or read full conversation records',
                'Search documents for relevant passages',
                'Compare statements across multiple sources',
                'Build timelines by hand',
                'Identify contradictions without structured support',
                'Write summary reports from scratch',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-[#F4A259] font-bold text-xs flex-shrink-0 mt-0.5">—</span>
                  <span className="text-xs text-[#5A6A75]">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          <DarkCard>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">With this platform</p>
            <p className="text-[10px] text-white/40 mb-3">The system assists by:</p>
            <div className="space-y-2">
              {[
                'Structuring the conversation with speaker attribution',
                'Separating and labeling each speaker\'s claims',
                'Extracting checkable statements automatically',
                'Identifying contradictions between accounts',
                'Connecting claims to evidence passages with citations',
                'Highlighting what remains uncertain or unverifiable',
                'Producing a structured, reviewable case report',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={11} className="text-[#2ECC71] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-xs text-white/80">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-[10px] mt-4 pt-3 border-t border-white/10 italic">
              The human remains responsible for the final decision.
            </p>
          </DarkCard>
        </div>
      </section>

      {/* ── Section 12: Multilingual ── */}
      <section className="bg-[#F7F9FB] border-y border-[#E2E8ED] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <SectionLabel>Multilingual Opportunity</SectionLabel>
          <SectionHeading>Organizations work across languages.</SectionHeading>
          <p className="text-[#5A6A75] text-base leading-relaxed max-w-xl mb-10">
            The platform can potentially support situations where employees speak one language while company records and evidence exist in another — enabling cross-language evidence matching.
          </p>

          <div className="bg-white border border-[#E2E8ED] p-6 max-w-md">
            <p className="text-[10px] font-semibold text-[#003017] uppercase tracking-widest mb-5">Cross-language flow</p>
            <div className="space-y-1">
              <FlowStep label="Spoken conversation" sub="Employee speaks in their language" />
              <Arrow />
              <FlowStep label="Structured claims" sub="Extracted regardless of spoken language" />
              <Arrow />
              <FlowStep label="Cross-language evidence matching" sub="Claims checked against documents in any language" />
              <Arrow />
              <FlowStep label="Evidence-based report" sub="Unified, structured output for the reviewer" />
            </div>
            <p className="text-[10px] text-[#9EAAB8] mt-5 italic leading-snug">
              Multilingual performance depends on speech quality, language, terminology, and available evidence. Accuracy is not guaranteed.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 13: Roadmap ── */}
      <section id="roadmap" className="px-6 py-20 max-w-5xl mx-auto">
        <SectionLabel>Expansion Roadmap</SectionLabel>
        <SectionHeading>What exists today. What comes next.</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              phase: 'Phase 1',
              title: 'Current',
              tag: 'Available now',
              tagVariant: 'green' as const,
              items: [
                'Real-time argument mediation',
                'Speaker attribution',
                'Claim extraction',
                'Contradiction detection',
                'Evidence matching',
                'Verified citations',
                'Structured reports',
              ],
            },
            {
              phase: 'Phase 2',
              title: 'Workplace',
              tag: 'Near-term',
              tagVariant: 'outline' as const,
              items: [
                'Case management',
                'Authorized reviewer workflows',
                'Additional evidence sources',
                'Decision audit trails',
                'Team collaboration',
              ],
            },
            {
              phase: 'Phase 3',
              title: 'Enterprise',
              tag: 'Roadmap',
              tagVariant: 'amber' as const,
              items: [
                'Enterprise administration',
                'Advanced permissions',
                'Organizational integrations',
                'Large-scale case workflows',
                'Advanced compliance',
              ],
            },
            {
              phase: 'Phase 4',
              title: 'Intelligence Layer',
              tag: 'Future',
              tagVariant: 'amber' as const,
              items: [
                'Cross-case pattern analysis',
                'Recurring dispute categories',
                'Organizational process insights',
                'Early problem identification',
              ],
            },
          ].map((p, i) => (
            <Card key={i} className="flex flex-col">
              <p className="text-[10px] text-[#9EAAB8] uppercase tracking-widest font-semibold mb-1">{p.phase}</p>
              <h3 className="text-[#003017] font-bold text-base mb-2">{p.title}</h3>
              <Tag variant={p.tagVariant}>{p.tag}</Tag>
              <div className="mt-4 space-y-1.5 flex-1">
                {p.items.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-[#5A6A75]">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${p.tagVariant === 'green' ? 'bg-[#003017]' : 'bg-[#E2E8ED]'}`} />
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <p className="text-[10px] text-[#C2CDD6] mt-4 italic">
          Phases 2–4 represent future opportunities, not current capabilities.
        </p>
      </section>

      {/* ── Section 14: Closing ── */}
      <section className="bg-[#003017] border-t border-[#002d16] px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <SectionLabel><span className="text-white/40">Why It Matters</span></SectionLabel>
          <h2 className="font-bebas text-[3rem] md:text-[4rem] leading-[1] text-white tracking-wide uppercase mb-6">
            The cost of ambiguity is real.
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-6 max-w-xl mx-auto">
            Organizations spend significant human time reconstructing what happened when people disagree.
            That time is expensive. The outcomes — when based on incomplete or unverified information — can be worse.
          </p>
          <p className="text-white text-lg md:text-xl font-semibold mb-10">
            Turn conflicting human accounts and scattered evidence<br className="hidden md:block" />
            into a structured, reviewable case.
          </p>

          <div className="inline-flex items-center gap-4 text-sm text-white/60 mb-14 flex-wrap justify-center">
            <span>From arguments to evidence.</span>
            <span className="text-white/20">·</span>
            <span>From evidence to clarity.</span>
            <span className="text-white/20">·</span>
            <span>From clarity to accountable decisions.</span>
          </div>

          {/* CTA */}
          <div className="border border-white/10 bg-white/5 p-8 max-w-lg mx-auto">
            <p className="text-white font-semibold text-lg mb-2">
              When people disagree, the evidence should be easier to understand.
            </p>
            <p className="text-white/50 text-sm mb-6">
              Build a clearer record of what was said, what can be verified, and what remains uncertain.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/session/demo"
                className="inline-block bg-white hover:bg-gray-100 text-[#003017] font-semibold px-8 py-3 rounded-sm text-sm transition-colors"
              >
                See How It Works →
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-block border border-white/30 text-white/80 hover:text-white hover:border-white px-8 py-3 rounded-sm text-sm transition-colors"
              >
                Back to product
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E2E8ED] bg-[#FDFDFD] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-[#003017] flex items-center justify-center">
              <img src="/logo.png" alt="MediFact logo" className="w-3 h-3 object-contain" />
            </div>
            <span className="text-[#003017] font-semibold text-xs">MediFact</span>
          </div>
          <p className="text-[#C2CDD6] text-xs text-center">
            Built for a hackathon. Not a legal product. No statistics, customers, or revenue figures presented here are real.
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['AssemblyAI', 'FastAPI', 'Next.js'].map((badge) => (
              <span key={badge} className="text-[10px] text-[#8A9BAA] border border-[#E2E8ED] px-2 py-0.5">{badge}</span>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
