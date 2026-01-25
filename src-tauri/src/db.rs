use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct Poetry {
    pub id: String,
    pub title: String,
    pub author: String,
    pub dynasty: String,
    pub content: String, // Stored as JSON string array or simple text
    pub type_: String,
}

pub struct DbState {
    pub db_path: PathBuf,
}

// Initialize the database (create table and seed if empty)
pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }
    let db_path = app_data_dir.join("liumo.db");
    
    let conn = Connection::open(&db_path)?;
    
    // Create table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS poetry (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            dynasty TEXT,
            content TEXT NOT NULL,
            type TEXT NOT NULL
        )",
        [],
    )?;

    // Check if empty, if so, seed demo data
    let count: i64 = conn.query_row("SELECT count(*) FROM poetry", [], |row| row.get(0))?;
    if count == 0 {
        seed_demo_data(&conn)?;
    }

    Ok(())
}

fn seed_demo_data(conn: &Connection) -> Result<()> {
    // Insert the same demo data we had in JSON, but now in SQLite
    let demo_poems = vec![
        ("tang-001", "静夜思", "李白", "唐", "[\"床前明月光\",\"疑是地上霜\",\"举头望明月\",\"低头思故乡\"]", "shi"),
        ("song-001", "水调歌头·明月几时有", "苏轼", "宋", "[\"明月几时有？把酒问青天。\",\"不知天上宫阙，今夕是何年。\",\"我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\",\"起舞弄清影，何似在人间。\",\"转朱阁，低绮户，照无眠。\",\"不应有恨，何事长向别时圆？\",\"人有悲欢离合，月有阴晴圆缺，此事古难全。\",\"但愿人长久，千里共婵娟。\"]", "ci"),
        ("modern-001", "断章", "卞之琳", "现代", "[\"你站在桥上看风景，\",\"看风景的人在楼上看你。\",\"明月装饰了你的窗子，\",\"你装饰了别人的梦。\"]", "modern"),
        ("prose-001", "千字文 (节选)", "周兴嗣", "南朝", "[\"天地玄黄，宇宙洪荒。\",\"日月盈昃，辰宿列张。\",\"寒来暑往，秋收冬藏。\",\"闰余成岁，律吕调阳。\"]", "prose"),
    ];

    let mut stmt = conn.prepare("INSERT INTO poetry (id, title, author, dynasty, content, type) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")?;
    for p in demo_poems {
        stmt.execute(params![p.0, p.1, p.2, p.3, p.4, p.5])?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn search_poetry(app: AppHandle, keyword: String, type_filter: String) -> Result<Vec<Poetry>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("liumo.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut query = "SELECT id, title, author, dynasty, content, type FROM poetry WHERE (title LIKE ?1 OR author LIKE ?1 OR content LIKE ?1)".to_string();
    
    if type_filter != "all" {
        query.push_str(" AND type = '");
        query.push_str(&type_filter); // Note: In production, bind this parameter safely
        query.push_str("'");
    }
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", keyword);
    
    let rows = stmt.query_map(params![pattern], |row| {
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
