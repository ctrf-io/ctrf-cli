#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

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
      try {
        if (!argv.directory) {
          throw new Error('The "directory" argument is required.');
        }

        const directoryPath = path.resolve(argv.directory as string);
        const outputFileName = argv.output as string;
        const outputDir = argv['output-dir'] ? path.resolve(argv['output-dir'] as string) : directoryPath;
        const keepReports = argv['keep-reports'] as boolean;
        const outputPath = path.join(outputDir, outputFileName);

        console.log("Merging CTRF reports...");

        const files = fs.readdirSync(directoryPath);

        files.forEach((file) => {
          console.log('Found CTRF report file:', file);
        });

        const ctrfReportFiles = files.filter((file) => {
          try {
            const filePath = path.join(directoryPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            return jsonData.hasOwnProperty('results');
          } catch (error) {
            console.error(`Error reading JSON file '${file}':`, error);
            return false;
          }
        });

        if (ctrfReportFiles.length === 0) {
          console.log('No CTRF reports found in the specified directory.');
          return;
        }

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`Created output directory: ${outputDir}`);
        }

        const mergedReport = ctrfReportFiles
          .map((file) => {
            console.log("Merging report:", file);
            const filePath = path.join(directoryPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
          })
          .reduce((acc, curr) => {
            if (!acc.results) {
              return curr;
            }

            acc.results.summary.tests += curr.results.summary.tests;
            acc.results.summary.passed += curr.results.summary.passed;
            acc.results.summary.failed += curr.results.summary.failed;
            acc.results.summary.skipped += curr.results.summary.skipped;
            acc.results.summary.pending += curr.results.summary.pending;
            acc.results.summary.other += curr.results.summary.other;

            acc.results.tests.push(...curr.results.tests);

            acc.results.summary.start = Math.min(acc.results.summary.start, curr.results.summary.start);
            acc.results.summary.stop = Math.max(acc.results.summary.stop, curr.results.summary.stop);

            return acc;
          }, { results: null });

        fs.writeFileSync(outputPath, JSON.stringify(mergedReport, null, 2));

        if (!keepReports) {
          ctrfReportFiles.forEach((file) => {
            const filePath = path.join(directoryPath, file);
            if (file !== outputFileName) {
              fs.unlinkSync(filePath);
            }
          });
        }

        console.log('CTRF reports merged successfully.');
        console.log(`Merged report saved to: ${outputPath}`);
      } catch (error) {
        console.error('Error merging CTRF reports:', error);
      }
    }
  )
  .help()
  .demandCommand(1, 'You need at least one command before moving on')
  .argv;
