import { jsonResponse } from './_util';

type Env = {
  APP_VERSION?: string;
  APP_COMMIT?: string;
  BUILD_TIME?: string;
};

function readHeader(request: Request, name: string): string {
  const v = request.headers.get(name);
  return v ? v.trim() : '';
}

type Source = 'env' | 'header' | 'runtime';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const envVersion = typeof env.APP_VERSION === 'string' ? env.APP_VERSION.trim() : '';
  const envCommit = typeof env.APP_COMMIT === 'string' ? env.APP_COMMIT.trim() : '';
  const envBuildTime = typeof env.BUILD_TIME === 'string' ? env.BUILD_TIME.trim() : '';

  const headerVersion = readHeader(request, 'x-app-version');
  const headerCommit = readHeader(request, 'x-app-commit');
  const headerBuildTime = readHeader(request, 'x-build-time');

  const version = envVersion || headerVersion;
  const commit = envCommit || headerCommit;

  let buildTime = envBuildTime || headerBuildTime;
  const buildTimeSource: Source = envBuildTime ? 'env' : headerBuildTime ? 'header' : 'runtime';
  if (!buildTime) buildTime = new Date().toISOString();

  const versionSource: Source = envVersion ? 'env' : headerVersion ? 'header' : 'runtime';
  const commitSource: Source = envCommit ? 'env' : headerCommit ? 'header' : 'runtime';

  return jsonResponse({
    ok: true,
    version,
    commit,
    buildTime,
    sources: {
      version: versionSource,
      commit: commitSource,
      buildTime: buildTimeSource,
    },
  });
};
