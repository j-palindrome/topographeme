import type { Config } from 'tailwindcss'

export default {
  content: ['src/renderer/**/*.{tsx,css,html}'],
  theme: {
    fontFamily: {
      mono: 'Courier New'
    },
    extend: {}
  },
  plugins: []
} satisfies Config
