import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import {
  loadBlueprintData,
  DataLoaderError,
  type DataIssue,
  type DataLoadResult,
} from '../src/backend/src/data/dataLoader.js';

interface CliArguments {
  dataDir: string;
  reportDir: string;
  showHelp: boolean;
}

interface ValidationReport {
  timestamp: string;
  durationMs: number;
  dataDirectory: string;
  reportDirectory: string;
  status: 'passed' | 'failed';
  counts: {
    errors: number;
    warnings: number;
    totalIssues: number;
  };
  summary: {
    loadedFiles: number;
    versions: Record<string, string>;
    issues: DataIssue[];
  };
  blueprintCounts?: Record<string, number>;
}

const USAGE =
  `Blueprint data validator\n\n` +
  `Usage: pnpm validate:data [options] [data-directory]\n\n` +
  `Options:\n` +
  `  -d, --data <path>        Path to the blueprint data directory (default: data)\n` +
  `  -o, --out <path>         Directory for validation reports (default: reports/validation)\n` +
  `  -h, --help               Show this help message\n`;

const formatRelative = (baseDir: string, target: string): string => {
  const relative = path.relative(baseDir, target);
  if (!relative) {
    return '.';
  }
  return relative.split(path.sep).join('/');
};

const ensureDirectory = async (directory: string) => {
  await mkdir(directory, { recursive: true });
};

const expectValue = (argv: string[], index: number, option: string): string => {
  const value = argv[index];
  if (!value || value.startsWith('-')) {
    throw new Error(`Option ${option} requires a value.`);
  }
  return value;
};

const parseArguments = (argv: string[]): CliArguments => {
  let dataDir: string | undefined;
  let reportDir: string | undefined;
  let showHelp = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '-h':
      case '--help':
        showHelp = true;
        break;
      case '-d':
      case '--data':
      case '--data-dir':
        dataDir = expectValue(argv, ++index, arg);
        break;
      case '-o':
      case '--out':
      case '--report-dir':
        reportDir = expectValue(argv, ++index, arg);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (!dataDir) {
          dataDir = arg;
          break;
        }
        throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return {
    dataDir: dataDir ?? 'data',
    reportDir: reportDir ?? path.join('reports', 'validation'),
    showHelp,
  };
};

const toDisplayPath = (value: string): string => value.split(path.sep).join('/');

const normalizeIssueDetails = (details: unknown): string[] => {
  if (details === undefined || details === null) {
    return [];
  }

  const toLines = (input: unknown): string[] => {
    if (typeof input === 'string') {
      return input.split('\n');
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
      return [String(input)];
    }
    return [JSON.stringify(input, null, 2)];
  };

  if (Array.isArray(details)) {
    return details.flatMap((item) => toLines(item));
  }

  return toLines(details);
};

const createTextReport = (report: ValidationReport): string => {
  const lines: string[] = [];
  lines.push('Blueprint validation report');
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Duration: ${report.durationMs.toFixed(2)} ms`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Data directory: ${report.dataDirectory}`);
  lines.push(`Report directory: ${report.reportDirectory}`);
  lines.push(
    `Files loaded: ${report.summary.loadedFiles} — Issues: ${report.counts.totalIssues} (errors: ${report.counts.errors}, warnings: ${report.counts.warnings})`,
  );

  if (report.blueprintCounts && Object.keys(report.blueprintCounts).length > 0) {
    lines.push('Blueprint counts:');
    for (const [key, value] of Object.entries(report.blueprintCounts)) {
      lines.push(`  - ${key}: ${value}`);
    }
  }

  if (report.summary.issues.length === 0) {
    lines.push('No issues detected.');
  } else {
    lines.push('Issues:');
    for (const issue of report.summary.issues) {
      const location = issue.file ? ` @ ${issue.file}` : '';
      lines.push(`  - [${issue.level.toUpperCase()}] ${issue.message}${location}`);
      const detailLines = normalizeIssueDetails(issue.details);
      for (const detail of detailLines) {
        lines.push(`      • ${detail}`);
      }
    }
  }

  return lines.join('\n');
};

