import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/dashboard/registrar/cases',
        destination: '/dashboard/clerk/cases',
        permanent: false,
      },
      {
        source: '/dashboard/registrar/payments',
        destination: '/dashboard/clerk/payments',
        permanent: false,
      },
      {
        source: '/dashboard/registrar/search',
        destination: '/dashboard/admin/cases',
        permanent: false,
      },
      {
        source: '/dashboard/registrar/reports',
        destination: '/dashboard/admin/reports',
        permanent: false,
      },
      {
        source: '/dashboard/registrar/settings',
        destination: '/dashboard/clerk/settings',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
