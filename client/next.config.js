/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ro-game/shared'],
  // Allow the dev server to accept requests tunneled through ngrok (mobile/other-device testing)
  allowedDevOrigins: ['1fc8-171-100-30-222.ngrok-free.app'],
};

module.exports = nextConfig;
