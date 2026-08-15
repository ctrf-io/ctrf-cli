import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const distDirectory = path.join(projectRoot, "dist");
const ctrfDistDirectory = path.dirname(
	fileURLToPath(import.meta.resolve("ctrf")),
);
const schemaPattern = /^ctrf-schema-\d+\.\d+\.json$/;

await mkdir(distDirectory, { recursive: true });

await build({
	entryPoints: [path.join(projectRoot, "src/cli.ts")],
	outfile: path.join(distDirectory, "cli.js"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node20.19",
	external: ["ajv", "ajv-formats", "yargs", "yargs/*"],
	legalComments: "linked",
	logLevel: "info",
});

const existingSchemaFiles = (await readdir(distDirectory)).filter((file) =>
	schemaPattern.test(file),
);

await Promise.all(
	existingSchemaFiles.map((file) => rm(path.join(distDirectory, file))),
);

const schemaFiles = (await readdir(ctrfDistDirectory)).filter((file) =>
	schemaPattern.test(file),
);

if (schemaFiles.length === 0) {
	throw new Error(
		"No CTRF schema files were found to include in the CLI bundle",
	);
}

for (const schemaFile of schemaFiles) {
	const source = path.join(ctrfDistDirectory, schemaFile);
	const destination = path.join(distDirectory, schemaFile);
	await copyFile(source, destination);

	const [sourceBytes, destinationBytes] = await Promise.all([
		readFile(source),
		readFile(destination),
	]);

	if (!sourceBytes.equals(destinationBytes)) {
		throw new Error(
			`Copied CTRF schema does not match its source: ${schemaFile}`,
		);
	}
}
