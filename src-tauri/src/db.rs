use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use std::fs::File;
use std::io::{BufWriter, Write, Cursor};
use flate2::read::GzDecoder;

// EMBED THE DATABASE INTO THE BINARY
// Correct path: relative to this file (src/db.rs) -> ../resources/
const DB_GZ_BYTES: &[u8] = include_bytes!("../resources/liumo_full.db.gz");

#[derive(Debug, Serialize, Deserialize)]
pub struct Poetry {
    pub id: String,
    pub title: String,
    pub author: String,
    pub dynasty: String,
    pub content: String,
    pub type_: String,
}

// Initialize the database (extract from binary if empty OR version mismatch)
pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }
    
    let db_path = app_data_dir.join("liumo.db");
    let version_path = app_data_dir.join("liumo.db.version");
    
    let current_version = app.package_info().version.to_string();
    let mut should_extract = false;

    // 1. Check if DB exists
    if !db_path.exists() {
        println!("Database missing. Marking for extraction.");
        should_extract = true;
    } 
    // 2. Check version marker
    else if version_path.exists() {
        let saved_version = std::fs::read_to_string(&version_path)?.trim().to_string();
        if saved_version != current_version {
            println!("Database version mismatch (Saved: {}, Current: {}). Updating...", saved_version, current_version);
            should_extract = true;
        }
    } 
    // 3. No version file but DB exists (legacy case), force update to be safe
    else {
        println!("Database exists but no version marker. Forcing update to ensure consistency.");
        should_extract = true;
    }

    if should_extract {
        println!("Extracting embedded database to {:?}", db_path);
        
        // Decompress from MEMORY (embedded bytes) to DISK
        let cursor = Cursor::new(DB_GZ_BYTES);
        let mut decoder = GzDecoder::new(cursor);
        let output = File::create(&db_path)?;
        let mut writer = BufWriter::new(output);
        
        std::io::copy(&mut decoder, &mut writer)?;
        writer.flush()?;
        
        // Write version marker
        std::fs::write(&version_path, &current_version)?;
        
        println!("✅ Database successfully extracted and version marked as {}", current_version);
    } else {
        println!("Database is up to date (v{}).", current_version);
    }

    Ok(())
}

#[tauri::command]
pub fn search_poetry(app: AppHandle, keyword: String, type_filter: String, offset: i64, limit: i64) -> Result<Vec<Poetry>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("liumo.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut query = "SELECT id, title, author, dynasty, content, type FROM poetry WHERE (title LIKE ?1 OR author LIKE ?1 OR content LIKE ?1)".to_string();
    
    if type_filter != "all" {
        query.push_str(" AND type = '");
        let safe_type = type_filter.replace("'", ""); 
        query.push_str(&safe_type);
        query.push_str("'");
    }
    
    query.push_str(" LIMIT ?2 OFFSET ?3");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", keyword);
    let safe_limit = if limit > 100 { 100 } else { limit };

    let rows = stmt.query_map(params![pattern, safe_limit, offset], |row| {
        Ok(Poetry {
            id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            dynasty: row.get(3)?,
            content: row.get(4)?,
            type_: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }

    Ok(result)
}
