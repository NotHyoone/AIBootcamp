// User-chosen emotion (selfLabel): validation, persistence, backup, display priority and statistics.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../scripts/core.js'), D = require('../scripts/diary-core.js');
const Cards = require('../scripts/cards.js'), S = require('../scripts/statistics.js');
const { validateSnapshot } = require('../scripts/storage.js'), B = require('../scripts/backup.js');

const record = (extra = {}) => ({ id: 'one', text: '기록', recordDate: '2026-11-09', version: 1,
  createdAt: '2026-11-09T12:00:00Z', updatedAt: '2026-11-09T12:00:00Z', ...extra });
const snapshot = (extra = {}, rec = {}) => ({ schemaVersion: 1, revision: 1, text: '초안', date: '2026-11-09',
  policy: 'single', currentEntryId: null, savedText: null, sessions: [record(rec)], ...extra });

test('isSelfLabel accepts only the 10 taxonomy ids', () => {
  for (const id of C.IDS) assert.equal(D.isSelfLabel(id), true);
  for (const bad of ['', 'joy', '기쁨', 'POS_1', null, undefined, 1, {}, ['pos_1']]) assert.equal(D.isSelfLabel(bad), false, String(bad));
});

test('snapshot keeps valid selfLabel/draftLabel and treats missing as not chosen', () => {
  const v = validateSnapshot(snapshot({ draftLabel: 'neg_2' }, { selfLabel: 'pos_1' }));
  assert.equal(v.sessions[0].selfLabel, 'pos_1');
  assert.equal(v.draftLabel, 'neg_2');
  const legacy = validateSnapshot(snapshot());
  assert.equal(legacy.draftLabel, null);
  assert.equal('selfLabel' in legacy.sessions[0], false, 'no key added for unlabeled records');
  assert.equal(validateSnapshot(snapshot({ draftLabel: null }, { selfLabel: null })).sessions[0].selfLabel, undefined);
});

test('invalid selfLabel or draftLabel is rejected, never coerced', () => {
  for (const bad of ['joy', '', 3, 'neg_9']) {
    assert.throws(() => validateSnapshot(snapshot({}, { selfLabel: bad })), /형식/);
    assert.throws(() => validateSnapshot(snapshot({ draftLabel: bad })), /형식/);
  }
});

test('selfLabel never becomes model analysis on load', () => {
  const v = validateSnapshot(snapshot({}, { selfLabel: 'neg_3', analysis: { status: 'valid', probabilities: {} } }));
  assert.deepEqual(v.sessions[0].analysis, { status: 'pending' });
  assert.equal(Cards.resolve(v.sessions[0]).status, 'pending');
  assert.equal(Cards.selfLabel(v.sessions[0]), 'neg_3');
});

test('backup round-trips selfLabel and detects label changes as conflicts', () => {
  const file = B.create([record({ selfLabel: 'pos_2' }), record({ id: 'two' })]);
  const parsed = B.parse(JSON.stringify(file));
  assert.equal(parsed[0].selfLabel, 'pos_2');
  assert.equal('selfLabel' in parsed[1], false);
  assert.equal(B.merge([record({ selfLabel: 'pos_2' })], parsed.slice(0, 1)).duplicates, 1);
  assert.equal(B.merge([record({ selfLabel: 'neg_1' })], parsed.slice(0, 1)).conflicts, 1);
  assert.equal(B.merge([record()], parsed.slice(0, 1)).conflicts, 1);
});

test('cards.selfLabel ignores invalid values and missing records', () => {
  assert.equal(Cards.selfLabel(null), null);
  assert.equal(Cards.selfLabel(record()), null);
  assert.equal(Cards.selfLabel(record({ selfLabel: 'bogus' })), null);
  assert.equal(Cards.selfLabel(record({ selfLabel: 'neu_4' })), 'neu_4');
});

test('self-chosen emotions never enter the model-based catalog', () => {
  const slots = Cards.collection([record({ selfLabel: 'pos_1' })]);
  assert.ok(slots.every(s => s.records.length === 0));
});

test('monthly statistics count self labels separately from model analysis', () => {
  const recs = [record({ selfLabel: 'pos_1' }), record({ id: 'b', selfLabel: 'pos_1', recordDate: '2026-11-30' }),
    record({ id: 'c', selfLabel: 'neg_2' }), record({ id: 'd' }), record({ id: 'e', selfLabel: 'bogus' }),
    record({ id: 'f', selfLabel: 'neg_1', recordDate: '2026-10-31' })];
  const s = S.monthSummary(recs, '2026-11');
  assert.equal(s.total, 5);
  assert.equal(s.labeled, 3);
  assert.equal(s.labelCounts.pos_1, 2);
  assert.equal(s.labelCounts.neg_2, 1);
  assert.equal(s.labelCounts.neg_1, 0, 'other month excluded');
  assert.equal(s.valid, 0, 'labels are not analysis');
  assert.deepEqual(s.days.find(d => d.date === '2026-11-09').labels, ['pos_1', 'neg_2']);
  assert.deepEqual(s.days.find(d => d.date === '2026-11-30').labels, ['pos_1']);
  assert.equal(Object.keys(s.labelCounts).length, C.IDS.length);
});
