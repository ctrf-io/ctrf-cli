import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  ReportBuilder,
  TestBuilder,
  generateTestId,
  stringify,
  parse,
} from 'ctrf'
import { generateTestIds } from './generate-test-ids.js'

describe('generateTestIds', () => {
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
    .addTest(
      new TestBuilder().name('test 3').status('passed').duration(150).build()
    )
    .build()

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-generate-ids-test-'))
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

  describe('ID generation', () => {
    it('should generate IDs for all tests', async () => {
      await generateTestIds(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0] as string
      const result = JSON.parse(output as string)

      expect(result.results.tests).toHaveLength(3)
      expect(result.results.tests.every((t: any) => t.id)).toBe(true)
    })

    it('should generate deterministic IDs (same input = same ID)', async () => {
      await generateTestIds(reportPath)
      const output1 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)

      consoleLogSpy.mockClear()
      await generateTestIds(reportPath)
      const output2 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)

      expect(output1.results.tests[0].id).toBe(output2.results.tests[0].id)
      expect(output1.results.tests[1].id).toBe(output2.results.tests[1].id)
      expect(output1.results.tests[2].id).toBe(output2.results.tests[2].id)
    })

    it('should generate UUIDs', async () => {
      await generateTestIds(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      const output = consoleLogSpy.mock.calls[0][0]
      const result = JSON.parse(output as string)

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      result.results.tests.forEach((test: any) => {
        expect(test.id).toMatch(uuidRegex)
      })
    })
  })

  describe('output option', () => {
    it('should write to file when --output is specified', async () => {
      const outputPath = path.join(tmpDir, 'with-ids.json')

      await generateTestIds(reportPath, { output: outputPath })
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(fs.existsSync(outputPath)).toBe(true)

      const savedContent = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
      expect(savedContent.results.tests.every((t: any) => t.id)).toBe(true)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated IDs for 3 tests')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Saved to')
      )
    })

    it('should print to stdout when no --output specified', async () => {
      await generateTestIds(reportPath)
      expect(exitSpy).toHaveBeenCalledWith(0)

      expect(consoleLogSpy).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls[0][0]
      expect(() => JSON.parse(output as string)).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should exit with code 3 for file not found', async () => {
      const nonExistentPath = path.join(tmpDir, 'nonexistent.json')
      await generateTestIds(nonExistentPath)
      expect(exitSpy).toHaveBeenCalledWith(3)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
    })

    it('should exit with code 4 for invalid JSON', async () => {
      const invalidJsonPath = path.join(tmpDir, 'invalid.json')
      fs.writeFileSync(invalidJsonPath, 'not valid json')
      await generateTestIds(invalidJsonPath)
      expect(exitSpy).toHaveBeenCalledWith(4)
    })
  })

  describe('output validity', () => {
    it('should produce valid CTRF output', async () => {
      await generateTestIds(reportPath)
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
