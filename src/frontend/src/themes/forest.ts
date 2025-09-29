export type ThemeColorScheme = 'light' | 'dark';

export type ForestCssVariable =
  | '--color-base-100'
  | '--color-base-200'
  | '--color-base-300'
  | '--color-base-content'
  | '--color-primary'
  | '--color-primary-content'
  | '--color-secondary'
  | '--color-secondary-content'
  | '--color-accent'
  | '--color-accent-content'
  | '--color-neutral'
  | '--color-neutral-content'
  | '--color-info'
  | '--color-info-content'
  | '--color-success'
  | '--color-success-content'
  | '--color-warning'
  | '--color-warning-content'
  | '--color-error'
  | '--color-error-content'
  | '--radius-selector'
  | '--radius-field'
  | '--radius-box'
  | '--size-selector'
  | '--size-field'
  | '--border'
  | '--depth'
  | '--noise';

export interface ThemeDefinition<VariableName extends string = string> {
  /**
   * Human-friendly identifier for runtime toggles and Tailwind plugins.
   */
  readonly name: string;
  /**
   * Indicates whether the theme should opt into prefers-color-scheme dark or light primitives.
   */
  readonly colorScheme: ThemeColorScheme;
  /**
   * CSS class appended to the document root to activate the theme tokens.
   */
  readonly className: string;
  /**
   * DaisyUI compatible variable bag. Keys should align with the exported CSS custom properties.
   */
  readonly cssVariables: Readonly<Record<VariableName, string>>;
}

export type ForestThemeDefinition = ThemeDefinition<ForestCssVariable> & {
  readonly name: 'forest';
  readonly colorScheme: 'dark';
  readonly className: 'theme-forest';
};

export const forestTheme: ForestThemeDefinition = {
  name: 'forest',
  colorScheme: 'dark',
  className: 'theme-forest',
  cssVariables: {
    '--color-base-100': '#030202',
    '--color-base-200': '#020101',
    '--color-base-300': '#010101',
    '--color-base-content': '#979695',
    '--color-primary': '#047a17',
    '--color-primary-content': '#000000',
    '--color-secondary': '#037a45',
    '--color-secondary-content': '#000101',
    '--color-accent': '#037a68',
    '--color-accent-content': '#000101',
    '--color-neutral': '#020907',
    '--color-neutral-content': '#9ca6a2',
    '--color-info': '#0077ff',
    '--color-info-content': '#000000',
    '--color-success': '#006628',
    '--color-success-content': '#000000',
    '--color-warning': '#ff8300',
    '--color-warning-content': '#000000',
    '--color-error': '#ff191e',
    '--color-error-content': '#000000',
    '--radius-selector': '1rem',
    '--radius-field': '2rem',
    '--radius-box': '1rem',
    '--size-selector': '0.25rem',
    '--size-field': '0.25rem',
    '--border': '1px',
    '--depth': '0',
    '--noise': '0',
  },
} as const;

export type ForestTheme = typeof forestTheme;

export default forestTheme;
