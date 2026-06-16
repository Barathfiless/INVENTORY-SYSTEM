const fs = require('fs');

async function runTest() {
  try {
    console.log('Sending login request to backend...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tester@admin.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      const errorText = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} ${errorText}`);
    }
    
    const loginData = await loginRes.json();
    console.log('Login successful. Token acquired.');
    
    const token = loginData.token;
    
    const invalidProductPayload = {
      // name is missing (required)
      description: 'A product description for testing',
      about: 'A test about product text with bullet points',
      sku: `SKU-TEST-${Date.now()}`,
      category: 'Electronics',
      price: 150,
      costPrice: 100
    };
    
    console.log('Sending INVALID create product request to backend...');
    const createRes = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidProductPayload)
    });
    
    console.log(`Response Status: ${createRes.status}`);
    const resText = await createRes.text();
    console.log('Response Body:', resText);
    
  } catch (err) {
    console.error('Error during test execution:', err);
  }
}

runTest();
