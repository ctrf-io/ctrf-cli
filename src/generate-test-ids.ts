import fs from 'fs'
import path from 'path'
import { parse, generateTestId, stringify, CTRFReport, Test } from 'ctrf'

const EXIT_SUCCESS = 0
const EXIT_GENERAL_ERROR = 1
const EXIT_FILE_NOT_FOUND = 3
const EXIT_INVALID_CTRF = 4

export interface GenerateTestIdsOptions {
  output?: string
}

export async function generateTestIds(
  filePath: string,
  options: GenerateTestIdsOptions = {}
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

    const testsWithIds: Test[] = report.results.tests.map(test => ({
      ...test,
      id: generateTestId(test),
    }))

    const updatedReport: CTRFReport = {
      ...report,
      results: {
        ...report.results,
        tests: testsWithIds,
      },
    }

    const output = stringify(updatedReport)

    if (options.output) {
      const outputPath = path.resolve(options.output)
      const outputDir = path.dirname(outputPath)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputPath, output, 'utf-8')
      console.error(`✓ Generated IDs for ${testsWithIds.length} tests`)
      console.error(`✓ Saved to ${options.output}`)
      process.exit(EXIT_SUCCESS)
    } else {
      console.log(output)
      process.exit(EXIT_SUCCESS)
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(EXIT_GENERAL_ERROR)
  }
}
