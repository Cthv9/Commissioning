/**
 * JSON.parse "sicuro": neutralizza le chiavi pericolose per prototype pollution
 * (__proto__, constructor, prototype) quando si fa il parse di input non
 * attendibile (body di richieste HTTP, pacchetti .df/zip caricati da esterni).
 */
function safeJsonParse(str) {
  return JSON.parse(str, (k, v) => (
    (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v
  ));
}

module.exports = { safeJsonParse };
