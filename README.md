# CTRF CLI Reference Implementation

Command line tooling for the [Common Test Report Format (CTRF)](https://github.com/ctrf-io/ctrf) specification.

## Open Standard

[CTRF](https://github.com/ctrf-io/ctrf) is an open standard built and shaped by community contributions.

Your feedback and contributions are essential to the project's success:

- [Contribute](CONTRIBUTING.md)
- [Discuss](https://github.com/orgs/ctrf-io/discussions)

## Support

You can support the project by giving this repository a star ⭐

## Usage

### Without Installation

Use `npx` to run the CLI without installing:

```bash
npx ctrf-cli@0.0.5-next-1 validate report.json
```

### Global Installation

Or install globally for repeated use:

```bash [npm]
npm install -g ctrf-cli@0.0.5-next-1
```

After global installation, use the `ctrf` command:

```bash
ctrf validate report.json
```

## Commands

| Command | Purpose |
|---------|---------|
| `merge` | Merge multiple CTRF reports into a single report |
| `validate` | Validate a CTRF report against the JSON schema |
| `validate-strict` | Strict validation with additionalProperties enforcement |
| `filter` | Filter tests from a CTRF report based on criteria |
| `generate-test-ids` | Generate deterministic UUIDs for all tests |
| `generate-report-id` | Generate a unique UUID v4 identifier for report |
| `add-insights` | Analyze trends and add insights across multiple reports |
| `flaky` | Identify and output flaky tests |

## Exit Codes

- `0`: Command completed successfully
- `1`: General error
- `2`: Validation failed
- `3`: File or directory not found
- `4`: Invalid CTRF report
- `5`: No CTRF reports found in directory

## merge

Combines multiple CTRF reports into a single unified report. **Writes to file.**

**Syntax:**

```sh
ctrf merge <directory> [--output <path>] [--keep-reports]
```

**Parameters:**

- `directory`: Path to directory containing CTRF reports (required)
- `--output, -o`: Output file path (default: ctrf-report.json)
- `--keep-reports, -k`: Preserve original reports after merging

**Example:**

```sh
ctrf merge ./reports --output ./merged.json
```

## validate

Validates CTRF report conformance to the JSON Schema specification. **Outputs to stdout.**

**Syntax:**

```sh
ctrf validate <file-path>
ctrf validate-strict <file-path>
```

**Parameters:**

- `file-path`: Path to CTRF report file (required)

**Modes:**

- `validate`: Standard validation allowing additional properties
- `validate-strict`: Strict validation enforcing additionalProperties: false

**Example:**

```sh
ctrf validate report.json
ctrf validate-strict report.json
```

## filter

Extracts a subset of tests from a CTRF report based on specified criteria. **Outputs to stdout or file.**

**Syntax:**

```sh
ctrf filter <file-path> [options]
```

**Parameters:**

- `file-path`: Path to CTRF report (use `-` for stdin) (required)
- `--id <uuid>`: Filter by test ID
- `--name <string>`: Filter by test name (exact match)
- `--status <statuses>`: Filter by status (comma-separated: passed,failed,skipped,pending,other)
- `--tags <tags>`: Filter by tags (comma-separated)
- `--suite <string>`: Filter by suite name (exact match)
- `--type <string>`: Filter by test type
- `--browser <string>`: Filter by browser
- `--device <string>`: Filter by device
- `--flaky`: Filter to flaky tests only
- `--output, -o`: Output file path (optional; defaults to stdout)

**Examples:**

```sh
# Filter failed tests to stdout
ctrf filter report.json --status failed

# Filter by multiple criteria and save to file
ctrf filter report.json --status failed,skipped --tags critical --output filtered.json

# Filter flaky tests and save
ctrf filter report.json --flaky --output flaky-report.json

# Read from stdin
cat report.json | ctrf filter - --status failed
```

## generate-test-ids

Generates deterministic UUID v5 identifiers for all tests in a report. **Outputs to stdout or file.**

**Syntax:**

```sh
ctrf generate-test-ids <file-path> [--output <path>]
```

**Parameters:**

- `file-path`: Path to CTRF report (use `-` for stdin) (required)
- `--output, -o`: Output file path (optional; defaults to stdout)

**Example:**

```sh
# Output to stdout
ctrf generate-test-ids report.json

# Save to file
ctrf generate-test-ids report.json --output report-with-ids.json
```

## generate-report-id

Generates a unique UUID v4 identifier for a CTRF report. **Outputs to stdout or file.**

**Syntax:**

```sh
ctrf generate-report-id <file-path> [--output <path>]
```

**Parameters:**

- `file-path`: Path to CTRF report (required)
- `--output, -o`: Output file path (optional; defaults to stdout)

**Example:**

```sh
# Output to stdout
ctrf generate-report-id report.json

# Save to file
ctrf generate-report-id report.json --output report-with-id.json
```

## add-insights

Analyzes historical test reports and adds insights metrics to the current report. **Writes to file (or stdout for piping).**

Reads all CTRF reports in the historical reports directory and calculates trends, patterns, and metrics. Writes the enhanced current report with insights appended.

**Syntax:**

```sh
ctrf add-insights <current-report> <historical-reports> [--output <path>]
```

**Parameters:**

- `current-report`: Path to the CTRF report file to enhance (required)
- `historical-reports`: Path to directory containing historical CTRF reports for analysis (required)
- `--output, -o`: Output file path for the report with insights (optional; defaults to stdout)

**Example:**

```sh
# Analyze historical reports and enhance current report
ctrf add-insights ./report.json ./historical-reports --output ./report-with-insights.json

# Output enhanced report to stdout for piping
ctrf add-insights ./report.json ./historical-reports | jq .
```

## flaky

Identifies and reports tests marked as flaky in a CTRF report. **Outputs to stdout.**

**Syntax:**

```sh
ctrf flaky <file-path>
```

**Parameters:**

- `file-path`: Path to CTRF report file (required)

**Example:**

```sh
ctrf flaky reports/sample-report.json
```

**Output:**

```bash
Processing report: reports/sample-report.json
Found 1 flaky test(s) in reports/sample-report.json:
- Test Name: Test 1, Retries: 2
```
