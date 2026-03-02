export type LinkPreviewConfig = {
  screenshot?: boolean;
  meta?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
};

const LINK_PREVIEW_FUNCTION_NAME = 'link-preview';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export class LinkPreviewRepository {
  getFunctionEndpoint(): string | null {
    if (!SUPABASE_URL) return null;

    const baseUrl = new URL(SUPABASE_URL);
    return baseUrl.origin.endsWith('.supabase.co')
      ? `${baseUrl.origin.replace('.supabase.co', '.functions.supabase.co')}/${LINK_PREVIEW_FUNCTION_NAME}`
      : `${baseUrl.origin}/functions/v1/${LINK_PREVIEW_FUNCTION_NAME}`;
  }

  async callLinkPreview(url: string, config: LinkPreviewConfig): Promise<unknown | null> {
    const endpoint = this.getFunctionEndpoint();
    if (!endpoint || !SUPABASE_ANON_KEY) return null;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, config }),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      if (result?.status !== 'success' || !result?.data) {
        return null;
      }

      return result.data;
    } catch {
      return null;
    }
  }
}

export const linkPreviewRepository = new LinkPreviewRepository();
