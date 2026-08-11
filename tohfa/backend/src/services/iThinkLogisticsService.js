const crypto = require('crypto');

/**
 * Sends a network request to the iThink Logistics V3 API.
 * 
 * If credentials are not set in the environment, it falls back to a simulated mock response.
 * 
 * @param {Object} payload 
 * @returns {Promise<{success: boolean, awb: string, raw: Object, error?: string}>}
 */
async function createPickupRequest(payload) {
  const token = process.env.ITHINK_LOGISTICS_ACCESS_TOKEN;
  const secret = process.env.ITHINK_LOGISTICS_SECRET_KEY;
  const baseUrl = process.env.ITHINK_LOGISTICS_BASE_URL || 'https://pre-alpha.ithinklogistics.com';

  // Fallback to Mock if API Keys are not set or left as default placeholders
  if (!token || !secret || token === 'your_token_here' || secret === 'your_secret_here') {
    console.log('[iThinkLogistics Service] API Credentials not found or default. Falling back to Mock service...');
    const delay = Math.floor(Math.random() * 300) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return {
      success: true,
      awb: `ITL${randomHex}`,
      raw: payload
    };
  }

  // Format date to: DD-MM-YYYY HH:MM:SS
  const formatOrderDate = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Map internal payload to iThink Logistics API V3 schema
  const apiPayload = {
    access_token: token,
    secret_key: secret,
    pickup_address_id: payload.pickup_address_id,
    data: {
      shipments: payload.shipments.map(s => ({
        order: s.order_id,
        order_date: formatOrderDate(),
        total_amount: String(s.total_amount),
        name: s.customer_name,
        add: s.address_line1 + (s.address_line2 ? `, ${s.address_line2}` : ''),
        pin: s.pincode,
        city: s.city,
        state: s.state,
        country: 'India',
        phone: s.phone,
        products: [
          {
            product_name: 'Tohfa Handcrafted Item',
            product_sku: 'TOHFA-ARTISAN',
            product_quantity: '1',
            product_price: String(s.total_amount)
          }
        ],
        shipment_length: String(s.length),
        shipment_width: String(s.width),
        shipment_height: String(s.height)
      }))
    }
  };

  try {
    console.log(`[iThinkLogistics API] Sending request to ${baseUrl}/api_v3/order/add.json`);
    const response = await fetch(`${baseUrl}/api_v3/order/add.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resData = await response.json();
    console.log('[iThinkLogistics API] Response received:', JSON.stringify(resData));

    // Handle iThink Logistics standard response
    if (resData.status_code === 200 && resData.data) {
      // Find the first shipment status in batch response
      const keys = Object.keys(resData.data);
      if (keys.length > 0) {
        const firstShipment = resData.data[keys[0]];
        if (firstShipment.status === 'Success' && firstShipment.awb) {
          return {
            success: true,
            awb: firstShipment.awb,
            raw: resData
          };
        } else {
          console.error('[iThinkLogistics API] Order registration failed:', firstShipment.remark);
          return {
            success: false,
            error: firstShipment.remark || 'Order registration rejected.'
          };
        }
      }
    }

    return {
      success: false,
      error: resData.html_message || 'Order registration rejected by aggregator.'
    };

  } catch (err) {
    console.error('[iThinkLogistics API] Network/Integration Exception:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Resolves text state and city names to iThink Logistics IDs.
 */
async function resolveStateAndCityIds(token, secret, baseUrl, stateName, cityName) {
  let stateId = 22; // Default Maharashtra
  let cityId = 2707; // Default Mumbai/Kandivali
  
  try {
    // 1. Get States
    const stateRes = await fetch(`${baseUrl}/api_v3/state/get.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, secret_key: secret, country_id: '101' })
    });
    
    if (stateRes.ok) {
      const stateData = await stateRes.json();
      if (stateData.status_code === 200 && Array.isArray(stateData.data)) {
        const stateObj = stateData.data.find(s => 
          s.state_name && s.state_name.toLowerCase().trim() === stateName.toLowerCase().trim()
        );
        if (stateObj) {
          stateId = parseInt(stateObj.id, 10);
        }
      }
    }
    
    // 2. Get Cities
    const cityRes = await fetch(`${baseUrl}/api_v3/city/get.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, secret_key: secret, state_id: String(stateId) })
    });
    
    if (cityRes.ok) {
      const cityData = await cityRes.json();
      if (cityData.status_code === 200 && Array.isArray(cityData.data)) {
        const cityObj = cityData.data.find(c => 
          c.city_name && c.city_name.toLowerCase().trim() === cityName.toLowerCase().trim()
        );
        if (cityObj) {
          cityId = parseInt(cityObj.id, 10);
        } else if (cityData.data.length > 0) {
          cityId = parseInt(cityData.data[0].id, 10); // Fallback to first city in state
        }
      }
    }
  } catch (err) {
    console.error('[iThinkLogistics Service] Error resolving State/City IDs:', err.message);
  }
  
  return { stateId, cityId };
}

/**
 * Registers an address as a warehouse on iThink Logistics.
 */
async function registerWarehouse(address, shopName) {
  const token = process.env.ITHINK_LOGISTICS_ACCESS_TOKEN;
  const secret = process.env.ITHINK_LOGISTICS_SECRET_KEY;
  const baseUrl = process.env.ITHINK_LOGISTICS_BASE_URL || 'https://pre-alpha.ithinklogistics.com';

  // Mock fallback if keys are missing
  if (!token || !secret || token === 'your_token_here' || secret === 'your_secret_here') {
    console.log('[iThinkLogistics Service] API Credentials not found. Returning mock warehouse ID...');
    const randomId = Math.floor(Math.random() * 1000) + 100;
    return {
      success: true,
      warehouseId: `MOCK-WH-${randomId}`
    };
  }

  const { stateId, cityId } = await resolveStateAndCityIds(token, secret, baseUrl, address.state, address.city);

  const apiPayload = {
    data: {
      company_name: shopName || address.label || 'Tohfa Artisan Store',
      address1: address.address_line || address.line1,
      address2: address.line2 || '',
      mobile: address.phone,
      pincode: address.pincode,
      city_id: String(cityId),
      state_id: String(stateId),
      country_id: '101',
      gps: '',
      access_token: token,
      secret_key: secret
    }
  };

  try {
    console.log(`[iThinkLogistics API] Registering warehouse at ${baseUrl}/api_v3/warehouse/add.json`);
    const response = await fetch(`${baseUrl}/api_v3/warehouse/add.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resData = await response.json();
    console.log('[iThinkLogistics API] Warehouse response received:', JSON.stringify(resData));

    if (resData.status_code === 200 && resData.warehouse_id) {
      return {
        success: true,
        warehouseId: String(resData.warehouse_id)
      };
    }

    return {
      success: false,
      error: resData.html_message || 'Warehouse registration rejected by iThink Logistics.'
    };
  } catch (err) {
    console.error('[iThinkLogistics API] Warehouse registration exception:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  createPickupRequest,
  registerWarehouse
};
