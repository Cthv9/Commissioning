document.getElementById('uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const progressBar = document.getElementById('progressBar');
  const submitButton = document.querySelector('button[type="submit"]');

  progressBar.style.width = '0%';
  progressBar.innerText = '0%';

  const cantiere = document.getElementById('cantiere').value;
  const nomeBarca = document.getElementById('nomeBarca').value;
  const numeroScafo = document.getElementById('numeroScafo').value;
  const matricola = document.getElementById('matricola').value;
  const tipo = document.getElementById('tipo').value;
  const operatore = document.getElementById('operatore').value;
  const files = document.getElementById('fileInput').files;

  if (!cantiere || !nomeBarca || !numeroScafo || !operatore) {
    alert('Tutti i campi obbligatori devono essere compilati!');
    return;
  }

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

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
        progressBar.innerText = `${percentComplete}%`;
      }
    });

    xhr.onload = () => {
      if (xhr.status === 200) {
        alert('File caricati con successo!');
        progressBar.style.width = '100%';
        progressBar.innerText = 'Caricamento completato!';
        submitButton.innerText = 'Reset';
        submitButton.classList.replace('btn-primary', 'btn-secondary');
        submitButton.addEventListener('click', () => {
          document.getElementById('uploadForm').reset();
          progressBar.style.width = '0%';
          progressBar.innerText = '0%';
          submitButton.innerText = 'Invia';
          submitButton.classList.replace('btn-secondary', 'btn-primary');
        }, { once: true });
      } else {
        alert('Errore nel caricamento dei file.');
      }
    };

    xhr.onerror = () => {
      alert('Errore di rete.');
    };

    xhr.send(formData);
  } catch (error) {
    console.error('Errore:', error);
    alert('Errore imprevisto.');
  }
});
