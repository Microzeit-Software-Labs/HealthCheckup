/** @type {import('tailwindcss').Config} */
export default {
  // Class strategy: toggle `dark` class on <html> to switch themes
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    screens: {
      xs:  '480px',  // tiny phones — brand text hidden below this
      sm:  '640px',
      md:  '768px',  // sidebar collapses to drawer below this
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1536px',
    },

    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // Enterprise color palette — slate-based, like Grafana/Datadog
      colors: {
        // Semantic surface aliases (used as bg-surface, etc. via @layer)
        surface: {
          // light: white  dark: slate-900
        },
      },

      fontSize: {
        // Tighten default line-heights for dense monitoring UIs
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.8125rem',{ lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
      },

      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        shimmer:   'shimmer 1.6s linear infinite',
      },
    },
  },

  plugins: [],
};
