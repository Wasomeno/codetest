const SESSION_KEY = 'qa_webapp_session_id';

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}

export function extractSessionIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    // Clean the URL to remove the session_id parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.toString());
    
    setSessionId(sessionId);
    return sessionId;
  }
  return null;
}
