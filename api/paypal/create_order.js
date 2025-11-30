// api/paypal/create_order.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { items, shipping = 0, currency = 'USD' } = req.body || {};
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Missing items' });

    const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_ENV = (process.env.PAYPAL_ENV === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const BASE_URL = process.env.BASE_URL || '';

    if (!PAYPAL_CLIENT || !PAYPAL_SECRET) return res.status(500).json({ error: 'PayPal credentials not set' });

    // calculate subtotal
    const subtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    const totalAmount = (Number(subtotal) + Number(shipping)).toFixed(2);

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
    if (!tokenData.access_token) return res.status(500).json({ error: 'Failed to get PayPal token', details: tokenData });

    const accessToken = tokenData.access_token;

    // Build purchase_units with breakdown (items + shipping)
    const purchase_unit = {
      amount: {
        currency_code: currency,
        value: totalAmount,
        breakdown: {
          item_total: {
            currency_code: currency,
            value: subtotal.toFixed ? subtotal.toFixed(2) : Number(subtotal).toFixed(2)
          },
          shipping: {
            currency_code: currency,
            value: Number(shipping).toFixed(2)
          }
        }
      },
      items: items.map(it => ({
        name: it.name,
        unit_amount: { currency_code: currency, value: Number(it.price).toFixed(2) },
        quantity: String(it.qty || 1)
      })),
      description: 'Velvet Charms order'
    };

    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [purchase_unit],
      application_context: {
        brand_name: 'Velvet Charms',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${BASE_URL.replace(/\/$/, '')}/api/paypal/capture_order`,
        cancel_url: `${BASE_URL.replace(/\/$/, '')}/catalogue.html`
      }
    };

    const orderRes = await fetch(`${PAYPAL_ENV}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderBody)
    });

    const orderJson = await orderRes.json();
    const approveLink = (orderJson.links || []).find(l => l.rel === 'approve');
    return res.json({ order: orderJson, approvalUrl: approveLink ? approveLink.href : null });
  } catch (err) {
    console.error('create_order err', err);
    return res.status(500).json({ error: 'server error', details: String(err) });
  }
};
