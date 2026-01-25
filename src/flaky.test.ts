import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { ReportBuilder, TestBuilder } from 'ctrf'
import { identifyFlakyTests } from './flaky.js'

describe('identifyFlakyTests', () => {
  let tmpDir: string
  let reportPath: string
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrf-flaky-test-'))
    reportPath = path.join(tmpDir, 'report.json')
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('should identify flaky tests', async () => {
    const report = new ReportBuilder()
      .tool({ name: 'test-tool' })
      .addTest(
        new TestBuilder()
          .name('flaky test 1')
          .status('passed')
          .duration(100)
          .flaky(true)
          .retries(2)
          .build()
      )
      .addTest(
        new TestBuilder()
          .name('flaky test 2')
          .status('passed')
          .duration(100)
          .flaky(true)
          .retries(1)
          .build()
      )
      .addTest(
        new TestBuilder()
          .name('stable test')
          .status('passed')
          .duration(100)
          .build()
      )
      .build()

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    await identifyFlakyTests(reportPath)

    expect(consoleLogSpy).toHaveBeenCalledWith('Found 2 flaky test(s):')
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '- Test Name: flaky test 1, Retries: 2'
    )
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '- Test Name: flaky test 2, Retries: 1'
    )
  })

  it('should report when no flaky tests found', async () => {
    const report = new ReportBuilder()
      .tool({ name: 'test-tool' })
      .addTest(
        new TestBuilder()
          .name('stable test')
          .status('passed')
          .duration(100)
          .build()
      )
      .build()

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    await identifyFlakyTests(reportPath)

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No flaky tests found')
    )
  })

  it('should handle file not found', async () => {
    const nonExistentPath = path.join(tmpDir, 'non-existent.json')

    await identifyFlakyTests(nonExistentPath)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not exist')
    )
  })

  it('should handle invalid JSON', async () => {
    fs.writeFileSync(reportPath, 'invalid json {')

    await identifyFlakyTests(reportPath)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error identifying flaky tests:',
      expect.any(Error)
    )
  })

  it('should handle missing results property', async () => {
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ invalid: 'structure' }, null, 2)
    )

    await identifyFlakyTests(reportPath)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error identifying flaky tests:',
      expect.any(Error)
    )
  })

  it('should display test retries correctly', async () => {
    const report = new ReportBuilder()
      .tool({ name: 'test-tool' })
      .addTest(
        new TestBuilder()
          .name('flaky with retries')
          .status('passed')
          .duration(100)
          .flaky(true)
          .retries(5)
          .build()
      )
      .build()

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    await identifyFlakyTests(reportPath)

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '- Test Name: flaky with retries, Retries: 5'
    )
  })
})
