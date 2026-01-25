import fs from 'fs'
import path from 'path'
import {
  parse,
  filterTests,
  stringify,
  calculateSummary,
  CTRFReport,
  TestStatus,
  FilterCriteria,
} from 'ctrf'

// Exit codes as per specification
const EXIT_SUCCESS = 0
const EXIT_GENERAL_ERROR = 1
const EXIT_FILE_NOT_FOUND = 3
const EXIT_INVALID_CTRF = 4

export interface FilterOptions {
  id?: string
  name?: string
  status?: string
  tags?: string
  suite?: string
  type?: string
  browser?: string
  device?: string
  flaky?: boolean
  output?: string
}

export async function filterReport(
  filePath: string,
  options: FilterOptions
): Promise<void> {
  try {
    let fileContent: string
    let displayPath: string

    if (filePath === '-') {
      // Read from stdin
      fileContent = await readStdin()
      displayPath = 'stdin'
    } else {
      const resolvedPath = path.resolve(filePath)

      if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: File not found: ${resolvedPath}`)
        process.exit(EXIT_FILE_NOT_FOUND)
      }

      fileContent = fs.readFileSync(resolvedPath, 'utf-8')
      displayPath = path.basename(filePath)
    }

    let report: CTRFReport
    try {
      report = parse(fileContent)
    } catch (parseError) {
      console.error(
        `Error: Invalid CTRF report - ${(parseError as Error).message}`
      )
      process.exit(EXIT_INVALID_CTRF)
    }

    // Build filter criteria
    const criteria: FilterCriteria = {}

    if (options.id) {
      criteria.id = options.id
    }

    if (options.name) {
      criteria.name = options.name
    }

    if (options.status) {
      // Support comma-separated statuses (OR logic)
      const statuses = options.status
        .split(',')
        .map(s => s.trim() as TestStatus)
      criteria.status = statuses
    }

    if (options.tags) {
      // Support comma-separated tags
      const tags = options.tags.split(',').map(t => t.trim())
      criteria.tags = tags
    }

    if (options.suite) {
      criteria.suite = options.suite
    }

    // Note: 'type' filtering is not supported by the library FilterCriteria
    // If needed, filter manually after filterTests call

    if (options.browser) {
      criteria.browser = options.browser
    }

    if (options.device) {
      criteria.device = options.device
    }

    if (options.flaky !== undefined) {
      criteria.flaky = options.flaky
    }

    // Apply filters using the library function
    let filteredTests = filterTests(report, criteria)

    // Apply type filter manually if specified (not in library FilterCriteria)
    if (options.type) {
      filteredTests = filteredTests.filter(test => test.type === options.type)
    }

    // Build new valid CTRF report with filtered tests
    const filteredReport: CTRFReport = {
      ...report,
      results: {
        ...report.results,
        tests: filteredTests,
        summary: calculateSummary(filteredTests),
      },
    }

    // Output based on --output option
    const output = stringify(filteredReport)

    if (options.output) {
      const outputPath = path.resolve(options.output)
      const outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputPath, output, 'utf-8')
      console.error(
        `✓ Filtered ${filteredTests.length} tests from ${displayPath}`
      )
      console.error(`✓ Saved to ${options.output}`)
      process.exit(EXIT_SUCCESS)
    } else {
      // Print to stdout for piping
      console.log(output)
      process.exit(EXIT_SUCCESS)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(EXIT_GENERAL_ERROR)
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', chunk => {
      data += chunk
    })
    process.stdin.on('end', () => {
      resolve(data)
    })
    process.stdin.on('error', reject)
  })
}
