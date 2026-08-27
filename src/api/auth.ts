import { api } from '~/services/api';

export async function gitlabLogin(redirectUrl?: string) {
  const query = redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : '';
  return api.post<{ url: string }>(`/auth/login${query}`);
}

export async function getGitlabLoginSession() {
  return api.get<{ url: string }>(`/auth/session`);
}

export async function logout() {
  return api.post(`/auth/logout`);
}
