// api/upload.js
// Vercel Node serverless function to accept file uploads for product customizations.
// Requires "formidable" in package.json.
// Save this file as api/upload.js
// Usage from client: POST FormData with fields: file (File), productId, note (optional)

const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm({
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    uploadDir: '/tmp',
    keepExtensions: true
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Upload parse error', err);
      return res.status(500).json({ error: 'Upload parsing failed' });
    }

    // If no file provided, return details only
    let uploaded = null;
    if (files.file) {
      const f = files.file;
      // f.filepath in formidable v2; older versions use f.path
      const filepath = f.filepath || f.path;
      const filename = path.basename(filepath);
      // Move to a safer temporary place (optional). We'll return filename so you can reference it.
      // Note: serverless functions ephemeral storage — persist to external storage for production.
      uploaded = {
        name: filename,
        originalName: f.originalFilename || f.name,
        size: f.size,
        path: '/tmp/' + filename
      };
    }

    // Save submission record (append to /tmp/uploads.json) — temporary store
    try {
      const record = {
        time: new Date().toISOString(),
        fields,
        file: uploaded
      };
      const dbPath = '/tmp/uploads.json';
      let arr = [];
      if (fs.existsSync(dbPath)) {
        try { arr = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]'); } catch(e){ arr = []; }
      }
      arr.push(record);
      fs.writeFileSync(dbPath, JSON.stringify(arr, null, 2));
    } catch (e) {
      console.error('Failed to write upload record', e);
    }

    return res.status(200).json({ ok: true, file: uploaded, fields });
  });
};
