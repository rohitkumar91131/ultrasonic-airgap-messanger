export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://sonic.rohits.online/sitemap.xml', // Correct XML path
  }
}