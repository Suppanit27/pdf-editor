import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function apiPost(
  url: string,
  jsonMap: Record<string, any>
): Promise<string> {
  const path = "switchUrl2img";

  // Format date as MM/dd
  const now = new Date();
  const formattedDate = `${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
  console.log("formattedDate:", formattedDate);

  // Generate HMAC digest
  const secretKey = "A^Amps9@_Um_=^-9tfwJ&d&!pFqgppnK9=JWtFrJqxq=m=5H*3U@%&f%R@+Nsymz&@aC_8tbq6gYjM*R#6mqJ!7A^ZPYwAG3P!8C*dR2zuc33";
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(formattedDate);
  const digest = hmac.digest('hex');
  console.log("digest:", digest);

  // Create JWT token
  const payload = {
    sub: "dockerapi-22022203889234",
    iat: Math.floor(Date.now() / 1000), // iat should be seconds
  };
    console.log("payload:", payload);

//   const token = jwt.sign(payload, digest); // digest used as secret
const token = jwt.sign(payload, digest, {
  algorithm: 'HS256',
  expiresIn: '1h',
  notBefore: '10s',
});
  console.log("JWT Token:", token);

  try {
    const response = await axios.post(url, jsonMap, {
      headers: {
        'Content-Type': 'application/json',
        'path': path,
        'port': '5200',
        'Authorization': token,
      },
    });

    if (response.status === 200) {
      console.log("reply:", response.data);
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data); // safe return
    } else {
      throw new Error(`API failed: ${response.status}`);
    }
  } catch (error: any) {
    console.error("API call error:", error);
    throw new Error(`Request error: ${error.message}`);
  }
}
