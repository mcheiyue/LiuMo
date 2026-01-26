import fs from 'fs';
import path from 'path';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const outputPath = path.join(process.cwd(), 'LATEST_RELEASE_NOTE.md');

try {
  const content = fs.readFileSync(changelogPath, 'utf-8');
  
  // Robust Regex for CRLF/LF handling
  // 1. Matches header line: ## v1.2.3... (Capture Group 1 is full header content without ##)
  // 2. Matches newline (CRLF or LF)
  // 3. Captures content ([\s\S]*?) (Capture Group 2)
  // 4. Lookahead for next version header or EOF
  const match = content.match(/## (v[0-9]+\.[0-9]+\.[0-9]+.*?)(?:\r?\n|\r)([\s\S]*?)(?=(?:\r?\n|\r)## v|$)/);

  if (match && match[2]) {
    const title = match[1].trim();
    const notes = match[2].trim();
    
    fs.writeFileSync(outputPath, notes);
    
    // Output title for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `RELEASE_TITLE=${title}\n`);
    }
    
    console.log(`✅ Extracted release notes for: ${title}`);
    console.log('✅ Wrote content to LATEST_RELEASE_NOTE.md');
  } else {
    console.error('❌ Could not find version notes in CHANGELOG.md');
    // Debug info
    console.log('Content preview:', content.substring(0, 200));
    fs.writeFileSync(outputPath, "See CHANGELOG.md for details.");
  }
} catch (e) {
  console.error('Error processing changelog:', e);
  process.exit(1);
}
