import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import https from 'node:https';

const root = process.cwd();
const lockPath = resolve(root, 'assets.lock.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { variant: 'lite' };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--variant') {
      options.variant = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--variant=')) {
      options.variant = arg.slice('--variant='.length);
    } else if (arg === '--help' || arg === '-h') {
      console.log('用法: node scripts/fetch-assets.mjs --variant lite|full');
      process.exit(0);
    } else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  return options;
}

async function readLock() {
  const raw = await readFile(lockPath, 'utf8');
  return JSON.parse(raw);
}

function releaseUrl(lock, asset) {
  return `https://github.com/${lock.asset_repository}/releases/download/${lock.data_release_tag}/${asset.file}`;
}

function download(url, destination) {
  return new Promise((resolveDownload, rejectDownload) => {
    const request = https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        response.resume();
        if (!response.headers.location) {
          rejectDownload(new Error(`重定向缺少 Location: ${url}`));
          return;
        }
        download(response.headers.location, destination).then(resolveDownload, rejectDownload);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        rejectDownload(new Error(`下载失败: HTTP ${response.statusCode} ${url}`));
        return;
      }

      const file = createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolveDownload));
      file.on('error', rejectDownload);
    });

    request.on('error', rejectDownload);
  });
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

async function assertGzip(filePath) {
  await pipeline(createReadStream(filePath), createGunzip(), async function* drain(source) {
    for await (const chunk of source) {
      void chunk;
    }
  });
}

async function isValidAsset(filePath, asset) {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.size !== asset.size) return false;
    const actualHash = await sha256(filePath);
    return actualHash === asset.sha256;
  } catch {
    return false;
  }
}

async function main() {
  const { variant } = parseArgs();
  const lock = await readLock();
  const asset = lock.assets?.[variant];
  if (!asset) {
    throw new Error(`assets.lock.json 中不存在资源变体: ${variant}`);
  }

  const targetPath = resolve(root, lock.target_path);
  const tempDir = resolve(root, 'assets_download');
  const tempPath = join(tempDir, asset.file);
  const partialPath = `${tempPath}.part`;
  const url = releaseUrl(lock, asset);

  await mkdir(tempDir, { recursive: true });
  await mkdir(dirname(targetPath), { recursive: true });

  if (await isValidAsset(tempPath, asset)) {
    console.log(`[assets] 复用已校验缓存: ${tempPath}`);
  } else {
    console.log(`[assets] 下载 ${variant}: ${url}`);
    await unlink(partialPath).catch(() => undefined);
    await download(url, partialPath);
    await rename(partialPath, tempPath);
  }

  const fileStat = await stat(tempPath);
  if (fileStat.size !== asset.size) {
    throw new Error(`资源大小不匹配: ${asset.file} 期望 ${asset.size}, 实际 ${fileStat.size}`);
  }

  const actualHash = await sha256(tempPath);
  if (actualHash !== asset.sha256) {
    throw new Error(`SHA256 不匹配: ${asset.file}\n期望 ${asset.sha256}\n实际 ${actualHash}`);
  }

  await assertGzip(tempPath);
  await copyFile(tempPath, targetPath);
  console.log(`[assets] 已写入 ${lock.target_path}`);
  console.log(`[assets] schema=${lock.schema_version} data=${lock.data_release_tag} sha256=${actualHash}`);
}

main().catch((error) => {
  console.error(`[assets] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
