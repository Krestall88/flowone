export type DocumentContentPayload = {
  body: string;
  recipientId: number;
};

export function serializeDocumentContent(payload: DocumentContentPayload) {
  return JSON.stringify(payload);
}

export function parseDocumentContent(content: string): DocumentContentPayload {
  try {
    const parsed = JSON.parse(content);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.body === "string" &&
      typeof parsed.recipientId === "number"
    ) {
      return parsed as DocumentContentPayload;
    }
  } catch (error) {
    // ignore
  }
  return { body: content, recipientId: 0 };
}
