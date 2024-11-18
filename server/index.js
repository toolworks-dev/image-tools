import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://imagetools.toolworks.dev'
    : 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, '../build')));


app.post('/api/convert', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const options = JSON.parse(req.body.options);

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let inputBuffer = file.buffer;
    const mimeType = file.mimetype.toLowerCase();

    try {
      switch (mimeType) {
        case 'image/x-icon':
          return res.status(415).json({ error: 'ICO format is not supported' });
          break;
        case 'image/tiff':
          return res.status(415).json({ error: 'TIFF format is not supported' });
          break;
        case 'image/heic':
          return res.status(415).json({ error: 'HEIC format is not supported' });
      }

      let image = sharp(inputBuffer);

      if (options.compression) {
        const { type, value } = options.compression;
        if (type === 'percentage') {
          const quality = Math.min(100, Math.max(1, value));
          switch (options.format || file.mimetype.split('/')[1]) {
            case 'jpeg':
            case 'jpg':
              image = image.jpeg({ quality });
              break;
            case 'webp':
              image = image.webp({ quality });
              break;
            case 'png':
              image = image.png({ quality });
              break;
          }
        } else {
          const targetSize = value * 1024 * 1024;
          let quality = 100;
          let buffer;
          
          while (quality > 1) {
            buffer = await image
              .jpeg({ quality })
              .toBuffer();
            
            if (buffer.length <= targetSize) break;
            quality = Math.max(1, quality - 5);
          }
          
          image = sharp(buffer);
        }
      }
  

      if (options.width || options.height) {
        image = image.resize(options.width, options.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        });
      }

      switch (options.format) {
        case 'png':
          image = image.png();
          break;
        case 'jpg':
          image = image.jpeg({ quality: 90 });
          break;
        case 'webp':
          image = image.webp({ quality: 90 });
          break;
        default:
          return res.status(400).json({ error: 'Unsupported output format' });
      }

      const buffer = await image.toBuffer();
      res.type(`image/${options.format}`);
      res.send(buffer);

    } catch (processingError) {
      console.error('Processing error:', processingError);
      throw processingError;
    }

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Image conversion failed',
      details: error.message 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

const PORT = process.env.PORT || 3355;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});