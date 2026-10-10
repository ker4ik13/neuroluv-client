'use client';

import {
	type GenerationChatKind,
	GenerationChatPage,
} from './GenerationChatPage';

export function CreateStudioPage({
	kind,
	initialModelSlug,
	pageTitle,
	semanticTitle = true,
	syncModelUrl = false,
}: {
	kind: GenerationChatKind;
	initialModelSlug?: string;
	pageTitle?: string;
	semanticTitle?: boolean;
	syncModelUrl?: boolean;
}) {
	return (
		<GenerationChatPage
			initialModelSlug={initialModelSlug}
			kind={kind}
			pageTitle={pageTitle}
			semanticTitle={semanticTitle}
			syncModelUrl={syncModelUrl}
		/>
	);
}
