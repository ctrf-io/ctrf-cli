#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { mergeReports as merge } from './merge';
import { identifyFlakyTests } from './flaky';
import { readReportsFromDirectory, readReportsFromGlobPattern } from './methods/read-reports';
import { mergeReports } from './methods/merge-reports';

const argv = yargs(hideBin(process.argv))
  .command(
    'merge <directory>',
    'Merge CTRF reports into a single report',
    (yargs) => {
      return yargs
        .positional('directory', {
          describe: 'Directory of the CTRF reports',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file name for merged report',
          type: 'string',
          default: 'ctrf-report.json',
        })
        .option('output-dir', {
          alias: 'd',
          describe: 'Output directory for merged report',
          type: 'string',
        })
        .option('keep-reports', {
          alias: 'k',
          describe: 'Keep existing reports after merging',
          type: 'boolean',
          default: false,
        });
    },
    async (argv) => {
      await merge(argv.directory as string, argv.output as string, argv['output-dir'] as string, argv['keep-reports'] as boolean);
    }
  )
  .command(
    'flaky <file>',
    'Identify flaky tests from a CTRF report file',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'CTRF report file',
          type: 'string',
          demandOption: true,
        });
    },
    async (argv) => {
      await identifyFlakyTests(argv.file as string);
    }
  )
  .help()
  .demandCommand(1, 'You need at least one command before moving on')
  .argv;

  export { mergeReports, readReportsFromDirectory, readReportsFromGlobPattern}