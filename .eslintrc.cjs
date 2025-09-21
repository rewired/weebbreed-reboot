module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', 'src/backend/node_modules']
      },
      typescript: {
        project: [
          './tsconfig.base.json',
          './src/backend/tsconfig.json',
          './src/frontend/tsconfig.json'
        ]
      }
    }
  },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-throw-literal': 'error'
  }
};
