/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface-color)',
        surfaceAlt: 'var(--surface-alt-color)',
        surfaceElevated: 'var(--surface-elevated-color)',
        overlay: 'var(--overlay-color)',
        background: 'var(--background-color)',
        foreground: 'var(--text-primary-color)',
        border: {
          DEFAULT: 'var(--border-color)',
          strong: 'var(--border-strong-color)',
        },
        text: {
          primary: 'var(--text-primary-color)',
          secondary: 'var(--text-secondary-color)',
          muted: 'var(--text-muted-color)',
        },
        primary: {
          DEFAULT: 'var(--primary-color)',
          strong: 'var(--primary-strong-color)',
        },
        accent: {
          DEFAULT: 'var(--primary-color)',
          strong: 'var(--primary-strong-color)',
        },
        positive: 'var(--positive-color)',
        warning: 'var(--warning-color)',
        danger: 'var(--danger-color)',
      },
      backgroundColor: {
        surface: 'var(--surface-color)',
        surfaceAlt: 'var(--surface-alt-color)',
        surfaceElevated: 'var(--surface-elevated-color)',
      },
      textColor: {
        primary: 'var(--text-primary-color)',
        secondary: 'var(--text-secondary-color)',
        muted: 'var(--text-muted-color)',
      },
      borderColor: {
        DEFAULT: 'var(--border-color)',
        strong: 'var(--border-strong-color)',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        strong: 'var(--shadow-strong)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
        8: 'var(--space-8)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      transitionTimingFunction: {
        fast: 'var(--transition-fast)',
      },
      maxWidth: {
        layout: 'var(--layout-max-width)',
      },
    },
  },
  plugins: [],
};
