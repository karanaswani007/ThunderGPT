export type LogicalModelId =
  | "auto"
  | "fast"
  | "general"
  | "reasoning"
  | "vision"
  | "image";

export type ModelCapability =
  | "chat"
  | "code"
  | "vision"
  | "documents"
  | "image"
  | "search"
  | "reasoning";

export type ChatRole = "user" | "assistant" | "system";

export type AttachmentKind =
  | "image"
  | "pdf"
  | "text"
  | "spreadsheet"
  | "document"
  | "generated";

export type ChatAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  extractedText?: string;
  dataBase64?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  model?: string | null;
  webSearch?: boolean;
  error?: string | null;
  attachments?: ChatAttachment[];
  createdAt: string;
};

export type SourceCitation = {
  title: string;
  url: string;
};

export type GenerateTextInput = {
  modelId: string;
  system: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    attachments?: ChatAttachment[];
  }>;
  webSearch?: boolean;
  maxTokens?: number;
  abortSignal?: AbortSignal;
};

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "sources"; sources: SourceCitation[] }
  | { type: "usage"; tokensIn?: number; tokensOut?: number };

export type GenerateImageInput = {
  prompt: string;
  aspectRatio?: string;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  abortSignal?: AbortSignal;
};

export type GenerateImageResult = {
  mimeType: string;
  dataBase64: string;
  model: string;
};

export type ProviderHealth = {
  id: "gemini" | "xai";
  label: string;
  available: boolean;
  supportsImage: boolean;
  supportsSearch: boolean;
};

export interface AIProvider {
  readonly id: ProviderHealth["id"];
  readonly label: string;
  isAvailable(): boolean;
  resolveModel(logical: Exclude<LogicalModelId, "auto">): string;
  streamText(input: GenerateTextInput): AsyncGenerator<StreamEvent, void, void>;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}
