import { proxy } from 'valtio';
import { Octokit } from 'octokit';

export interface IGithubStore {
  token: string;
  octokit: Octokit | null;
}

export const GithubStore = proxy<IGithubStore>({
  token: '',
  octokit: null,
});
