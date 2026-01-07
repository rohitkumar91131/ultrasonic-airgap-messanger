import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",      // Files kahan save hongi
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  swcMinify: true,
  disable: false,      // Development mein bhi PWA on rakhein check karne ke liye
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA offline mode ke liye output export zaroori nahi, par performance achi hoti hai
  reactStrictMode: true,
};

export default withPWA(nextConfig);