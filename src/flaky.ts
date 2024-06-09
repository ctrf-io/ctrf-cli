import fs from 'fs';
import path from 'path';

export async function identifyFlakyTests(filePath: string) {
  try {
    const resolvedFilePath = path.resolve(filePath);

    if (!fs.existsSync(resolvedFilePath)) {
      console.error(`The file ${resolvedFilePath} does not exist.`);
      return;
    }

    const fileContent = fs.readFileSync(resolvedFilePath, 'utf8');
    const report = JSON.parse(fileContent);

    const flakyTests = report.results.tests.filter((test: any) => test.flaky === true);

    if (flakyTests.length > 0) {
      console.log(`Found ${flakyTests.length} flaky test(s):`);
      flakyTests.forEach((test: any) => {
        console.log(`- Test Name: ${test.name}, Retries: ${test.retries}`);
      });
    } else {
      console.log(`No flaky tests found in ${resolvedFilePath}.`);
    }
  } catch (error) {
    console.error('Error identifying flaky tests:', error);
  }
}
