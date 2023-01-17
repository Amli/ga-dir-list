import { exec as execImpl, ExecOptions } from '@actions/exec';

export const exec = async (
  commandLine,
  args,
  options
) => {
  options = options || {};
  let stdout = '';
  let stderr = '';
  options.listeners = {
    stdout => (stdout += data.toString()),
    stderr => (stderr += data.toString())
  };
  const code = await execImpl(commandLine, args, options);
  return { code, stdout, stderr };
};
