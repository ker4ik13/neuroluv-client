import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveInterfaceIconName } from '../src/shared/ui/icon-renderer/semantic-icons.ts';

test('legacy CMS icons resolve to one outline family', () => {
	for (const [code, expected] of [
		['FaImage', 'FiImage'],
		['BsImage', 'FiImage'],
		['AiOutlineTeam', 'FiUsers'],
		['FaBolt', 'FiZap'],
		['RiRobot2Line', 'FiCpu'],
		['FaChevronDown', 'FiChevronDown'],
		['BsCheckCircle', 'FiCheckCircle'],
	])
		assert.equal(resolveInterfaceIconName(code), expected);
});
test('semantic names, whitespace and native Feather choices stay compatible', () => {
	assert.equal(resolveInterfaceIconName(' book-open '), 'FiBookOpen');
	assert.equal(resolveInterfaceIconName('FiSettings'), 'FiSettings');
	assert.equal(resolveInterfaceIconName('file-text'), 'FiFileText');
});
test('an unknown CMS choice has a predictable neutral fallback', () => {
	assert.equal(resolveInterfaceIconName('unknown-new-icon'), 'FiGrid');
});
