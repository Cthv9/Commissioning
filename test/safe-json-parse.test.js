const test = require('node:test');
const assert = require('node:assert');
const { safeJsonParse } = require('../safe-json');

test('safeJsonParse neutralizza __proto__ e non inquina Object.prototype', () => {
  const payload = '{"__proto__":{"polluted":true}}';
  const result = safeJsonParse(payload);

  assert.strictEqual(({}).polluted, undefined);
  assert.strictEqual(Object.prototype.polluted, undefined);
  // La chiave __proto__ non deve comparire come proprietà propria del risultato.
  assert.strictEqual(Object.prototype.hasOwnProperty.call(result, 'polluted'), false);
});

test('safeJsonParse neutralizza anche "constructor" e "prototype"', () => {
  const payload = '{"constructor":{"prototype":{"polluted2":true}}}';
  const result = safeJsonParse(payload);

  assert.strictEqual(({}).polluted2, undefined);
  // La chiave "constructor" non deve essere impostata come proprietà propria
  // (il reviver la neutralizza); l'oggetto continua a ereditare il normale
  // Object.prototype.constructor, che è innocuo.
  assert.strictEqual(Object.prototype.hasOwnProperty.call(result, 'constructor'), false);
});

test('safeJsonParse continua a fare il parse corretto di JSON normale', () => {
  const result = safeJsonParse('{"a":1,"b":"due","c":[1,2,3]}');
  assert.deepStrictEqual(result, { a: 1, b: 'due', c: [1, 2, 3] });
});
