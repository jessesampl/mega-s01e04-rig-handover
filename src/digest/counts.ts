import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunLine } from './types.js';

export type StatusCounts = { ok: number; retry: number; fail: number };

// Counts of parsed lines by status (not of jobs). Lines that didn't parse are not counted.
export function countByStatus(lines: RunLine[]): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const l of lines) counts[l.status] += 1;
  return counts;
}

// Counts for runs/<night>.jsonl, or null if the file can't be read. `night` must come from
// nightsOnDisk, not from a URL.
export function nightCounts(runsDir: string, night: string): StatusCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const lines = text
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map(parseLine)
    .filter((l): l is RunLine => l !== null);
  return countByStatus(lines);
}
