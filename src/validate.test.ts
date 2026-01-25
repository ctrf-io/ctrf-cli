import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  ReportBuilder,
  TestBuilder,
  validate,
  isCTRFReport,
  stringify,
  parse,
} from 'ctrf'
import { validateReport } from './validate.js'

describe('validateReport', () => {
  let tmpDir: string
  let validReportPath: string
  let invalidReportPath: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  const validReport = new ReportBuilder()
    .tool({ name: 'test-tool' })
    .addTest(
      new TestBuilder().name('test 1').status('passed').duration(100).build()
    )
    .addTest(
      new TestBuilder().name('test 2').status('failed').duration(200).build()
    )
    .build()

  const invalidReport = {
    results: {
      tests: [],
    },
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-validate-test-'))

    validReportPath = path.join(tmpDir, 'valid-report.json')
    invalidReportPath = path.join(tmpDir, 'invalid-report.json')

    fs.writeFileSync(validReportPath, JSON.stringify(validReport, null, 2))
    fs.writeFileSync(invalidReportPath, JSON.stringify(invalidReport, null, 2))

    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined as never) as any) as any
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    exitSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('validate (non-strict)', () => {
    it('should validate a valid CTRF report', async () => {
      await validateReport(validReportPath, false)
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('is valid CTRF')
      )

      const reportContent = fs.readFileSync(validReportPath, 'utf-8')
      const parsedReport = parse(reportContent)
      const result = validate(parsedReport)
      expect(result.valid).toBe(true)
    })

    it('should reject an invalid CTRF report', async () => {
      await validateReport(invalidReportPath, false)
      expect(exitSpy).toHaveBeenCalledWith(2)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed validation')
      )
    })

    it('should exit with code 3 for file not found', async () => {
      const nonExistentPath = path.join(tmpDir, 'nonexistent.json')
      await validateReport(nonExistentPath, false)
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
    })

    it('should exit with code 4 for invalid JSON', async () => {
      const invalidJsonPath = path.join(tmpDir, 'invalid.json')
      fs.writeFileSync(invalidJsonPath, 'not valid json')
      await validateReport(invalidJsonPath, false)
      expect(exitSpy).toHaveBeenCalledWith(4)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid CTRF report')
      )
    })
  })

  describe('validate-strict', () => {
    it('should validate a valid CTRF report in strict mode', async () => {
      await validateReport(validReportPath, true)
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('is valid CTRF (strict)')
      )
    })

    it('should reject an invalid CTRF report in strict mode', async () => {
      await validateReport(invalidReportPath, true)
      expect(exitSpy).toHaveBeenCalledWith(2)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed strict validation')
      )
    })
  })
})
