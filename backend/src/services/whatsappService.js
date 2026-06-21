const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const TEMPLATE_NAME = process.env.META_WHATSAPP_TEMPLATE_OTP || 'otp_template_name';

const isMockMode = !ACCESS_TOKEN || 
  ACCESS_TOKEN === 'your_meta_whatsapp_permanent_access_token' || 
  !PHONE_NUMBER_ID || 
  PHONE_NUMBER_ID === 'your_meta_phone_number_id';

/**
 * Helper to make Meta Cloud API HTTP requests
 */
async function callMetaAPI(endpoint, options = {}) {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      ...options.headers
    }
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response from Meta API: ${text}`);
  }

  if (!response.ok) {
    throw new Error(json.error?.message || `Meta API Error (${response.status}): ${text}`);
  }

  return json;
}

/**
 * Send a verification OTP via a WhatsApp template message
 */
async function sendWhatsAppOTP(to, otp) {
  const cleanTo = String(to).replace(/\+/g, '').trim();
  if (isMockMode) {
    console.log(`[WhatsApp Simulator] SENT OTP TEMPLATE (${TEMPLATE_NAME}) TO: +${cleanTo} WITH CODE: ${otp}`);
    return { mock: true, success: true, otp };
  }

  try {
    const payload = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: otp }
            ]
          }
        ]
      }
    };

    return await callMetaAPI('messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`Meta API send OTP failed, falling back to simulation. Error: ${err.message}`);
    console.log(`[WhatsApp Simulator Fallback] SENT OTP TEMPLATE TO: +${cleanTo} WITH CODE: ${otp}`);
    return { mock: true, fallback: true, otp };
  }
}

/**
 * Send a standard text reply via WhatsApp
 */
async function sendWhatsAppTextMessage(to, text) {
  const cleanTo = String(to).replace(/\+/g, '').trim();
  if (isMockMode) {
    console.log(`\n========================================\n[WhatsApp Simulator] SEND TEXT TO: +${cleanTo}\nMESSAGE: "${text}"\n========================================\n`);
    return { mock: true, success: true };
  }

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    return await callMetaAPI('messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`Meta API send text failed, falling back to simulation. Error: ${err.message}`);
    console.log(`\n========================================\n[WhatsApp Simulator Fallback] SEND TEXT TO: +${cleanTo}\nMESSAGE: "${text}"\n========================================\n`);
    return { mock: true, fallback: true };
  }
}

/**
 * Upload a local file (e.g. PDF) to Meta Cloud Media and send it as a document message
 */
async function sendWhatsAppDocument(to, filePath, filename, caption = '') {
  const cleanTo = String(to).replace(/\+/g, '').trim();
  if (isMockMode) {
    console.log(`[WhatsApp Simulator] SENT DOCUMENT TO: +${cleanTo} (File: ${filename}, Path: ${filePath}, Caption: "${caption}")`);
    return { mock: true, success: true };
  }

  try {
    // 1. Read file to upload
    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Construct multipart/form-data body manually for fetch
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\napplication/pdf\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`
    ];

    const partBuffers = parts.map(p => Buffer.from(p, 'utf-8'));
    const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const bodyBuffer = Buffer.concat([
      partBuffers[0],
      partBuffers[1],
      partBuffers[2],
      fileBuffer,
      footerBuffer
    ]);

    // Upload to media endpoint
    const uploadUrl = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    const text = await response.text();
    let uploadJson;
    try {
      uploadJson = JSON.parse(text);
    } catch (e) {
      throw new Error(`Media upload failed, non-JSON response: ${text}`);
    }

    if (!response.ok || !uploadJson.id) {
      throw new Error(`Media upload failed: ${text}`);
    }

    const mediaId = uploadJson.id;

    // 2. Send message with media id
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'document',
      document: {
        id: mediaId,
        filename: filename,
        caption: caption
      }
    };

    return await callMetaAPI('messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`Meta API send document failed, falling back to simulation. Error: ${err.message}`);
    console.log(`[WhatsApp Simulator Fallback] SENT DOCUMENT TO: +${cleanTo} (File: ${filename}, Caption: "${caption}")`);
    return { mock: true, fallback: true };
  }
}

module.exports = {
  sendWhatsAppOTP,
  sendWhatsAppTextMessage,
  sendWhatsAppDocument
};
