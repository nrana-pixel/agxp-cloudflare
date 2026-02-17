/**
 * Generate Test JWT Token
 * 
 * This script generates a valid JWT token for testing the frontend.
 * Run this to get a token, then update src/services/api.ts
 */

async function generateTestJWT() {
    const secret = 'test-secret-key-for-development'; // Match this with your JWT_SECRET

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        userId: 1,
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    };

    const encoder = new TextEncoder();

    // Encode header and payload
    const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const payloadB64 = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Create signature
    const data = `${headerB64}.${payloadB64}`;
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const jwt = `${data}.${signatureB64}`;

    console.log('\n=== TEST JWT TOKEN ===\n');
    console.log(jwt);
    console.log('\n=== INSTRUCTIONS ===\n');
    console.log('1. Copy the token above');
    console.log('2. Open: src/services/api.ts');
    console.log('3. Replace MOCK_JWT value with the token');
    console.log('4. Make sure your backend JWT_SECRET is: "test-secret-key-for-development"');
    console.log('\nOr run: wrangler secret put JWT_SECRET');
    console.log('And enter: test-secret-key-for-development\n');
}

generateTestJWT().catch(console.error);
