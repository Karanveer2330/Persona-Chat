import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Messages API - Fetching global messages');
    
    // Proxy request to backend server
    const backendUrl = 'https://localhost:3443/api/messages/global';
    
    const response = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3443,
        path: '/api/messages/global',
        method: 'GET',
        rejectUnauthorized: false, // Disable SSL verification for localhost
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode || 200,
              data: jsonData
            });
          } catch (parseError) {
            reject(new Error('Failed to parse response'));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
    
    if (response.status !== 200) {
      console.error('❌ Backend messages API failed:', response.status);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    console.log('✅ Messages API - Successfully fetched messages:', response.data);
    
    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('❌ Messages API - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}




