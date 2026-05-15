function dfHideOtherModals() {
  try {
    const editEl = document.getElementById('editModal');
    if (editEl) {
      const inst = bootstrap.Modal.getInstance(editEl);
      if (inst) inst.hide();
    }
  } catch {}
}

// UI comune: modal Info + impostazioni
async function dfLoadSettings() {
  const res = await fetch('/settings');
  if (!res.ok) throw new Error('Impossibile leggere impostazioni');
  return await res.json();
}

async function dfSaveUploadsRootDir(dir) {
  const res = await fetch('/settings/uploads-root', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadsRootDir: dir })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore salvataggio impostazioni');
  }
  return await res.json();
}

function dfSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

async function dfOpenInfoModal() {
  dfHideOtherModals();
  try {
    const s = await dfLoadSettings();
    dfSetText('dfAppVersion', `v${s.version}`);
    const inp = document.getElementById('dfUploadsRootDir');
    if (inp) inp.value = s.uploadsRootDir || '';
  } catch (e) {
    console.warn('dfLoadSettings failed:', e);
    dfSetText('dfAppVersion', '—');
  }

  const modalEl = document.getElementById('dfInfoModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function dfChooseDir() {
  let dir = null;
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    alert('Selezione cartella non disponibile fuori dall\'app Tauri.');
    return;
  }
  try {
    dir = await window.__TAURI__.core.invoke('select_directory');
  } catch (e) {
    console.warn('select_directory failed:', e);
    alert('Impossibile aprire il selettore cartelle. Riprova o inserisci il percorso manualmente.');
    return;
  }
  if (!dir) return;
  const inp = document.getElementById('dfUploadsRootDir');
  if (inp) {
    inp.value = dir;
    await dfSaveDir();
  }
}

async function dfSaveDir() {
  const inp = document.getElementById('dfUploadsRootDir');
  const dir = (inp?.value || '').trim();
  if (!dir) {
    alert('Inserisci una destinazione valida.');
    return;
  }
  try {
    await dfSaveUploadsRootDir(dir);
    const modalEl = document.getElementById('dfInfoModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  } catch (e) {
    alert(e.message || 'Errore salvataggio.');
  }
}

function dfWireInfoButtons() {
  document.querySelectorAll('[data-df-info]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      dfOpenInfoModal();
    });
  });

  const chooseBtn = document.getElementById('dfChooseDirBtn');
  if (chooseBtn) {
    const hasTauri = !!(window.__TAURI__ && window.__TAURI__.core);
    if (hasTauri) {
      chooseBtn.classList.remove('d-none');
      chooseBtn.addEventListener('click', dfChooseDir);
    } else {
      chooseBtn.classList.add('d-none');
    }
  }

  const saveBtn = document.getElementById('dfSaveDirBtn');
  if (saveBtn) saveBtn.addEventListener('click', dfSaveDir);

  const reorgBtn = document.getElementById('dfReorgBtn');
  if (reorgBtn) reorgBtn.addEventListener('click', dfReorganizeFolders);
}

async function dfReorganizeFolders() {
  const btn = document.getElementById('dfReorgBtn');
  const resultEl = document.getElementById('dfReorgResult');
  if (btn) { btn.disabled = true; btn.textContent = 'Elaborazione…'; }
  if (resultEl) resultEl.classList.add('d-none');
  try {
    const res = await fetch('/admin/reorganize-folders', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore server');
    const movedIds = data.moved.map(m => `ID ${m.id}`).join(', ');
    if (resultEl) {
      resultEl.classList.remove('d-none');
      resultEl.innerHTML =
        `<span class="text-success fw-semibold">Spostate: ${data.moved.length}</span>` +
        (data.errors.length ? ` &nbsp;<span class="text-danger">Errori: ${data.errors.length}</span>` : '') +
        (movedIds ? `<br><span class="text-muted">${movedIds}</span>` : '');
    }
  } catch (e) {
    if (resultEl) {
      resultEl.classList.remove('d-none');
      resultEl.innerHTML = `<span class="text-danger">Errore: ${e.message}</span>`;
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Riorganizza cartelle legacy'; }
  }
}

document.addEventListener('DOMContentLoaded', dfWireInfoButtons);
