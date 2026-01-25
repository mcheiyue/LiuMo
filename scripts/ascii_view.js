import sharp from 'sharp';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), '../图1.png');

async function asciiView() {
  try {
    const size = 32; // 32x32 grid
    const { data, info } = await sharp(INPUT_PATH)
      .resize(size, size, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`Image ASCII Preview (${size}x${size}):\n`);
    
    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
        const brightness = data[y * size + x];
        // Use characters to represent brightness
        // @ = dark, . = bright (paper)
        if (brightness > 220) row += '..'; // Very bright (Paper)
        else if (brightness > 150) row += '::'; // Medium
        else row += '##'; // Dark (Table/Background)
      }
      console.log(`${y.toString().padStart(2, '0')} ${row}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

asciiView();
