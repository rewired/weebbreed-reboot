import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import daisyui from 'daisyui';

type DaisyUIConfig = {
  themes?: Array<string | Record<string, unknown>> | false;
  darkTheme?: string | false;
  base?: boolean;
  styled?: boolean;
  utils?: boolean;
  logs?: boolean;
  themeRoot?: string;
};

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-strong': 'rgb(var(--color-primary-strong) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      boxShadow: {
        overlay: '0 24px 48px -12px rgba(15, 23, 42, 0.65)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['forest --default --prefersdark'],
    darkTheme: 'forest',
    base: true,
    styled: true,
    utils: true,
    logs: false,
    themeRoot: ':root',
  },
} satisfies Config & { daisyui: DaisyUIConfig };

export default config;
