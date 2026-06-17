import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, restrictTo } from '../middleware/auth.js';
import Product from '../models/Product.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files allowed'));
  }
});

// Upload image (admin & staff only)
router.post('/', protect, restrictTo('admin', 'staff'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ status: 'success', data: { url, filename: req.file.filename } });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// Bulk upload images
router.post('/bulk', protect, restrictTo('admin', 'staff'), upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }
    const files = req.files.map(f => ({ filename: f.filename, url: `/uploads/${f.filename}` }));
    res.status(201).json({ status: 'success', data: { count: files.length, files } });
  } catch (err) {
    res.status(500).json({ message: 'Bulk upload failed', error: err.message });
  }
});

// Assign image to product
router.patch('/assign/:productId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'imageUrl required' });
    const product = await Product.findByIdAndUpdate(req.params.productId, { image: imageUrl }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ status: 'success', data: { product } });
  } catch (err) {
    res.status(500).json({ message: 'Error assigning image', error: err.message });
  }
});

// Placeholder gradient API for frontend fallbacks
router.get('/placeholder/:category', (req, res) => {
  const gradientMap = {
    'cakes': 'from-pink-900 to-rose-950',
    'sweets': 'from-amber-900 to-yellow-950',
    'friedrice': 'from-orange-950 to-red-950',
    'noodles': 'from-amber-950 to-orange-950',
    'pizza': 'from-yellow-950 to-red-950',
    'burgers': 'from-amber-900 to-amber-950',
    'sandwiches': 'from-yellow-900 to-amber-950',
    'chats': 'from-amber-950 to-yellow-900',
    'fries': 'from-yellow-900 to-yellow-950',
    'shawarma': 'from-red-900 to-rose-950',
    'beverages': 'from-brown-900 to-yellow-950'
  };
  
  const gradient = gradientMap[req.params.category.toLowerCase()] || 'from-zinc-800 to-zinc-950';
  res.json({ status: 'success', data: { category: req.params.category, gradient } });
});

export default router;
