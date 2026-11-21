import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const packageMetadata = JSON.parse(
	readFileSync(path.join(projectRoot, "package.json"), "utf-8"),
);
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "ctrf-cli-package-"));
const packDirectory = path.join(temporaryRoot, "pack");
const installDirectory = path.join(temporaryRoot, "install");
const npmCacheDirectory = path.join(temporaryRoot, "npm-cache");
const supportedSpecVersions = [
	"0.0.1",
	"0.0.2",
	"0.0.3",
	"0.0.4",
	"0.1.0",
	"0.2.0",
	"0.3.0",
];

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? projectRoot,
		encoding: "utf-8",
		env: {
			...process.env,
			npm_config_cache: npmCacheDirectory,
		},
	});
	const expectedStatus = options.expectedStatus ?? 0;

	if (result.status !== expectedStatus) {
		throw new Error(
			[
				`Command failed: ${command} ${args.join(" ")}`,
				`Expected exit status ${expectedStatus}, received ${result.status}`,
				result.stdout,
				result.stderr,
			].join("\n"),
		);
	}

	return result;
}

try {
	mkdirSync(packDirectory);
	mkdirSync(installDirectory);
	mkdirSync(npmCacheDirectory);

	const packResult = run(
		"npm",
		["pack", "--pack-destination", packDirectory, "--json"],
		{ cwd: projectRoot },
	);
	const [{ filename }] = JSON.parse(packResult.stdout);
	const tarballPath = path.join(packDirectory, filename);

	writeFileSync(
		path.join(installDirectory, "package.json"),
		JSON.stringify({ private: true }),
	);
	run(
		"npm",
		["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
		{ cwd: installDirectory },
	);

	assert.equal(
		existsSync(path.join(installDirectory, "node_modules/ctrf")),
		false,
		"ctrf must not be installed as a production dependency",
	);

	for (const version of supportedSpecVersions) {
		assert.equal(
			existsSync(
				path.join(
					installDirectory,
					"node_modules/ctrf-cli/dist",
					`ctrf-schema-${version}.json`,
				),
			),
			true,
			`ctrf-schema-${version}.json must be included in the package`,
		);
	}

	if (process.platform !== "win32") {
		const expectedCli = realpathSync(
			path.join(installDirectory, "node_modules/ctrf-cli/dist/cli.js"),
		);
		for (const binary of ["ctrf", "ctrf-cli"]) {
			assert.equal(
				realpathSync(
					path.join(installDirectory, `node_modules/.bin/${binary}`),
				),
				expectedCli,
				`${binary} must resolve to the standalone CLI`,
			);
		}
	}

	const versionResult = run(
		"npx",
		["--yes", `--package=${tarballPath}`, "ctrf", "--version"],
		{ cwd: temporaryRoot },
	);
	assert.equal(versionResult.stdout.trim(), packageMetadata.version);

	const validReport = path.join(projectRoot, "examples/minimal.json");
	for (const version of supportedSpecVersions) {
		const validationResult = run(
			"npx",
			[
				"--yes",
				`--package=${tarballPath}`,
				"ctrf",
				"validate",
				validReport,
				"--spec-version",
				version,
			],
			{ cwd: temporaryRoot },
		);
		assert.match(validationResult.stdout, /is valid CTRF/);
	}

	const latestValidationResult = run(
		"npx",
		[
			"--yes",
			`--package=${tarballPath}`,
			"ctrf-cli",
			"validate-strict",
			validReport,
			"--spec-version",
			"latest",
		],
		{ cwd: temporaryRoot },
	);
	assert.match(latestValidationResult.stdout, /is valid CTRF \(strict\)/);

	const retryReport = path.join(projectRoot, "examples/with-retries.json");
	for (const binary of ["ctrf", "ctrf-cli"]) {
		const accepted = run(
			"npx",
			[
				"--yes",
				`--package=${tarballPath}`,
				binary,
				"validate-strict",
				retryReport,
				"--spec-version",
				"0.2.0",
			],
			{ cwd: temporaryRoot },
		);
		assert.match(accepted.stdout, /is valid CTRF/);
		const historical = run(
			"npx",
			[
				"--yes",
				`--package=${tarballPath}`,
				binary,
				"validate",
				retryReport,
				"--spec-version",
				"0.1.0",
			],
			{ cwd: temporaryRoot, expectedStatus: 2 },
		);
		assert.match(historical.stderr, /must NOT have additional properties/);
	}

	const currentReport = path.join(temporaryRoot, "current.json");
	const current = {
		reportFormat: "CTRF",
		specVersion: "0.3.0",
		reportId: "abcdefab-e29b-41d4-a716-446655440001",
		provenance: {
			inputs: [{ reportId: "abcdefab-e29b-41d4-a716-446655440002" }],
		},
		results: {
			tool: { name: "package-control" },
			summary: {
				tests: 1,
				passed: 1,
				failed: 0,
				skipped: 0,
				pending: 0,
				other: 0,
				start: 100,
				stop: 120,
			},
			errors: [{ message: "worker setup" }],
			tests: [
				{
					name: "case",
					description: "",
					status: "passed",
					duration: 1,
					retries: 1,
					retryAttempts: [
						{
							attempt: 1,
							status: "failed",
							threadId: "worker-1",
							assertionFailures: [{ expected: "200", actual: "500" }],
						},
					],
				},
			],
		},
	};
	writeFileSync(currentReport, JSON.stringify(current));
	for (const binary of ["ctrf", "ctrf-cli"]) {
		const accepted = run(
			"npx",
			[
				"--yes",
				`--package=${tarballPath}`,
				binary,
				"validate-strict",
				currentReport,
				"--spec-version",
				"0.3.0",
			],
			{ cwd: temporaryRoot },
		);
		assert.match(accepted.stdout, /is valid CTRF/);
	}
	current.provenance.inputs[0].reportId = current.reportId;
	writeFileSync(currentReport, JSON.stringify(current));
	const selfReference = run(
		"npx",
		[
			"--yes",
			`--package=${tarballPath}`,
			"ctrf",
			"validate-strict",
			currentReport,
			"--spec-version",
			"0.3.0",
		],
		{ cwd: temporaryRoot, expectedStatus: 2 },
	);
	assert.match(selfReference.stderr, /must not reference the current report/);

	const invalidReport = path.join(temporaryRoot, "invalid.json");
	writeFileSync(
		invalidReport,
		JSON.stringify({ reportFormat: "CTRF", specVersion: "0.1.0" }),
	);
	const invalidResult = run(
		"npx",
		["--yes", `--package=${tarballPath}`, "ctrf", "validate", invalidReport],
		{ cwd: temporaryRoot, expectedStatus: 2 },
	);
	assert.match(invalidResult.stderr, /failed validation/);

	console.log(
		`✓ Packed ctrf-cli ${packageMetadata.version} resolves both binaries to the standalone CLI`,
	);
} finally {
	const expectedPrefix = path.join(os.tmpdir(), "ctrf-cli-package-");
	if (temporaryRoot.startsWith(expectedPrefix)) {
		rmSync(temporaryRoot, { recursive: true, force: true });
	}
}
