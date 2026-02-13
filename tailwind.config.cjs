const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50: '#f0f6ff',
          100: '#dce8ff',
          200: '#b9d0ff',
          300: '#8eafff',
          400: '#6688f5',
          500: '#4c6ce0',
          600: '#3953c0',
          700: '#2f4499',
          800: '#293a7c',
          900: '#233263',
        },
      },
      boxShadow: {
        card: '0 10px 30px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
};
