const path = require('path');

module.exports = {
  '*.{ts,tsx,js,jsx}': (files) => {
    const relativeFiles = files.map((file) =>
      path.isAbsolute(file) ? path.relative(process.cwd(), file) : file,
    );
    const commands = [];
    const frontendFiles = relativeFiles.filter((file) => file.startsWith('frontend/'));
    const otherFiles = relativeFiles.filter(
      (file) => !file.startsWith('frontend/') && !file.startsWith('frontend-legacy/'),
    );

    if (otherFiles.length > 0) {
      commands.push(`pnpm exec eslint --max-warnings=0 ${otherFiles.join(' ')}`);
    }

    if (frontendFiles.length > 0) {
      commands.push('npm run lint --prefix frontend');
    }

    return commands;
  },
  '*.{ts,tsx,js,jsx,json,md,css,scss}': ['pnpm exec prettier --check'],
};
