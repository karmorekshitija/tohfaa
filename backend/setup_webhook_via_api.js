const ACCESS_TOKEN = 'EAAoi46xZAXcYBR16ZAR8TzsOCL2rHkFu0U1VlWo2ZBoBtEinMmAdZCohuKtYYKyTyGz47ZAzgx1jQuV14VSFnWcevwLr2tMGjlpZAGpvRln5rZCnWywFvCWB0qaD8jpgIjpuvOFZAzbbrmR86jyVyBVjZCQzqK33wkEgQGAVp7DCTmTEZCH4xZCrGQ8zOakFtlEZAnaZB8yrOkWvWYnqtiZCICzRCcsF9TLfZA6CrvjC8KFx9xBubRTZC2glAGXKXad1GTu6ZAxhdxAfYKcCMQx5NXEcFgDF9WhJeFeMBTif4DAZDZD';
const WABA_ID = '1133227719882104';
const TUNNEL_URL = 'https://ahkfx-2409-4090-3024-4404-aa9e-54c9-395a-43cf.run.pinggy-free.link/api/whatsapp/webhook';
const VERIFY_TOKEN = 'tohfa_whatsapp_verify_token';

async function main() {
  const url = `https://graph.facebook.com/v19.0/${WABA_ID}/subscribed_apps`;
  console.log(`Sending POST request to Meta API: ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        override_callback_uri: TUNNEL_URL,
        verify_token: VERIFY_TOKEN
      })
    });
    const text = await res.text();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error('Error occurred during fetch:', err);
  }
}

main();
