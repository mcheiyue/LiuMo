import sharp from 'sharp';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), '../图1.png');
const OUTPUT_PATH = path.join(process.cwd(), 'app-icon.png');

async function processRoundedIcon() {
  try {
    console.log(`Creating Rounded Icon from ${INPUT_PATH}...`);
    
    // 1. Extract the center square (same as before)
    const size = 1024;
    const crop = await sharp(INPUT_PATH)
      .extract({ left: 244, top: 244, width: 1560, height: 1560 })
      .resize(size, size)
      .toBuffer();

    // 2. Create a Rounded Rectangle Mask (SVG)
    // Radius of 180px for a 1024px icon gives a nice "squircle" look similar to iOS/macOS
    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="180" ry="180"/></svg>`
    );

    // 3. Apply the mask
    await sharp(crop)
      .composite([{
        input: roundedCorners,
        blend: 'dest-in' // Keeps image content ONLY where the mask exists
      }])
      .toFile(OUTPUT_PATH);

    console.log(`Successfully created rounded icon at ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }
}

processRoundedIcon();
