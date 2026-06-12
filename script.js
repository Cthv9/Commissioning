function dfT(key, params) {
  if (window.DF_I18N && typeof window.DF_I18N.t === 'function') {
    return window.DF_I18N.t(key, params);
  }
  return key;
}

function populateDatalist(datalistId, values) {
  const dl = document.getElementById(datalistId);
  if (!dl) return;
  const uniq = Array.from(new Set((values || []).filter(Boolean).map(v => String(v).trim()))).sort((a, b) => a.localeCompare(b));
  dl.replaceChildren(...uniq.map(v => {
    const opt = document.createElement('option');
    opt.value = v;
    return opt;
  }));
}

async function refreshOptions() {
  let cache = { cantieri: [], operatori: [] };
  try {
    cache = JSON.parse(localStorage.getItem('portale_options_cache') || '{}');
  } catch {}

  populateDatalist('cantiereList', cache.cantieri || []);
  populateDatalist('operatoreList', cache.operatori || []);

  try {
    const res = await fetch('/options');
    if (!res.ok) return;
    const data = await res.json();

    const merge = (a, b) => Array.from(new Set([...(a || []), ...(b || [])].map(s => String(s).trim()).filter(Boolean)));
    const merged = {
      cantieri: merge(cache.cantieri, data.cantieri),
      operatori: merge(cache.operatori, data.operatori),
    };

    localStorage.setItem('portale_options_cache', JSON.stringify(merged));
    populateDatalist('cantiereList', merged.cantieri);
    populateDatalist('operatoreList', merged.operatori);
  } catch {}
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
let selectedFiles = [];

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFileList() {
  const fileList = document.getElementById('fileList');
  if (!fileList) return;
  fileList.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'd-flex justify-content-between align-items-center';
    li.innerHTML = `<span class="text-truncate me-2">${escHtml(f.name)}</span>
      <button type="button" class="btn btn-outline-danger btn-sm py-0 px-1" style="font-size:0.7rem;" data-idx="${i}">✕</button>`;
    fileList.appendChild(li);
  });
}

function addFiles(files) {
  const dfFiles = files.filter(f => f.name.toLowerCase().endsWith('.df'));
  const regular = files.filter(f => !f.name.toLowerCase().endsWith('.df'));
  if (dfFiles.length) {
    dfFiles.forEach(f => dfHandleImportFile(f, {
      onSuccess() { window.location.href = 'manage.html'; },
      showError(msg) { alert(msg); },
    }));
  }
  for (const f of regular) {
    if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
      selectedFiles.push(f);
    }
  }
  renderFileList();
}

document.addEventListener('DOMContentLoaded', () => {
  refreshOptions();

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const fileList = document.getElementById('fileList');

  if (!dropZone || !fileInput) return;

  // Prevent the browser from navigating when files are dropped outside the zone
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const files = [];
    if (e.dataTransfer.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); }
      }
    }
    if (!files.length) files.push(...Array.from(e.dataTransfer.files));
    if (files.length) addFiles(files);
  });

  browseBtn.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-idx]');
    if (!btn) return;
    selectedFiles.splice(Number(btn.dataset.idx), 1);
    renderFileList();
  });

  // Allegati Outlook: il drag diretto non è supportato da WebView2/Chromium,
  // ma Ctrl+C sull'allegato + Ctrl+V qui funziona.
  document.addEventListener('paste', (e) => {
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []);
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  // Dentro l'app desktop il drop arriva dagli eventi nativi inoltrati da Rust;
  // il wiring qui ha priorità su quello generico di dfWirePageDfDrop (singleton).
  try {
    dfWireNativeDrop({
      onFiles: addFiles,
      onDragState: (active) => dropZone.classList.toggle('drag-over', !!active),
    });
  } catch (err) {
    console.error('Wiring drag&drop nativo fallito:', err);
  }

  dfWirePageDfDrop({
    onSuccess() { window.location.href = 'manage.html'; },
    showError(msg) { alert(msg); },
  });
});

