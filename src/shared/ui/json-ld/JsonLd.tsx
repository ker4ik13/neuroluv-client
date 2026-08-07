type JsonLdProps = {
  data: unknown;
  nonce?: string;
};

export function JsonLd({ data, nonce }: JsonLdProps) {
  const normalizedData = normalizeJsonLd(data);

  if (!normalizedData) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(normalizedData).replace(/</g, "\\u003c"),
      }}
      nonce={nonce}
      type="application/ld+json"
    />
  );
}

function normalizeJsonLd(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data || null;
  }

  const graph = data.flatMap(extractGraphNodes);

  if (graph.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function extractGraphNodes(value: unknown): Record<string, unknown>[] {
  if (!isJsonLdObject(value)) {
    return [];
  }

  if (Array.isArray(value["@graph"])) {
    return value["@graph"].flatMap(extractGraphNodes);
  }

  const node = { ...value };
  delete node["@context"];

  return [node];
}

function isJsonLdObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
