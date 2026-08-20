import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1A73E8',
        arenaGreen: '#3BC884',
      },
    },
  },
  plugins: [],
}

export default config
