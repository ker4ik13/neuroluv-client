import { getSiteNotices } from '@/shared/api/directus/site-notices';

export async function GET() {
	try {
		return Response.json(await getSiteNotices(true), {
			headers: {
				'Cache-Control':
					'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
			},
		});
	} catch {
		return Response.json(
			{ error: 'Configuration temporarily unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } },
		);
	}
}
