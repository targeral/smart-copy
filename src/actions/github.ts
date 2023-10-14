import { GithubStore } from '@/store/github';
import { gitCommitByContent } from '@/apis/github';

export const setGithubToken = (token?: string) => {
  if (!token) {
    const tokenInLocalStorage = localStorage.getItem('github_token');
    if (tokenInLocalStorage) {
      GithubStore.token = tokenInLocalStorage;
    }

    return;
  }

  localStorage.setItem('github_token', token);
  GithubStore.token = token;
};

export const copyContentToGithub = async ({ text = '' }: { text?: string }) => {
  setGithubToken();
  await gitCommitByContent({ text });
};
