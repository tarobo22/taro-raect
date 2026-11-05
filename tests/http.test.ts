import test from 'node:test';
import assert from 'node:assert/strict';
import {FetchClient} from '../src/infrastructure/http/FetchClient';
import {GuestSession} from '../src/infrastructure/http/GuestSession';

test('an HTTP error cannot be mistaken for successful persistence', async () => {
  const client = new FetchClient('http://api', 100, async () => 'session', async () =>
    new Response(JSON.stringify({error: 'try again'}), {status: 503}));
  await assert.rejects(client.request('/entries'), /try again/);
});

test('a request timeout aborts the underlying fetch', async () => {
  let aborted = false;
  const client = new FetchClient('http://api', 15, async () => 'session', async (_url, options) =>
    new Promise((_resolve, reject) => options!.signal!.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('aborted'));
    })));
  await assert.rejects(client.request('/entries'), /유지됩니다/);
  assert.equal(aborted, true);
});

test('concurrent authenticated screens create and persist only one guest session', async () => {
  let creations = 0;
  let writes = 0;
  const session = new GuestSession({read: async () => null, write: async () => {writes++;}},
    async () => {creations++; return {token: 'a'.repeat(64)};});
  assert.deepEqual(await Promise.all([session.token(), session.token(), session.token()]), Array(3).fill('a'.repeat(64)));
  assert.equal(creations, 1);
  assert.equal(writes, 1);
});
