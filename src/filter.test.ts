import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  ReportBuilder,
  TestBuilder,
  filterTests,
  isCTRFReport,
  stringify,
  parse,
} from 'ctrf'
import { filterReport } from './filter.js'

describe('filterReport', () => {
  let tmpDir: string
  let reportPath: string
  let exitSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  const sampleReport = new ReportBuilder()
    .tool({ name: 'test-tool' })
    .addTest(
      new TestBuilder()
        .name('test 1')
        .status('passed')
        .duration(100)
        .tags(['smoke'])
        .suite(['Unit'])
        .browser('chrome')
        .build()
    )
    .addTest(
      new TestBuilder()
        .name('test 2')
        .status('failed')
        .duration(200)
        .tags(['regression'])
        .suite(['Integration'])
        .build()
    )
    .addTest(
      new TestBuilder()
        .name('test 3')
        .status('passed')
        .duration(150)
        .tags(['smoke', 'regression'])
        .suite(['Unit'])
        .build()
    )
    .addTest(
      new TestBuilder()
        .name('test 4')
        .status('failed')
        .duration(180)
        .tags(['regression'])
        .suite(['E2E'])
        .device('mobile')
        .build()
    )
    .addTest(
      new TestBuilder()
        .name('test 5')
        .status('skipped')
        .duration(0)
        .tags(['flaky'])
        .suite(['Unit'])
        .flaky(true)
        .build()
    )
    .build()

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-filter-test-'))
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

  describe('status filtering', () => {
    it('should filter by single status', async () => {
      await filterReport(reportPath, { status: 'failed' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(2)
      expect(
        result.results.tests.every((t: any) => t.status === 'failed')
      ).toBe(true)
      expect(result.results.summary.failed).toBe(2)
    })

    it('should filter by multiple statuses (OR logic)', async () => {
      await filterReport(reportPath, { status: 'passed,failed' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(4)
      expect(
        result.results.tests.every((t: any) =>
          ['passed', 'failed'].includes(t.status)
        )
      ).toBe(true)
    })
  })

  describe('tags filtering', () => {
    it('should filter by tag', async () => {
      await filterReport(reportPath, { tags: 'smoke' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0] as string
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(2)
      expect(
        result.results.tests.every((t: any) => t.tags?.includes('smoke'))
      ).toBe(true)

      // Verify the output is a valid CTRF report
      expect(isCTRFReport(result)).toBe(true)
    })
  })

  describe('suite filtering', () => {
    it('should filter by suite', async () => {
      await filterReport(reportPath, { suite: 'Unit' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(3)
    })
  })

  describe('flaky filtering', () => {
    it('should filter to flaky tests only', async () => {
      await filterReport(reportPath, { flaky: true })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(1)
      expect(result.results.tests[0].name).toBe('test 5')
    })
  })

  describe('browser filtering', () => {
    it('should filter by browser', async () => {
      await filterReport(reportPath, { browser: 'chrome' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(1)
      expect(result.results.tests[0].name).toBe('test 1')
    })
  })

  describe('device filtering', () => {
    it('should filter by device', async () => {
      await filterReport(reportPath, { device: 'mobile' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(1)
      expect(result.results.tests[0].name).toBe('test 4')
    })
  })

  describe('combined filtering (AND logic)', () => {
    it('should apply multiple criteria with AND logic', async () => {
      await filterReport(reportPath, { status: 'passed', suite: 'Unit' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(2)
      expect(
        result.results.tests.every((t: any) => t.status === 'passed')
      ).toBe(true)
    })
  })

  describe('output option', () => {
    it('should write to file when --output is specified', async () => {
      const outputPath = path.join(tmpDir, 'filtered.json')

      await filterReport(reportPath, { status: 'failed', output: outputPath })
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(fs.existsSync(outputPath)).toBe(true)

      const savedContent = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
      expect(savedContent.results.tests).toHaveLength(2)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 2 tests')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Saved to')
      )
    })
  })

  describe('error handling', () => {
    it('should exit with code 3 for file not found', async () => {
      const nonExistentPath = path.join(tmpDir, 'nonexistent.json')
      await filterReport(nonExistentPath, {})
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
    })

    it('should produce valid CTRF output', async () => {
      await filterReport(reportPath, { status: 'failed' })
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      // Verify it's a valid CTRF structure
      expect(result.reportFormat).toBe('CTRF')
      expect(result.specVersion).toBeDefined()
      expect(result.results).toBeDefined()
      expect(result.results.tool).toBeDefined()
      expect(result.results.summary).toBeDefined()
      expect(result.results.tests).toBeDefined()
    })
  })
})
