/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
      fontFamily: {
        sans: ['"SF Pro Display"', 'sans-serif'],
      },
      colors: {
        novacodex: {
          primary: 'var(--novacodex-primary)',
          secondary: 'var(--novacodex-secondary)',
          border: 'var(--novacodex-border)',
          surface: 'var(--novacodex-surface)',
          background: 'var(--novacodex-background)',
          text: {
            primary: 'var(--novacodex-text-primary)',
            secondary: 'var(--novacodex-text-secondary)',
          },
        },
      },
      borderRadius: {
        sm: 'var(--novacodex-radius-sm)',
        md: 'var(--novacodex-radius-md)',
        lg: 'var(--novacodex-radius-lg)',
      },
    },
  },
  plugins: [],
};
