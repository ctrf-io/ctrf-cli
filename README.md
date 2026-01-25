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

Combines multiple CTRF reports into a single unified report.

**Syntax:**

```sh
ctrf-cli merge <directory> [--output <path>] [--keep-reports]
```

**Parameters:**

- `directory`: Path to directory containing CTRF reports (required)
- `--output, -o`: Output file path (default: ctrf-report.json)
- `--keep-reports, -k`: Preserve original reports after merging

**Example:**

```sh
npx ctrf-cli@0.0.4 merge ./reports --output ./merged.json
```

## validate

Validates CTRF report conformance to the JSON Schema specification.

**Syntax:**

```sh
ctrf-cli validate <file-path>
ctrf-cli validate-strict <file-path>
```

**Parameters:**

- `file-path`: Path to CTRF report file (required)

**Modes:**

- `validate`: Standard validation allowing additional properties
- `validate-strict`: Strict validation enforcing additionalProperties: false

**Example:**

```sh
npx ctrf-cli@0.0.4 validate report.json
npx ctrf-cli@0.0.4 validate-strict report.json
```

## filter

Extracts a subset of tests from a CTRF report based on specified criteria.

**Syntax:**

```sh
ctrf-cli filter <file-path> [options]
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
- `--output, -o`: Output file path (default: stdout)

**Examples:**

```sh
# Filter failed tests
npx ctrf-cli@0.0.4 filter report.json --status failed

# Filter by multiple criteria
npx ctrf-cli@0.0.4 filter report.json --status failed,skipped --tags critical

# Filter flaky tests and save
npx ctrf-cli@0.0.4 filter report.json --flaky --output flaky-report.json

# Read from stdin
cat report.json | npx ctrf-cli@0.0.4 filter - --status failed
```

## generate-test-ids

Generates deterministic UUID v5 identifiers for all tests in a report.

**Syntax:**

```sh
ctrf-cli generate-test-ids <file-path> [--output <path>]
```

**Parameters:**

- `file-path`: Path to CTRF report (use `-` for stdin) (required)
- `--output, -o`: Output file path (default: stdout)

**Example:**

```sh
npx ctrf-cli@0.0.4 generate-test-ids report.json --output report-with-ids.json
```

## generate-report-id

Generates a unique UUID v4 identifier for a CTRF report.

**Syntax:**

```sh
ctrf-cli generate-report-id <file-path> [--output <path>]
```

**Parameters:**

- `file-path`: Path to CTRF report (required)
- `--output, -o`: Output file path (default: stdout)

**Example:**

```sh
npx ctrf-cli@0.0.4 generate-report-id report.json --output report-with-id.json
```

## add-insights

Performs historical analysis across multiple CTRF reports to identify trends and patterns.

**Syntax:**

```sh
ctrf-cli add-insights <directory> [--output <path>]
```

**Parameters:**

- `directory`: Path to directory containing CTRF reports (required)
- `--output, -o`: Output directory for enhanced reports (default: stdout)

**Example:**

```sh
npx ctrf-cli@0.0.4 add-insights ./reports --output ./reports-with-insights
```

## flaky

Identifies and reports tests marked as flaky in a CTRF report.

**Syntax:**

```sh
ctrf-cli flaky <file-path>
```

**Parameters:**

- `file-path`: Path to CTRF report file (required)

**Example:**

```sh
npx ctrf-cli@0.0.4 flaky reports/sample-report.json
```

**Output:**

```bash
Processing report: reports/sample-report.json
Found 1 flaky test(s) in reports/sample-report.json:
- Test Name: Test 1, Retries: 2
```
