/**
 * lib/types.ts
 * ------------
 * Single source of truth for all data shapes — mirrors backend/models/schemas.py
 * and backend/models/enums.py exactly. Do NOT hand-edit types here; regenerate
 * from the backend models when they change.
 */

// ---------------------------------------------------------------------------
// Enums  (mirror of backend/models/enums.py)
// ---------------------------------------------------------------------------

export type StatementType =
  | 'fact'
  | 'claim'
  | 'assumption'
  | 'evidence_ref'
  | 'opinion'

export type VerdictType =
  | 'supported'
  | 'contradicted'
  | 'uncertain'
  | 'insufficient_evidence'

export type SessionStatus = 'live' | 'ended'

// ---------------------------------------------------------------------------
// Models  (mirror of backend/models/schemas.py)
// ---------------------------------------------------------------------------

export interface Speaker {
  id: string
  display_name: string
  color: string              // default "#6366f1"
}

export interface Utterance {
  id: string
  session_id: string
  speaker_id: string | null  // null until diarization resolves attribution
  text: string
  is_final: boolean
  start_ms: number
  end_ms: number
}

export interface Claim {
  id: string
  speaker_id: string | null
  text: string
  statement_type: StatementType
  verbatim_quote: string
  start_ms: number
  confidence: number         // 0.0 – 1.0
}

export interface EvidenceChunk {
  id: string
  session_id: string
  source_name: string
  chunk_index: number
  text: string
}

export interface EvidenceLink {
  claim_id: string
  evidence_chunk_id: string
  quote: string
  verdict: VerdictType
  reasoning: string
}

export interface ContradictionFlag {
  claim_id_a: string
  claim_id_b: string
  description: string
  resolved: boolean
}

export interface SpeakerAssessment {
  speaker_id: string
  supported: number
  contradicted: number
  uncertain: number         // UNCERTAIN + INSUFFICIENT_EVIDENCE
  checkable_total: number   // supported + contradicted
}

export interface MediationReport {
  session_id: string
  claims: Claim[]
  verdicts: EvidenceLink[]
  contradictions: ContradictionFlag[]
  agreements: string[]
  dispute_type: string
  summary: string
  assessments: SpeakerAssessment[]
}

// ---------------------------------------------------------------------------
// WebSocket message unions  (mirrors backend/api/ws_routes.py docstring)
// ---------------------------------------------------------------------------

/** Messages the CLIENT sends to the server */
export type ClientMessage =
  | { type: 'begin_enrollment'; slot: number }   // start voice enrollment for slot N
  | { type: 'start_session'; speakers: string[] }
  | { type: 'audio_chunk'; data: string }        // base64-encoded Int16 PCM
  | { type: 'analyze' }
  | { type: 'end_session' }

/** Enrollment result from the server — four possible shapes:
 *  success:    name is a non-null string, no duplicate_of / give_up
 *  no-name:    name is null (ASR/LLM got nothing), neither flag set → retry
 *  duplicate:  name is null, duplicate_of is the already-enrolled name
 *  give_up:    name is null, give_up is true → show typed fallback
 */
export interface EnrollmentResultMessage {
  type: 'enrollment_result'
  slot: number
  name: string | null
  duplicate_of?: string   // present only on duplicate rejection
  give_up?: boolean       // present only when max duplicates exceeded
}

/** Messages the SERVER sends to the client */
export type ServerMessage =
  | EnrollmentResultMessage
  | { type: 'transcript_partial'; speaker_id: string | null; text: string; start_ms: number; end_ms: number }
  | { type: 'transcript_final';   speaker_id: string | null; text: string; start_ms: number; end_ms: number; utterance_id: string }
  | { type: 'claims_updated';     claims: Claim[] }
  | { type: 'contradictions';     contradictions: ContradictionFlag[]; agreements: string[]; dispute_type: string }
  | { type: 'clarifying_question'; question: string; contradiction: ContradictionFlag }
  | { type: 'report_ready';       report: MediationReport }
  | { type: 'session_ended';      wav_path: string }
  | { type: 'error';              detail: string }
