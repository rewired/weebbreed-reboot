const EXCLUDED_PATTERNS = ['docs/addendum/clickdummy/'];

const filterTargets = (files) =>
  files.filter((file) => !EXCLUDED_PATTERNS.some((pattern) => file.includes(pattern)));

const runEslint = (files) => {
  const targets = filterTargets(files);
  if (!targets.length) {
    return [];
  }
  const quoted = targets.map((file) => `"${file}"`).join(' ');
  return [`pnpm exec eslint --max-warnings=0 ${quoted}`];
};

const runPrettier = (files) => {
  const targets = filterTargets(files);
  if (!targets.length) {
    return [];
  }
  const quoted = targets.map((file) => `"${file}"`).join(' ');
  return [`pnpm exec prettier --check --no-error-on-unmatched-pattern ${quoted}`];
};

module.exports = {
  '*.{ts,tsx,js,jsx}': runEslint,
  '*.{ts,tsx,js,jsx,json,md,css,scss}': runPrettier,
};