const printSummary = (
  report: ValidationReport,
  relativePaths: { dataDir: string; reportDir: string },
) => {
  console.log(`Blueprint validation status: ${report.status.toUpperCase()}`);
  console.log(`  Data directory: ${relativePaths.dataDir}`);
  console.log(`  Files loaded: ${report.summary.loadedFiles}`);

  if (report.blueprintCounts) {
    for (const [key, value] of Object.entries(report.blueprintCounts)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  console.log(
    `  Issues: ${report.counts.totalIssues} (errors: ${report.counts.errors}, warnings: ${report.counts.warnings})`,
  );

  if (report.summary.issues.length > 0) {
    console.log('  Issue details:');
    for (const issue of report.summary.issues) {
      const location = issue.file ? ` (${toDisplayPath(issue.file)})` : '';
      console.log(`    - [${issue.level.toUpperCase()}] ${issue.message}${location}`);
      const detailLines = normalizeIssueDetails(issue.details);
      for (const detail of detailLines) {
        console.log(`        • ${detail}`);
      }
    }
  } else {
    console.log('  No issues detected.');
  }

  const latestJson = toDisplayPath(path.join(relativePaths.reportDir, 'latest.json'));
  const latestText = toDisplayPath(path.join(relativePaths.reportDir, 'latest.txt'));
  console.log(`  Reports: ${latestJson}, ${latestText}`);
};

const run = async () => {
  let cliArguments: CliArguments;
  try {
    cliArguments = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    console.log();
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  if (cliArguments.showHelp) {
    console.log(USAGE);
    return;
  }

  const resolvedDataDir = path.resolve(process.cwd(), cliArguments.dataDir);
  const resolvedReportDir = path.resolve(process.cwd(), cliArguments.reportDir);

  const start = performance.now();
  let validationResult: DataLoadResult;
  try {
    validationResult = await loadBlueprintData(resolvedDataDir, { allowErrors: true });
  } catch (error) {
    if (error instanceof DataLoaderError) {
      console.error('Blueprint validation failed with blocking issues:');
      for (const issue of error.issues) {
        const location = issue.file ? ` (${issue.file})` : '';
        console.error(`  - [${issue.level.toUpperCase()}] ${issue.message}${location}`);
        const detailLines = normalizeIssueDetails(issue.details);
        for (const detail of detailLines) {
          console.error(`      • ${detail}`);
        }
      }
      process.exitCode = 1;
      return;
    }
    throw error;
  }
  const durationMs = Number((performance.now() - start).toFixed(3));

  const summary = validationResult.summary;
  const issues = [...summary.issues];
  issues.sort((a, b) => {
    if (a.level === b.level) {
      return (a.file ?? '').localeCompare(b.file ?? '');
    }
    return a.level === 'error' ? -1 : 1;
  });

  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;
  const status: ValidationReport['status'] = errorCount > 0 ? 'failed' : 'passed';

  const blueprintCounts: Record<string, number> = {
    strains: validationResult.data.strains.size,
    devices: validationResult.data.devices.size,
    cultivationMethods: validationResult.data.cultivationMethods.size,
    substrates: validationResult.data.substrates.size,
    containers: validationResult.data.containers.size,
    roomPurposes: validationResult.data.roomPurposes.size,
    devicePrices: validationResult.data.prices.devices.size,
    strainPrices: validationResult.data.prices.strains.size,
  };

  const utilityPriceFields = Object.keys(validationResult.data.prices.utility ?? {}).length;
  if (utilityPriceFields > 0) {
    blueprintCounts.utilityPriceFields = utilityPriceFields;
  }

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    durationMs,
    dataDirectory: resolvedDataDir,
    reportDirectory: resolvedReportDir,
    status,
    counts: {
      errors: errorCount,
      warnings: warningCount,
      totalIssues: issues.length,
    },
    summary: {
      loadedFiles: summary.loadedFiles,
      versions: { ...summary.versions },
      issues: issues.map((issue) => ({ ...issue })),
    },
    blueprintCounts,
  };

  const textReport = createTextReport(report);
  await ensureDirectory(resolvedReportDir);
  const jsonReport = JSON.stringify(report, null, 2);
  const safeTimestamp = report.timestamp.replace(/[:.]/g, '-');
  await writeFile(path.join(resolvedReportDir, 'latest.json'), jsonReport, 'utf-8');
  await writeFile(path.join(resolvedReportDir, 'latest.txt'), textReport, 'utf-8');
  await writeFile(path.join(resolvedReportDir, `${safeTimestamp}.json`), jsonReport, 'utf-8');

  printSummary(report, {
    dataDir: formatRelative(process.cwd(), resolvedDataDir),
    reportDir: formatRelative(process.cwd(), resolvedReportDir),
  });

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

void run().catch((error) => {
  console.error('Unexpected error while running blueprint validation.');
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
