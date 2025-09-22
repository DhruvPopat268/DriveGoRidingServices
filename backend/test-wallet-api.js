// Simple test script to verify wallet API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/payments';

// Test data
const testRiderId = 'test_rider_123';
const testToken = 'your_jwt_token_here'; // Replace with actual token

const testAPI = async () => {
  try {
    console.log('Testing Wallet API endpoints...\n');

    // Test 1: Get wallet details
    console.log('1. Testing GET /wallet');
    try {
      const walletResponse = await axios.get(`${BASE_URL}/wallet`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Wallet data:', walletResponse.data);
    } catch (error) {
      console.log('❌ Wallet error:', error.response?.data || error.message);
    }

    // Test 2: Get payment history
    console.log('\n2. Testing GET /history');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/history?type=deposit`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Payment history:', historyResponse.data);
    } catch (error) {
      console.log('❌ History error:', error.response?.data || error.message);
    }

    // Test 3: Create order
    console.log('\n3. Testing POST /create-order');
    try {
      const orderResponse = await axios.post(`${BASE_URL}/create-order`, {
        amount: 100 // 100 INR
      }, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Order created:', orderResponse.data);
    } catch (error) {
      console.log('❌ Create order error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Run tests
if (require.main === module) {
  console.log('Note: Replace testToken with a valid JWT token before running tests');
  console.log('Usage: node test-wallet-api.js\n');
  // testAPI();
}

module.exports = testAPI;