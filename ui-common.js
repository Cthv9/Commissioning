function dfT(key, params) {
  if (window.DF_I18N && typeof window.DF_I18N.t === 'function') {
    return window.DF_I18N.t(key, params);
  }
  return key;
}

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
  if (!res.ok) throw new Error(dfT('error.settings.load'));
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
    throw new Error(err.error || dfT('error.settings.save'));
  }
  return await res.json();
}

function dfSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function dfInjectLangSwitcher() {
  const modalEl = document.getElementById('dfInfoModal');
  if (!modalEl) return;
  const body = modalEl.querySelector('.modal-body');
  if (!body) return;
  if (body.querySelector('#dfLangSwitcher')) {
    dfUpdateLangSwitcherActive();
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'dfLangSwitcher';
  wrap.className = 'mb-3 pb-3 border-bottom';
  wrap.innerHTML = `
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <span class="small text-muted" data-i18n="info.lang.label">Lingua / Language</span>
      <div class="btn-group btn-group-sm ms-auto" role="group" aria-label="Language selector">
        <button type="button" class="btn" data-df-lang="it">ITA</button>
        <button type="button" class="btn" data-df-lang="en">EN</button>
      </div>
    </div>
  `;
  body.insertBefore(wrap, body.firstChild);

  wrap.querySelectorAll('[data-df-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-df-lang');
      if (window.DF_I18N) window.DF_I18N.setLang(lang);
      dfUpdateLangSwitcherActive();
    });
  });

  dfUpdateLangSwitcherActive();
}

