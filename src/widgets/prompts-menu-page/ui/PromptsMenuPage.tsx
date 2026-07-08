import Link from "next/link";

import type {
  PromptsMenuPageData,
  PromptTagGroup,
  PromptTaxonomy,
} from "@/entities/prompt";

import { PromptCollectionsGrid } from "./PromptCollectionsGrid";
import styles from "./PromptsMenuPage.module.scss";

type PromptsMenuPageProps = {
  data: PromptsMenuPageData;
};

export function PromptsMenuPage({ data }: PromptsMenuPageProps) {
  if (
    data.contentKinds.length === 0 &&
    data.neuralNetworks.length === 0 &&
    data.collections.length === 0 &&
    data.goals.length === 0 &&
    data.tagGroups.length === 0
  ) {
    return null;
  }

  return (
    <div className={styles.sections}>
      {data.contentKinds.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <SectionHeading title="Виды промптов" />

            <div className={styles.grid}>
              {data.contentKinds.map((kind) => (
                <ContentKindCard kind={kind} key={kind.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.neuralNetworks.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <SectionHeading title="По нейросетям" />

            <div className={styles.networkCloud}>
              {data.neuralNetworks.map((network) => (
                <NetworkChip key={network.id} network={network} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.collections.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <SectionHeading title="Тематические подборки" />
            <PromptCollectionsGrid
              initialHasMore={data.collectionsHasMore}
              initialItems={data.collections}
            />
          </div>
        </section>
      )}

      {data.goals.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <SectionHeading title="Для чего промпт?" />

            <div className={styles.goalGrid}>
              {data.goals.map((goal) => (
                <GoalCard goal={goal} key={goal.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.tagGroups.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <SectionHeading title="Популярные теги" />

            <div className={styles.tagGroups}>
              {data.tagGroups.map((group) => (
                <TagGroup group={group} key={group.kind.id} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className={styles.heading}>
      <h2>{title}</h2>
    </div>
  );
}

function NetworkChip({ network }: { network: PromptTaxonomy }) {
  return (
    <Link
      className={styles.networkChip}
      href={`/prompts-menu/network-${network.slug}`}
    >
      <span className={styles.networkDot} aria-hidden="true" />
      <span>{network.title}</span>
      <small>{network.count || 0}</small>
    </Link>
  );
}

function GoalCard({ goal }: { goal: PromptTaxonomy }) {
  return (
    <Link className={styles.goalCard} href={`/prompts-menu/goal-${goal.slug}`}>
      <span className={styles.goalCount}>{goal.count || 0}</span>
      <strong>{goal.title}</strong>
      {goal.description && <span>{goal.description}</span>}
      <small>Открыть →</small>
    </Link>
  );
}

function TagGroup({ group }: { group: PromptTagGroup }) {
  return (
    <div className={styles.tagGroup}>
      <h3>{group.kind.title}</h3>

      <div className={styles.tagCloud}>
        {group.tags.map((tag) => (
          <Link
            className={styles.tagChip}
            href={`/prompts-menu/tag-${tag.slug}`}
            key={tag.id}
          >
            <span>#{tag.title}</span>
            <small>{tag.count || 0}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ContentKindCard({ kind }: { kind: PromptTaxonomy }) {
  return (
    <Link className={styles.card} href={`/prompts-menu/kind-${kind.slug}`}>
      <span className={styles.accent} />
      <span className={styles.cardBody}>
        <span className={styles.cardMeta}>
          <span>{kind.count || 0} {getPromptsCountWord(kind.count || 0)}</span>
        </span>
        <strong>{kind.title}</strong>
        {kind.description && <span className={styles.description}>{kind.description}</span>}
        <span className={styles.link}>Открыть →</span>
      </span>
    </Link>
  );
}

function getPromptsCountWord(count: number): string {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  const lastDigit = absoluteCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "промптов";
  }

  if (lastDigit === 1) {
    return "промпт";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "промпта";
  }

  return "промптов";
}
