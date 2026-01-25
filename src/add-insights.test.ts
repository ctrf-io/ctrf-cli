import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { ReportBuilder, TestBuilder, addInsights, stringify, parse } from 'ctrf'
import { addInsightsCommand } from './add-insights.js'

describe('addInsightsCommand', () => {
  let tmpDir: string
  let currentReportPath: string
  let historicalReportsDir: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  const createReport = (
    index: number,
    passedCount: number,
    failedCount: number
  ) => {
    const builder = new ReportBuilder().tool({ name: 'test-tool' })

    for (let i = 0; i < passedCount; i++) {
      builder.addTest(
        new TestBuilder()
          .name(`test ${i + 1}`)
          .status('passed')
          .duration(100 + i * 10)
          .build()
      )
    }

    for (let i = 0; i < failedCount; i++) {
      builder.addTest(
        new TestBuilder()
          .name(`test ${passedCount + i + 1}`)
          .status('failed')
          .duration(200 + i * 10)
          .build()
      )
    }

    return builder.build()
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-insights-test-'))
    historicalReportsDir = path.join(tmpDir, 'historical')
    fs.mkdirSync(historicalReportsDir, { recursive: true })

    // Create multiple historical reports
    fs.writeFileSync(
      path.join(historicalReportsDir, 'report1.json'),
      JSON.stringify(createReport(1, 8, 2), null, 2)
    )
    fs.writeFileSync(
      path.join(historicalReportsDir, 'report2.json'),
      JSON.stringify(createReport(2, 7, 3), null, 2)
    )

    // Create current report
    currentReportPath = path.join(tmpDir, 'current-report.json')
    fs.writeFileSync(
      currentReportPath,
      JSON.stringify(createReport(3, 9, 1), null, 2)
    )

    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined as never) as any) as any
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    exitSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('insights generation', () => {
    it('should analyze historical reports and add insights to current report', async () => {
      await addInsightsCommand(currentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0] as string
      const result = JSON.parse(output)

      // Should have the report with insights
      expect(result.reportFormat).toBe('CTRF')
      expect(result.results).toBeDefined()
    })

    it('should produce valid CTRF output', async () => {
      await addInsightsCommand(currentReportPath, historicalReportsDir)
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

  describe('output option', () => {
    it('should write to file when --output is specified', async () => {
      const outputPath = path.join(tmpDir, 'with-insights.json')

      await addInsightsCommand(currentReportPath, historicalReportsDir, {
        output: outputPath,
      })
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(fs.existsSync(outputPath)).toBe(true)

      const savedContent = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
      expect(savedContent.reportFormat).toBe('CTRF')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analyzed')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Saved to')
      )
    })

    it('should print to stdout when no --output specified', async () => {
      await addInsightsCommand(currentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(consoleLogSpy).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls[0][0]
      expect(() => JSON.parse(output as string)).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should exit with code 3 for current report not found', async () => {
      const nonExistentReportPath = path.join(tmpDir, 'nonexistent.json')
      await addInsightsCommand(nonExistentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Report file not found')
      )
    })

    it('should exit with code 3 for historical directory not found', async () => {
      const nonExistentDir = path.join(tmpDir, 'nonexistent')
      await addInsightsCommand(currentReportPath, nonExistentDir)
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Directory not found')
      )
    })

    it('should warn but succeed when no valid historical reports found', async () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir, { recursive: true })

      await addInsightsCommand(currentReportPath, emptyDir)
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid CTRF historical reports found')
      )
    })

    it('should skip non-CTRF files with warning', async () => {
      // Add a non-CTRF file
      fs.writeFileSync(
        path.join(historicalReportsDir, 'not-ctrf.json'),
        JSON.stringify({ foo: 'bar' })
      )

      await addInsightsCommand(currentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(0)

      // Should still succeed with valid reports
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should skip invalid JSON files', async () => {
      // Add an invalid JSON file
      fs.writeFileSync(
        path.join(historicalReportsDir, 'invalid.json'),
        'not valid json'
      )

      await addInsightsCommand(currentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(0)

      // Should still succeed with valid reports
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('single historical report', () => {
    it('should work with a single historical report', async () => {
      await addInsightsCommand(currentReportPath, historicalReportsDir)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.reportFormat).toBe('CTRF')
    })
  })

  describe('current report in historical directory', () => {
    it('should exclude current report if it has the same absolute path', async () => {
      // Create historical directory as parent of current report
      const parentDir = tmpDir
      const reportsDirAsParent = path.join(parentDir, 'reports')
      fs.mkdirSync(reportsDirAsParent, { recursive: true })

      // Create a report in the parent (which will be in both places)
      const reportInParent = path.join(parentDir, 'report.json')
      fs.writeFileSync(
        reportInParent,
        JSON.stringify(createReport(1, 8, 2), null, 2)
      )

      // Also create another historical report
      fs.writeFileSync(
        path.join(reportsDirAsParent, 'historical.json'),
        JSON.stringify(createReport(2, 7, 3), null, 2)
      )

      await addInsightsCommand(reportInParent, reportsDirAsParent)
      expect(exitSpy).toHaveBeenCalledWith(0)

      // Should succeed even if no actual historical reports (after exclusion)
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })
})
