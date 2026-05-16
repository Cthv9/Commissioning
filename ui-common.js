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
