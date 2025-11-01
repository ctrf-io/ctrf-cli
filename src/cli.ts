#!/usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { mergeReports } from './merge'
import { identifyFlakyTests } from './flaky'

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
  .help()
  .demandCommand(1, 'You need at least one command before moving on').argv
