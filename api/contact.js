// api/contact.js
// Simple contact form receiver. Accepts JSON body: name, email, message, productId (optional), attachmentUrl (optional).
// Saves to /tmp/contacts.json as a temporary store. Later you can forward submissions to email or CRM.

const fs = require('fs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }

  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing body' });
    }

    const record = {
      time: new Date().toISOString(),
      ...data
    };

    const dbPath = '/tmp/contacts.json';
    let arr = [];
    if (fs.existsSync(dbPath)) {
      try { arr = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]'); } catch(e){ arr = []; }
    }
    arr.push(record);
    fs.writeFileSync(dbPath, JSON.stringify(arr, null, 2));
    return res.status(200).json({ ok: true, record });
  } catch (e) {
    console.error('contact error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
};
