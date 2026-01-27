import opentype from 'opentype.js';

/**
 * Perform font subsetting using opentype.js
 * Creates a new font file containing only the glyphs used in the text.
 */
export function subsetFont(
  fontBuffer: ArrayBuffer,
  text: string
): ArrayBuffer {
  try {
    console.time('Font_Parse');
    const font = opentype.parse(fontBuffer);
    console.timeEnd('Font_Parse');

    // 1. Identify unique characters
    const uniqueChars = new Set<string>();
    // Always include basic ASCII for safety (space, numbers, punctuation)
    // " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split('').forEach(c => uniqueChars.add(c));
    // Or just minimal:
    uniqueChars.add(' ');
    
    for (const char of text) {
      if (!uniqueChars.has(char)) {
        uniqueChars.add(char);
      }
    }
    
    console.log(`[Subsetting] Found ${uniqueChars.size} unique characters.`);

    // 2. Extract Glyphs
    console.time('Glyph_Extraction');
    const glyphs: opentype.Glyph[] = [];
    
    // .notdef glyph is required at index 0
    const notdefGlyph = font.glyphs.get(0);
    glyphs.push(notdefGlyph);

    uniqueChars.forEach(char => {
      const glyph = font.charToGlyph(char);
      if (glyph) {
        glyphs.push(glyph);
      }
    });
    console.timeEnd('Glyph_Extraction');

    // 3. Construct New Font
    console.time('Font_Construction');
    const newFont = new opentype.Font({
      familyName: 'SubsetFont',
      styleName: 'Regular',
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphs: glyphs
    });
    console.timeEnd('Font_Construction');

    // 4. Export
    console.time('Font_Write');
    const outBuffer = newFont.toArrayBuffer();
    console.timeEnd('Font_Write');
    
    return outBuffer;

  } catch (e) {
    console.error("Font subsetting failed:", e);
    throw e;
  }
}
