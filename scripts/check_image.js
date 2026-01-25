import sharp from 'sharp';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), '../图1.png');
const OUTPUT_PATH = path.join(process.cwd(), 'app-icon.png');

async function checkImage() {
  try {
    const original = await sharp(INPUT_PATH).metadata();
    console.log('Original Image Metadata:', {
      width: original.width,
      height: original.height,
      format: original.format
    });

    const processed = await sharp(OUTPUT_PATH).metadata();
    console.log('Processed Image Metadata:', {
      width: processed.width,
      height: processed.height,
      format: processed.format
    });

  } catch (error) {
    console.error('Error checking image:', error);
  }
}

checkImage();
