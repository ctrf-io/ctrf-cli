import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  ReportBuilder,
  TestBuilder,
  generateReportId,
  stringify,
  parse,
} from 'ctrf'
import { generateReportIdCommand } from './generate-report-id.js'

describe('generateReportIdCommand', () => {
  let tmpDir: string
  let reportPath: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  const sampleReport = new ReportBuilder()
    .tool({ name: 'test-tool' })
    .addTest(
      new TestBuilder().name('test 1').status('passed').duration(100).build()
    )
    .addTest(
      new TestBuilder().name('test 2').status('failed').duration(200).build()
    )
    .build()

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-report-id-test-'))
    reportPath = path.join(tmpDir, 'report.json')
    fs.writeFileSync(reportPath, JSON.stringify(sampleReport, null, 2))

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

  describe('report ID generation', () => {
    it('should add reportId to the report', async () => {
      await generateReportIdCommand(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.reportId).toBeDefined()
    })

    it('should generate a UUID', async () => {
      await generateReportIdCommand(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0] as string
      const result = JSON.parse(output as string)

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(result.reportId)).toBe(true)
    })

    it('should generate unique IDs on each call', async () => {
      await generateReportIdCommand(reportPath)
      const output1 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)

      consoleLogSpy.mockClear()
      await generateReportIdCommand(reportPath)
      const output2 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)

      expect(output1.reportId).not.toBe(output2.reportId)
    })

    it('should replace existing reportId', async () => {
      const reportWithId = { ...sampleReport, reportId: 'existing-id' }
      const pathWithId = path.join(tmpDir, 'report-with-id.json')
      fs.writeFileSync(pathWithId, JSON.stringify(reportWithId, null, 2))

      await generateReportIdCommand(pathWithId)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.reportId).not.toBe('existing-id')
    })
  })

  describe('output option', () => {
    it('should write to file when --output is specified', async () => {
      const outputPath = path.join(tmpDir, 'with-id.json')

      await generateReportIdCommand(reportPath, { output: outputPath })
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(fs.existsSync(outputPath)).toBe(true)

      const savedContent = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
      expect(savedContent.reportId).toBeDefined()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated report ID')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Saved to')
      )
    })

    it('should print to stdout when no --output specified', async () => {
      await generateReportIdCommand(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(consoleLogSpy).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls[0][0]
      expect(() => JSON.parse(output as string)).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should exit with code 3 for file not found', async () => {
      const nonExistentPath = path.join(tmpDir, 'nonexistent.json')
      await generateReportIdCommand(nonExistentPath)
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
    })

    it('should exit with code 4 for invalid JSON', async () => {
      const invalidJsonPath = path.join(tmpDir, 'invalid.json')
      fs.writeFileSync(invalidJsonPath, 'not valid json')
      await generateReportIdCommand(invalidJsonPath)
      expect(exitSpy).toHaveBeenCalledWith(4)
    })
  })

  describe('output validity', () => {
    it('should produce valid CTRF output', async () => {
      await generateReportIdCommand(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.reportFormat).toBe('CTRF')
      expect(result.specVersion).toBeDefined()
      expect(result.results).toBeDefined()
      expect(result.results.tool).toBeDefined()
      expect(result.results.summary).toBeDefined()
      expect(result.results.tests).toBeDefined()
    })
  })
})
