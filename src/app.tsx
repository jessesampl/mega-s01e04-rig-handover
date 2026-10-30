import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { nightCounts } from './digest/counts.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage, NoSuchNight } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) => {
    const status = readStatus(config);
    const nights = status.nights.map((night) => ({ night, counts: nightCounts(config.runsDir, night) }));
    return c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={status} nights={nights} />
      </Layout>,
    );
  });

  // Page and JSON both read the night through here, so they can never disagree (ADR 0001).
  const loadNight = (name: string) => readNight(config.runsDir, name);

  app.get('/digest/:night', (c) => {
    const name = c.req.param('night');
    const night = loadNight(name);
    if (night === null) {
      return c.html(
        <Layout title={`digest ${name}`} lane={lane()}>
          <NoSuchNight night={name} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${name}`} lane={lane()}>
        <DigestPage night={night} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = loadNight(c.req.param('night'));
    if (night === null) return c.json({ error: 'no such night' }, 404);
    return c.json({ night: night.night, rows: night.rows, badLines: night.badLines });
  });

  return app;
}
