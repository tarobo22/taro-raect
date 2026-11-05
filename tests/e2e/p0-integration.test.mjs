import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {inflateRawSync} from 'node:zlib';
import {enterGuest} from './onboarding.mjs';

const {chromium} = await import(process.env.YEOUN_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.YEOUN_WEB_URL || 'http://127.0.0.1:8817';
const api = process.env.YEOUN_API_URL || 'http://127.0.0.1:8818';
const artifacts = process.env.YEOUN_TEST_ARTIFACTS || '.local/p0-integration-e2e';
for (const endpoint of [base, api]) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(endpoint).hostname),
    'P0 integration tests require an isolated loopback preview and backend');
}

const apiPath = response => new URL(response.url()).pathname.replace(/^\/api(?=\/)/, '');
const responseFor = (page, method, pathname) => page.waitForResponse(response =>
  response.request().method() === method && apiPath(response) === pathname);
const journalPost = response => response.request().method() === 'POST' &&
  ['/v1/entries', '/v2/journal-entries'].includes(apiPath(response));

async function jsonResponse(response, status) {
  assert.equal(response.status(), status, `${response.request().method()} ${apiPath(response)}`);
  return response.json();
}

async function settledScreenshot(page, name, anchor) {
  await anchor.waitFor({state: 'visible'});
  const element = await anchor.elementHandle();
  await page.waitForFunction(node => {
    for (let current = node; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) < 0.99) return false;
    }
    return true;
  }, element);
  await page.waitForFunction(() => [...document.images].filter(image => {
    const bounds = image.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  }).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: path.join(artifacts, name + '.png'), fullPage: true});
}

async function completedDataRequest(page, id) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const response = responseFor(page, 'GET', '/v2/data-requests/' + id);
    await page.getByRole('button', {name: '처리 상태 다시 조회', exact: true}).click();
    const status = await jsonResponse(await response, 200);
    assert.notEqual(status.state, 'failed');
    if (status.state === 'completed') {
      await page.getByText('완료', {exact: true}).waitFor();
      return status;
    }
    await delay(200);
  }
  assert.fail('data request did not complete within 15 seconds');
}

async function setup(t, name) {
  await mkdir(artifacts, {recursive: true});
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await context.addInitScript(() => localStorage.setItem('yeoun.reduced', 'true'));
  const state = {authorization: '', receipt: null, erased: false};
  const requests = [], network = [], responseTasks = [], pageErrors = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (!pathname.startsWith('/api/')) return;
    const authorization = request.headers().authorization;
    if (authorization) state.authorization = authorization;
    requests.push({method: request.method(), path: pathname.slice(4)});
  });
  page.on('response', response => {
    if (!new URL(response.url()).pathname.startsWith('/api/')) return;
    const pathname = apiPath(response);
    network.push({method: response.request().method(), path: pathname, status: response.status()});
    if (response.request().method() !== 'POST' || response.status() >= 400) return;
    if (pathname === '/v2/sessions') {
      responseTasks.push(response.json().then(value => {
        if (typeof value.access_token === 'string') state.authorization = 'Bearer ' + value.access_token;
      }));
    }
    if (pathname === '/v2/me/data-requests') {
      responseTasks.push(response.json().then(value => {
        if (value.kind === 'erase') state.receipt = value;
      }));
    }
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  async function ownerRequest(pathname, options = {}) {
    assert.ok(state.authorization, 'onboarding must create a session before owner requests');
    return fetch(api + pathname, {...options, headers: {Authorization: state.authorization, ...options.headers}});
  }
  async function cleanupOwner() {
    await Promise.all(responseTasks);
    if (state.erased || !state.authorization) return;
    if (!state.receipt) {
      const response = await ownerRequest('/v2/me/data-requests', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'X-Idempotency-Key': randomUUID()},
        body: JSON.stringify({kind: 'erase', confirmation: '내 기록 모두 삭제'}),
      });
      assert.equal(response.status, 202, 'cleanup must accept erasure of this test owner');
      state.receipt = await response.json();
    }
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const response = await fetch(api + '/v2/data-requests/' + state.receipt.id,
        {headers: {'X-Data-Receipt': state.receipt.receipt}});
      assert.equal(response.status, 200, 'cleanup receipt must remain valid');
      const current = await response.json();
      if (current.state === 'completed') { state.erased = true; return; }
      assert.notEqual(current.state, 'failed', 'test owner erasure must complete');
      await delay(200);
    }
    assert.fail('test owner cleanup did not complete within 15 seconds');
  }
  t.after(async () => {
    try {
      try {
        if (!page.isClosed()) await settledScreenshot(page, name + '-final', page.locator('body'));
      } finally {
        // Cleanup runs even if an evidence screenshot fails.
        await cleanupOwner();
        // Trace intentionally excludes request headers, session tokens, receipts and body text.
        await writeFile(path.join(artifacts, name + '-network.json'), JSON.stringify(network, null, 2) + '\n');
      }
    } finally {
      await context.close();
      await browser.close();
    }
  });
  return {page, context, state, requests, network, pageErrors, ownerRequest};
}

