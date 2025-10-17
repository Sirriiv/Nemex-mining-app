// Simple test script to verify backend functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Starting NEMEXCOIN API Tests...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        
        // Test 2: User Registration
        console.log('\n2. Testing User Registration...');
        const testUser = {
            fullName: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'Test123!',
            referralCode: 'NMX123'
        };
        
        const registerResponse = await axios.post(`${BASE_URL}/users/register`, testUser);
        console.log('✅ Registration:', registerResponse.data.message);
        
        const { token, user } = registerResponse.data;
        
        // Test 3: User Login
        console.log('\n3. Testing User Login...');
        const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log('✅ Login:', loginResponse.data.message);
        
        const authToken = loginResponse.data.token;
        
        // Test 4: Get User Profile
        console.log('\n4. Testing Get Profile...');
        const profileResponse = await axios.get(`${BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Profile:', profileResponse.data.user.email);
        
        // Test 5: Get Balance
        console.log('\n5. Testing Get Balance...');
        const balanceResponse = await axios.get(`${BASE_URL}/users/balance`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Balance:', balanceResponse.data.balance + ' NMXp');
        
        // Test 6: Get Tasks
        console.log('\n6. Testing Get Tasks...');
        const tasksResponse = await axios.get(`${BASE_URL}/tasks`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Tasks:', tasksResponse.data.tasks.length + ' tasks found');
        
        console.log('\n🎉 All tests passed successfully!');
        console.log('\n📊 Test Summary:');
        console.log('   - Health Check: ✅');
        console.log('   - User Registration: ✅');
        console.log('   - User Login: ✅');
        console.log('   - Profile Access: ✅');
        console.log('   - Balance Check: ✅');
        console.log('   - Tasks Access: ✅');
        
    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Message:', error.response.data.message);
        } else {
            console.error('   Error:', error.message);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testAPI();
}

module.exports = testAPI;