// ── Submit ────────────────────────────────────────────────────────────────────
document.getElementById('uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const progressBar = document.getElementById('progressBar');
  const submitButton = document.querySelector('button[type="submit"]');

  progressBar.style.width = '0%';
  progressBar.innerText = '0%';

  const cantiere = document.getElementById('cantiere').value.trim();
  const nomeBarca = document.getElementById('nomeBarca').value.trim();
  const numeroScafo = document.getElementById('numeroScafo').value.trim();
  const matricola = document.getElementById('matricola').value.trim();
  const tipo = document.getElementById('tipo').value.trim();
  const operatore = document.getElementById('operatore').value.trim();

  if (!selectedFiles.length) {
    alert(dfT('nuovo.error.noFile'));
    return;
  }

  try {
    submitButton.disabled = true;

    const formData = new FormData();
    formData.append('cantiere', cantiere);
    formData.append('nomeBarca', nomeBarca);
    formData.append('numeroScafo', numeroScafo);
    formData.append('matricola', matricola);
    formData.append('tipo', tipo);
    formData.append('operatore', operatore);

    for (const f of selectedFiles) {
      formData.append('files[]', f);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
        progressBar.innerText = `${percentComplete}%`;
        progressBar.setAttribute('aria-valuenow', String(percentComplete));
      }
    });

    xhr.onload = () => {
      submitButton.disabled = false;

      if (xhr.status === 200) {
        let payload = null;
        try { payload = JSON.parse(xhr.responseText); } catch {}

        const norm = (payload && (payload.normalization || payload.corrections)) ? (payload.normalization || payload.corrections) : null;

        if (norm) {
          const msgs = [];
          if (norm.cantiere) msgs.push(dfT('nuovo.norm.cantiere', { from: norm.cantiere.from, to: norm.cantiere.to }));
          if (norm.operatore) msgs.push(dfT('nuovo.norm.operatore', { from: norm.operatore.from, to: norm.operatore.to }));
          if (msgs.length) alert(msgs.join('\n'));
        }

        alert(dfT('nuovo.success.upload'));
        progressBar.style.width = '100%';
        progressBar.innerText = dfT('nuovo.success.completed');
        submitButton.removeAttribute('data-i18n');
        submitButton.innerText = dfT('nuovo.reset');
        submitButton.classList.replace('btn-primary', 'btn-secondary');

        try {
          const cache = JSON.parse(localStorage.getItem('portale_options_cache') || '{}');
          const cantieri = new Set([...(cache.cantieri || []), (payload?.newRecord?.Cantiere || cantiere)].filter(Boolean));
          const operatori = new Set([...(cache.operatori || []), (payload?.newRecord?.Operatore || operatore)].filter(Boolean));
          localStorage.setItem('portale_options_cache', JSON.stringify({
            cantieri: Array.from(cantieri),
            operatori: Array.from(operatori),
          }));
          refreshOptions();
        } catch {}

        submitButton.addEventListener('click', () => {
          document.getElementById('uploadForm').reset();
          selectedFiles = [];
          renderFileList();
          progressBar.style.width = '0%';
          progressBar.innerText = '0%';
          progressBar.setAttribute('aria-valuenow', '0');
          submitButton.setAttribute('data-i18n', 'nuovo.submit');
          submitButton.innerText = dfT('nuovo.submit');
          submitButton.classList.replace('btn-secondary', 'btn-primary');
          submitButton.disabled = false;
        }, { once: true });
      } else {
        alert(dfT('nuovo.error.upload'));
      }
    };

    xhr.onerror = () => {
      submitButton.disabled = false;
      progressBar.style.width = '0%';
      progressBar.innerText = '0%';
      progressBar.setAttribute('aria-valuenow', '0');
      alert(dfT('nuovo.error.network'));
    };

    xhr.send(formData);
  } catch (error) {
    console.error('Errore:', error);
    submitButton.disabled = false;
    alert(dfT('nuovo.error.unexpected'));
  }
});
