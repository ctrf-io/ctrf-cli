import fs from 'fs'
import path from 'path'
import { parse, addInsights, stringify, CTRFReport } from 'ctrf'

// Exit codes as per specification
const EXIT_SUCCESS = 0
const EXIT_GENERAL_ERROR = 1
const EXIT_FILE_NOT_FOUND = 3

export interface AddInsightsOptions {
  output?: string
}

export async function addInsightsCommand(
  currentReportPath: string,
  historicalReportsDirectory: string,
  options: AddInsightsOptions = {}
): Promise<void> {
  try {
    const resolvedCurrentPath = path.resolve(currentReportPath)
    const resolvedHistoricalDir = path.resolve(historicalReportsDirectory)

    if (!fs.existsSync(resolvedCurrentPath)) {
      console.error(`Error: Report file not found: ${resolvedCurrentPath}`)
      process.exit(EXIT_FILE_NOT_FOUND)
    }

    if (!fs.statSync(resolvedCurrentPath).isFile()) {
      console.error(`Error: Path is not a file: ${resolvedCurrentPath}`)
      process.exit(EXIT_GENERAL_ERROR)
    }

    if (!fs.existsSync(resolvedHistoricalDir)) {
      console.error(`Error: Directory not found: ${resolvedHistoricalDir}`)
      process.exit(EXIT_FILE_NOT_FOUND)
    }

    if (!fs.statSync(resolvedHistoricalDir).isDirectory()) {
      console.error(`Error: Path is not a directory: ${resolvedHistoricalDir}`)
      process.exit(EXIT_GENERAL_ERROR)
    }

    let currentReport: CTRFReport
    try {
      const currentContent = fs.readFileSync(resolvedCurrentPath, 'utf-8')
      currentReport = parse(currentContent)

      if (
        !currentReport ||
        !currentReport.results ||
        !currentReport.results.tests
      ) {
        console.error(`Error: Invalid CTRF report: ${resolvedCurrentPath}`)
        process.exit(EXIT_GENERAL_ERROR)
      }
    } catch {
      console.error(
        `Error: Failed to parse current report: ${resolvedCurrentPath}`
      )
      process.exit(EXIT_GENERAL_ERROR)
    }

    const files = fs.readdirSync(resolvedHistoricalDir)
    const historicalReports: CTRFReport[] = []
    let totalHistoricalTests = 0

    for (const file of files) {
      if (path.extname(file) !== '.json') {
        continue
      }

      const filePath = path.join(resolvedHistoricalDir, file)
      const resolvedFilePath = path.resolve(filePath)

      // Skip current report if it appears in historical directory
      // Use lowercase comparison for case-insensitive filesystems (Windows, macOS)
      if (
        resolvedFilePath.toLowerCase() === resolvedCurrentPath.toLowerCase()
      ) {
        console.warn(
          'Note: Current report found in historical reports directory and excluded from analysis'
        )
        continue
      }

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const report = parse(fileContent)

        if (report && report.results && report.results.tests) {
          historicalReports.push(report)
          totalHistoricalTests += report.results.tests.length
        } else {
          console.warn(`Skipping non-CTRF file: ${file}`)
        }
      } catch {
        console.warn(`Skipping invalid file: ${file}`)
      }
    }

    if (historicalReports.length === 0) {
      console.warn(
        'No valid CTRF historical reports found in the specified directory.'
      )
    }

    const reportWithInsights = addInsights(currentReport, historicalReports)

    if (options.output) {
      const outputPath = path.resolve(options.output)
      const outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputPath, stringify(reportWithInsights), 'utf-8')

      console.error(
        `✓ Analyzed current report with ${historicalReports.length} historical report(s) (${totalHistoricalTests} total tests)`
      )
      console.error(
        `✓ Added insights including trends, patterns, and behavioral analysis`
      )
      console.error(`✓ Saved to ${options.output}`)
      process.exit(EXIT_SUCCESS)
    } else {
      const output = stringify(reportWithInsights)
      console.log(output)
      process.exit(EXIT_SUCCESS)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(EXIT_GENERAL_ERROR)
  }
}
