import fs from 'fs';
import path from 'path';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const outputPath = path.join(process.cwd(), 'LATEST_RELEASE_NOTE.md');

try {
  const content = fs.readFileSync(changelogPath, 'utf-8');
  
  // Regex to find the latest version section
  // Matches from "## v1.3.1" until the next "## v..." or end of file
  const match = content.match(/## v[0-9]+\.[0-9]+\.[0-9]+.*?\n([\s\S]*?)(?=\n## v|$)/);

  if (match && match[1]) {
    const notes = match[1].trim();
    fs.writeFileSync(outputPath, notes);
    console.log('✅ Extracted release notes to LATEST_RELEASE_NOTE.md');
    console.log(notes); // Print to verify
  } else {
    console.error('❌ Could not find version notes in CHANGELOG.md');
    // Fallback content
    fs.writeFileSync(outputPath, "See CHANGELOG.md for details.");
  }
} catch (e) {
  console.error('Error processing changelog:', e);
  process.exit(1);
}
