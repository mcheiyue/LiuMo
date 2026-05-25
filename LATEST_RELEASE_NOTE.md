本次更新聚焦于发布流程的可复现性、数据制品的契约校验、Tauri 安全边界收紧，以及排版引擎的一致性修复。核心目标是让主仓库能够可信、可复现地消费 `LiuMo-assets` 的 Release 制品。

### 🏗️ 基础设施 (Infrastructure)
- **资产锁定机制**: 新增 `assets.lock.json`，锁定 `LiuMo-assets` 仓库的 release tag、文件名、体积和 SHA256 哈希，彻底消除构建隐式追随 latest 的风险。
- **资产下载与校验**: 新增 `fetch-assets.mjs` 脚本，按锁文件从 GitHub Release 下载指定资源，校验 size/sha256/gzip 完整性；支持已下载缓存复用。
- **数据契约验证**: 新增 `verify_data.mjs` 替换旧 `verify_data.js`，使用 Python `sqlite3` 标准库校验 `PRAGMA integrity_check`、V8 必需列、样本 JSON 可解析、FTS smoke 查询。
- **发布流程锁定**: `release.yml` 改为按 `assets.lock.json` 下载资源并校验，不再隐式吃 latest；构建前新增 Lite/Full 数据库验证步骤；Release 上传包含 `assets.lock.json`。

### 🔒 安全加固 (Security)
- **CSP 策略收紧**: `tauri.conf.json` 的 `csp: null` 改为最小 CSP 字符串，保留 `worker-src 'self' blob:`、`font-src 'self' data:`、`connect-src ipc:`，禁用 `object-src`、`base-uri`。

### 🐛 关键修复 (Critical Fixes)
- **V8 数据查询兼容**: 新增 `table_has_column()` 运行时探测 `created_at` 列是否存在，空关键词排序改为"有则用、无则退回 `ORDER BY id DESC`"，避免硬依赖不确定字段导致运行时失败。
- **排版策略优先级**: `calculate()` 新增 `preferredStrategy` 参数，优先使用数据库返回的 `layout_strategy`，不再只靠启发式猜测。
- **虚拟滚动修复**: 删除竖排场景不成立的 y 单调二分和 `break` 优化，改为安全的 `filter(y >= startY && y <= endY)`。
- **类型收窄**: `LayoutConfig.gridType` 和 `WorkerPayload.gridType` 从 `string` 收窄为 `GridType`。

### 📦 版本一致性 (Version Alignment)
- **版本号统一**: `Cargo.toml` 从 1.7.0 升至 1.7.2，`package-lock.json` 从 1.7.1 升至 1.7.2，四份版本文件（`package.json`/`package-lock.json`/`tauri.conf.json`/`Cargo.toml`）现在完全同步。
- **资源追踪**: `build.rs` 新增 `cargo:rerun-if-changed=resources/liumo_v8.db.gz`，资源变更自动触发重编译。

### 📝 文档与脚本 (Docs & Scripts)
- **README 更新**: 安装和打包步骤新增 `assets:fetch` + `assets:verify`，说明资产锁文件机制。
- **下载脚本修正**: `download-release.ps1` 和 `download_release.sh` 的产物名从 `*portable.exe` 修正为 `LiuMo_*_${tag}_x64.exe`。
- **发布前检查**: `pre-release-check.ps1` 新增资产准备与校验步骤。
