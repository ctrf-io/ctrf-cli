import fs from 'fs'
import path from 'path'
import { parse, generateReportId, stringify, CTRFReport } from 'ctrf'

// Exit codes as per specification
const EXIT_SUCCESS = 0
const EXIT_GENERAL_ERROR = 1
const EXIT_FILE_NOT_FOUND = 3
const EXIT_INVALID_CTRF = 4

export interface GenerateReportIdOptions {
  output?: string
}

export async function generateReportIdCommand(
  filePath: string,
  options: GenerateReportIdOptions = {}
): Promise<void> {
  try {
    const resolvedPath = path.resolve(filePath)

    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`)
      process.exit(EXIT_FILE_NOT_FOUND)
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8')

    let report: CTRFReport
    try {
      report = parse(fileContent)
    } catch (parseError) {
      console.error(
        `Error: Invalid CTRF report - ${(parseError as Error).message}`
      )
      process.exit(EXIT_INVALID_CTRF)
    }

    // Generate report ID using the library function
    const reportId = generateReportId()

    // Build updated report with reportId at top level
    const updatedReport: CTRFReport = {
      ...report,
      reportId,
    }

    // Output based on --output option
    const output = stringify(updatedReport)

    if (options.output) {
      const outputPath = path.resolve(options.output)
      const outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputPath, output, 'utf-8')
      console.error(`✓ Generated report ID: ${reportId}`)
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
