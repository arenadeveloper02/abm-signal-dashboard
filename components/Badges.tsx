import type { Confidence, SignalFamily } from '@/lib/types';
import { CONFIDENCE_COLORS, FAMILY_COLORS, FAMILY_LABELS } from '@/lib/utils';

export function FamilyChip({ family }: { family: SignalFamily }) {
  const color = FAMILY_COLORS[family];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}33` }}
    >
      {FAMILY_LABELS[family]}
    </span>
  );
}

export function TypeChip({ type, family }: { type: string; family: SignalFamily }) {
  const color = FAMILY_COLORS[family];
  return (
    <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11px] font-medium" style={{ color }}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const color = CONFIDENCE_COLORS[confidence];
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color, backgroundColor: `${color}1F` }}
    >
      {confidence}
    </span>
  );
}
