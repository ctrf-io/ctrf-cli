import fs from 'fs'
import path from 'path'
import { parse, addInsights, stringify, CTRFReport } from 'ctrf'

// Exit codes as per specification
const EXIT_SUCCESS = 0
const EXIT_GENERAL_ERROR = 1
const EXIT_FILE_NOT_FOUND = 3
const EXIT_NO_REPORTS = 5

export interface AddInsightsOptions {
  output?: string
}

export async function addInsightsCommand(
  directory: string,
  options: AddInsightsOptions = {}
): Promise<void> {
  try {
    const resolvedDir = path.resolve(directory)

    if (!fs.existsSync(resolvedDir)) {
      console.error(`Error: Directory not found: ${resolvedDir}`)
      process.exit(EXIT_FILE_NOT_FOUND)
    }

    if (!fs.statSync(resolvedDir).isDirectory()) {
      console.error(`Error: Path is not a directory: ${resolvedDir}`)
      process.exit(EXIT_GENERAL_ERROR)
    }

    // Read all JSON files from directory
    const files = fs.readdirSync(resolvedDir)
    const reports: CTRFReport[] = []
    let totalTests = 0

    for (const file of files) {
      if (path.extname(file) !== '.json') {
        continue
      }

      const filePath = path.join(resolvedDir, file)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const report = parse(fileContent)

        // Verify it's a valid CTRF report
        if (report && report.results && report.results.tests) {
          reports.push(report)
          totalTests += report.results.tests.length
        } else {
          console.warn(`Skipping non-CTRF file: ${file}`)
        }
      } catch {
        console.warn(`Skipping invalid file: ${file}`)
      }
    }

    if (reports.length === 0) {
      console.error('No valid CTRF reports found in the specified directory.')
      process.exit(EXIT_NO_REPORTS)
    }

    // Add insights using the library function
    // addInsights takes a current report and historical reports
    // Use the last report as current, and all others as historical
    const currentReport = reports[reports.length - 1]
    const historicalReports = reports.slice(0, -1)

    const reportWithInsights = addInsights(currentReport, historicalReports)

    // Output based on --output option
    if (options.output) {
      const outputPath = path.resolve(options.output)
      const outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputPath, stringify(reportWithInsights), 'utf-8')

      console.error(
        `✓ Analyzed ${reports.length} reports (${totalTests} total tests)`
      )
      console.error(
        `✓ Added insights including trends, patterns, and behavioral analysis`
      )
      console.error(`✓ Saved to ${options.output}`)
      process.exit(EXIT_SUCCESS)
    } else {
      // Print result with insights to stdout for piping
      const output = stringify(reportWithInsights)
      console.log(output)
      process.exit(EXIT_SUCCESS)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(EXIT_GENERAL_ERROR)
  }
}
