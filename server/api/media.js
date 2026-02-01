import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
await fs.mkdir(UPLOADS_DIR, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize by year/month
    const date = new Date();
    const subdir = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const fullPath = path.join(UPLOADS_DIR, subdir);
    
    fs.mkdir(fullPath, { recursive: true })
      .then(() => cb(null, fullPath))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const router = Router();

// List all media
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type } = req.query;
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;

    const pageNum = Math.max(1, Number.parseInt(String(pageRaw ?? '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, Number.parseInt(String(limitRaw ?? '50'), 10) || 50));
    const offsetNum = (pageNum - 1) * limitNum;

    console.log('[WebWolf:media]', {
      type,
      page: pageNum,
      limit: limitNum,
      offset: offsetNum
    });
    
    let sql = 'SELECT * FROM media';
    const params = [];
    
    if (type === 'image') {
      sql += ' WHERE mime_type LIKE ?';
      params.push('image/%');
    } else if (type === 'document') {
      sql += ' WHERE mime_type NOT LIKE ?';
      params.push('image/%');
    }
    
    // Some MySQL/MariaDB configs do not accept prepared statement placeholders for LIMIT/OFFSET.
    // These values are sanitized integers, so inlining is safe here.
    sql += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const media = await query(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM media';
    const countParams = [];
    
    if (type === 'image') {
      countSql += ' WHERE mime_type LIKE ?';
      countParams.push('image/%');
    } else if (type === 'document') {
      countSql += ' WHERE mime_type NOT LIKE ?';
      countParams.push('image/%');
    }
    
    const [{ total }] = await query(countSql, countParams);
    
    res.json({
      media,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('List media error:', err);
    res.status(500).json({ error: 'Failed to list media' });
  }
});

// Get single media item
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const media = await query('SELECT * FROM media WHERE id = ?', [req.params.id]);
    
    if (!media[0]) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    res.json(media[0]);
  } catch (err) {
    console.error('Get media error:', err);
    res.status(500).json({ error: 'Failed to get media' });
  }
});

// Upload media
router.post('/upload', requireAuth, requireEditor, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { alt_text, title } = req.body;
    const relativePath = req.file.path.replace(UPLOADS_DIR, '').replace(/\\/g, '/');
    
    const result = await query(`
      INSERT INTO media (filename, original_name, mime_type, size, path, alt_text, title, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      relativePath,
      alt_text || '',
      title || req.file.originalname,
      req.user.id
    ]);
    
    res.status(201).json({
      id: result.insertId,
      filename: req.file.filename,
      path: `/uploads${relativePath}`,
      url: `/uploads${relativePath}`
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload multiple files
router.post('/upload/multiple', requireAuth, requireEditor, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const results = [];
    
    for (const file of req.files) {
      const relativePath = file.path.replace(UPLOADS_DIR, '').replace(/\\/g, '/');
      
      const result = await query(`
        INSERT INTO media (filename, original_name, mime_type, size, path, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        relativePath,
        req.user.id
      ]);
      
      results.push({
        id: result.insertId,
        filename: file.filename,
        path: `/uploads${relativePath}`,
        url: `/uploads${relativePath}`
      });
    }
    
    res.status(201).json(results);
  } catch (err) {
    console.error('Multiple upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Update media metadata
router.put('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const { alt_text, title } = req.body;
    
    await query(
      'UPDATE media SET alt_text = ?, title = ? WHERE id = ?',
      [alt_text || '', title || '', req.params.id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update media error:', err);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// Delete media
router.delete('/:id', requireAuth, requireEditor, async (req, res) => {
  try {
    const media = await query('SELECT * FROM media WHERE id = ?', [req.params.id]);
    
    if (!media[0]) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(UPLOADS_DIR, media[0].path);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }
    
    // Delete from database
    await query('DELETE FROM media WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;
