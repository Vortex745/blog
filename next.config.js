/** @type {import('next').NextConfig} */
const nextConfig = {
    // Skip linting during build to speed up deployment
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Skip TypeScript errors during build
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
