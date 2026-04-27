const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/users');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.jpg';
    cb(null, `user-${Date.now()}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG images are allowed'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

/**
 * Optional field `image` — only runs multipart parsing when client sends multipart/form-data.
 * JSON-only requests pass through with body untouched.
 */
function userProfileImageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError
          ? err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be smaller than 2 MB'
            : err.message
          : err.message || 'File upload failed';
      return res.status(400).json({ message, error: true, code: 400 });
    }
    next();
  });
}

module.exports = { userProfileImageUpload };
