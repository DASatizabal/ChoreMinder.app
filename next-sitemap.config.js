/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://choreminder.app',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/dashboard/*', '/test-*', "/twitter-image.*", "/opengraph-image.*", "/icon.*"],
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/test-*'],
      },
    ],
  },
};
