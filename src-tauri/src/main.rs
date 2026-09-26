#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

// Handle al processo server per terminarlo alla chiusura (solo produzione)
struct ServerProcess(Mutex<Option<std::process::Child>>);

// Segreto condiviso con il server (env PORTALE_SHELL_SECRET): autorizza solo la
// shell, non la pagina, a indicare quali file sono stati trascinati.
struct ShellSecret(String);

fn shell_secret() -> String {
    // In sviluppo il server è avviato da `tauri dev`: stesso segreto se impostato
    // nell'ambiente, altrimenti il server resta nella modalità senza segreto.
    if let Ok(s) = std::env::var("PORTALE_SHELL_SECRET") {
        if !s.is_empty() {
            return s;
        }
    }
    // RandomState usa chiavi casuali del sistema operativo: 256 bit senza crate aggiuntivi.
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};
    (0..4u64)
        .map(|i| {
            let mut h = RandomState::new().build_hasher();
            h.write_u64(i);
            format!("{:016x}", h.finish())
        })
        .collect()
}

// Registra sul server i path appena trascinati: /local-file servirà solo quelli.
fn register_dropped_paths(secret: &str, paths: &[String]) -> bool {
    use std::io::{Read, Write};
    let body = serde_json::json!({ "paths": paths }).to_string();
    let request = format!(
        "POST /internal/dropped-paths HTTP/1.1\r\nHost: 127.0.0.1:3000\r\n\
         Content-Type: application/json\r\nX-Portale-Shell: {}\r\n\
         Content-Length: {}\r\nConnection: close\r\n\r\n{}",
        secret,
        body.len(),
        body
    );
    let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:3000") else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut response = String::new();
    let _ = stream.read_to_string(&mut response);
    response.starts_with("HTTP/1.1 200")
}

