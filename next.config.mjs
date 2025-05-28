/** @type {import('next').NextConfig} */
const nextConfig = {
  // เ<|im_start|>่มการกำหนดค่า<|im_start|>ี่ font optimization
  optimizeFonts: true,
  
  // เ:semicolonการกำหนดค่า<|im_start|>ี่ experimental features ถ้าจำเป็น
  experimental: {
    // :semicolonการใช้งาน turbopack :semicolon่วคราวเพื่อแก้:semicolon
    turbo: false,
  },
};

export default nextConfig;