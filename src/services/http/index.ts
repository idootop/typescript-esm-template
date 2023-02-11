import fetch from 'node-fetch';

import { jsonDecode, jsonEncode } from '@/utils/base';
import { writeFile } from '@/utils/io';
import { isNotEmpty, isObject } from '@/utils/is';
import pTimeout from '@/utils/p-timeout';

type HttpConfig = {
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

class HTTPClient {
  static timeout = 3000;

  /**
   * 构建GET请求地址
   */
  private static _buildURL = (url: string, query?: Record<string, any>) => {
    const _url = new URL(url);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (isNotEmpty(value)) {
        _url.searchParams.append(key, value.toString());
      }
    }
    return _url.href;
  };

  /**
   * 处理超时和异常
   */
  static _fetchWithTimeout = async (url: string, config?: RequestInit) => {
    return await pTimeout(
      fetch(url, config as any).catch((e) => {
        if (!e.message?.includes('aborted')) {
          console.error('❌ 网络异常：', e);
        }
        return undefined;
      }),
      HTTPClient.timeout
    ).catch(() => {
      console.error('🕙 请求超时');
      return undefined;
    });
  };

  async get<T = any>(url: string, config?: HttpConfig): Promise<T | undefined> {
    const { headers = {}, query, signal } = config ?? {};
    const newUrl = query ? HTTPClient._buildURL(url, query) : url;
    const response = await HTTPClient._fetchWithTimeout(newUrl, {
      method: 'GET',
      headers: {
        ...headers,
      },
      signal,
    });
    let result: any = await response?.text();
    result = jsonDecode(result) ?? result;
    return result;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: HttpConfig
  ): Promise<T | undefined> {
    const { headers = {}, signal } = config ?? {};
    const body = isObject(data) ? jsonEncode(data) : data;
    const response = await HTTPClient._fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        ...headers,
      },
      body,
      signal,
    });
    let result: any = await response?.text();
    result = jsonDecode(result) ?? result;
    return result;
  }

  async download(url: string, path: string, config?: HttpConfig) {
    const { headers = {}, query, signal } = config ?? {};
    const newUrl = query ? HTTPClient._buildURL(url, query) : url;
    const response = await HTTPClient._fetchWithTimeout(newUrl, {
      headers: {
        ...headers,
      },
      signal,
    });
    if (response?.ok) {
      const buffer = await response.arrayBuffer();
      return await writeFile(path, Buffer.from(buffer));
    }
  }
}

export const http = new HTTPClient();
