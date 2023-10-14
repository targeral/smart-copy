import { Octokit } from 'octokit';
import dayjs from 'dayjs';
import { GithubStore } from '@/store/github';

const owner = 'targeral';
const repo = 'copy-to-github-storage';

export const octokitFactory = () => {
  if (GithubStore.octokit) {
    return GithubStore.octokit;
  }

  if (GithubStore.token.length > 0) {
    GithubStore.octokit = new Octokit({
      auth: GithubStore.token,
    });

    return GithubStore.octokit;
  }

  throw new Error('Please input github token');
};

export const getGitInstance = () => {
  const octokit = octokitFactory();
  return octokit.rest.git;
};

// 获取当前仓库的树对象
export const getCurrentTree = async ({ branch }: { branch: string }) => {
  const git = getGitInstance();
  const response = await git.getTree({
    owner,
    repo,
    tree_sha: branch, // 分支的 SHA 或分支名称
    recursive: 'true', // 递归获取所有文件和文件夹
  });

  return response.data.sha; // 返回当前树对象的 SHA 哈希值
};

// 创建 Blob 对象
export const createBlob = async (content: string) => {
  const git = getGitInstance();
  const resp = await git.createBlob({
    owner,
    repo,
    content,
    encoding: 'utf-8',
  });

  return resp.data.sha;
};

export const getBranchSha = async ({ branch }: { branch: string }) => {
  const git = getGitInstance();
  const refResp = await git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  console.info(branch, ':refResp:', refResp);
  if (refResp.status === 200) {
    return refResp.data.object.sha;
  }

  return null;
};

export const pushCommitToBranch = async ({
  branch,
  commitSha,
}: {
  branch: string;
  commitSha: string;
}) => {
  const git = getGitInstance();
  const refResp = await git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
  });

  if (refResp.status === 200) {
    console.info('提交成功');
  }

  console.info('update ref:resp', refResp);
};

export const getTreeByBranchSha = async (branchSha: string) => {
  const git = getGitInstance();
  const treeResp = await git.getTree({
    owner,
    repo,
    tree_sha: branchSha,
  });
  console.info('treeResp', treeResp);
  if (treeResp.status === 200) {
    return treeResp.data;
  }

  return null;
};

export const createTree = async ({
  blobSha,
  filePath,
  currentTreeSha,
}: {
  blobSha: string;
  filePath: string;
  currentTreeSha: string;
}) => {
  const git = getGitInstance();
  // 获取当前树对象中的文件和文件夹项
  const response = await git.getTree({
    owner,
    repo,
    tree_sha: currentTreeSha,
    recursive: 'true', // 递归获取所有文件和文件夹
  });

  const currentTreeData = response.data.tree;

  const treeResp = await git.createTree({
    repo,
    owner,
    tree: [
      // 添加文件条目
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobSha, // 文件内容的SHA哈希
      },
      ...(currentTreeData as any),
      // 添加文件夹条目
      //   {
      //     path:  ,
      //     mode: '040000',
      //     type: 'tree',
      //     sha: 'SHA_HASH_OF_FOLDER_TREE', // 文件夹树对象的SHA哈希
      //   },
    ],
    base_tree: undefined, // 如果是新提交，请将其设置为 null,
  });

  return treeResp.data.sha;
};

export const createCommit = async ({
  treeSha,
  branch,
}: {
  treeSha: string;
  branch: string;
}) => {
  const git = getGitInstance();
  const parentSha = await getBranchSha({ branch });
  if (parentSha === null) {
    throw Error(`不存在${branch} 对应的 sha`);
  }

  await getTreeByBranchSha(parentSha);

  const commitResp = await git.createCommit({
    repo,
    owner,
    tree: treeSha,
    parents: [parentSha],
    message: 'add copy content',
    author: {
      name: 'targeral',
      email: 'targeral@outlook.com',
    },
  });

  return commitResp.data; // 返回新提交的 SHA 哈希值
};

export const createFolderIfNotExists = async ({
  folderPath,
  branch,
}: {
  folderPath: string;
  branch: string;
}) => {
  await createNewFolder({ folderPath, branch });
  //   try {
  //     // 尝试获取文件夹的内容，如果文件夹不存在，会抛出异常
  //     await octokit.rest.repos.getContent({
  //       owner,
  //       repo,
  //       path: folderPath,
  //       ref: `heads/${branch}`,
  //     });
  //   } catch (error) {
  //     if ((error as any).status === 404) {
  //       // 文件夹不存在，创建新文件夹
  //       await createNewFolder({ folderPath, branch });
  //     } else {
  //       throw error; // 如果发生其他错误，抛出异常
  //     }
  //   }
};

export const createNewFolder = async ({
  folderPath,
  branch,
}: {
  folderPath: string;
  branch: string;
}) => {
  // 创建新树对象
  console.info('folderPath', folderPath);
  const git = getGitInstance();
  const response = await git.createTree({
    owner,
    repo,
    base_tree: undefined, // 如果是新提交，请将其设置为 null
    // 创建一个表示新文件夹的树对象
    tree: [
      {
        path: folderPath,
        mode: '040000', // 文件夹权限模式
        type: 'tree',
        // sha: null, // 置为 null 表示新文件夹
      },
    ],
  });

  const treeSha = response.data.sha; // 新树对象的 SHA 哈希值

  // 创建新提交，将新树对象与父提交关联起来
  const newCommit = await createCommit({ treeSha, branch });

  // 推送新提交到分支
  await pushCommitToBranch({ commitSha: newCommit.sha, branch });
};

export const gitCommitByContent = async ({ text = '' }: { text?: string }) => {
  const now = dayjs().format('YYYY_MM_DD_HH_mm_ss');
  const folderPath = 'files';
  const filePath = `${folderPath}/${now}.md`;
  const branch = 'main';
  console.info(filePath);

  //   await createFolderIfNotExists({ folderPath, branch });

  const currentTreeSha = await getCurrentTree({ branch });
  const blobSha = await createBlob(text);
  const treeSha = await createTree({ blobSha, filePath, currentTreeSha });
  const commitResult = await createCommit({
    treeSha,
    branch,
  });

  await pushCommitToBranch({ branch: 'main', commitSha: commitResult.sha });
};
