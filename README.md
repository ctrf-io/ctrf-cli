# CTRF CLI

Various CTRF utilities available programatically and by command line

<div align="center">
<div style="padding: 1.5rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #30363d;">
<span style="font-size: 23px;">💚</span>
<h3 style="margin: 1rem 0;">CTRF tooling is open source and free to use</h3>
<p style="font-size: 16px;">You can support the project with a follow and a star</p>

<div style="margin-top: 1.5rem;">
<a href="https://github.com/ctrf-io/ctrf-cli">
<img src="https://img.shields.io/github/stars/ctrf-io/ctrf-cli?style=for-the-badge&color=2ea043" alt="GitHub stars">
</a>
<a href="https://github.com/ctrf-io">
<img src="https://img.shields.io/github/followers/ctrf-io?style=for-the-badge&color=2ea043" alt="GitHub followers">
</a>
</div>
</div>

<p style="font-size: 14px; margin: 1rem 0;">
Maintained by <a href="https://github.com/ma11hewthomas">Matthew Thomas</a><br/>
Contributions are very welcome! <br/>
Explore more <a href="https://www.ctrf.io/integrations">integrations</a>
</p>
</div>

## Command Line Utilities

| Name         |Details                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| `merge`      | Merge multiple CTRF reports into a single report.                                   |
| `flaky`      | Output flaky test name and retries.                                                 |

## Merge

This might be useful if you need a single report, but your chosen reporter generates multiple reports through design, parallelisation or otherwise.

To merge CTRF reports in a specified directory, use the following command:

```sh
npx ctrf merge <directory>
```

Replace `directory` with the path to the directory containing the CTRF reports you want to merge.

### Options

-o, --output `filename`: Output file name for the merged report. Default is ctrf-report.json.

```sh
npx ctrf merge <directory> --output my-merged-report.json
```

-d, --output-dir `directory`: Output directory for the merged report. Default is the same directory as the input reports.

```sh
npx ctrf merge <directory> --output-dir /path/to/output
```

-k, --keep-reports: Keep existing reports after merging. By default, the original reports will be deleted after merging.

```sh
npx ctrf merge <directory> --keep-reports
```

## Flaky

The flaky command is useful for identifying tests marked as flaky in your CTRF report. Flaky tests are tests that pass or fail inconsistently and may require special attention or retries to determine their reliability.

Usage
To output flaky tests, use the following command:

```sh
npx ctrf flaky <file-path>
```

Replace <file-path> with the path to the CTRF report file you want to analyze.

### Output

The command will output the names of the flaky tests and the number of retries each test has undergone. For example:

```zsh
Processing report: reports/sample-report.json
Found 1 flaky test(s) in reports/sample-report.json:
- Test Name: Test 1, Retries: 2
```

## Programmatic Methods

```sh
npm install ctrf
```

The following programmatic methods are available:

`mergeReports` - This method merges multiple CTRF reports into a single report.

`readSingleReport` - Reads and parses a single CTRF report file from a specified file path.

`readReportsFromDirectory` - Reads all CTRF report files from a given directory.

`readReportsFromGlobPattern` - Reads all CTRF report files from a given glob pattern.

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## Support Us

If you find this project useful, consider giving it a GitHub star ⭐ It means a lot to us.
