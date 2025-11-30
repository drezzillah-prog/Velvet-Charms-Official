// api/paypal/capture_order.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  try {
    const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_ENV = (process.env.PAYPAL_ENV === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT || !PAYPAL_SECRET) return res.status(500).json({ error: 'PayPal creds not set' });

    // PayPal returns ?token=ORDERID on return_url
    const orderId = req.query.token || req.body.orderID || req.query.orderId;
    if (!orderId) {
      // If this is a direct API call, orderId might be in body
      return res.status(400).json({ error: 'Order id missing (token)' });
    }

    // get access token
    const tokenRes = await fetch(`${PAYPAL_ENV}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // capture order
    const capRes = await fetch(`${PAYPAL_ENV}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const capJson = await capRes.json();

    // TODO: You may send email notification or record order in DB here.
    // For now we return capture detail and a simple HTML confirmation.
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><body><h2>Payment Received</h2><pre>${JSON.stringify(capJson, null, 2)}</pre><p><a href="/index.html">Return to shop</a></p></body></html>`);
  } catch (err) {
    console.error('capture error', err);
    res.status(500).json({ error: 'capture failed', details: String(err) });
  }
};
