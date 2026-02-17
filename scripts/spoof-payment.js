/**
 * scripts/spoof-payment.js
 * 
 * This script simulates a PayPal IPN (Instant Payment Notification) 
 * call to your local Netlify Function. Use this to test the backend
 * logic for granting course access without making a real payment.
 * 
 * Usage:
 * node scripts/spoof-payment.js --email="user@example.com" --name="John" --userId="NETLIFY_USER_ID"
 */

import fetch from 'node-fetch';

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const EMAIL = args.email || 'jdwallace12@gmail.com';
const NAME = args.name || 'John';
const USER_ID = args.userId || ''; // Netlify User ID from local Identity
const ITEM_NAME = "Magickal Foundations: A Beginner's Guide";

if (!USER_ID) {
  console.error('❌ ERROR: You must provide a --userId. Get this from your local Netlify Identity widget.');
  process.exit(1);
}

console.log(`🚀 Simulating payment for ${ITEM_NAME}...`);
console.log(`👤 User: ${NAME} (${EMAIL})`);
console.log(`🆔 ID: ${USER_ID}`);

// Construct the mock PayPal IPN body
const body = new URLSearchParams({
  payer_email: EMAIL,
  first_name: NAME,
  item_name: ITEM_NAME,
  custom: USER_ID,
  payment_status: 'Completed',
  mc_gross: '44.00',
  txn_id: `MOCK_TXN_${Date.now()}`
}).toString();

async function spoof() {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/paypal-ipn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });

    const result = await response.text();
    console.log(`\n📡 Response from Server: ${response.status} ${response.statusText}`);
    console.log(`📄 Body: ${result}`);

    if (response.ok) {
      console.log('\n✅ SUCCESS: The payment notification was sent.');
      console.log('🔗 Check your Netlify Dev terminal to see if the role was granted!');
    } else {
      console.error('\n❌ FAILED: The server rejected the notification.');
    }
  } catch (error) {
    console.error('\n❌ ERROR: Could not connect to localhost:8888. Is Netlify Dev running?');
    console.error(error.message);
  }
}

spoof();
