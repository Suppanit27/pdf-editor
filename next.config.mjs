/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint ระหว่างการ build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ตั้งค่า output เป็น export static site
  output: 'export',
  // เพิ่ม trailingSlash เพื่อให้ URL ทำงานได้ Firebase Hosting
  trailingSlash: true,
  // เพิ่ม images.unoptimized เพื่อให้ทำงาน static export
  images: {
    unoptimized: true,
  },
  // แก้ไขปัญหา canvas module สำหรับ PDF.js
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // แก้ไขปัญหา canvas และ Node.js modules ใน browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false,
      };

    // เพิ่ม alias สำหรับ pdfjs-dist
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
    };

    // ป้องกันการ import Node.js modules ใน client-side
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(canvas|jsdom)$/,
        })
      );
    }

    return config;
  },
};

export default nextConfig;
