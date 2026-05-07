/**
 * Blog v2 API Test Script
 *
 * 用法:
 *   node test/api-test.js
 *
 * 交互式测试脚本，测试 blog-v2 后端的各个接口。
 * 当需要 token、验证码等信息时，会等待用户在命令行输入。
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8848';
const readline = require('readline');

// ========== 工具函数 ==========

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ANSI 颜色
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function log(level, label, message) {
  const prefix = { pass: `${C.green}PASS${C.reset}`, fail: `${C.red}FAIL${C.reset}`, skip: `${C.yellow}SKIP${C.reset}`, info: `${C.cyan}INFO${C.reset}` }[level];
  console.log(`  [${prefix}] ${label}${message ? ' — ' + message : ''}`);
}

function pass(label, message) {
  passCount++;
  log('pass', label, message);
}

function fail(label, message) {
  failCount++;
  log('fail', label, message);
}

function skip(label, message) {
  skipCount++;
  log('skip', label, message);
}

function info(label, message) {
  log('info', label, message);
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}`);
}

// ========== Cookie 管理 ==========

const cookieJar = {};

function setCookies(headers) {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return;
  // 简单解析：取 key=value 部分，忽略其他属性
  const match = setCookie.match(/^([^=]+)=([^;]+)/);
  if (match) {
    cookieJar[match[1]] = match[2];
  }
}

function getCookieHeader() {
  const pairs = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`);
  return pairs.length > 0 ? pairs.join('; ') : null;
}

// ========== HTTP 请求封装 ==========

async function request(method, path, opts = {}) {
  const { body, auth = true, isFormData = false } = opts;
  const url = `${BASE_URL}${path}`;
  const headers = {};

  if (auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const cookie = getCookieHeader();
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOpts = { method, headers };
  if (body) {
    fetchOpts.body = isFormData ? body : JSON.stringify(body);
  }

  // 不自动跟随重定向，因为某些接口可能返回 302
  fetchOpts.redirect = 'manual';

  let response;
  try {
    response = await fetch(url, fetchOpts);
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.message };
  }

  setCookies(response.headers);

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

// ========== 全局状态 ==========

let accessToken = null;
let currentUser = null;
let testPostId = null;
let testCommentId = null;
let targetUserId = null;
let verificationToken = null;

// ========== 测试用例 ==========

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    fail(name, `异常: ${err.message}`);
  }
}

// ==================== Phase 0: 健康检查 ====================

async function testHealth() {
  section('0. 健康检查');

  await test('GET /api/health', async () => {
    const { ok, status, data } = await request('GET', '/api/health', { auth: false });
    if (ok && status === 200 && data?.status === 'ok') {
      pass('GET /api/health', `status=${data.status}`);
    } else {
      fail('GET /api/health', `status=${status}, data=${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 1: 认证流程 ====================

async function testAuth() {
  section('1. 认证流程');

  const mode = await ask('  注册新用户 (r) 还是使用已有账号登录 (l)? [r/l]: ');
  const isRegister = mode.toLowerCase() === 'r';

  let email, password, username;

  if (isRegister) {
    username = await ask('  用户名 (3-30 chars): ');
    email = await ask('  邮箱: ');
    password = await ask('  密码 (8-72 chars, 需含字母+数字或特殊字符): ');

    await test('POST /api/auth/register', async () => {
      const { ok, status, data } = await request('POST', '/api/auth/register', {
        auth: false,
        body: { username, email, password },
      });
      if (ok && status === 201) {
        pass('POST /api/auth/register', data?.message || '注册成功');
      } else if (status === 409) {
        skip('POST /api/auth/register', data?.message || '用户已存在，跳过注册');
      } else {
        fail('POST /api/auth/register', `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    // 验证邮箱
    const verifyChoice = await ask('\n  是否验证邮箱？需要邮箱验证码 (y/n): ');
    if (verifyChoice.toLowerCase() === 'y') {
      const verifyToken = await ask('  请输入邮箱验证 token: ');
      await test('GET /api/auth/verify-email', async () => {
        const { ok, status, data } = await request('GET', `/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`, { auth: false });
        if (ok && status === 200) {
          pass('GET /api/auth/verify-email', data?.message || '验证成功');
        } else {
          fail('GET /api/auth/verify-email', `status=${status}, ${JSON.stringify(data)}`);
        }
      });
    } else {
      skip('GET /api/auth/verify-email', '用户跳过');
    }
  } else {
    email = await ask('  邮箱: ');
    password = await ask('  密码: ');
  }

  // 登录
  await test('POST /api/auth/login', async () => {
    const { ok, status, data } = await request('POST', '/api/auth/login', {
      auth: false,
      body: { email, password, rememberMe: true },
    });
    if (ok && status === 200) {
      accessToken = data?.data?.accessToken;
      currentUser = data?.data?.user;
      pass('POST /api/auth/login', `用户: ${currentUser?.username}, 获得 accessToken`);
      info('accessToken', accessToken ? accessToken.substring(0, 50) + '...' : '(null)');
    } else {
      fail('POST /api/auth/login', `status=${status}, ${JSON.stringify(data)}`);
      console.log(`  ${C.red}如果登录失败，后续认证接口将无法测试。请检查账号密码。${C.reset}`);
    }
  });

  if (!accessToken && isRegister) {
    info('提示', '注册后可能需要验证邮箱才能登录。尝试用数据库工具手动设置 emailVerified=true');
  }
}

// ==================== Phase 2: 用户操作 ====================

async function testUsers() {
  section('2. 用户操作');

  if (!accessToken) {
    skip('所有用户接口', '未登录，跳过');
    return;
  }

  await test('GET /api/users/me', async () => {
    const { ok, status, data } = await request('GET', '/api/users/me');
    if (ok && status === 200) {
      currentUser = data?.data;
      pass('GET /api/users/me', `用户: ${currentUser?.username}`);
    } else {
      fail('GET /api/users/me', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('PATCH /api/users/me', async () => {
    const { ok, status, data } = await request('PATCH', '/api/users/me', {
      body: { bio: '测试签名 - ' + Date.now() },
    });
    if (ok && status === 200) {
      pass('PATCH /api/users/me', data?.message || '更新成功');
    } else {
      fail('PATCH /api/users/me', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  // 查询其他用户
  targetUserId = await ask('\n  输入另一个用户的 ID（用于测试关注/取关，为空则跳过）: ');
  if (targetUserId) {
    await test(`GET /api/users/${targetUserId}`, async () => {
      const { ok, status, data } = await request('GET', `/api/users/${targetUserId}`);
      if (ok && status === 200) {
        pass(`GET /api/users/${targetUserId}`, `用户: ${data?.data?.username}`);
      } else {
        fail(`GET /api/users/${targetUserId}`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    await test(`GET /api/users/${targetUserId}/posts`, async () => {
      const { ok, status, data } = await request('GET', `/api/users/${targetUserId}/posts`);
      if (ok && status === 200) {
        const count = Array.isArray(data?.data) ? data.data.length : '?';
        pass(`GET /api/users/${targetUserId}/posts`, `文章数: ${count}`);
      } else {
        fail(`GET /api/users/${targetUserId}/posts`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });
  } else {
    skip('GET /api/users/:id', '未提供用户 ID');
    skip('GET /api/users/:id/posts', '未提供用户 ID');
  }
}

// ==================== Phase 3: 文章操作 ====================

async function testPosts() {
  section('3. 文章操作');

  // 公共接口：获取文章列表
  await test('GET /api/posts (公开)', async () => {
    const { ok, status, data } = await request('GET', '/api/posts', { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/posts', `文章数: ${count}`);
    } else {
      fail('GET /api/posts', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('GET /api/posts?sort=hot', async () => {
    const { ok, status, data } = await request('GET', '/api/posts?sort=hot', { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/posts?sort=hot', `文章数: ${count}`);
    } else {
      fail('GET /api/posts?sort=hot', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('GET /api/posts/trending', async () => {
    const { ok, status, data } = await request('GET', '/api/posts/trending', { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/posts/trending', `文章数: ${count}`);
    } else {
      fail('GET /api/posts/trending', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  if (!accessToken) {
    skip('文章 CRUD/Like', '未登录，跳过认证接口');
    return;
  }

  // 创建文章
  await test('POST /api/posts (创建)', async () => {
    const { ok, status, data } = await request('POST', '/api/posts', {
      body: {
        title: '测试文章 ' + new Date().toISOString(),
        content: '这是测试文章的内容。包含一些 **Markdown** 格式。',
        summary: '测试摘要',
        tags: ['测试', 'api'],
        status: 'published',
      },
    });
    if (ok && status === 201) {
      testPostId = data?.data?._id || data?.data?.id;
      pass('POST /api/posts', `文章 ID: ${testPostId}`);
      info('post slug', data?.data?.slug || '?');
    } else {
      fail('POST /api/posts', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  if (testPostId && currentUser) {
    await test(`GET /api/posts/${testPostId}`, async () => {
      const { ok, status, data } = await request('GET', `/api/posts/${testPostId}`);
      if (ok && status === 200) {
        pass(`GET /api/posts/${testPostId}`, `标题: ${data?.data?.title}`);
      } else {
        fail(`GET /api/posts/${testPostId}`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    await test(`PATCH /api/posts/${testPostId}`, async () => {
      const { ok, status, data } = await request('PATCH', `/api/posts/${testPostId}`, {
        body: { summary: '更新后的摘要 - ' + Date.now(), tags: ['测试', 'api', '更新'] },
      });
      if (ok && status === 200) {
        pass(`PATCH /api/posts/${testPostId}`, '更新成功');
      } else {
        fail(`PATCH /api/posts/${testPostId}`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    await test(`POST /api/posts/${testPostId}/like`, async () => {
      const { ok, status, data } = await request('POST', `/api/posts/${testPostId}/like`);
      if (ok && status === 200) {
        pass(`POST /api/posts/${testPostId}/like`, '点赞成功');
      } else if (status === 409) {
        skip(`POST /api/posts/${testPostId}/like`, '已点赞过');
      } else {
        fail(`POST /api/posts/${testPostId}/like`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    await test(`DELETE /api/posts/${testPostId}/like`, async () => {
      const { ok, status, data } = await request('DELETE', `/api/posts/${testPostId}/like`);
      if (ok && status === 200) {
        pass(`DELETE /api/posts/${testPostId}/like`, '取消点赞成功');
      } else {
        fail(`DELETE /api/posts/${testPostId}/like`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });

    // Feed
    await test('GET /api/posts/feed', async () => {
      const { ok, status, data } = await request('GET', '/api/posts/feed');
      if (ok && status === 200) {
        const count = Array.isArray(data?.data) ? data.data.length : '?';
        pass('GET /api/posts/feed', `文章数: ${count}`);
      } else {
        fail('GET /api/posts/feed', `status=${status}, ${JSON.stringify(data)}`);
      }
    });
  }
}

// ==================== Phase 4: 评论操作 ====================

async function testComments() {
  section('4. 评论操作');

  if (!accessToken || !testPostId) {
    skip('评论接口', '未登录或无测试文章');
    return;
  }

  // 获取评论列表（公开）
  await test(`GET /api/posts/${testPostId}/comments`, async () => {
    const { ok, status, data } = await request('GET', `/api/posts/${testPostId}/comments`, { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass(`GET /api/posts/${testPostId}/comments`, `评论数: ${count}`);
    } else {
      fail(`GET /api/posts/${testPostId}/comments`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  // 创建评论
  await test(`POST /api/posts/${testPostId}/comments`, async () => {
    const { ok, status, data } = await request('POST', `/api/posts/${testPostId}/comments`, {
      body: { content: '这是一条测试评论 - ' + Date.now() },
    });
    if (ok && status === 201) {
      testCommentId = data?.data?._id || data?.data?.id;
      pass(`POST /api/posts/${testPostId}/comments`, `评论 ID: ${testCommentId}`);
    } else {
      fail(`POST /api/posts/${testPostId}/comments`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  if (testCommentId) {
    await test(`POST /api/posts/${testPostId}/comments/${testCommentId}/like`, async () => {
      const { ok, status, data } = await request('POST', `/api/posts/${testPostId}/comments/${testCommentId}/like`);
      if (ok && status === 200) {
        pass(`POST .../comments/${testCommentId}/like`, '点赞成功');
      } else if (status === 409) {
        skip(`POST .../comments/${testCommentId}/like`, '已点赞过');
      } else {
        fail(`POST .../comments/${testCommentId}/like`, `status=${status}, ${JSON.stringify(data)}`);
      }
    });
  }
}

// ==================== Phase 5: 收藏操作 ====================

async function testCollections() {
  section('5. 收藏操作');

  if (!accessToken || !testPostId) {
    skip('收藏接口', '未登录或无测试文章');
    return;
  }

  await test(`POST /api/collections/${testPostId}`, async () => {
    const { ok, status, data } = await request('POST', `/api/collections/${testPostId}`);
    if (ok && status === 201) {
      pass(`POST /api/collections/${testPostId}`, '收藏成功');
    } else if (status === 409) {
      skip(`POST /api/collections/${testPostId}`, '已收藏过');
    } else {
      fail(`POST /api/collections/${testPostId}`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('GET /api/collections', async () => {
    const { ok, status, data } = await request('GET', '/api/collections');
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/collections', `收藏数: ${count}`);
    } else {
      fail('GET /api/collections', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test(`DELETE /api/collections/${testPostId}`, async () => {
    const { ok, status, data } = await request('DELETE', `/api/collections/${testPostId}`);
    if (ok && status === 200) {
      pass(`DELETE /api/collections/${testPostId}`, '取消收藏成功');
    } else {
      fail(`DELETE /api/collections/${testPostId}`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 6: 关注操作 ====================

async function testFollow() {
  section('6. 关注操作');

  if (!accessToken || !targetUserId) {
    skip('关注接口', '未登录或未提供目标用户 ID');
    return;
  }

  await test(`POST /api/users/${targetUserId}/follow`, async () => {
    const { ok, status, data } = await request('POST', `/api/users/${targetUserId}/follow`);
    if (ok && status === 200) {
      pass(`POST /api/users/${targetUserId}/follow`, '关注成功');
    } else if (status === 409) {
      skip(`POST /api/users/${targetUserId}/follow`, '已关注过');
    } else if (status === 400 && data?.code === 'BAD_REQUEST') {
      skip(`POST /api/users/${targetUserId}/follow`, '不能关注自己');
    } else {
      fail(`POST /api/users/${targetUserId}/follow`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test(`DELETE /api/users/${targetUserId}/follow`, async () => {
    const { ok, status, data } = await request('DELETE', `/api/users/${targetUserId}/follow`);
    if (ok && status === 200) {
      pass(`DELETE /api/users/${targetUserId}/follow`, '取关成功');
    } else {
      fail(`DELETE /api/users/${targetUserId}/follow`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 7: 通知操作 ====================

async function testNotifications() {
  section('7. 通知操作');

  if (!accessToken) {
    skip('通知接口', '未登录');
    return;
  }

  await test('GET /api/notifications/unread-count', async () => {
    const { ok, status, data } = await request('GET', '/api/notifications/unread-count');
    if (ok && status === 200) {
      pass('GET /api/notifications/unread-count', `未读数: ${data?.data?.count ?? '?'}`);
    } else {
      fail('GET /api/notifications/unread-count', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('GET /api/notifications', async () => {
    const { ok, status, data } = await request('GET', '/api/notifications');
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/notifications', `通知数: ${count}`);
    } else {
      fail('GET /api/notifications', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('POST /api/notifications/read-all', async () => {
    const { ok, status, data } = await request('POST', '/api/notifications/read-all');
    if (ok && status === 200) {
      pass('POST /api/notifications/read-all', data?.message || '标记成功');
    } else {
      fail('POST /api/notifications/read-all', `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 8: 搜索 ====================

async function testSearch() {
  section('8. 搜索');

  await test('GET /api/search?q=test', async () => {
    const { ok, status, data } = await request('GET', '/api/search?q=test', { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/search?q=test', `结果数: ${count}`);
    } else {
      fail('GET /api/search?q=test', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  await test('GET /api/search/users?q=a', async () => {
    const { ok, status, data } = await request('GET', '/api/search/users?q=a', { auth: false });
    if (ok && status === 200) {
      const count = Array.isArray(data?.data) ? data.data.length : '?';
      pass('GET /api/search/users?q=a', `用户数: ${count}`);
    } else {
      fail('GET /api/search/users?q=a', `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 9: 上传 ====================

async function testUpload() {
  section('9. 文件上传');

  if (!accessToken) {
    skip('上传接口', '未登录');
    return;
  }

  const fs = require('fs');
  const path = require('path');

  // 创建一个 1x1 PNG 测试图片
  // 最小的 PNG (1x1 红色像素)
  const minPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );
  const testImagePath = path.join(__dirname, '_test_image.png');
  fs.writeFileSync(testImagePath, minPng);

  await test('POST /api/upload/image', async () => {
    // 使用原生方式构造 multipart
    try {
      // Node.js 18+ 支持 Blob/File
      const { open } = require('fs/promises');
      const file = await open(testImagePath);
      const { size } = await file.stat();
      const buf = new Uint8Array(size);
      await file.read(buf);
      await file.close();

      // 构造 multipart body
      const boundary = 'TestBoundary' + Date.now();
      const partHeader = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`;
      const partFooter = `\r\n--${boundary}--\r\n`;
      const bodyBuffer = Buffer.concat([Buffer.from(partHeader), Buffer.from(buf), Buffer.from(partFooter)]);

      const url = `${BASE_URL}/api/upload/image`;
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

      const cookie = getCookieHeader();
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyBuffer,
      });

      let data = null;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await response.json();
      }

      if (response.ok && response.status === 201) {
        pass('POST /api/upload/image', `上传成功: ${data?.data?.filename || '?'}`);
      } else {
        fail('POST /api/upload/image', `status=${response.status}, ${JSON.stringify(data)}`);
      }
    } catch (err) {
      fail('POST /api/upload/image', `异常: ${err.message}`);
    }
  });

  // 清理测试图片
  try {
    fs.unlinkSync(testImagePath);
  } catch {}
}

// ==================== Phase 10: Token 刷新 ====================

async function testRefresh() {
  section('10. Token 刷新');

  if (!accessToken) {
    skip('POST /api/auth/refresh', '未登录，跳过');
    return;
  }

  await test('POST /api/auth/refresh', async () => {
    const { ok, status, data } = await request('POST', '/api/auth/refresh', { auth: false });
    if (ok && status === 200) {
      const oldToken = accessToken;
      accessToken = data?.data?.accessToken;
      pass('POST /api/auth/refresh', `获得新 accessToken`);
      if (accessToken && accessToken !== oldToken) {
        info('Token 已轮换', accessToken.substring(0, 50) + '...');
      }
    } else {
      fail('POST /api/auth/refresh', `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 11: 密码重置 ====================

async function testPasswordReset() {
  section('11. 密码重置流程');

  const doReset = await ask('  是否测试密码重置流程？(y/n): ');
  if (doReset.toLowerCase() !== 'y') {
    skip('密码重置流程', '用户跳过');
    return;
  }

  const resetEmail = await ask('  输入要重置密码的邮箱: ');

  await test('POST /api/auth/forgot-password', async () => {
    const { ok, status, data } = await request('POST', '/api/auth/forgot-password', {
      auth: false,
      body: { email: resetEmail },
    });
    if (ok && status === 200) {
      pass('POST /api/auth/forgot-password', data?.message || '发送成功');
    } else {
      fail('POST /api/auth/forgot-password', `status=${status}, ${JSON.stringify(data)}`);
    }
  });

  const resetToken = await ask('  请输入收到的重置密码 token (为空则跳过重置): ');
  if (resetToken) {
    const newPassword = await ask('  请输入新密码: ');

    await test('POST /api/auth/reset-password', async () => {
      const { ok, status, data } = await request('POST', '/api/auth/reset-password', {
        auth: false,
        body: { token: resetToken, password: newPassword },
      });
      if (ok && status === 200) {
        pass('POST /api/auth/reset-password', data?.message || '重置成功');
      } else {
        fail('POST /api/auth/reset-password', `status=${status}, ${JSON.stringify(data)}`);
      }
    });
  } else {
    skip('POST /api/auth/reset-password', '未提供 token');
  }
}

// ==================== Phase 12: 退出登录 ====================

async function testLogout() {
  section('12. 退出登录');

  if (!accessToken) {
    skip('POST /api/auth/logout', '未登录，跳过');
    return;
  }

  await test('POST /api/auth/logout', async () => {
    const { ok, status, data } = await request('POST', '/api/auth/logout');
    if (ok && status === 200) {
      pass('POST /api/auth/logout', data?.message || '退出成功');
    } else {
      fail('POST /api/auth/logout', `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== Phase 13: 清理 ====================

async function testCleanup() {
  section('13. 清理：删除测试文章');

  if (!accessToken || !testPostId) {
    skip('DELETE /api/posts/:id', '未登录或无测试文章');
    return;
  }

  await test(`DELETE /api/posts/${testPostId}`, async () => {
    const { ok, status, data } = await request('DELETE', `/api/posts/${testPostId}`);
    if (ok && status === 200) {
      pass(`DELETE /api/posts/${testPostId}`, '删除成功');
    } else {
      fail(`DELETE /api/posts/${testPostId}`, `status=${status}, ${JSON.stringify(data)}`);
    }
  });
}

// ==================== 主流程 ====================

async function main() {
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   Blog v2 API 测试脚本              ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════╝${C.reset}`);
  console.log(`\n${C.dim}服务器地址: ${BASE_URL}${C.reset}`);
  console.log(`${C.dim}测试前请确保后端服务和数据库已启动。${C.reset}\n`);

  const ready = await ask('准备好了吗？按回车开始测试...');
  console.log('');

  try {
    await testHealth();
    await testAuth();
    await testUsers();
    await testPosts();
    await testComments();
    await testCollections();
    await testFollow();
    await testNotifications();
    await testSearch();
    await testUpload();
    await testRefresh();
    await testPasswordReset();
    await testCleanup();
  } finally {
    // 总结
    const total = passCount + failCount + skipCount;
    console.log(`\n${C.bold}${C.cyan}━━━ 测试结果 ━━━${C.reset}`);
    console.log(`  总计: ${total}  |  ${C.green}通过: ${passCount}${C.reset}  |  ${C.red}失败: ${failCount}${C.reset}  |  ${C.yellow}跳过: ${skipCount}${C.reset}`);
    if (failCount > 0) {
      console.log(`\n${C.red}${C.bold}注意: ${failCount} 个测试失败，请检查。${C.reset}`);
    }
    console.log('');
    rl.close();
  }
}

main();
