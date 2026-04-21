import mammoth from "mammoth";

/**
 * Extracts dynamic placeholder fields from a .docx file.
 * Looks for patterns like {fieldName}, {clientName}, {Client Email}, etc.
 * Returns deduplicated array of field names.
 */
export async function extractFieldsFromDocx(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  // Match {fieldName} patterns — supports letters, numbers, spaces, underscores, hyphens
  const regex = /\{([a-zA-Z][a-zA-Z0-9 _-]*)\}/g;
  const fields = new Set<string>();

  let match;
  while ((match = regex.exec(text)) !== null) {
    fields.add(match[1].trim());
  }

  return Array.from(fields);
}
