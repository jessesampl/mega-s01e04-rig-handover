// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// A night that exists on disk. `badLines` counts lines that didn't parse; they never throw.
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Returns null when runs/<night>.jsonl doesn't exist. Rows are sorted by job.
export type ReadNight = (runsDir: string, night: string) => Night | null;
