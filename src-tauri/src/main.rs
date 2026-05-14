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

                let server_path = app
                    .path()
                    .resource_dir()
                    .expect("resource dir non trovata")
                    .join("server.exe");

                let mut cmd = std::process::Command::new(&server_path);
                cmd.env("PORTALE_BACKUP_DIR", &backup_dir);
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }
                let child = cmd.spawn().expect("Impossibile avviare server.exe");

                *app.state::<ServerProcess>().0.lock().unwrap() = Some(child);
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
                    let error_html = "data:text/html,<html><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1e1e1e;color:#f0f0f0'><div style='text-align:center'><h2 style='color:#e05252'>Errore avvio server</h2><p>Il server non ha risposto entro 15 secondi.<br>Chiudi l\'applicazione e riprova.</p></div></body></html>";
                    tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        "error",
                        tauri::WebviewUrl::External(
                            error_html
                                .parse()
                                .expect("URL di errore non valido"),
                        ),
                    )
                    .title("Errore avvio server")
                    .inner_size(480.0, 200.0)
                    .build()
                    .expect("Impossibile creare la finestra di errore")
                    .show()
                    .expect("Impossibile mostrare la finestra di errore");
                    return;
                }

                tauri::WebviewWindowBuilder::new(
                    &app_handle,
                    "main",
                    tauri::WebviewUrl::External(
                        "http://127.0.0.1:3000/index.html"
                            .parse()
                            .expect("URL non valido"),
                    ),
                )
                .title("Portale Commissioning")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 650.0)
                .visible(false)
                .build()
                .expect("Impossibile creare la finestra principale")
                .show()
                .expect("Impossibile mostrare la finestra");
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Termina server.exe quando la finestra viene distrutta (solo produzione)
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<ServerProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("errore durante l'esecuzione dell'applicazione Tauri");
}
