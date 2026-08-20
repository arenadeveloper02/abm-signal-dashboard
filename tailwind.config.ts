import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#0A0C10',
        surface: '#12161D',
        ink: '#E5EAF2',
        muted: '#8B94A7',
      },
    },
  },
  plugins: [],
};

export default config;
