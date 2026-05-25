fn main() {
    println!("cargo:rerun-if-changed=resources/liumo_v8.db.gz");
    tauri_build::build()
}
