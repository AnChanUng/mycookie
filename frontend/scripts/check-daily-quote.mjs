import assert from 'node:assert/strict';
import { QUOTES, quoteForDay } from '../src/data/quotes.js';

// 오늘의 명언은 한국 시간 기준으로 하루에 한 번만 바뀐다
const at = iso => Date.parse(iso);

// 같은 날에는 언제 보아도 같은 문장
assert.equal(quoteForDay(at('2026-11-22T15:00:00Z')), quoteForDay(at('2026-11-23T14:59:59Z')), '한국 시간 하루 안에서는 같다');
assert.equal(quoteForDay(at('2026-11-22T20:00:00Z')), quoteForDay(at('2026-11-23T10:00:00Z')));

// 한국 시간 자정(UTC 15시)을 지나면 다음 문장으로 바뀐다
assert.notEqual(quoteForDay(at('2026-11-22T14:59:59Z')), quoteForDay(at('2026-11-22T15:00:00Z')), '자정에 바뀐다');
assert.equal(QUOTES.indexOf(quoteForDay(at('2026-11-22T15:00:00Z'))), (QUOTES.indexOf(quoteForDay(at('2026-11-22T14:59:59Z'))) + 1) % QUOTES.length, '하루에 한 문장씩 넘어간다');

// 목록을 한 바퀴 돌면 처음으로 돌아온다
const day = 24 * 60 * 60 * 1000;
const start = at('2026-11-22T15:00:00Z');
assert.equal(quoteForDay(start), quoteForDay(start + QUOTES.length * day));
const seen = new Set(Array.from({ length: QUOTES.length }, (_, i) => quoteForDay(start + i * day).text));
assert.equal(seen.size, new Set(QUOTES.map(q => q.text)).size, '한 바퀴 동안 모든 문장이 한 번씩 나온다');

console.log('Daily quote passed: same all day, changes at Korean midnight, wraps after a full cycle.');
