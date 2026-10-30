import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

// Parse one JSONL line at the edge. Anything that doesn't fit is null, never thrown.
export function parseLine(line: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (!STATUSES.includes(o.status as RunStatus)) return null;
  if (o.owner !== undefined && o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as RunStatus,
    owner: (o.owner as string | null | undefined) ?? null,
    ...(o.error !== undefined ? { error: o.error as string } : {}),
  };
}

export function digest(lines: RunLine[]): DigestRow[] {
  const byJob = new Map<string, RunLine[]>();
  for (const l of lines) byJob.set(l.job, [...(byJob.get(l.job) ?? []), l]);

  return [...byJob.entries()]
    .map(([job, ls]) => {
      const sorted = [...ls].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const last = sorted[sorted.length - 1]!;
      const withOwner = sorted.filter((l) => l.owner !== null);
      const withError = sorted.filter((l) => l.error !== undefined);
      return {
        job,
        owner: withOwner.length ? withOwner[withOwner.length - 1]!.owner : null,
        runs: sorted.length,
        retries: sorted.filter((l) => l.status === 'retry').length,
        lastStatus: last.status,
        lastError: withError.length ? withError[withError.length - 1]!.error! : null,
        firstAt: sorted[0]!.at,
        lastAt: last.at,
      };
    })
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}

export const readNight: ReadNight = (runsDir, night) => {
  // The night comes from a URL, so it only ever names a file of the shape runs/YYYY-MM-DD.jsonl.
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const raw = text.split('\n').filter((l) => l.trim() !== '');
  const parsed = raw.map(parseLine);
  const lines = parsed.filter((l): l is RunLine => l !== null);
  return { night, rows: digest(lines), badLines: parsed.length - lines.length } satisfies Night;
};
