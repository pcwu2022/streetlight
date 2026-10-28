const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFile } = require('node:fs/promises');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { matchRoadGuess, computeStats } = require('../.test-build/lib/roadUtils');
const { getRoadType, ROAD_TYPE_COLORS } = require('../.test-build/lib/roadTypes');
const { loadRoadsForRegion } = require('../.test-build/lib/roads');
const { REGIONS } = require('../.test-build/lib/regions');
const { Sidebar } = require('../.test-build/components/game/Sidebar');
const { RoadPolyline } = require('../.test-build/components/game/RoadPolyline');

function road(name, id = 1) {
  return { id, name, type: getRoadType(name, 'en'), coordinates: [[-74, 40.7], [-73.99, 40.71]], lengthKm: 1 };
}

test('rejects 21 distinct matches and permits a more specific follow-up', () => {
  const roads = Array.from({ length: 21 }, (_, i) => road(`West ${i + 1} Street`, i));
  assert.equal(matchRoadGuess('West', roads, 'en').status, 'too-broad');
  assert.equal(matchRoadGuess('West 1', roads, 'en').status, 'matched');
  assert.deepEqual(matchRoadGuess('West 1', roads, 'en').matches.map(r => r.name), ['West 1 Street']);
  assert.equal(matchRoadGuess('West', roads.slice(0, 20), 'en').matches.length, 20);
  assert.equal(matchRoadGuess('West', roads.slice(0, 20), 'en').status, 'matched');
});

test('counts names rather than OSM segments, with case and width normalization', () => {
  const roads = Array.from({ length: 50 }, (_, i) => road('West Street', i));
  const guess = matchRoadGuess('  ＷＥＳＴ  ', roads, 'en');
  assert.equal(guess.status, 'matched');
  assert.equal(guess.matches.length, 1);
  assert.equal(matchRoadGuess('street', roads, 'en').status, 'reserved');
  assert.equal(matchRoadGuess('St.', roads, 'en').status, 'reserved');
  assert.equal(matchRoadGuess('highway', roads, 'en').status, 'reserved');
});

test('applies the threshold to Taiwan roads and preserves prefix matching', () => {
  const roads = Array.from({ length: 21 }, (_, i) => road(`中山${i + 1}路`, i));
  assert.equal(matchRoadGuess('中山', roads, 'tw').status, 'too-broad');
  assert.deepEqual(matchRoadGuess('中 山 1路', roads, 'tw').matches.map(r => r.name), ['中山1路']);
  assert.equal(matchRoadGuess('大道', roads, 'tw').status, 'reserved');
  assert.equal(matchRoadGuess('山1', roads, 'tw').matches.length, 0);
});

test('classifies Broadway and avoids matching road abbreviations inside words', () => {
  assert.equal(getRoadType('Broadway', 'en'), 'Broadway');
  assert.equal(getRoadType('East Broadway', 'en'), 'Broadway');
  assert.equal(getRoadType('BROADWAY', 'en'), 'Broadway');
  assert.equal(getRoadType('Broadway Terrace', 'en'), 'Terrace');
  assert.equal(getRoadType('Garden Road', 'en'), 'Road');
  assert.equal(getRoadType('West End Avenue', 'en'), 'Avenue');
  assert.equal(getRoadType('Chestnut Drive', 'en'), 'Drive');
  assert.equal(getRoadType('Highway 1', 'en'), 'Highway');
  assert.equal(getRoadType('中山路', 'tw'), '路');
});

test('statistics and sidebar include Broadway and other nonstandard names', () => {
  const roads = [road('Broadway'), road('The Bowery'), road('West Avenue')];
  const stats = computeStats(roads, new Set(roads.map(r => r.name)), [], 'en');
  assert.deepEqual(stats.byType.Broadway, { found: 1, total: 1 });
  assert.deepEqual(stats.byType.Avenue, { found: 1, total: 1 });
  assert.equal(Object.values(stats.byType).reduce((sum, r) => sum + r.total, 0), stats.total);
  const sidebar = renderToStaticMarkup(React.createElement(Sidebar, { stats, locale: 'en' }));
  assert.match(sidebar, /Broadway/);
  assert.match(sidebar, /Other/);
  const line = renderToStaticMarkup(React.createElement(RoadPolyline, {
    road: roads[0], isFound: true, isHovered: false, projectedPoints: [[0, 0], [1, 1]], onHover() {},
  }));
  assert.ok(line.includes(ROAD_TYPE_COLORS.Broadway));
});

test('loads the real NYC snapshot through the static base path, never Overpass', async t => {
  process.env.NEXT_PUBLIC_BASE_PATH = '/streetlight';
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(url);
    return new Response(await readFile('public/data/roads/new-york.json'), { status: 200 });
  });
  const region = REGIONS.find(r => r.id === 'new-york');
  const [roads, sameRoads] = await Promise.all([loadRoadsForRegion(region), loadRoadsForRegion(region)]);
  assert.equal(roads, sameRoads);
  assert.deepEqual(requests, ['/streetlight/data/roads/new-york.json']);
  const broadway = roads.filter(r => r.name === 'Broadway');
  assert.ok(broadway.length > 1);
  assert.ok(broadway.every(r => r.type === 'Broadway' && r.lengthKm > 0));
  assert.ok(roads.every(r => Number.isFinite(r.lengthKm)));
});

test('a missing static map fails without falling back to the API, and can be retried', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response('', { status: 404 });
  });
  const region = REGIONS.find(r => r.id === 'new-york');
  await assert.rejects(loadRoadsForRegion(region), /HTTP 404/);
  await assert.rejects(loadRoadsForRegion(region), /HTTP 404/);
  assert.equal(calls, 2);
});
