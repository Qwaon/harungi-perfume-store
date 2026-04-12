import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#faf9f5',   // ivory — карточки, поверхности
          100: '#f5f4ed',   // parchment — фон страницы
          200: '#e8e6dc',   // warm border — границы, разделители
          300: '#d1cfc5',   // ring — мягкие разделители
        },
        gold: {
          400: '#7a8a5c',   // olive light — hover, вторичный
          500: '#5c6b3f',   // olive — бренд-акцент, лейблы
          600: '#4a5732',   // olive dark — pressed
        },
        ink: {
          900: '#141413',   // near-black — основной текст, CTA
          800: '#1e1e1c',   // dark alt
          700: '#30302e',   // dark surface — тёмные секции
          500: '#5e5d59',   // olive gray — вторичный текст
          300: '#87867f',   // stone gray — третичный текст
        },
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
