import { ABILITY_KEYS, ABILITY_LABEL, type AbilityKey } from '@/lib/types';

export function AbilityBars({ values }: { values: Partial<Record<AbilityKey, number | null>> }) {
  return (
    <ul className="space-y-2.5">
      {ABILITY_KEYS.map((key) => {
        const value = values[key] ?? null;
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-sm font-medium">{ABILITY_LABEL[key]}</span>
            <span className="flex gap-1" role="img" aria-label={`${ABILITY_LABEL[key]} ${value ?? 0}점 (5점 만점)`}>
              {[1, 2, 3, 4, 5].map((step) => (
                <span
                  key={step}
                  aria-hidden="true"
                  className={`h-2.5 w-6 rounded-sm ${
                    value !== null && step <= value ? 'bg-pitch-500' : 'bg-black/10 dark:bg-white/10'
                  }`}
                />
              ))}
            </span>
            <span className="muted ml-auto text-sm tabular-nums">{value ?? '-'}</span>
          </li>
        );
      })}
    </ul>
  );
}
