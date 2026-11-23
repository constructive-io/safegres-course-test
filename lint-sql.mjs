import { createLinter, defineRule } from '@pgsql/lint';

const qualifiedFunctionName = defineRule({
	id: 'qualified-function-name',
	code: 'TEAM1',
	title: 'Function definitions must name their schema',
	reasonRequired: true,
	run(unit) {
		const name = unit.createFnStmt?.funcname;
		if (!Array.isArray(name) || name.length !== 1) return [];
		return [
			{
				ruleId: 'qualified-function-name',
				line: 1,
				message: 'Use CREATE FUNCTION schema.name(...).',
			},
		];
	},
});

const linter = createLinter({ rules: [qualifiedFunctionName] });
for (const report of await linter.lintFiles(['migrations'])) {
	if (report.parseError) {
		console.error(report.file, report.parseError);
		process.exitCode = 1;
	}
	for (const finding of report.findings) {
		if (finding.acknowledged || finding.severity !== 'error') continue;
		console.error(`${report.file}:${finding.line}: ${finding.message}`);
		process.exitCode = 1;
	}
}
