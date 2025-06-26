import axios from 'axios';
import { SignJWT } from 'jose';
import { HmacSHA256, enc } from 'crypto-js';

export async function apiPost(url: string, jsonMap: Record<string, any>): Promise<string> {
  const path = "switchUrl2img";
  
  const secretKey = "A^Amps9@_Um_=^-9tfwJ&d&!pFqgppnK9=JWtFrJqxq=m=5H*3U@%&f%R@+Nsymz&@aC_8tbq6gYjM*R#6mqJ!7A^ZPYwAG3P!8C*dR2zuc33";
  
  const now = new Date();
  const formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;

  const bytes = enc.Utf8.parse(formattedDate);
  const digest = HmacSHA256(bytes, secretKey).toString(enc.Hex);


  const payload = {
    sub: "dockerapi-22022203889234",
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(digest));

  console.log("JWT:", jwt);
  console.log("POST body:", JSON.stringify(jsonMap, null, 2));

  try {
    const bodySend = JSON.stringify(jsonMap);

    const response = await axios.post(url, bodySend, {
      headers: {
        'Content-Type': 'application/json',
        'path': path,
        'port': '5200',
        'Authorization': `${jwt}`, // ปรับให้ JWT อยู่ในรูปแบบ Bearer
      },
    });

    console.log(response);
    if (response.status === 200) {
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } else {
      throw new Error(`API failed: ${response.status}`);
    }
  } catch (error: any) {
    if (error.response) {
      console.error("Server error:", error.response.status, error.response.data);
    } else {
      console.error("Network/API error:", error.message);
    }
    throw new Error(`Request error: ${error.message}`);
  }
}