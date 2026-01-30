use flate2::read::GzDecoder;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufWriter, Cursor, Write};
use tauri::{AppHandle, Manager};

// EMBED THE DATABASE INTO THE BINARY
// Note: This expects liumo_v8.db.gz to exist in resources/ when building.
// For now, we assume the file name will be updated.
const DB_GZ_BYTES: &[u8] = include_bytes!("../resources/liumo_v8.db.gz");

#[derive(Debug, Serialize, Deserialize)]
pub struct Poetry {
    pub id: String,
    pub title: String,
    pub author: String,
    pub dynasty: String,
    pub content_json: String,
    pub layout_strategy: String,
    pub tags: Vec<String>,
    pub source: String,
}

// Initialize the database (extract from binary if empty OR version mismatch)
pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }

    let db_path = app_data_dir.join("liumo_v8.db");
    let version_path = app_data_dir.join("liumo_v8.db.version");

    let current_version = app.package_info().version.to_string();
    let mut should_extract = false;

    // 1. Check if DB exists
    if !db_path.exists() {
        should_extract = true;
    }
    // 2. Check version marker
    else if version_path.exists() {
        let saved_version = std::fs::read_to_string(&version_path)?.trim().to_string();
        if saved_version != current_version {
            should_extract = true;
        }
    }
    // 3. Force update if version file missing
    else {
        should_extract = true;
    }

    if should_extract {
        // Decompress from MEMORY (embedded bytes) to DISK
        let cursor = Cursor::new(DB_GZ_BYTES);
        let mut decoder = GzDecoder::new(cursor);
        let output = File::create(&db_path)?;
        let mut writer = BufWriter::new(output);

        std::io::copy(&mut decoder, &mut writer)?;
        writer.flush()?;

        // Write version marker
        std::fs::write(&version_path, &current_version)?;
    }

    Ok(())
}

// Helper to space Chinese characters for FTS search
fn add_spaces_to_chinese(text: &str) -> String {
    let mut result = String::new();
    for c in text.chars() {
        if is_chinese_or_alphanumeric(c) {
            result.push(c);
            result.push(' ');
        }
    }
    result.trim().to_string()
}

fn is_chinese_or_alphanumeric(c: char) -> bool {
    // Basic check for Chinese, alphanumeric.
    // We want to space EVERYTHING that is significant.
    // Actually, just spacing everything that is not whitespace is safer for the "space-every-char" strategy.
    !c.is_whitespace()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterOptions {
    dynasties: Vec<String>,
    tags: Vec<String>,
}

#[tauri::command]
pub fn get_filter_options(app: AppHandle) -> Result<FilterOptions, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("liumo_v8.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // 1. Get Dynasties (Top 20 by count)
    let mut stmt = conn
        .prepare(
            "SELECT dynasty, COUNT(*) as c FROM poetry GROUP BY dynasty ORDER BY c DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?;
    let dynasties = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| e.to_string())?;

    // 2. Get Tags (Extract from JSON string is hard in pure SQL without json extension)
    // Simplified: Just return hardcoded tags for now, OR fetch all tags and aggregate in Rust.
    // Fetching all tags is expensive.
    // Let's return the standard V8 tags + top discovered ones if possible.
    // For V8 MVP, return curated tags matching DB content (Chinese & Codes).
    let tags = vec![
        "唐诗三百首".to_string(),
        "宋词三百首".to_string(),
        "K12".to_string(),
        "shi".to_string(),
        "ci".to_string(),
        "qu".to_string(),
        "wen".to_string(),
        "fu".to_string(),
    ];

    Ok(FilterOptions { dynasties, tags })
}

#[tauri::command]
pub fn search_poetry(
    app: AppHandle,
    keyword: String,
    dynasty: Option<String>,
    tag: Option<String>,
    offset: i64,
    limit: i64,
) -> Result<Vec<Poetry>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("liumo_v8.db");

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut query = String::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // --- Base Query Construction ---
    if keyword.trim().is_empty() {
        query.push_str("SELECT id, title, author, dynasty, content_json, layout_strategy, tags, source FROM poetry WHERE 1=1");
    } else {
        query.push_str("SELECT p.id, p.title, p.author, p.dynasty, p.content_json, p.layout_strategy, p.tags, p.source ");
        query.push_str("FROM poetry p ");
        query.push_str("JOIN poetry_fts f ON p.id = f.id ");
        query.push_str("WHERE poetry_fts MATCH ?");
        let spaced_keyword = add_spaces_to_chinese(&keyword);
        let fts_query = format!("\"{}\"", spaced_keyword);
        params_vec.push(Box::new(fts_query));
    }

    // --- Apply Filters ---
    if let Some(d) = &dynasty {
        if !d.is_empty() {
            if keyword.trim().is_empty() {
                query.push_str(" AND dynasty = ?");
            } else {
                query.push_str(" AND p.dynasty = ?");
            }
            params_vec.push(Box::new(d.clone()));
        }
    }

    if let Some(t) = &tag {
        if !t.is_empty() {
            let col = if keyword.trim().is_empty() {
                "tags"
            } else {
                "p.tags"
            };
            query.push_str(&format!(" AND {} LIKE ?", col));
            let tag_pattern = format!("%\"{}\"%", t.replace("\"", ""));
            params_vec.push(Box::new(tag_pattern));
        }
    }

    // --- Order & Limit ---
    if keyword.trim().is_empty() {
        query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    } else {
        query.push_str(" ORDER BY rank LIMIT ? OFFSET ?");
    }

    params_vec.push(Box::new(limit));
    params_vec.push(Box::new(offset));

    // --- Execute ---
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(params_slice.as_slice(), |row| {
            let tags_json: String = row.get(6).unwrap_or("[]".to_string());
            // Simple JSON parse or keep as vec string if we had serde_json dep, but here we can just pass raw or empty
            // Actually Poetry struct expects Vec<String>. We need to parse it.
            // We have serde_json available? Yes, in Cargo.toml presumably.
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(Poetry {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                dynasty: row.get(3)?,
                content_json: row.get(4)?,
                layout_strategy: row.get(5)?,
                tags,
                source: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }

    Ok(result)
}