async function saveJournal(page, context, text) {
  const policyResponse = await context.request.get(base + '/api/v1/journal-policy');
  assert.equal(policyResponse.status(), 200);
  const policy = await policyResponse.json();
  await page.getByRole('button', {name: policy.moods[0], exact: true}).click();
  await page.getByLabel('마음기록 내용 입력').fill(text);
  const saved = page.waitForResponse(journalPost);
  await page.getByRole('button', {name: '이 마음 저장하기', exact: true}).click();
  const entry = await jsonResponse(await saved, 201);
  await page.getByRole('button', {name: '기록 수정하기', exact: true}).waitFor();
  assert.equal(entry.body, text.trim());
  return entry;
}

async function allowCurrentPurpose(page, expectedKind) {
  const recorded = responseFor(page, 'POST', '/v2/me/consents');
  await page.getByRole('button', {name: '이 목적만 허용', exact: true}).first().click();
  const event = await jsonResponse(await recorded, 201);
  assert.equal(event.kind, expectedKind);
  assert.equal(event.granted, true);
  await page.getByRole('button', {name: '이 목적의 동의 철회', exact: true}).first().waitFor();
  return event;
}

test('real server slots, selected journal context, explicit AI result, card provenance and linked feedback',
  {timeout: 120000}, async t => {
    const {page, context, requests, network, pageErrors, ownerRequest} = await setup(t, 'reading');
    const marker = 'P0 실제 연동 ' + randomUUID().slice(0, 8);
    await page.goto(base);
    await page.getByRole('button', {name: '게스트로 시작', exact: true}).waitFor();
    assert.equal(requests.filter(r => r.path === '/v2/sessions').length, 0);
    await enterGuest(page);
    assert.equal(requests.filter(r => r.path === '/v2/sessions').length, 1);

    await page.getByRole('button', {name: /지금의 마음 남기기/}).click();
    const contextEntry = await saveJournal(page, context, marker + ' · 직접 고를 참고 기록');
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('tab', {name: '오늘', exact: true}).click();
    await page.getByRole('button', {name: /고민 타로/}).click();
    const question = marker + ' · 오늘 내가 선택할 작은 한 걸음은?';
    await page.getByLabel('타로 질문 입력').fill(question);
    await page.getByRole('button', {name: '덱 그림과 출처 고르기', exact: true}).click();
    await page.getByRole('button', {name: '덱 출처 확인', exact: true}).click();
    await page.getByText('Public domain', {exact: true}).waitFor();
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('button', {name: /^(선택한 덱으로 완료|이 덱 선택 완료)$/}).click();
    assert.equal(await page.getByLabel('타로 질문 입력').inputValue(), question);

    const created = responseFor(page, 'POST', '/v2/readings');
    await page.getByRole('button', {name: '3장의 카드 만나기', exact: true}).click();
    const draft = await jsonResponse(await created, 201);
    assert.equal(draft.state, 'draft');
    assert.equal(draft.question, question);
    assert.equal(draft.slots.length, 12);
    assert.deepEqual(draft.selected_cards, []);
    assert.ok(draft.slots.every(slot => Object.keys(slot).sort().join(',') === 'id,index'));

    const shuffledResponse = responseFor(page, 'POST', `/v2/readings/${draft.id}/shuffle`);
    await page.getByRole('button', {name: '카드 다시 섞기', exact: true}).click();
    const shuffled = await jsonResponse(await shuffledResponse, 200);
    assert.equal(shuffled.version, draft.version + 1);
    assert.ok(shuffled.slots.every(slot => !draft.slots.some(old => old.id === slot.id)));
    const indexes = [8, 3, 11];
    for (const number of indexes) await page.getByRole('button', {name: number + '번째 카드', exact: true}).click();
    assert.equal(requests.filter(r => r.path.endsWith('/interpretations')).length, 0);
    const selectionResponse = responseFor(page, 'POST', `/v2/readings/${draft.id}/selection`);
    await page.getByRole('button', {name: '선택한 카드의 이야기 듣기', exact: true}).click();
    const selectedResponse = await selectionResponse;
    const selected = await jsonResponse(selectedResponse, 200);
    assert.deepEqual(selectedResponse.request().postDataJSON(), {
      expected_version: shuffled.version,
      slot_ids: indexes.map(index => shuffled.slots.find(slot => slot.index === index).id),
    });
    assert.deepEqual(selected.selected_cards.map(c => c.position), [1, 2, 3]);
    assert.deepEqual(selected.selected_cards.map(c => c.position_label), ['지금의 마음', '주변의 흐름', '다음 한 걸음']);
    assert.equal(new Set(selected.selected_cards.map(c => c.card_id)).size, 3);
    await page.getByRole('button', {name: 'AI 이용 동의 설정', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: '확인한 카드로 GPT 해석 요청', exact: true}).isDisabled(), true);

    await page.getByRole('button', {name: 'AI 이용 동의 설정', exact: true}).click();
    const aiConsent = await allowCurrentPurpose(page, 'ai_processing');
    await allowCurrentPurpose(page, 'journal_context');
    assert.equal(requests.filter(r => r.path.endsWith('/interpretations')).length, 0);
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('button', {name: '참고할 마음기록 선택 · 0개', exact: true}).click();
    await page.getByText(contextEntry.body, {exact: true}).waitFor();
    await page.getByRole('button', {name: '이 기록 선택', exact: true}).click();
    await page.getByRole('button', {name: '선택한 기록 확정', exact: true}).click();
    const admittedResponse = responseFor(page, 'POST', `/v2/readings/${draft.id}/interpretations`);
    await page.getByRole('button', {name: '확인한 카드로 GPT 해석 요청', exact: true}).click();
    const admission = await admittedResponse;
    const job = await jsonResponse(admission, 202);
    assert.deepEqual(admission.request().postDataJSON(), {
      expected_version: selected.version, consent_event_id: aiConsent.id, context_entry_ids: [contextEntry.id],
    });
    assert.match(admission.request().headers()['x-idempotency-key'], /^[\da-f-]{36}$/i);
    await page.getByRole('button', {name: '완료된 결과 보기', exact: true}).waitFor({timeout: 25000});
    const persistedResponse = await ownerRequest(`/v2/readings/${draft.id}`);
    assert.equal(persistedResponse.status, 200);
    const persisted = await persistedResponse.json();
    assert.equal(persisted.state, 'ready');
    assert.equal(persisted.version, selected.version + 1);
    assert.deepEqual(persisted.selected_cards, selected.selected_cards);
    assert.deepEqual(persisted.result.card_insights.map(c => [c.card_id, c.position]),
      selected.selected_cards.map(c => [c.card_id, c.position]));
    await page.getByRole('button', {name: '완료된 결과 보기', exact: true}).click();
    await page.getByText(persisted.result.summary, {exact: true}).first().waitFor();
    await page.getByText('지금의 나를 위한 힌트.', {exact: true}).scrollIntoViewIfNeeded();
    await settledScreenshot(page, 'reading-ai-result', page.getByText('지금의 나를 위한 힌트.', {exact: true}));

    const firstCard = persisted.selected_cards[0];
    await page.getByRole('button', {name: firstCard.card.name_ko + ' 카드 상세', exact: true}).click();
    await page.getByRole('button', {name: '카드 원본 출처', exact: true}).click();
    await page.getByText(firstCard.card.image_asset.license_name, {exact: true}).waitFor();
    await page.getByText(new RegExp(firstCard.card.image_asset.sha256)).waitFor();
    await settledScreenshot(page, 'reading-card-source', page.getByText(firstCard.card.image_asset.license_name, {exact: true}));
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('button', {name: '닫기', exact: true}).click();
    await page.getByRole('button', {name: '이 마음을 기록으로 남기기', exact: true}).click();
    await page.getByText('이 타로 리딩과 연결해 남기는 기록이에요.', {exact: true}).waitFor();
    const initial = await page.getByLabel('마음기록 내용 입력').inputValue();
    assert.ok(initial.includes(question) && initial.includes(persisted.result.summary));
    await settledScreenshot(page, 'reading-source-journal', page.getByText('이 타로 리딩과 연결해 남기는 기록이에요.', {exact: true}));
    const reflection = await saveJournal(page, context, initial + '\n' + marker + ' · 내가 확인하고 남긴 마음');
    assert.equal(reflection.source_reading_id, draft.id);
    assert.equal(reflection.source_turn_id, null);
    const journalsResponse = await ownerRequest('/v2/journal-entries?limit=50');
    assert.equal(journalsResponse.status, 200);
    const journals = await journalsResponse.json();
    const persistedReflection = journals.items.find(entry => entry.id === reflection.id);
    assert.equal(persistedReflection.body, reflection.body);
    assert.equal(persistedReflection.source_reading_id, draft.id);
    assert.equal(persistedReflection.source_turn_id, null);
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('button', {name: '이 리딩에 의견 남기기', exact: true}).click();
    await page.getByLabel('의견 이유').fill('내가 고른 카드와 기록으로 정리했어요');
    await page.getByLabel('의견 내용').fill(marker + ' · 직접 보낸 의견');
    const feedbackResponse = responseFor(page, 'POST', '/v2/feedback');
    await page.getByRole('button', {name: '의견 보내기', exact: true}).click();
    const sentFeedback = await feedbackResponse;
    await jsonResponse(sentFeedback, 201);
    assert.deepEqual(sentFeedback.request().postDataJSON(), {
      rating: 'helpful', reason: '내가 고른 카드와 기록으로 정리했어요',
      comment: marker + ' · 직접 보낸 의견', reading_id: draft.id,
    });
    await page.getByText('의견이 접수됐어요. 마음을 나눠 주셔서 고마워요.', {exact: true}).waitFor();
    await settledScreenshot(page, 'reading-feedback', page.getByText('의견이 접수됐어요. 마음을 나눠 주셔서 고마워요.', {exact: true}));
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('button', {name: '이 리딩 삭제', exact: true}).click();
    assert.equal(requests.filter(r => r.path === `/v2/readings/${draft.id}` && r.method === 'DELETE').length, 0);
    await page.getByRole('button', {name: '취소하고 남겨 두기', exact: true}).click();
    assert.equal((await ownerRequest(`/v2/readings/${draft.id}`)).status, 200);
    await page.getByRole('button', {name: '이 리딩 삭제', exact: true}).click();
    await settledScreenshot(page, 'reading-delete-confirmation', page.getByRole('button', {name: '확인하고 리딩 삭제', exact: true}));
    const deleted = responseFor(page, 'DELETE', `/v2/readings/${draft.id}`);
    await page.getByRole('button', {name: '확인하고 리딩 삭제', exact: true}).click();
    assert.equal((await deleted).status(), 204);
    await page.getByRole('button', {name: '새 마음기록 쓰기', exact: true}).waitFor();
    assert.equal((await ownerRequest(`/v2/readings/${draft.id}`)).status, 404);
    const retainedResponse = await ownerRequest('/v2/journal-entries?limit=50');
    assert.equal(retainedResponse.status, 200);
    assert.equal((await retainedResponse.json()).items.find(entry => entry.id === reflection.id).body, reflection.body);
    assert.equal(requests.filter(r => r.path.endsWith('/interpretations')).length, 1);
    assert.equal(requests.filter(r => r.path.endsWith('/retry')).length, 0);
    assert.ok(network.some(r => r.path === `/v2/ai/jobs/${job.job_id}` && r.status === 200));
    assert.deepEqual(network.filter(r => r.status >= 400), []);
    assert.deepEqual(pageErrors, []);
  });

