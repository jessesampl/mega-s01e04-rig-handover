import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (o: object) => JSON.stringify(o);

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(dir, '2030-01-01.jsonl'),
    [
      line({ at: '2030-01-01T02:00:00+01:00', job: 'b/second', status: 'ok', owner: null }),
      line({ at: '2030-01-01T01:00:00+01:00', job: 'a/first', status: 'retry', owner: 'alex', error: 'timeout' }),
      line({ at: '2030-01-01T01:05:00+01:00', job: 'a/first', status: 'fail', owner: 'alex', error: 'timeout' }),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2030-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2030-01-03.jsonl'),
    [
      line({ at: '2030-01-03T01:00:00+00:00', job: 'only/job', status: 'ok', owner: 'sam' }),
      'this is not json',
    ].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2030-01-01T00:00:00+00:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('digest routes', () => {
  it('renders a night as a page and as JSON', async () => {
    const page = await app.request('/digest/2030-01-01');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('a/first');
    expect(html).toContain('2030-01-01T01:05:00+01:00');
    expect(html).toContain('—');
    expect(html).toContain('class="warn"');

    const api = await app.request('/api/digest/2030-01-01');
    const body = (await api.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(api.status).toBe(200);
    expect(body.night).toBe('2030-01-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['a/first', 'b/second']);
  });

  it('lists the same jobs in the same order on the page and in the JSON', async () => {
    const html = await (await app.request('/digest/2030-01-01')).text();
    const body = (await (await app.request('/api/digest/2030-01-01')).json()) as { rows: { job: string }[] };
    const onPage = [...html.matchAll(/<tr[^>]*><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(onPage).toEqual(body.rows.map((r) => r.job));
  });

  it('returns 404 for a night with no file', async () => {
    const page = await app.request('/digest/2030-02-02');
    expect(page.status).toBe(404);
    expect(await page.text()).toContain('no such night');

    const api = await app.request('/api/digest/2030-02-02');
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ error: 'no such night' });
  });

  it('renders an empty night as "nothing ran"', async () => {
    const page = await app.request('/digest/2030-01-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const body = (await (await app.request('/api/digest/2030-01-02')).json()) as { rows: unknown[] };
    expect(body.rows).toEqual([]);
  });

  it('counts bad lines and still renders the rest', async () => {
    const page = await app.request('/digest/2030-01-03');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('1 line couldn&#39;t be read');
    expect(html).toContain('only/job');
    const body = (await (await app.request('/api/digest/2030-01-03')).json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });

  it('marks fail and 3+ retries with text, and shows the board link counts', async () => {
    const html = await (await app.request('/digest/2030-01-01')).text();
    expect(html).toContain('<td>fail</td>');
    const board = await (await app.request('/')).text();
    expect(board).toContain('href="/digest/2030-01-03"');
    expect(board).toContain('1 ok · 0 retry · 0 fail');
  });
});
