use serde::{Deserialize, Serialize};
use std::fs;
use ttf_parser::Face;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize)]
pub struct FontMetadata {
    pub family_name: String,
    pub file_path: String,
    pub is_valid: bool,
    pub format: String,
    pub base64_data: Option<String>,
}

#[tauri::command]
pub fn validate_font(path: String) -> Result<FontMetadata, String> {
    let data = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    // 1. Magic Bytes Check (Basic)
    let format = if data.starts_with(&[0x00, 0x01, 0x00, 0x00]) || data.starts_with(b"true") {
        "ttf"
    } else if data.starts_with(b"OTTO") {
        "otf"
    } else if data.starts_with(b"wOFF") {
        "woff"
    } else if data.starts_with(b"wOF2") {
        "woff2"
    } else {
        return Err("Unsupported font format (Unknown Magic Bytes)".into());
    };

    let base64_data = general_purpose::STANDARD.encode(&data);

    // 2. Parse Metadata (TTF/OTF only for now, WOFF/WOFF2 skipped for deep parsing)
    if format == "ttf" || format == "otf" {
        // Parse the first face (index 0)
        match Face::parse(&data, 0) {
            Ok(face) => {
                // Try to get English family name (ID 1), fallback to others if needed
                // name_id 1 = Font Family
                let mut family_name = path.split(&['/', '\\'][..]).last().unwrap_or("Unknown").to_string();
                
                for name in face.names() {
                    if name.name_id == 1 && name.is_unicode() {
                         if let Some(name_str) = name.to_string() {
                             family_name = name_str;
                             break;
                         }
                    }
                }

                // 3. Validation: Check if it supports the character "永" (U+6C38)
                // This is a classic test for Chinese calligraphy support
                let has_yong = face.glyph_index('永').is_some();

                if !has_yong {
                     return Err("Font does not support Chinese character '永'".into());
                }

                Ok(FontMetadata {
                    family_name,
                    file_path: path,
                    is_valid: true,
                    format: format.to_string(),
                    base64_data: Some(base64_data),
                })
            },
            Err(e) => Err(format!("Failed to parse font data: {}", e)),
        }
    } else {
        // For WOFF/WOFF2, we assume valid for now (MVP), or we could reject.
        // Let's accept but warn we didn't check glyphs.
        Ok(FontMetadata {
            family_name: path.split(&['/', '\\'][..]).last().unwrap_or("Unknown").to_string(),
            file_path: path,
            is_valid: true, 
            format: format.to_string(),
            base64_data: Some(base64_data),
        })
    }
}
