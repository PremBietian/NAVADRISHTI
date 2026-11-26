
export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  ingest: `${API_BASE_URL}/ingest`,
  results: `${API_BASE_URL}/results`,
  integrity: `${API_BASE_URL}/integrity`,
  aiStatus: `${API_BASE_URL}/ai/status`,
  aiExplain: (conflictId) =>
    `${API_BASE_URL}/ai/explain/${encodeURIComponent(conflictId)}`,
};

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      'Cannot connect to CERBERUS-X backend. Check that FastAPI is running on port 8000.'
    );
  }

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || `Request failed: ${response.status}`
    );
  }

  return data;
}

export const cerberusApi = {
  getHealth: () => request(API_ENDPOINTS.health),

  getResults: () => request(API_ENDPOINTS.results),

  getIntegrity: () => request(API_ENDPOINTS.integrity),

  getAiStatus: () => request(API_ENDPOINTS.aiStatus),

  ingestEvidence: (file, authorProvenance = '') => {
    const formData = new FormData();
    formData.append('file', file);

    if (authorProvenance) {
      formData.append('author_provenance', authorProvenance);
    }

    return request(API_ENDPOINTS.ingest, {
      method: 'POST',
      body: formData,
    });
  },

  explainConflict: (conflictId) =>
    request(API_ENDPOINTS.aiExplain(conflictId), {
      method: 'POST',
    }),
};
