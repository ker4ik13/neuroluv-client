import { Suspense } from 'react';
import { MatomoRouteTracker } from './MatomoRouteTracker';

export function MatomoHead({ bootstrap }: { bootstrap: string }) {
	return (
		<script
			id='matomo-tracker'
			dangerouslySetInnerHTML={{ __html: bootstrap }}
		/>
	);
}

export function Matomo() {
	return (
		<Suspense fallback={null}>
			<MatomoRouteTracker />
		</Suspense>
	);
}