#[tauri::command]
fn select_directory(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .set_can_create_directories(true)
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

fn show_error_window(app_handle: &tauri::AppHandle, message: &str) {
    let encoded = message
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    let html = format!(
        "data:text/html,<html><body style='font-family:sans-serif;display:flex;\
         align-items:center;justify-content:center;height:100vh;margin:0;\
         background:#1e1e1e;color:#f0f0f0'><div style='text-align:center'>\
         <h2 style='color:#e05252'>Errore avvio server</h2><p>{}</p>\
         <p style='font-size:12px;color:#888'>Chiudere e riavviare l\u{2019}applicazione.</p>\
         </div></body></html>",
        encoded
    );
    if let Ok(url) = html.parse() {
        let _ = tauri::WebviewWindowBuilder::new(
            app_handle,
            "error",
            tauri::WebviewUrl::External(url),
        )
        .title("Errore avvio server")
        .inner_size(480.0, 220.0)
        .build();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ServerProcess(Mutex::new(None)))
        .manage(ShellSecret(shell_secret()))
        .invoke_handler(tauri::generate_handler![select_directory])
        .setup(|app| {
            // In PRODUZIONE: avvia server.exe dalla resource directory
            // In DEV: il server è già avviato da beforeDevCommand (node server.js)
            #[cfg(not(dev))]
            {
                // Backup nei Documenti: nel pacchetto MSIX (Microsoft Store) AppData
                // viene cancellata alla disinstallazione, audit trail compreso.
                // Il server copia una tantum i backup dalla vecchia cartella AppData.
                let appdata = std::env::var("APPDATA").unwrap_or_default();
                let legacy_backup_dir = format!("{}\\Portale Commissioning\\backup", appdata);
                let backup_dir = app
                    .path()
                    .document_dir()
                    .map(|d| d.join("Portale Commissioning").join("backup").to_string_lossy().into_owned())
                    .unwrap_or_else(|_| legacy_backup_dir.clone());

                match app.path().resource_dir() {
                    Ok(resource_dir) => {
                        let server_path = resource_dir.join("server.exe");
                        let mut cmd = std::process::Command::new(&server_path);
                        cmd.env("PORTALE_BACKUP_DIR", &backup_dir);
                        cmd.env("PORTALE_LEGACY_BACKUP_DIR", &legacy_backup_dir);
                        cmd.env("PORTALE_SHELL_SECRET", &app.state::<ShellSecret>().0);
                        #[cfg(target_os = "windows")]
                        {
                            use std::os::windows::process::CommandExt;
                            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                        }
                        match cmd.spawn() {
                            Ok(child) => {
                                if let Ok(mut guard) = app.state::<ServerProcess>().0.lock() {
                                    *guard = Some(child);
                                }
                            }
                            Err(e) => {
                                eprintln!("ERRORE: impossibile avviare server.exe: {}", e);
                                // Il thread di attesa andrà in timeout e mostrerà la finestra di errore
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("ERRORE: resource dir non trovata: {}", e);
                    }
                }
            }

            // Attende che il server sia pronto su porta 3000, poi crea la finestra
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut ready = false;
                for _ in 0..30u32 {
                    if std::net::TcpStream::connect("127.0.0.1:3000").is_ok() {
                        ready = true;
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(500));
                }

                if !ready {
                    eprintln!("ERRORE: il server non ha risposto entro 15 secondi");
                    show_error_window(
                        &app_handle,
                        "Il server non ha risposto entro 15 secondi.",
                    );
                    return;
                }

                if let Ok(url) = "http://127.0.0.1:3000/index.html".parse() {
                    let result = tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        "main",
                        tauri::WebviewUrl::External(url),
                    )
                    .title("Portale Commissioning")
                    .inner_size(1280.0, 800.0)
                    .min_inner_size(900.0, 650.0)
                    .maximized(true)
                    // NOTA: la finestra deve nascere visibile e con il drag&drop nativo
                    // di Tauri attivo (default): su Windows wry non registra il drop
                    // target per finestre create nascoste (tauri#14643 / wry#1639) e
                    // drag_and_drop(false) via builder non viene propagato (tauri#13761).
                    .build();

                    match result {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("ERRORE: impossibile creare la finestra principale: {}", e);
                            show_error_window(&app_handle, "Impossibile creare la finestra principale.");
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                // Inoltra il drag&drop nativo alla pagina via eval: la pagina è servita
                // da http://127.0.0.1:3000 (origine remota per Tauri) e l'IPC JS è
                // bloccato dalle ACL, quindi gli eventi tauri://drag-* non arrivano.
                tauri::WindowEvent::DragDrop(drag_event) if window.label() == "main" => {
                    let payload = match drag_event {
                        tauri::DragDropEvent::Enter { .. } => {
                            Some(serde_json::json!({ "type": "enter" }))
                        }
                        tauri::DragDropEvent::Leave => {
                            Some(serde_json::json!({ "type": "leave" }))
                        }
                        tauri::DragDropEvent::Drop { paths, .. } => {
                            let paths: Vec<String> = paths
                                .iter()
                                .map(|p| p.to_string_lossy().into_owned())
                                .collect();
                            // Prima si registrano i path sul server, poi si avvisa la
                            // pagina: in un thread, per non bloccare la finestra.
                            let secret = window.state::<ShellSecret>().0.clone();
                            if let Some(webview) = window.get_webview_window("main") {
                                std::thread::spawn(move || {
                                    if !register_dropped_paths(&secret, &paths) {
                                        eprintln!("ERRORE: registrazione dei file trascinati non riuscita");
                                    }
                                    let payload = serde_json::json!({ "type": "drop", "paths": paths });
                                    let js = format!(
                                        "window.__dfNativeDragEvent && window.__dfNativeDragEvent({});",
                                        payload
                                    );
                                    let _ = webview.eval(&js);
                                });
                            }
                            None
                        }
                        // Over arriva di continuo durante il trascinamento: inutile
                        _ => None,
                    };
                    if let Some(payload) = payload {
                        if let Some(webview) = window.get_webview_window("main") {
                            let js = format!(
                                "window.__dfNativeDragEvent && window.__dfNativeDragEvent({});",
                                payload
                            );
                            let _ = webview.eval(&js);
                        }
                    }
                }
                // Termina server.exe quando la finestra viene distrutta (solo produzione)
                tauri::WindowEvent::Destroyed => {
                    if let Some(state) = window.app_handle().try_state::<ServerProcess>() {
                        if let Ok(mut guard) = state.0.lock() {
                            if let Some(mut child) = guard.take() {
                                let _ = child.kill();
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("errore durante l'esecuzione dell'applicazione Tauri");
}
