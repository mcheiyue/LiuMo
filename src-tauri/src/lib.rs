use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub mod font_utils;
pub mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize Database on startup
            db::init_db(app.handle()).expect("failed to init db");
            
            // Explicitly set window icon for Windows Taskbar reliability
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(tauri::image::Image::from_bytes(include_bytes!("../icons/icon.ico")).expect("failed to load icon"));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            font_utils::validate_font,
            db::search_poetry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
