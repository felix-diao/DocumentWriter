import { normalizeAppPath, toAppRoute, withAppBase } from './appPath';

describe('app path helpers', () => {
  it('normalizes deployed browser paths to app routes', () => {
    expect(normalizeAppPath('/agent_officea/user/login')).toBe('/user/login');
    expect(normalizeAppPath('/agent_officea')).toBe('/');
    expect(normalizeAppPath('/user/login')).toBe('/user/login');
  });

  it('converts deployed browser paths back to app routes for Umi history', () => {
    expect(toAppRoute('/agent_officea/user/login?redirect=%2Fdoc%2Fwelcome')).toBe('/user/login?redirect=%2Fdoc%2Fwelcome');
    expect(toAppRoute('/doc/welcome')).toBe('/doc/welcome');
  });

  it('prefixes same-origin app routes with deployment base', () => {
    expect(withAppBase('/user/login')).toBe('/agent_officea/user/login');
    expect(withAppBase('/agent_officea/user/login')).toBe('/agent_officea/user/login');
    expect(withAppBase('https://example.com/user/login')).toBe('https://example.com/user/login');
  });
});
