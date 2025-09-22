const runEslint = (files) => {
  const targets = files.filter((file) => !file.includes('src/frontend-legacy/'))
  if (!targets.length) {
    return []
  }
  const quoted = targets.map((file) => `"${file}"`).join(' ')
  return [`pnpm exec eslint --max-warnings=0 ${quoted}`]
}

module.exports = {
  '*.{ts,tsx,js,jsx}': runEslint,
  '*.{ts,tsx,js,jsx,json,md,css,scss}': ['pnpm exec prettier --check --no-error-on-unmatched-pattern'],
}
