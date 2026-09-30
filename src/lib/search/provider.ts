/**
 * Web-search provider abstraction.
 *
 * ThunderGPT currently uses the active AI engine's native search
 * (Gemini Google Search grounding, or xAI live search) so answers and
 * citations stay in one request. Swap this module if a dedicated search
 * API is added later — the chat UI only toggles `webSearch`.
 */
export type SearchHit = {
  title: string;
  url: string;
  snippet?: string;
};

export interface SearchProvider {
  readonly id: string;
  isConfigured(): boolean;
  search(query: string): Promise<SearchHit[]>;
}

export const disabledSearch: SearchProvider = {
  id: "none",
  isConfigured: () => false,
  async search() {
    return [];
  },
};
