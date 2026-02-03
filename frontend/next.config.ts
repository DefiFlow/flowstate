import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  env: {
    // 合约地址
    NEXT_PUBLIC_AGENT_EXECUTOR_ADDRESS: "0xa7a2867E7C69af433FE10c098704ba44c54F1D7f",
    NEXT_PUBLIC_ARC_USDC_ADDRESS:"0x5399f667627bC3f170Ba91fEd251a0d4F76F6C7A",
    NEXT_PUBLIC_ARC_PAYROLL_ADDRESS:"0xa19F0dc6655772dB798F9b7eb1a4DC4f775f7f5b"
    // 暂时注释掉 assetPrefix，确保不走 CDN
  // assetPrefix: 'https://你的r2域名...',
  },
};

export default nextConfig;
