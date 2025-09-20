import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import js from '@eslint/js';
import globals from 'globals';

const baseTypescriptConfig = {
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  plugins: {
    '@typescript-eslint': tsPlugin
  },
  rules: {
    ...tsPlugin.configs.recommended.rules
  }
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['src/backend/**/*.ts'],
    ...baseTypescriptConfig,
    languageOptions: {
      ...baseTypescriptConfig.languageOptions,
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },
  {
    files: ['src/shared/**/*.ts'],
    ...baseTypescriptConfig,
    languageOptions: {
      ...baseTypescriptConfig.languageOptions,
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021
      }
    }
  },
  {
    files: ['src/frontend/**/*.ts', 'src/frontend/**/*.tsx', 'src/backend/**/*.tsx'],
    ...baseTypescriptConfig,
    languageOptions: {
      ...baseTypescriptConfig.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
        JSX: true
      },
      parserOptions: {
        ...baseTypescriptConfig.languageOptions.parserOptions,
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      ...baseTypescriptConfig.plugins,
      react: reactPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...baseTypescriptConfig.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];