function dfUpdateLangSwitcherActive() {
  const cur = (window.DF_I18N && window.DF_I18N.getLang) ? window.DF_I18N.getLang() : 'it';
  document.querySelectorAll('#dfLangSwitcher [data-df-lang]').forEach(btn => {
    const active = btn.getAttribute('data-df-lang') === cur;
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-outline-primary', !active);
  });
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

  dfInjectLangSwitcher();

  const modalEl = document.getElementById('dfInfoModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function dfChooseDir() {
  let dir = null;
  if (!window.__TAURI__ || !window.__TAURI__.core) {
    alert(dfT('error.folder.tauriOnly'));
    return;
  }
  try {
    dir = await window.__TAURI__.core.invoke('select_directory');
  } catch (e) {
    console.warn('select_directory failed:', e);
    alert(dfT('error.folder.openPicker'));
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
    alert(dfT('error.dest.invalid'));
    return;
  }
  try {
    await dfSaveUploadsRootDir(dir);
    const modalEl = document.getElementById('dfInfoModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  } catch (e) {
    alert(e.message || dfT('error.settings.saveGeneric'));
  }
}

function dfInjectConfirmModal() {
  if (document.getElementById('dfConfirmModal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal fade" id="dfConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 2050;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="dfConfirmTitle"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" data-i18n-attr="aria-label:common.close" aria-label="Chiudi"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex gap-3 align-items-start">
              <div style="font-size: 2rem; line-height: 1;">⚠️</div>
              <div id="dfConfirmMessage" class="flex-grow-1"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="dfConfirmNoBtn" data-bs-dismiss="modal" data-i18n="common.no">No</button>
            <button type="button" class="btn btn-danger" id="dfConfirmYesBtn" data-i18n="common.yes">Sì</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap.firstElementChild);

  if (window.DF_I18N) window.DF_I18N.applyTranslations(document.getElementById('dfConfirmModal'));
}

function dfConfirm(opts) {
  const {
    titleKey = 'delete.title',
    messageKey = 'delete.message',
    params = {},
    danger = true,
  } = opts || {};

  dfInjectConfirmModal();

  const modalEl = document.getElementById('dfConfirmModal');
  const titleEl = document.getElementById('dfConfirmTitle');
  const msgEl = document.getElementById('dfConfirmMessage');
  const yesBtn = document.getElementById('dfConfirmYesBtn');
  const noBtn = document.getElementById('dfConfirmNoBtn');

  titleEl.textContent = dfT(titleKey, params);
  msgEl.innerHTML = dfT(messageKey, params);

  yesBtn.classList.toggle('btn-danger', !!danger);
  yesBtn.classList.toggle('btn-primary', !danger);

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise(resolve => {
    let settled = false;
    const onYes = () => { if (settled) return; settled = true; cleanup(); modal.hide(); resolve(true); };
    const onHidden = () => { if (settled) return; settled = true; cleanup(); resolve(false); };
    function cleanup() {
      yesBtn.removeEventListener('click', onYes);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    }
    yesBtn.addEventListener('click', onYes);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
  });
}

window.dfConfirm = dfConfirm;

// ── Import .df shared logic ───────────────────────────────────────────────────
let _dfImportTempFile = null;
let _dfImportConfirmed = false;
let _dfImportModalInstance = null;
let _dfImportOnSuccess = null;
let _dfImportShowError = null;

function dfInjectImportModal() {
  if (document.getElementById('importPreviewModal')) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal fade" id="importPreviewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-i18n="manage.importPreview.title">Anteprima importazione .df</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Chiudi"></button>
          </div>
          <div class="modal-body">
            <div id="importPreviewNorm" class="alert alert-warning d-none mb-3"></div>
            <form id="importPreviewForm">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label" data-i18n="edit.label.cantiere">Cantiere</label>
                  <input id="previewCantiere" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label" data-i18n="edit.label.nomeBarca">Nome barca</label>
                  <input id="previewNomeBarca" class="form-control">
                </div>
                <div class="col-md-3">
                  <label class="form-label" data-i18n="edit.label.numeroScafo">Numero scafo</label>
                  <input id="previewNumeroScafo" class="form-control">
                </div>
                <div class="col-md-3">
                  <label class="form-label" data-i18n="edit.label.matricola">Matricola</label>
                  <input id="previewMatricola" class="form-control">
                </div>
                <div class="col-md-4">
                  <label class="form-label" data-i18n="edit.label.tipo">Tipo</label>
                  <select id="previewTipo" class="form-select">
                    <option value="Avviamento">Avviamento</option>
                    <option value="Commissioning">Commissioning</option>
                  </select>
                </div>
                <div class="col-md-8">
                  <label class="form-label" data-i18n="edit.label.operatore">Operatore</label>
                  <input id="previewOperatore" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label" data-i18n="edit.label.dataInserimento">Data inserimento</label>
                  <input id="previewData" class="form-control">
                </div>
                <div class="col-12">
                  <p id="importPreviewFilesCount" class="text-muted small mb-0"></p>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-i18n="common.cancel">Annulla</button>
            <button type="button" class="btn btn-primary" id="confirmImportBtn" data-i18n="manage.importPreview.confirm">📥 Importa</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);

  if (window.DF_I18N) window.DF_I18N.applyTranslations(document.getElementById('importPreviewModal'));

  const modalEl = document.getElementById('importPreviewModal');
  _dfImportModalInstance = new bootstrap.Modal(modalEl);

  modalEl.addEventListener('hidden.bs.modal', () => {
    if (!_dfImportConfirmed && _dfImportTempFile) {
      fetch('/cancel-df-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempFile: _dfImportTempFile }),
      }).catch(() => {});
      _dfImportTempFile = null;
    }
  });

  document.getElementById('confirmImportBtn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('confirmImportBtn');
    confirmBtn.disabled = true;

    const confirmedData = {
      Cantiere: document.getElementById('previewCantiere').value,
      'Nome Barca': document.getElementById('previewNomeBarca').value,
      'Numero Scafo': document.getElementById('previewNumeroScafo').value,
      Matricola: document.getElementById('previewMatricola').value,
      Tipo: document.getElementById('previewTipo').value,
      Operatore: document.getElementById('previewOperatore').value,
      'Data e Ora Inserimento': document.getElementById('previewData').value,
    };

    const formData = new FormData();
    formData.append('tempFile', _dfImportTempFile);
    formData.append('confirmedData', JSON.stringify(confirmedData));

    try {
      const res = await fetch('/import-df', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || dfT('manage.import.error'));
      _dfImportConfirmed = true;
      _dfImportModalInstance.hide();
      if (_dfImportOnSuccess) _dfImportOnSuccess(data);
    } catch (err) {
      if (_dfImportShowError) _dfImportShowError(dfT('manage.import.errorPrefix') + err.message);
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

async function dfHandleImportFile(file, { onSuccess, showError } = {}) {
  if (!file) return;
  dfInjectImportModal();

  _dfImportOnSuccess = onSuccess || null;
  _dfImportShowError = showError || null;
  _dfImportConfirmed = false;

  const importBtn = document.getElementById('importDfBtn');
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.removeAttribute('data-i18n');
    importBtn.textContent = dfT('manage.importDf.loading');
  }

  const formData = new FormData();
  formData.append('dfFile', file);

  try {
    const res = await fetch('/preview-df', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || dfT('manage.import.error'));

    _dfImportTempFile = data.tempFile;

    document.getElementById('previewCantiere').value = data.recordData.Cantiere || '';
    document.getElementById('previewNomeBarca').value = data.recordData['Nome Barca'] || '';
    document.getElementById('previewNumeroScafo').value = data.recordData['Numero Scafo'] || '';
    document.getElementById('previewMatricola').value = data.recordData.Matricola || '';
    document.getElementById('previewOperatore').value = data.recordData.Operatore || '';
    document.getElementById('previewData').value = data.recordData['Data e Ora Inserimento'] || '';

    const previewTipo = document.getElementById('previewTipo');
    previewTipo.value = data.recordData.Tipo || '';
    if (!previewTipo.value) previewTipo.selectedIndex = 0;

    const normDiv = document.getElementById('importPreviewNorm');
    const normNotes = [];
    if (data.normalization) {
      for (const [, v] of Object.entries(data.normalization)) {
        if (v) normNotes.push(`"${String(v.from).replace(/</g,'&lt;')}" → "${String(v.to).replace(/</g,'&lt;')}"`);
      }
    }
    if (normNotes.length) {
      normDiv.innerHTML = '⚠️ ' + dfT('manage.importPreview.normalizationWarning') + '<br><small>' + normNotes.join(' | ') + '</small>';
      normDiv.classList.remove('d-none');
    } else {
      normDiv.classList.add('d-none');
    }

    document.getElementById('importPreviewFilesCount').textContent =
      data.filesCount > 0 ? dfT('manage.import.filesNote', { n: data.filesCount }) : '';

    _dfImportModalInstance.show();
  } catch (err) {
    if (showError) showError(dfT('manage.import.errorPrefix') + err.message);
  } finally {
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.setAttribute('data-i18n', 'manage.importDf.label');
      importBtn.textContent = dfT('manage.importDf.label');
    }
  }
}

// Drag & drop nativo nell'app desktop: dentro la webview gli eventi HTML5 non
// arrivano (il drop target nativo di wry intercetta i drop). Il lato Rust
// inoltra gli eventi alla pagina via eval chiamando window.__dfNativeDragEvent
// (l'IPC Tauri è bloccato per le pagine servite da http://127.0.0.1:3000);
// i byte dei file si recuperano dal server locale con /local-file.
// Nel browser (slave/LAN) il hook esiste ma non viene mai invocato.
function dfWireNativeDrop({ onFiles, onDragState } = {}) {
  if (window.__dfNativeDropWired) return true;
  window.__dfNativeDropWired = true;

  const setDragState = (active) => {
    try { if (onDragState) onDragState(active); } catch {}
  };

  window.__dfNativeDragEvent = async (ev) => {
    try {
      const type = ev && ev.type;
      if (type === 'enter') { setDragState(true); return; }
      if (type === 'leave') { setDragState(false); return; }
      if (type !== 'drop') return;
      setDragState(false);

      const files = [];
      for (const path of (ev.paths || [])) {
        try {
          const res = await fetch('/local-file?path=' + encodeURIComponent(path));
          if (!res.ok) { console.error('Lettura file droppato fallita:', path, res.status); continue; }
          const blob = await res.blob();
          const name = String(path).split(/[\\/]/).pop() || 'file';
          files.push(new File([blob], name));
        } catch (err) {
          console.error('Lettura file droppato fallita:', path, err);
        }
      }
      if (files.length && onFiles) onFiles(files);
    } catch (err) {
      console.error('Errore drag&drop nativo:', err);
    }
  };
  return true;
}

function dfWirePageDfDrop({ onSuccess, showError } = {}) {
  if (document.getElementById('dfDropOverlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #dfDropOverlay { position:fixed; inset:0; background:rgba(13,110,253,.07);
      border:4px dashed #0d6efd; z-index:9999; display:none;
      align-items:center; justify-content:center; }
    #dfDropOverlay.active { display:flex; }
    #dfDropOverlay .df-drop-inner { background:#fff; border-radius:12px;
      padding:32px 48px; box-shadow:0 8px 32px rgba(0,0,0,.15);
      font-size:1.4rem; color:#0d6efd; font-weight:600; text-align:center;
      pointer-events:none; }`;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'dfDropOverlay';
  overlay.innerHTML = '<div class="df-drop-inner">📥 Rilascia il file .df per importarlo</div>';
  document.body.appendChild(overlay);

  let dragCounter = 0;
  document.addEventListener('dragenter', (e) => {
    if (!(e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files'))) return;
    e.preventDefault();
    dragCounter++;
    overlay.classList.add('active');
  });
  document.addEventListener('dragleave', () => {
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) overlay.classList.remove('active');
  });
  document.addEventListener('dragover', (e) => {
    if (!(e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files'))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.remove('active');
    const files = [];
    if (e.dataTransfer.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); }
      }
    }
    if (!files.length) files.push(...Array.from(e.dataTransfer.files));
    const dfFile = files.find(f => f.name.toLowerCase().endsWith('.df'));
    if (dfFile) dfHandleImportFile(dfFile, { onSuccess, showError });
  });

  dfWireNativeDrop({
    onDragState(active) { overlay.classList.toggle('active', !!active); },
    onFiles(files) {
      const dfFile = files.find(f => f.name.toLowerCase().endsWith('.df'));
      if (dfFile) dfHandleImportFile(dfFile, { onSuccess, showError });
    },
  });
}

window.dfHandleImportFile = dfHandleImportFile;
window.dfWirePageDfDrop = dfWirePageDfDrop;
window.dfWireNativeDrop = dfWireNativeDrop;

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

  dfInjectConfirmModal();
}

document.addEventListener('DOMContentLoaded', dfWireInfoButtons);
window.addEventListener('df:langchange', dfUpdateLangSwitcherActive);
