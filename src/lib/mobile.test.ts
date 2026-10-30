import { afterEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { authRedirectUrl, MOBILE_AUTH_CALLBACK, publicShareUrl, readNativeAuthCode } from './mobile';
import config from '../../capacitor.config';

afterEach(() => vi.restoreAllMocks());

describe('native URLs', () => {
  it('packages the app locally without a development server or cleartext traffic', () => {
    expect(config.appName).toBe('A Challenge');
    expect(config.appId).toBe('com.albilubila.achallenge');
    expect(config.server?.url).toBeUndefined();
    expect(config.server?.cleartext).toBe(false);
  });
  it('only consumes authentication callbacks for this application', () => {
    expect(readNativeAuthCode(`${MOBILE_AUTH_CALLBACK}?code=example`)).toBe('example');
    for (const value of ['javascript:alert(1)', 'https://example.test/auth/callback?code=secret', 'com.albilubila.achallenge://evil/callback?code=secret']) {
      expect(readNativeAuthCode(value)).toBeNull();
    }
  });
  it('keeps web authentication on the current origin and native recovery inside the app', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(authRedirectUrl('/auth?mode=reset')).toBe(`${window.location.origin}/auth?mode=reset`);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(authRedirectUrl('/auth?mode=reset')).toBe(`${MOBILE_AUTH_CALLBACK}?mode=reset`);
  });
  it('always shares a usable public URL, including from a native localhost origin', () => {
    expect(publicShareUrl('/auth?ref=friend')).toBe('https://achallenge.vercel.app/auth?ref=friend');
  });
});
