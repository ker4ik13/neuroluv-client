import type { PageMiniCtaBlock } from '@/entities/page';
import { CtaPanel } from '../cta-panel/CtaPanel';

export function MiniCtaBlock({ block }: { block: PageMiniCtaBlock }) {
	return <CtaPanel {...block} density='compact' />;
}
