/** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    screens: {
      minBtn: '150',
      xs: '480px',
      sm: '640px',
      md: '768px',  // examples: <div className="max-w-sm md:max-w-lg lg:max-w-3xl">Контейнер з адаптивною шириною</div>
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      'max-md': {'max': '860px'}, // example: <div className="max-md:hidden">Сховати при <=860px</div>
    },

    fontFamily: {
      sans: ['TT Commons Done', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'serif'],
      mono: ['Menlo', 'monospace']
    },

    borderRadius: {
      none: '0px',
      sm: '0.125rem',
      DEFAULT: '1.5rem',
      md: '0.375rem',
      lg: '1rem',
      xl: '1.5rem',
      full: '9999px',
    },

    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        white: '#ffffff',
        black: '#000000',

        /* Base gray scale (Tailwind default, keep for utilities that rely on it) */
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        /* Semantic colors backed by CSS variables */
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-press': 'var(--color-primary-press)',
        secondary: 'var(--color-secondary)',
        error: 'var(--color-error)',

        dark: 'var(--color-bg-gray-darkest)',
        'dark-gray': 'var(--color-bg-gray-dark)',
        'gray-2': 'var(--color-bg-gray)',
        'light-gray': 'var(--color-bg-gray-light)',
        'lighter-gray': 'var(--color-bg-gray-lighter)',
        light: 'var(--color-bg-light)',

        'text-dark': 'var(--color-text-gray-darkest)',
        'text-dark-gray': 'var(--color-text-gray-dark)',
        'text-gray': 'var(--color-text-gray)',
        'text-gray-muted': 'var(--color-text-gray-muted)',
        'text-gray-medium': 'var(--color-text-gray-medium)',
        'text-light': 'var(--color-text-light)',

        'divider-color': 'var(--color-divider)',
        'border-color': 'var(--color-border)',

        /* Status colors */
        'status-default-bg': 'var(--color-status-default-bg)',
        'status-default-text': 'var(--color-status-default-text)',
        'status-progress-bg': 'var(--color-status-progress-bg)',
        'status-progress-text': 'var(--color-status-progress-text)',
        'status-calculation-bg': 'var(--color-status-calculation-bg)',
        'status-calculation-text': 'var(--color-status-calculation-text)',
        'status-done-bg': 'var(--color-status-done-bg)',
        'status-done-text': 'var(--color-status-done-text)',
        'status-cancelled-bg': 'var(--color-status-cancelled-bg)',
        'status-cancelled-text': 'var(--color-status-cancelled-text)',

        /* Legacy aliases mapped to CSS variables */
        danger: 'var(--color-error)',
        warning: 'var(--color-status-calculation-bg)',
        info: 'var(--color-status-progress-bg)',
        success: 'var(--color-status-done-bg)',

        'primary-hover-button': 'var(--color-primary-hover)',
        'primary-press-button': 'var(--color-primary-press)',
        'outlined-hover-button': '#e4e4e7',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '> *': {
              marginTop: '0',
            },

            h1: {
              fontSize: theme('fontSize.h1'), //'1.875rem', // 30px
              fontWeight: '700',
              lineHeight: '1.1',
            },
            h2: {
              fontSize: theme('fontSize.h2'),
              fontWeight: '700',
              lineHeight: '1.1',
            },
            h3: {
              fontSize: theme('fontSize.h3'),
              fontWeight: '600',
              lineHeight: '1.15',
            },
            h4: {
              fontSize: theme('fontSize.h4'),
              fontWeight: '600',
              lineHeight: '1.15',
            },
            h5: {
              fontSize: theme('fontSize.h5'),
              fontWeight: '600',
              lineHeight: '1.15',
            },
            p: {
              color: '#374151', // gray-700
              fontSize: theme('fontSize.p-main'),
              lineHeight: '1.3',
            },
            li: {
              // marginTop: '0.25em',
              marginBottom: '0.25em',
              fontSize: theme('fontSize.p-main'),
            },
            'li::marker': {
              // color:  theme('colors.primary'), // text-primary
              fontWeight: '600',
            },
            blockquote: {
              fontWeight: '400',
              fontStyle: 'normal',
              color: theme('colors.gray.700'), // gray-700
              borderLeftColor: theme('colors.primary'), // primary
              borderLeftWidth: '0.25rem',
              paddingLeft: '1rem',
              quotes: 'none',
              fontSize: theme('fontSize.p-main'),
              lineHeight: '1.3',
            },

          },
        },
      }),
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
  },

  plugins: [
    require('@tailwindcss/typography'),
  ],
};
