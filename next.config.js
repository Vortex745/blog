/** @type {import('next').NextConfig} */
const nextConfig = {
    // Skip TypeScript errors during build
    typescript: {
        ignoreBuildErrors: true,
    },

    // ============================================================
    // Performance Optimizations
    // ============================================================

    // Enable experimental optimizations
    experimental: {
        // Optimize third-party packages (tree-shaking for barrel exports)
        optimizePackageImports: [
            'lucide-react',
            'framer-motion',
        ],
    },

    // Compress responses for smaller transfer sizes
    compress: true,

    // Enable image optimization with next/image
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        minimumCacheTTL: 60 * 60 * 24 * 365, // Cache images for 1 year
    },

    // Security & caching headers
    async headers() {
        return [
            {
                // Static assets: long-term caching
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Font files: aggressive caching
                source: '/_next/static/media/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Public assets
                source: '/logo.png',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, stale-while-revalidate=604800',
                    },
                ],
            },
        ];
    },

    // Enable powered-by header removal for smaller response headers
    poweredByHeader: false,
};

module.exports = nextConfig;
