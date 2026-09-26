// Avvia server.js in un processo separato, su una porta libera e con cartelle
// temporanee per backup, Excel e allegati: i test non toccano i dati reali.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portale-test-'));
  const backupDir = path.join(dir, 'backup');
  const dataDir = path.join(dir, 'share');
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await freePort();

  const env = { ...process.env };
  delete env.PORTALE_DOMAIN_PROFILE;
  delete env.PORTALE_SHELL_SECRET;
  Object.assign(env, {
    PORTALE_PORT: String(port),
    PORTALE_BACKUP_DIR: backupDir,
    PORTALE_ROOT_DIR: dataDir,
    PORTALE_UPLOADS_DIR: dataDir,
    ...extraEnv,
  });

  // PORTALE_TEST_SERVER_EXE: prova il server impacchettato (server.exe della
  // build) invece di server.js, con gli stessi test.
  const exe = process.env.PORTALE_TEST_SERVER_EXE;
  const child = exe
    ? spawn(path.resolve(exe), [], { cwd: path.dirname(path.resolve(exe)), env, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn(process.execPath, [path.join(ROOT, 'server.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server.js terminato all'avvio:\n${output}`);
    try {
      const res = await fetch(`${base}/app-token`);
      if (res.ok) break;
    } catch {}
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`server.js non risponde:\n${output}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const { token } = await (await fetch(`${base}/app-token`)).json();

  return {
    base,
    port,
    token,
    dir,
    backupDir,
    dataDir,
    output: () => output,
    async stop() {
      if (child.exitCode === null) {
        const exited = new Promise((r) => child.once('exit', r));
        child.kill();
        await exited;
      }
      // Su Windows i file possono restare bloccati per un attimo dopo l'uscita del processo.
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    },
  };
}

module.exports = { startServer, ROOT };
