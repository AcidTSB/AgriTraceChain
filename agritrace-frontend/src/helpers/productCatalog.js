export function parseProductCatalogMetadata(product, fallbackNA) {
  const rawDescription = String(product?.description ?? "").trim();
  const fallback = fallbackNA || "N/A";

  if (!rawDescription) {
    return {
      variety: fallback,
      grade: fallback,
      summary: fallback,
    };
  }

  const tokens = rawDescription.split("|").map((item) => item.trim()).filter(Boolean);
  if (tokens.length >= 4 && tokens[0].toUpperCase() === "MOCK") {
    return {
      variety: tokens[1] || fallback,
      grade: tokens[2] || fallback,
      summary: tokens[3] || product?.name || fallback,
    };
  }

  if (tokens.length >= 2) {
    return {
      variety: tokens[0] || fallback,
      grade: tokens[1] || fallback,
      summary: tokens.slice(2).join(" | ") || product?.name || fallback,
    };
  }

  return {
    variety: rawDescription,
    grade: fallback,
    summary: rawDescription,
  };
}
