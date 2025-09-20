module.exports = {
  '*.{ts,tsx,js,jsx}': ['pnpm exec eslint --max-warnings=0'],
  '*.{ts,tsx,js,jsx,json,md,css,scss}': ['pnpm exec prettier --check']
};
