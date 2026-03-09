#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

struct SidecarHandle(Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>);

#[tauri::command]
fn select_directory(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .set_can_create_directories(true)
        .blocking_pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarHandle(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![select_directory])
        .setup(|app| {
            // Percorso backup identico a Electron: %APPDATA%\Portale Commissioning\backup
            // (Electron usa productName come nome della cartella userData)
            let backup_dir = {
                let appdata = std::env::var("APPDATA").unwrap_or_default();
                format!("{}\\Portale Commissioning\\backup", appdata)
            };

            // Avvia server.exe come sidecar con PORTALE_BACKUP_DIR
            let (_, child) = app
                .shell()
                .sidecar("server")
                .expect("sidecar 'server' non trovato nei bundle resources")
                .env("PORTALE_BACKUP_DIR", &backup_dir)
                .spawn()
                .expect("Impossibile avviare il processo server");

            *app.state::<SidecarHandle>().0.lock().unwrap() = Some(child);

            // Attende che il server sia pronto, poi crea la finestra
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                // Poll TCP port 3000: 30 tentativi x 500ms = 15s timeout massimo
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
            // Termina il sidecar quando la finestra viene chiusa
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<SidecarHandle>() {
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
