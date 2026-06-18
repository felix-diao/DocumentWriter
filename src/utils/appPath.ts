const DEFAULT_APP_BASE_PATH = '/agent_officea';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getAppBasePath = () => {
  const rawBase = process.env.BASE_PATH || process.env.PUBLIC_PATH || DEFAULT_APP_BASE_PATH;
  const normalized = trimTrailingSlash(rawBase || '');
  return normalized === '/' ? '' : normalized;
};

export const normalizeAppPath = (path: string = '/') => {
  const basePath = getAppBasePath();
  const currentPath = path || '/';

  if (!basePath) return currentPath || '/';
  if (currentPath === basePath) return '/';
  if (currentPath.startsWith(`${basePath}/`)) {
    return currentPath.slice(basePath.length) || '/';
  }

  return currentPath;
};

export const withAppBase = (path: string) => {
  if (!path) return path;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(path) || path.startsWith('//') || path.startsWith('#')) {
    return path;
  }

  const basePath = getAppBasePath();
  if (!basePath) return path;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;

  return path.startsWith('/') ? `${basePath}${path}` : `${basePath}/${path}`;
};

export const toAppRoute = (path: string) => {
  if (!path) return path;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(path) || path.startsWith('//') || path.startsWith('#')) {
    return path;
  }

  const separatorIndex = path.search(/[?#]/);
  const pathname = separatorIndex >= 0 ? path.slice(0, separatorIndex) : path;
  const suffix = separatorIndex >= 0 ? path.slice(separatorIndex) : '';

  return `${normalizeAppPath(pathname || '/')}${suffix}`;
};
