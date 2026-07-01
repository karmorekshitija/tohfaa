const crypto = require('crypto');

/**
 * Simulates a network call to iThink Logistics API.
 * 
 * Payload shape mirrors iThink Logistics add order/pickup structure:
 * {
 *   pickup_address_id: string,
 *   shipments: Array<{
 *     order_id: string,
 *     payment_mode: 'COD' | 'prepaid',
 *     total_amount: number,
 *     weight: number, // in kg
 *     length: number, // in cm
 *     width: number,  // in cm
 *     height: number  // in cm
 *   }>
 * }
 * 
 * @param {Object} payload 
 * @returns {Promise<{success: boolean, awb: string, raw: Object}>}
 */
async function createPickupRequest(payload) {
  // Simulate network latency (200-500ms)
  const delay = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log(`[iThinkLogistics Mock] Booking pickup with payload (delayed by ${delay}ms):`, JSON.stringify(payload, null, 2));
  
  // Generate a mock AWB number
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const awb = `ITL${randomHex}`;
  
  return {
    success: true,
    awb,
    raw: payload
  };
}

module.exports = {
  createPickupRequest
};
