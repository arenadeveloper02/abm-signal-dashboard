import type { Confidence, Family } from '@/lib/types'
import { CONFIDENCE_META, FAMILY_META } from '@/lib/utils'

export function FamilyChip({ family }: { family: Family }) {
  const meta = FAMILY_META[family]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }}
    >
      {meta.label}
    </span>
  )
}

export function TypeChip({ type, family }: { type: string; family: Family }) {
  const meta = FAMILY_META[family]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E313A] bg-[#22242C] px-2 py-0.5 text-[11px] font-medium text-[#D3D6DE]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {type}
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const meta = CONFIDENCE_META[confidence]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color: meta.color, borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }}
    >
      {confidence}
    </span>
  )
}
