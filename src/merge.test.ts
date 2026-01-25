import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { mergeReports } from './merge.js'

describe('mergeReports', () => {
  let tmpDir: string
  let testReportDir: string
  let testReport1: string
  let testReport2: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-merge-test-'))
    testReportDir = path.join(tmpDir, 'reports')
    fs.mkdirSync(testReportDir, { recursive: true })

    const report1 = {
      results: {
        tool: { name: 'test-tool' },
        summary: {
          tests: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 1708979371669,
          stop: 1708979388927,
        },
        tests: [
          {
            name: 'test 1',
            status: 'passed',
            duration: 100,
          },
          {
            name: 'test 2',
            status: 'failed',
            duration: 200,
          },
        ],
      },
    }

    const report2 = {
      results: {
        tool: { name: 'test-tool' },
        summary: {
          tests: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 1708979400000,
          stop: 1708979410000,
        },
        tests: [
          {
            name: 'test 3',
            status: 'passed',
            duration: 150,
          },
        ],
      },
    }

    testReport1 = path.join(testReportDir, 'report1.json')
    testReport2 = path.join(testReportDir, 'report2.json')

    fs.writeFileSync(testReport1, JSON.stringify(report1, null, 2))
    fs.writeFileSync(testReport2, JSON.stringify(report2, null, 2))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('output path handling', () => {
    it('should save with custom filename in input directory', async () => {
      const outputFilename = 'my-merged-report.json'
      await mergeReports(testReportDir, outputFilename, true)

      const outputPath = path.join(testReportDir, outputFilename)
      expect(fs.existsSync(outputPath)).toBe(true)

      const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
      expect(merged.results.summary.tests).toBe(3)
      expect(merged.results.summary.passed).toBe(2)
      expect(merged.results.summary.failed).toBe(1)
    })

    it('should save with relative path from current directory', async () => {
      const outputDir = path.join(tmpDir, 'output')
      const outputPath = path.join(outputDir, 'merged.json')
      const relativeOutputPath = path.join(outputDir, 'merged.json')

      const originalCwd = process.cwd()
      try {
        process.chdir(tmpDir)
        await mergeReports(testReportDir, relativeOutputPath, true)

        expect(fs.existsSync(outputPath)).toBe(true)

        const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
        expect(merged.results.summary.tests).toBe(3)
        expect(merged.results.summary.passed).toBe(2)
        expect(merged.results.summary.failed).toBe(1)
      } finally {
        process.chdir(originalCwd)
      }
    })

    it('should save to directory with default filename', async () => {
      const outputDirPath = path.join(tmpDir, 'output')
      await mergeReports(testReportDir, outputDirPath + '/', true)

      const expectedOutputPath = path.join(outputDirPath, 'ctrf-report.json')
      expect(fs.existsSync(expectedOutputPath)).toBe(true)

      const merged = JSON.parse(fs.readFileSync(expectedOutputPath, 'utf8'))
      expect(merged.results.summary.tests).toBe(3)
      expect(merged.results.summary.passed).toBe(2)
      expect(merged.results.summary.failed).toBe(1)
    })

    it('should save to absolute path', async () => {
      const outputAbsPath = path.join(tmpDir, 'absolute-output', 'merged.json')
      await mergeReports(testReportDir, outputAbsPath, true)

      expect(fs.existsSync(outputAbsPath)).toBe(true)

      const merged = JSON.parse(fs.readFileSync(outputAbsPath, 'utf8'))
      expect(merged.results.summary.tests).toBe(3)
      expect(merged.results.summary.passed).toBe(2)
      expect(merged.results.summary.failed).toBe(1)
    })

    it('should detect directory without trailing slash and use default filename', async () => {
      const outputDirPath = path.join(tmpDir, 'output-no-slash')
      fs.mkdirSync(outputDirPath, { recursive: true })
      await mergeReports(testReportDir, outputDirPath, true)

      const expectedOutputPath = path.join(outputDirPath, 'ctrf-report.json')
      expect(fs.existsSync(expectedOutputPath)).toBe(true)

      const merged = JSON.parse(fs.readFileSync(expectedOutputPath, 'utf8'))
      expect(merged.results.summary.tests).toBe(3)
    })

    it('should create nested output directories if they do not exist', async () => {
      const outputPath = path.join(
        tmpDir,
        'deep',
        'nested',
        'output',
        'merged.json'
      )
      await mergeReports(testReportDir, outputPath, true)

      expect(fs.existsSync(outputPath)).toBe(true)

      const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
      expect(merged.results.summary.tests).toBe(3)
    })
  })

  describe('report merging', () => {
    it('should correctly merge test summaries', async () => {
      const outputPath = path.join(tmpDir, 'merged.json')
      await mergeReports(testReportDir, outputPath, true)

      const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))

      expect(merged.results.summary.tests).toBe(3)
      expect(merged.results.summary.passed).toBe(2)
      expect(merged.results.summary.failed).toBe(1)
      expect(merged.results.summary.skipped).toBe(0)
      expect(merged.results.summary.pending).toBe(0)
      expect(merged.results.summary.other).toBe(0)
    })

    it('should combine all test cases from multiple reports', async () => {
      const outputPath = path.join(tmpDir, 'merged.json')
      await mergeReports(testReportDir, outputPath, true)

      const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))

      expect(merged.results.tests.length).toBe(3)
      expect(merged.results.tests[0].name).toBe('test 1')
      expect(merged.results.tests[1].name).toBe('test 2')
      expect(merged.results.tests[2].name).toBe('test 3')
    })

    it('should use min start time and max stop time from all reports', async () => {
      const outputPath = path.join(tmpDir, 'merged.json')
      await mergeReports(testReportDir, outputPath, true)

      const merged = JSON.parse(fs.readFileSync(outputPath, 'utf8'))

      expect(merged.results.summary.start).toBe(1708979371669)
      expect(merged.results.summary.stop).toBe(1708979410000)
    })
  })

  describe('file retention', () => {
    it('should keep original reports when keepReports is true', async () => {
      const outputPath = path.join(tmpDir, 'merged.json')
      await mergeReports(testReportDir, outputPath, true)

      expect(fs.existsSync(testReport1)).toBe(true)
      expect(fs.existsSync(testReport2)).toBe(true)
    })

    it('should delete original reports when keepReports is false', async () => {
      const outputPath = path.join(tmpDir, 'merged.json')
      await mergeReports(testReportDir, outputPath, false)

      expect(fs.existsSync(testReport1)).toBe(false)
      expect(fs.existsSync(testReport2)).toBe(false)
      expect(fs.existsSync(outputPath)).toBe(true)
    })

    it('should not delete the output report itself', async () => {
      const outputFilename = 'ctrf-report.json'
      const outputPath = path.join(testReportDir, outputFilename)

      await mergeReports(testReportDir, outputFilename, false)

      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })
})
