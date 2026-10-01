/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
