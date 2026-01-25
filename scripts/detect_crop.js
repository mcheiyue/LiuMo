import sharp from 'sharp';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), '../图1.png');

async function findBoundingBox() {
  try {
    const image = sharp(INPUT_PATH);
    const metadata = await image.metadata();
    
    // Get raw pixel data
    const { data, info } = await image
      .resize(200, 200, { fit: 'fill' }) // Resize to small square for analysis
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    // Simple brightness threshold to find the "white paper"
    // Assuming the paper is significantly brighter than the table
    const threshold = 200; // 0-255

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Simple luminance
        const brightness = (r + g + b) / 3;
        
        if (brightness > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Map back to original 2048 dimensions
    const scaleX = metadata.width / width;
    const scaleY = metadata.height / height;

    const crop = {
      left: Math.floor(minX * scaleX),
      top: Math.floor(minY * scaleY),
      width: Math.floor((maxX - minX) * scaleX),
      height: Math.floor((maxY - minY) * scaleY)
    };

    console.log('Detected Bounding Box (approx):', crop);
    
    // Add some padding (negative padding to cut into the paper slightly to avoid edges)
    const padding = 20; 
    const finalCrop = {
        left: crop.left + padding,
        top: crop.top + padding,
        width: crop.width - (padding * 2),
        height: crop.height - (padding * 2)
    };

    console.log('Suggested Final Crop:', finalCrop);

  } catch (error) {
    console.error('Error:', error);
  }
}

findBoundingBox();
