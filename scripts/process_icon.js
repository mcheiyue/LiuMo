import sharp from 'sharp';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), '../图1.png');
const OUTPUT_PATH = path.join(process.cwd(), 'app-icon.png');

async function processIcon() {
  try {
    console.log(`Rolling back to "Version A" (Mathematical Center)...`);
    
    // RESTORING THE VERSION YOU LIKED
    // Crop calculation:
    // Left/Top offset: 244 (approx 12% margin)
    // Width/Height: 1560 (approx 76% of visual area)
    
    await sharp(INPUT_PATH)
      .extract({ left: 244, top: 244, width: 1560, height: 1560 }) 
      .resize(1024, 1024)
      .toFile(OUTPUT_PATH);

    console.log(`Successfully restored ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }
}

processIcon();
