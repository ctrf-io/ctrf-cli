#!/usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { mergeReports } from './merge.js'
import { identifyFlakyTests } from './flaky.js'
import { validateReport } from './validate.js'
import { filterReport } from './filter.js'
import { generateTestIds } from './generate-test-ids.js'
import { generateReportIdCommand } from './generate-report-id.js'
import { addInsightsCommand } from './add-insights.js'

const argv = yargs(hideBin(process.argv))
  .command(
    'merge <directory>',
    'Merge CTRF reports into a single report',
    yargs => {
      return yargs
        .positional('directory', {
          describe: 'Directory of the CTRF reports',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path (default: ctrf-report.json)',
          type: 'string',
          default: 'ctrf-report.json',
        })
        .option('output-dir', {
          alias: 'd',
          describe: 'Output directory for merged report',
          type: 'string',
          hidden: true,
          deprecated: 'Use --output with a path instead',
        })
        .option('keep-reports', {
          alias: 'k',
          describe: 'Keep existing reports after merging',
          type: 'boolean',
          default: false,
        })
    },
    async argv => {
      await mergeReports(
        argv.directory as string,
        argv.output as string,
        argv['keep-reports'] as boolean,
        argv['output-dir'] as string
      )
    }
  )
  .command(
    'flaky <file>',
    'Identify flaky tests from a CTRF report file',
    yargs => {
      return yargs.positional('file', {
        describe: 'CTRF report file',
        type: 'string',
        demandOption: true,
      })
    },
    async argv => {
      await identifyFlakyTests(argv.file as string)
    }
  )
  .command(
    'validate <file>',
    'Validate a CTRF report against the JSON schema',
    yargs => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF report file to validate',
        type: 'string',
        demandOption: true,
      })
    },
    async argv => {
      await validateReport(argv.file as string, false)
    }
  )
  .command(
    'validate-strict <file>',
    'Strict validation with additionalProperties enforcement',
    yargs => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF report file to validate',
        type: 'string',
        demandOption: true,
      })
    },
    async argv => {
      await validateReport(argv.file as string, true)
    }
  )
  .command(
    'filter <file>',
    'Filter tests from a CTRF report based on criteria',
    yargs => {
      return yargs
        .positional('file', {
          describe: 'Path to the CTRF report file (use - for stdin)',
          type: 'string',
          demandOption: true,
        })
        .option('id', {
          describe: 'Filter by test ID (UUID)',
          type: 'string',
        })
        .option('name', {
          describe: 'Filter by test name',
          type: 'string',
        })
        .option('status', {
          describe:
            'Filter by test status (comma-separated: passed,failed,skipped,pending,other)',
          type: 'string',
        })
        .option('tags', {
          describe: 'Filter by tags (comma-separated)',
          type: 'string',
        })
        .option('suite', {
          describe: 'Filter by suite name',
          type: 'string',
        })
        .option('type', {
          describe: 'Filter by test type',
          type: 'string',
        })
        .option('browser', {
          describe: 'Filter by browser (e.g., chrome, firefox)',
          type: 'string',
        })
        .option('device', {
          describe: 'Filter by device',
          type: 'string',
        })
        .option('flaky', {
          describe: 'Filter to flaky tests only',
          type: 'boolean',
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path (optional; defaults to stdout)',
          type: 'string',
        })
    },
    async argv => {
      await filterReport(argv.file as string, {
        id: argv.id as string | undefined,
        name: argv.name as string | undefined,
        status: argv.status as string | undefined,
        tags: argv.tags as string | undefined,
        suite: argv.suite as string | undefined,
        type: argv.type as string | undefined,
        browser: argv.browser as string | undefined,
        device: argv.device as string | undefined,
        flaky: argv.flaky as boolean | undefined,
        output: argv.output as string | undefined,
      })
    }
  )
  .command(
    'generate-test-ids <file>',
    'Generate deterministic UUIDs for all tests in a report',
    yargs => {
      return yargs
        .positional('file', {
          describe: 'Path to the CTRF report file',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path (optional; defaults to stdout)',
          type: 'string',
        })
    },
    async argv => {
      await generateTestIds(argv.file as string, {
        output: argv.output as string | undefined,
      })
    }
  )
  .command(
    'generate-report-id <file>',
    'Generate a unique identifier for the CTRF report',
    yargs => {
      return yargs
        .positional('file', {
          describe: 'Path to the CTRF report file',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file path (optional; defaults to stdout)',
          type: 'string',
        })
    },
    async argv => {
      await generateReportIdCommand(argv.file as string, {
        output: argv.output as string | undefined,
      })
    }
  )
  .command(
    'add-insights <directory>',
    'Analyze trends and add insights across multiple CTRF reports',
    yargs => {
      return yargs
        .positional('directory', {
          describe: 'Path to directory containing CTRF reports',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe:
            'Output directory for reports with insights (optional; defaults to stdout)',
          type: 'string',
        })
    },
    async argv => {
      await addInsightsCommand(argv.directory as string, {
        output: argv.output as string | undefined,
      })
    }
  )
  .help()
  .demandCommand(1, 'You need at least one command before moving on').argv
