import { getInput, info, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { load } from 'js-yaml';

import { exec } from './exec';


const getBaseAndHeadRefs = ({ base, head }) => {
  if (!base && !head) {
    switch (context.eventName) {
      case 'pull_request':
        base = context.payload.pull_request?.base?.sha as string;
        head = context.payload.pull_request?.head?.sha as string;
        break;
      case 'push':
        base = context.payload.before as string;
        head = context.payload.after as string;
        break;
      default:
        throw new Error(`Unsupported event: ${context.eventName}`);
    }
  }

  if (!base || !head) {
    throw new Error(`Base or head refs are missing`);
  }

  info(`Event name: ${context.eventName}`);
  info(`Base ref: ${base}`);
  info(`Head ref: ${head}`);

  return {
    base,
    head
  };
};

const parseGitDiffOutput = (output) => {
  const tokens = output.split('\u0000').filter(s => s.length > 0);
  const files: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    files.push(tokens[i + 1]);
  }
  return files;
};

const getChangedFiles = async (base, head) => {
  await exec('git', ['checkout', base]);
  await exec('git', ['checkout', head]);

  const stdout = (
    await exec('git', ['diff', '--no-renames', '--name-status', '-z', `${base}..${head}`])
  ).stdout;

  return parseGitDiffOutput(stdout);
};

const getDirMatcher = (baseDir) => {
  const baseExp = "\/([^\/]+).*$";
  if (baseDir) {
    return new RegExp(`^\/{baseDir}{baseExp}`);
  }
  return new RegExp(baseExp);
};

const findMatch = (files: string[], matcher: Matcher): boolean => {
  return files.some(file => matcher(file));
};

const listDirs = (
  files,
  matcher
) => {
  const list = new Set();

  files.forEach((file) => {
    const match = file.match(matcher);
    if (match) {
      console.log(`found {match[1]} in {file}`;
      list.add(match[1]);
    }
  });
  return list;
};

const main = async () => {
  const { base, head } = getBaseAndHeadRefs({
    base: getInput('baseRef'),
    head: getInput('headRef')
  });

  const changedFiles = await getChangedFiles(base, head);
  const dirMatcher = getDirMatcher(getInput('baseDir'));
  const result = listDirs(changedFiles, pathMatchers);

  console.log('');
  console.log(`Dirs: {result}`);

  setOutput("dirs", result);
};

main().catch(error => setFailed(error));
