#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

// Handle al processo server per terminarlo alla chiusura (solo produzione)
struct ServerProcess(Mutex<Option<std::process::Child>>);

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
        .invoke_handler(tauri::generate_handler![select_directory])
        .setup(|app| {
            // In PRODUZIONE: avvia server.exe dalla resource directory
            // In DEV: il server è già avviato da beforeDevCommand (node server.js)
            #[cfg(not(dev))]
            {
                let appdata = std::env::var("APPDATA").unwrap_or_default();
                let backup_dir = format!("{}\\Portale Commissioning\\backup", appdata);

                match app.path().resource_dir() {
                    Ok(resource_dir) => {
                        let server_path = resource_dir.join("server.exe");
                        let mut cmd = std::process::Command::new(&server_path);
                        cmd.env("PORTALE_BACKUP_DIR", &backup_dir);
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
                            Some(serde_json::json!({ "type": "drop", "paths": paths }))
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
