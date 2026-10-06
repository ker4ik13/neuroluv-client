import { AiApiError, aiApiFetch } from './client';
import type { AiApiEnvelope, AiRunSummary } from './contracts';

export async function submitAiRun(
	body: { idempotencyKey: string } & Record<string, unknown>,
): Promise<AiRunSummary | AiApiEnvelope<AiRunSummary>> {
	try {
		return await aiApiFetch('/runs', {
			method: 'POST',
			body,
			timeoutMs: 45_000,
			retry: true,
		});
	} catch (error) {
		if (
			!(error instanceof AiApiError) ||
			!(
				[500, 502, 504].includes(error.problem.status) ||
				(error.problem.status === 503 && !error.problem.code) ||
				['service_unavailable', 'request_timeout', 'invalid_response'].includes(
					error.problem.code || '',
				)
			)
		)
			throw error;
		// A lost response is not proof of failure. Read the accepted run before
		// showing an error; never mint a second key or submit a second generation.
		try {
			const accepted = await aiApiFetch<{ run: AiRunSummary | null }>(
				`/runs/by-idempotency/${encodeURIComponent(body.idempotencyKey)}`,
				{ csrf: false, retry: true },
			);
			if (accepted.run) return accepted.run;
		} catch {
			// Preserve the uncertain outcome rather than asserting a refund/failure.
		}
		throw new AiApiError({
			title:
				'Не удалось подтвердить отправку. Проверьте историю чата перед повторной отправкой.',
			status: 503,
			code: 'run_submission_unknown',
			correlationId: error.problem.correlationId,
		});
	}
}
