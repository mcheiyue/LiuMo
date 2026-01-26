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

// Initialize the database (extract from binary if empty)
pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }
    let db_path = app_data_dir.join("liumo.db");
    
    // Check if DB exists
    if !db_path.exists() {
        println!("Database not found at {:?}. Extracting from embedded binary...", db_path);
        
        // Decompress from MEMORY (embedded bytes) to DISK
        let cursor = Cursor::new(DB_GZ_BYTES);
        let mut decoder = GzDecoder::new(cursor);
        let output = File::create(&db_path)?;
        let mut writer = BufWriter::new(output);
        
        std::io::copy(&mut decoder, &mut writer)?;
        
        // Flush ensures all data is written
        writer.flush()?;
        println!("✅ Database successfully extracted to {:?}", db_path);
    } else {
        println!("Database found at {:?}", db_path);
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
