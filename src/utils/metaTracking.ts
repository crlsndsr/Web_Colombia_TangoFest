export interface MetaEventPayload {
  eventName: string;
  userData?: {
    em?: string[];
    ph?: string[];
    [key: string]: unknown;
  };
  customData?: {
    currency?: string;
    value?: string | number;
    [key: string]: unknown;
  };
}

// PUBLIC_META_API_URL must be set at build time (see .env)
const API_URL = import.meta.env.PUBLIC_META_API_URL as string;

export const trackMetaConversion = async (payload: MetaEventPayload): Promise<boolean> => {
  if (!API_URL) {
    console.warn('PUBLIC_META_API_URL no está configurado. El tracking de CAPI está desactivado.');
    return false;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Fallo al rastrear la conversión:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error de red al intentar enviar conversión:', error);
    return false;
  }
};
