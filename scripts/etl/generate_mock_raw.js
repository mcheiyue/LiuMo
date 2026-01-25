// scripts/etl/generate_mock_raw.js
import fs from 'fs';
import path from 'path';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

// Mock Chinese Poetry (Tang) Structure
const tangData = [
  {
    "id": "1d897678-0001",
    "title": "静夜思",
    "author": "李白",
    "paragraphs": [
      "床前明月光，",
      "疑是地上霜。",
      "举头望明月，",
      "低头思故乡。"
    ],
    "tags": ["五言", "唐诗"]
  },
  {
    "id": "1d897678-0002",
    "title": "春晓",
    "author": "孟浩然",
    "paragraphs": [
      "春眠不觉晓，",
      "处处闻啼鸟。",
      "夜来风雨声，",
      "花落知多少。"
    ],
    "tags": ["五言", "唐诗"]
  }
];

// Mock Chinese Poetry (Song Ci) Structure
// Note: Ci usually uses 'rhythmic' instead of title, and paragraphs are the content
const songCiData = [
  {
    "author": "苏轼",
    "rhythmic": "水调歌头",
    "paragraphs": [
      "明月几时有？把酒问青天。",
      "不知天上宫阙，今夕是何年。",
      "我欲乘风归去，又恐琼楼玉宇，高处不胜寒。",
      "起舞弄清影，何似在人间。"
    ],
    "tags": ["宋词"]
  }
];

// Mock Chinese Poetry (Song) Structure
const songData = [
  {
    "id": "song-0001",
    "title": "晓出净慈寺送林子方",
    "author": "杨万里",
    "paragraphs": [
      "毕竟西湖六月中，",
      "风光不与四时同。",
      "接天莲叶无穷碧，",
      "映日荷花别样红。"
    ],
    "tags": ["七言", "宋诗"]
  }
];

// Write files
fs.writeFileSync(path.join(RAW_DIR, 'poet.tang.0.json'), JSON.stringify(tangData, null, 2));
fs.writeFileSync(path.join(RAW_DIR, 'poet.song.0.json'), JSON.stringify(songData, null, 2));
fs.writeFileSync(path.join(RAW_DIR, 'ci.song.0.json'), JSON.stringify(songCiData, null, 2));

console.log("✅ Generated mock raw data in data/raw/ for ETL testing.");
console.log("   - poet.tang.0.json");
console.log("   - poet.song.0.json");
console.log("   - ci.song.0.json");
