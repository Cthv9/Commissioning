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
  // Cache locale per funzionare anche se l'Excel sparisce o la rete è lenta
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
  } catch {
    // offline o server non raggiungibile
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshOptions();
});

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
  const files = document.getElementById('fileInput').files;

  if (!files || files.length === 0) {
    alert('Seleziona almeno un file.');
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

    for (let i = 0; i < files.length; i++) {
      formData.append('files[]', files[i]);
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

        // Mostra eventuali normalizzazioni anti-refuso
        const norm = (payload && (payload.normalization || payload.corrections)) ? (payload.normalization || payload.corrections) : null;

        if (norm) {
          const msgs = [];
          if (norm.cantiere) {
            msgs.push(`Cantiere corretto: "${norm.cantiere.from}" → "${norm.cantiere.to}"`);
          }
          if (norm.operatore) {
            msgs.push(`Operatore corretto: "${norm.operatore.from}" → "${norm.operatore.to}"`);
          }
          if (msgs.length) alert(msgs.join('\n'));
        }

        alert('File caricati con successo!');
        progressBar.style.width = '100%';
        progressBar.innerText = 'Caricamento completato!';
        submitButton.innerText = 'Reset';
        submitButton.classList.replace('btn-primary', 'btn-secondary');

        // Aggiorna cache suggerimenti
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
          progressBar.style.width = '0%';
          progressBar.innerText = '0%';
          progressBar.setAttribute('aria-valuenow', '0');
          submitButton.innerText = 'Invia';
          submitButton.classList.replace('btn-secondary', 'btn-primary');
        }, { once: true });
      } else {
        alert('Errore nel caricamento dei file.');
      }
    };

    xhr.onerror = () => {
      submitButton.disabled = false;
      progressBar.style.width = '0%';
      progressBar.innerText = '0%';
      progressBar.setAttribute('aria-valuenow', '0');
      alert('Errore di rete.');
    };

    xhr.send(formData);
  } catch (error) {
    console.error('Errore:', error);
    submitButton.disabled = false;
    alert('Errore imprevisto.');
  }
});
