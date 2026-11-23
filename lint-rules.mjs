import { defineRule } from '@pgsql/lint';

const id = 'qualified-function-name';

export const qualifiedFunctionName = defineRule({
	id,
	code: 'TEAM1',
	title: 'Function definitions must name their schema',
	reasonRequired: true,
	run(unit) {
		const name = unit.createFnStmt?.funcname;
		if (!Array.isArray(name) || name.length !== 1) return [];
		return [{ ruleId: id, line: 1, message: 'Use CREATE FUNCTION schema.name(...).' }];
	},
});
