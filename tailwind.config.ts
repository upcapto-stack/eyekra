import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Dynamic gradient classes used in BANNERS (HomeView)
    'from-violet-600', 'to-purple-700',
    'from-[#fe5001]', 'to-[#e54800]',
    'from-emerald-600', 'to-teal-600',
    'from-blue-600', 'to-indigo-600',
    'from-rose-500', 'to-pink-600',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#fe5001',
          light: '#fe6a34',
          dark: '#e54800',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
