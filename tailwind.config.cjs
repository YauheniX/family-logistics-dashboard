const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Primary colors
        primary: {
          50: '#f0f6ff',
          100: '#EBF2FF',
          200: '#b9d0ff',
          300: '#8eafff',
          400: '#6B9AF8',
          500: '#4F86F7',
          600: '#3953c0',
          700: '#2f4499',
          800: '#293a7c',
          900: '#1E2A41',
        },
        // Success colors
        success: {
          100: '#d4f4dd',
          200: '#a9e9bb',
          300: '#7ddf99',
          400: '#4DD773',
          500: '#34C759',
          600: '#2aa047',
          700: '#207935',
          800: '#165323',
          900: '#0c2c11',
        },
        // Warning colors
        warning: {
          100: '#ffe8d1',
          200: '#ffd1a3',
          300: '#ffba75',
          400: '#FFB366',
          500: '#FF9F43',
          600: '#cc7f36',
          700: '#995f28',
          800: '#66401b',
          900: '#33200d',
        },
        // Danger colors
        danger: {
          100: '#ffe5e5',
          200: '#ffcccc',
          300: '#ffb3b3',
          400: '#FF7A7A',
          500: '#FF5C5C',
          600: '#cc4a4a',
          700: '#993737',
          800: '#662525',
          900: '#331212',
        },
        // Neutral colors for light mode
        neutral: {
          50: '#F7FAFC',
          100: '#F7FAFC',
          200: '#E2E8F0',
          300: '#CBD5E0',
          500: '#A0AEC0',
          700: '#4A5568',
          800: '#1A202C',
          900: '#1A202C',
        },
        // Dark mode background
        'dark-bg': '#121212',
        // Legacy brand colors for backward compatibility
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
        'card-light': '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
      },
      fontSize: {
        // Typography system from design spec
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-semibold': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        small: ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
