import mammoth from "mammoth";

/**
 * Fetches a .docx from a URL, converts to HTML via mammoth,
 * then replaces {placeholder} tokens with actual field values.
 */
export async function renderProposalHtml(
  fileUrl: string,
  fieldValues: Record<string, string>
): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error("Failed to fetch template file");

  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  let html = result.value;

  // Replace {placeholder} tokens with actual values (case-insensitive key match)
  const valuesLower = Object.fromEntries(
    Object.entries(fieldValues).map(([k, v]) => [k.toLowerCase(), v])
  );

  html = html.replace(/\{([a-zA-Z][a-zA-Z0-9 _-]*)\}/g, (_match, key: string) => {
    const value = valuesLower[key.trim().toLowerCase()];
    if (value !== undefined) {
      return `<span class="proposal-filled">${escapeHtml(value)}</span>`;
    }
    return `<span class="proposal-placeholder">{${key}}</span>`;
  });

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
