#!/usr/bin/env node

const https = require('https');

/**
 * Test the Foundry release token with minimal request
 */
async function testToken(packageId, token) {
  console.log(`🔍 Testing token for package: ${packageId}`);
  console.log(`🔑 Token format: ${token.substring(0, 10)}...`);
  
  const releaseData = {
    id: packageId,
    "dry-run": true,
    release: {
      version: "0.0.1-test",
      manifest: "https://example.com/test.json",
      notes: "https://example.com/test",
      compatibility: {
        minimum: "13",
        verified: "13",
        maximum: ""
      }
    }
  };

  const postData = JSON.stringify(releaseData);
  
  const options = {
    hostname: 'foundryvtt.com',
    path: '/_api/packages/release_version/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: response,
            headers: res.headers 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            headers: res.headers 
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test different package IDs that might be correct
const possibleIds = [
  'daggerheart',
  'unofficial-daggerheart', 
  'daggerheart-system'
];

async function runTests() {
  const token = process.env.FOUNDRY_RELEASE_TOKEN;
  
  if (!token) {
    console.error('❌ FOUNDRY_RELEASE_TOKEN environment variable not set');
    process.exit(1);
  }
  
  console.log('🧪 Testing Foundry Release Token\n');
  
  for (const packageId of possibleIds) {
    try {
      console.log(`\n--- Testing package ID: "${packageId}" ---`);
      const result = await testToken(packageId, token);
      
      console.log(`Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('✅ SUCCESS! This package ID works with your token');
        console.log('Response:', result.data);
        break;
      } else if (result.status === 403) {
        console.log('❌ 403 Forbidden - Token invalid for this package ID');
      } else if (result.status === 400) {
        console.log('⚠️  400 Bad Request - Token valid but request has issues');
        console.log('Response:', result.data);
      } else {
        console.log(`❓ Unexpected status: ${result.status}`);
        console.log('Response:', result.data);
      }
      
    } catch (error) {
      console.error(`💥 Error testing ${packageId}:`, error.message);
    }
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. If none worked, verify you copied the token from the correct package page');
  console.log('2. Check that you have edit permissions for the package');
  console.log('3. The token should be from: https://foundryvtt.com/packages/[your-package-id]/edit/');
}

if (require.main === module) {
  runTests();
}