import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
	ReportBuilder,
	TestBuilder,
	validate,
	parse,
	type SchemaSelector,
} from "ctrf";
import { validateReport } from "./validate.js";

describe("validateReport", () => {
	let tmpDir: string;
	let validReportPath: string;
	let invalidReportPath: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	const validReport = new ReportBuilder()
		.tool({ name: "test-tool" })
		.addTest(
			new TestBuilder().name("test 1").status("passed").duration(100).build(),
		)
		.addTest(
			new TestBuilder().name("test 2").status("failed").duration(200).build(),
		)
		.build();

	const invalidReport = {
		results: {
			tests: [],
		},
	};

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctrf-validate-test-"));

		validReportPath = path.join(tmpDir, "valid-report.json");
		invalidReportPath = path.join(tmpDir, "invalid-report.json");

		fs.writeFileSync(validReportPath, JSON.stringify(validReport, null, 2));
		fs.writeFileSync(invalidReportPath, JSON.stringify(invalidReport, null, 2));

		exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((() => undefined as never) as any) as any;
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		exitSpy.mockRestore();
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe("validate (non-strict)", () => {
		it("should validate a valid CTRF report", async () => {
			await validateReport(validReportPath, false);
			expect(exitSpy).toHaveBeenCalledWith(0);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("is valid CTRF"),
			);

			const reportContent = fs.readFileSync(validReportPath, "utf-8");
			const parsedReport = parse(reportContent);
			const result = validate(parsedReport);
			expect(result.valid).toBe(true);
		});

		it("should validate current CTRF identity fields and labels", async () => {
			const test = new TestBuilder()
				.testId("authentication/login")
				.executionId("execution-123")
				.name("logs in")
				.status("passed")
				.duration(100)
				.labels({ owners: ["qa", "platform"], priority: "high" })
				.build();

			test.retryAttempts = [
				{ attempt: 1, attemptId: "attempt-1", status: "failed", duration: 50 },
			];
			test.retries = 1;
			test.attachments = [
				{
					attachmentId: "attachment-1",
					name: "trace",
					contentType: "text/plain",
					path: "trace.txt",
				},
			];

			const currentReport = new ReportBuilder()
				.runId("run-123")
				.tool({ name: "test-tool" })
				.environment({ shardId: "shard-1-of-2" })
				.addTest(test)
				.build();
			const currentReportPath = path.join(tmpDir, "current-report.json");
			fs.writeFileSync(
				currentReportPath,
				JSON.stringify(currentReport, null, 2),
			);

			await validateReport(currentReportPath, false);

			expect(exitSpy).toHaveBeenCalledWith(0);
			expect(validate(currentReport).valid).toBe(true);
		});

		it.each(["0.0.1", "0.0.2", "0.0.3", "0.0.4", "0.1.0"] as const)(
			"should validate against CTRF %s",
			async (specVersion) => {
				fs.writeFileSync(
					validReportPath,
					JSON.stringify({ ...validReport, specVersion }, null, 2),
				);

				await validateReport(validReportPath, false, specVersion);

				expect(exitSpy).toHaveBeenCalledWith(0);
				expect(consoleLogSpy).toHaveBeenCalledWith(
					expect.stringContaining("is valid CTRF"),
				);
			},
		);

		it("should apply the selected historical schema", async () => {
			const reportWithLabels = {
				...validReport,
				results: {
					...validReport.results,
					tests: [
						{
							name: "labeled test",
							status: "passed",
							duration: 100,
							labels: { priority: "high" },
						},
					],
				},
			};
			fs.writeFileSync(
				validReportPath,
				JSON.stringify(reportWithLabels, null, 2),
			);

			await validateReport(validReportPath, false, "0.0.1");
			expect(exitSpy).toHaveBeenCalledWith(2);

			exitSpy.mockClear();
			await validateReport(validReportPath, false, "0.0.2");
			expect(exitSpy).toHaveBeenCalledWith(0);
		});

		it("should reject an invalid CTRF report", async () => {
			await validateReport(invalidReportPath, false);
			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("failed validation"),
			);
		});

		it("should exit with code 3 for file not found", async () => {
			const nonExistentPath = path.join(tmpDir, "nonexistent.json");
			await validateReport(nonExistentPath, false);
			expect(exitSpy).toHaveBeenCalledWith(3);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("File not found"),
			);
		});

		it("should exit with code 4 for invalid JSON", async () => {
			const invalidJsonPath = path.join(tmpDir, "invalid.json");
			fs.writeFileSync(invalidJsonPath, "not valid json");
			await validateReport(invalidJsonPath, false);
			expect(exitSpy).toHaveBeenCalledWith(4);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid CTRF report"),
			);
		});
	});

	describe("validate-strict", () => {
		it("should validate a valid CTRF report in strict mode", async () => {
			await validateReport(validReportPath, true);
			expect(exitSpy).toHaveBeenCalledWith(0);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("is valid CTRF (strict)"),
			);
		});

		it("should reject an invalid CTRF report in strict mode", async () => {
			await validateReport(invalidReportPath, true);
			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("failed strict validation"),
			);
		});

		it("should honor the selected schema version", async () => {
			const specVersion: SchemaSelector = "0.0.2";
			fs.writeFileSync(
				validReportPath,
				JSON.stringify({ ...validReport, specVersion }, null, 2),
			);

			await validateReport(validReportPath, true, specVersion);

			expect(exitSpy).toHaveBeenCalledWith(0);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("is valid CTRF (strict)"),
			);
		});
	});

	describe("file not found", () => {
		it("should exit with code 3 when file not found", async () => {
			const nonExistentPath = path.join(tmpDir, "nonexistent.json");
			await validateReport(nonExistentPath);
			expect(exitSpy).toHaveBeenCalledWith(3);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("File not found"),
			);
		});
	});

	describe("invalid JSON", () => {
		it("should exit with code 4 for invalid CTRF JSON", async () => {
			const invalidJsonPath = path.join(tmpDir, "invalid.json");
			fs.writeFileSync(invalidJsonPath, "not valid json {");

			await validateReport(invalidJsonPath);
			expect(exitSpy).toHaveBeenCalledWith(4);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid CTRF report"),
			);
		});
	});

	describe("strict mode error details", () => {
		it("should display validation error paths in strict mode", async () => {
			const reportWithPath = {
				reportFormat: "CTRF",
				specVersion: "0.1.0",
				results: {
					tool: { name: "test" },
					summary: {},
					tests: [],
				},
			};

			fs.writeFileSync(
				invalidReportPath,
				JSON.stringify(reportWithPath, null, 2),
			);

			await validateReport(invalidReportPath, true);
			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("failed strict validation"),
			);
		});
	});

	describe("standard mode error handling", () => {
		it("should display validation errors without error.errors array", async () => {
			const malformedReport = {
				reportFormat: "WRONG",
				specVersion: "0.1.0",
				results: {
					tool: { name: "test" },
					summary: {},
					tests: [],
				},
			};

			fs.writeFileSync(
				invalidReportPath,
				JSON.stringify(malformedReport, null, 2),
			);

			await validateReport(invalidReportPath, false);
			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("failed validation"),
			);
		});
	});
});
