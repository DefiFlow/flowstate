import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // 合约地址
    NEXT_PUBLIC_AGENT_EXECUTOR_ADDRESS: "0xa7a2867E7C69af433FE10c098704ba44c54F1D7f",
    output: 'standalone',
    // 暂时注释掉 assetPrefix，确保不走 CDN
  // assetPrefix: 'https://你的r2域名...',
  },
};

export default nextConfig;
