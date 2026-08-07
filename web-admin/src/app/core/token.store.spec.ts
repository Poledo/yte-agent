import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TokenStore } from './token.store';

describe('TokenStore', () => {
  let store: TokenStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(TokenStore);
  });

  it('chưa đăng nhập thì không có token nào', () => {
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
  });

  it('lưu và đọc lại được cả hai token', () => {
    store.setTokens('access-1', 'refresh-1');

    expect(store.accessToken).toBe('access-1');
    expect(store.refreshToken).toBe('refresh-1');
  });

  it('làm mới access token không đụng tới refresh token', () => {
    store.setTokens('access-1', 'refresh-1');
    store.setAccessToken('access-2');

    expect(store.accessToken).toBe('access-2');
    expect(store.refreshToken).toBe('refresh-1');
  });

  it('đăng xuất xóa sạch cả hai token', () => {
    store.setTokens('access-1', 'refresh-1');
    store.clear();

    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
  });

  it('token nằm ở localStorage chứ không phải cookie phiên', () => {
    store.setTokens('access-1', 'refresh-1');

    // Cơ sở cho việc API không cần bật AllowCredentials trong CORS:
    // trình duyệt không tự đính token vào request chéo origin.
    expect(localStorage.getItem('cbytds.accessToken')).toBe('access-1');
    expect(document.cookie).not.toContain('access-1');
  });

  it('đọc được claim trong payload JWT', () => {
    const payload = btoa(JSON.stringify({ sub: 'admin', permissions: ['System.Admin'] }));
    const token = `header.${payload}.chuky`;

    expect(store.decodeToken(token)).toEqual({ sub: 'admin', permissions: ['System.Admin'] });
  });

  it('token hỏng thì trả null chứ không ném lỗi', () => {
    expect(store.decodeToken('khong-phai-jwt')).toBeNull();
    expect(store.decodeToken('a.b.c')).toBeNull();
  });
});
