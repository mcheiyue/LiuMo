import type { StructuredContent } from './layoutEngine/types';

export function parseContentJson(jsonString: string): StructuredContent {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation
    if (!parsed || !Array.isArray(parsed.paragraphs)) {
        console.warn("Invalid content_json structure:", parsed);
        return { paragraphs: [] };
    }
    return parsed as StructuredContent;
  } catch (e) {
    console.error('Failed to parse content_json:', e);
    return { paragraphs: [] };
  }
}

export function generatePlainText(content: StructuredContent): string {
  if (!content || !content.paragraphs) return '';
  return content.paragraphs
    .map(p => p.lines.join('\n'))
    .join('\n\n');
}
