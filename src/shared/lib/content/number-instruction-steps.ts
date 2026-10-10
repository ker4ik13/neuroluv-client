export function numberInstructionSteps<
	T extends { id: number; isWarning?: boolean },
>(steps: readonly T[]): Array<{ step: T; number: number | null }> {
	let number = 0;
	return steps.map((step) => {
		if (step.isWarning === true) return { step, number: null };
		number += 1;
		return { step, number };
	});
}
