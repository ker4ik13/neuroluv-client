import { fixupConfigRules } from '@eslint/compat';
import { nextTs, nextVitals } from '@neuroluv/client-lint';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
	...fixupConfigRules(nextVitals),
	...fixupConfigRules(nextTs),
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
	]),
]);

export default eslintConfig;