function unzipText(buffer) {
  assert.equal(buffer.readUInt32LE(0), 0x04034b50, 'real export must be a ZIP archive');
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'ZIP central-directory footer is required');
  let offset = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    assert.ok(!name.includes('..') && !path.isAbsolute(name));
    assert.equal(buffer.readUInt32LE(local), 0x04034b50);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const compressed = buffer.subarray(start, start + size);
    assert.ok(method === 0 || method === 8, 'unsupported ZIP compression');
    const raw = method === 8 ? inflateRawSync(compressed, {maxOutputLength: 10 * 1024 * 1024}) : compressed;
    files.set(name, raw.toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

test('real exported journal ZIP and completed erase receipt survive reload without another guest',
  {timeout: 90000}, async t => {
    const {page, context, state, requests, network, pageErrors, ownerRequest} = await setup(t, 'privacy');
    const text = 'P0 개인 내보내기 확인 ' + randomUUID();
    await page.goto(base);
    await enterGuest(page);
    await page.getByRole('button', {name: /지금의 마음 남기기/}).click();
    const entry = await saveJournal(page, context, text);
    await page.getByRole('button', {name: '뒤로가기', exact: true}).click();
    await page.getByRole('tab', {name: '내 공간', exact: true}).click();
    await page.getByRole('button', {name: '내 기록과 데이터', exact: true}).click();
    const exportResponse = responseFor(page, 'POST', '/v2/me/data-requests');
    await page.getByRole('button', {name: '내 기록 내보내기 요청', exact: true}).click();
    const exportedRequest = await jsonResponse(await exportResponse, 202);
    assert.equal(exportedRequest.kind, 'export');
    await page.getByText('접수', {exact: true}).waitFor();
    assert.equal((await completedDataRequest(page, exportedRequest.id)).download_available, true);
    await page.getByRole('button', {name: '내보내기 파일 내려받기', exact: true}).waitFor();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', {name: '내보내기 파일 내려받기', exact: true}).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), `yeoun-export-${exportedRequest.id}.zip`);
    const zipPath = path.join(artifacts, 'privacy-owned-export.zip');
    await download.saveAs(zipPath);
    const files = unzipText(await readFile(zipPath));
    assert.ok(files.has('manifest.json') && files.has('data.json') && files.has('journal_entries.csv'));
    const exported = JSON.parse(files.get('data.json'));
    assert.equal(exported.journal_entries.length, 1);
    assert.equal(exported.journal_entries[0].id, entry.id);
    assert.equal(exported.journal_entries[0].body, text);
    assert.ok(files.get('journal_entries.csv').includes(text));
    const forbidden = /token_hash|access_token|receipt_hash|api_key|authorization|private_slots/;
    assert.equal(forbidden.test(files.get('data.json')), false);
    await settledScreenshot(page, 'privacy-export-ready', page.getByText('완료', {exact: true}));

    await page.evaluate(() => {
      localStorage.setItem('yeoun.draft', 'test-owned draft to erase');
      localStorage.setItem('p0-integration.unrelated', 'preserve');
    });
    await page.getByRole('button', {name: '전체 삭제 범위 확인', exact: true}).click();
    await page.getByLabel('전체 삭제 확인문').fill('wrong');
    assert.equal(await page.getByRole('button', {name: '전체 삭제 요청 보내기', exact: true}).isDisabled(), true);
    await page.getByLabel('전체 삭제 확인문').fill('내 기록 모두 삭제');
    const eraseResponse = responseFor(page, 'POST', '/v2/me/data-requests');
    await page.getByRole('button', {name: '전체 삭제 요청 보내기', exact: true}).click();
    const receipt = await jsonResponse(await eraseResponse, 202);
    assert.equal(receipt.kind, 'erase');
    state.receipt = receipt;
    await page.getByText('접수', {exact: true}).waitFor();
    assert.equal((await completedDataRequest(page, receipt.id)).download_available, false);
    await page.waitForFunction(() => localStorage.getItem('yeoun.session') === null && localStorage.getItem('yeoun.draft') === null);
    assert.equal(await page.evaluate(() => localStorage.getItem('p0-integration.unrelated')), 'preserve');
    assert.equal((await ownerRequest('/v2/me')).status, 401, 'erasure must revoke the old bearer');
    state.erased = true;
    await page.reload();
    await page.getByRole('button', {name: '게스트로 시작', exact: true}).waitFor();
    await page.getByRole('button', {name: '삭제 요청 상태 확인', exact: true}).click();
    await page.getByRole('button', {name: '처리 상태 다시 조회', exact: true}).click();
    await page.getByText('완료', {exact: true}).waitFor();
    assert.equal(requests.filter(r => r.path === '/v2/sessions').length, 1);
    await settledScreenshot(page, 'privacy-erased-receipt', page.getByText('완료', {exact: true}));
    assert.deepEqual(network.filter(r => r.status >= 400), []);
    assert.deepEqual(pageErrors, []);
  });
