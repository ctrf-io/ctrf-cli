import fs from 'fs'
import path from 'path'
import {
  parse,
  validate,
  validateStrict,
  ValidationResult,
  ValidationError,
} from 'ctrf'
import {
  EXIT_SUCCESS,
  EXIT_GENERAL_ERROR,
  EXIT_VALIDATION_FAILED,
  EXIT_FILE_NOT_FOUND,
  EXIT_INVALID_CTRF,
} from './exit-codes.js'

export async function validateReport(
  filePath: string,
  strict: boolean = false
): Promise<void> {
  try {
    const resolvedPath = path.resolve(filePath)

    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`)
      process.exit(EXIT_FILE_NOT_FOUND)
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8')

    let report
    try {
      report = parse(fileContent)
    } catch (parseError) {
      console.error(
        `Error: Invalid CTRF report - ${(parseError as Error).message}`
      )
      process.exit(EXIT_INVALID_CTRF)
    }

    if (strict) {
      try {
        validateStrict(report)
        console.log(`✓ ${path.basename(filePath)} is valid CTRF (strict)`)
        process.exit(EXIT_SUCCESS)
      } catch (error) {
        console.error(`✗ ${path.basename(filePath)} failed strict validation:`)
        if (error instanceof ValidationError && error.errors) {
          error.errors.forEach(err => {
            const errPath = err.path || ''
            const errMessage = err.message || String(err)
            console.error(`  - ${errPath ? errPath + ': ' : ''}${errMessage}`)
          })
        } else {
          console.error(`  - ${(error as Error).message}`)
        }
        process.exit(EXIT_VALIDATION_FAILED)
      }
    } else {
      const validationResult: ValidationResult = validate(report)

      if (validationResult.valid) {
        console.log(`✓ ${path.basename(filePath)} is valid CTRF`)
        process.exit(EXIT_SUCCESS)
      } else {
        console.error(`✗ ${path.basename(filePath)} failed validation:`)
        if (validationResult.errors && validationResult.errors.length > 0) {
          validationResult.errors.forEach(error => {
            const errPath = error.path || ''
            const errMessage = error.message || String(error)
            console.error(`  - ${errPath ? errPath + ': ' : ''}${errMessage}`)
          })
        }
        process.exit(EXIT_VALIDATION_FAILED)
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`)
    process.exit(EXIT_GENERAL_ERROR)
  }
}
