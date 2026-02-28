const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
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
        'card-hover': '0 12px 40px rgba(17, 24, 39, 0.12)',
        soft: '0 2px 4px rgba(0, 0, 0, 0.05)',
        medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
        large: '0 8px 24px rgba(0, 0, 0, 0.12)',
        glow: '0 0 20px rgba(79, 134, 247, 0.3)',
        'glow-success': '0 0 20px rgba(52, 199, 89, 0.3)',
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
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'slide-down': 'slideDown 300ms ease-out',
        'slide-in-left': 'slideInLeft 250ms ease-out',
        'slide-in-right': 'slideInRight 250ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'bounce-subtle': 'bounceSubtle 500ms ease-in-out',
        shimmer: 'shimmer 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        wiggle: 'wiggle 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        bounce: 'bounce 1s infinite',
        'strike-through': 'strikeThrough 0.3s ease-out forwards',
        'check-in': 'checkIn 0.3s ease-out forwards',
        'number-roll': 'numberRoll 0.3s ease-out',
        float: 'float 3s ease-in-out infinite',
        breathing: 'breathing 4s ease-in-out infinite',
        ripple: 'ripple 0.6s ease-out',
        confetti: 'confetti 1s ease-out',
        'heart-burst': 'heartBurst 0.6s ease-out',
        'progress-bar': 'progressBar 1s ease-out forwards',
        'skeleton-wave': 'skeletonWave 1.5s linear infinite',
        'stagger-fade-in': 'fadeIn 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        strikeThrough: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        checkIn: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(180deg)' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        numberRoll: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        breathing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-200px) rotate(720deg)', opacity: '0' },
        },
        heartBurst: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.3)' },
          '50%': { transform: 'scale(0.9)' },
          '75%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        progressBar: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        skeletonWave: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
