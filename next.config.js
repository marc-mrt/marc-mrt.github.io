const { execSync } = require("child_process");

function generateBuildId() {
    return execSync("git rev-parse --short HEAD", {
        encoding: "ascii",
    });
}

function appVersion() {
    const date = new Date(Date.now());

    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
    reactStrictMode: true,
    generateBuildId,
    env: {
        NEXT_PUBLIC_APP_VERSION: appVersion(),
    },
};

module.exports = nextConfig;
