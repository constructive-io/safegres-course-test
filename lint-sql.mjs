import { createLinter, requireQualifiedRefs } from '@pgsql/lint';

import { qualifiedFunctionName } from './lint-rules.mjs';

const linter = createLinter({ rules: [requireQualifiedRefs, qualifiedFunctionName] });
const reports = await linter.lintFiles(['migrations']);
if (reports.length === 0) throw new Error('No SQL migrations found.');

for (const report of reports) {
	for (const finding of report.findings) {
		if (finding.acknowledged) continue;
		console.error(`${report.file}:${finding.line} ${finding.severity}: ${finding.message}`);
		if (finding.severity === 'error') process.exitCode = 1;
	}
}
