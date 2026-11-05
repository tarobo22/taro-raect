import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveJournal} from '../src/features/journal/saveJournal';
import {JournalApi} from '../src/features/journal/JournalApi';
import type {JournalDraft, JournalEntry, JournalRepository} from '../src/features/journal/model';

const draft: JournalDraft = {day: '2026-11-06', mood: 'calm', body: 'keep my words'};
const saved: JournalEntry = {...draft, id: 'cbe9d620-3ce9-48cd-b5fc-0238de044915',
  createdAt: '2026-11-06T00:00:00Z', updatedAt: '2026-11-06T00:00:00Z'};

function repository(create: JournalRepository['create']): JournalRepository {
  return {create, update: async () => saved, list: async () => [], delete: async () => true,
    policy: async () => ({moods: ['calm'], maxBodyLength: 40})};
}

test('repeated save shares one pending write and waits for acknowledgement', async () => {
  let calls = 0;
  let acknowledge!: (entry: JournalEntry) => void;
  const pending = new Promise<JournalEntry>(resolve => {acknowledge = resolve;});
  const save = new SaveJournal(repository(() => {calls++; return pending;}));
  const first = save.save(draft);
  const second = save.save(draft);
  assert.equal(calls, 1);
  acknowledge(saved);
  assert.equal(await first, saved);
  assert.equal(await second, saved);
});

test('a failed save preserves input and permits an explicit retry', async () => {
  let calls = 0;
  const input = Object.freeze({...draft});
  const save = new SaveJournal(repository(async () => {
    if (++calls === 1) throw new Error('offline');
    return saved;
  }));
  await assert.rejects(save.save(input), /offline/);
  assert.equal(input.body, 'keep my words');
  assert.equal(await save.save(input), saved);
});

test('an edit calls update with the original identity', async () => {
  const repo = repository(async () => assert.fail('edit must not create'));
  repo.update = async (id, value) => {assert.equal(id, saved.id); assert.equal(value.body, draft.body); return saved;};
  assert.equal(await new SaveJournal(repo).save({...draft, id: saved.id}), saved);
});

test('an invalid persistence acknowledgement is rejected rather than clearing the form', async () => {
  const api = new JournalApi({request: async () => ({ok: true})}, {entries: '/entries', policy: '/policy'});
  await assert.rejects(api.create(draft));
});

test('the HTTP adapter maps and validates wire dates and field names', async () => {
  const api = new JournalApi({request: async () => ({id: saved.id, day: draft.day, mood: draft.mood,
    body: draft.body, created_at: saved.createdAt, updated_at: saved.updatedAt})}, {entries: '/entries', policy: '/policy'});
  assert.deepEqual(await api.create(draft), saved);
});
