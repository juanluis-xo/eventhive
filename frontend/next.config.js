/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // QR Server (goQR.me) - generación de QR codes reales
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        // Picsum Photos - imágenes placeholder para EventCards
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
}

module.exports = nextConfig
