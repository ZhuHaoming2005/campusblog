# CampusBlog 后续开发规范

本文档记录当前项目在 Payload CMS、Next.js Cache Components、OpenNext Cloudflare 与鉴权链路上的约定。后续改动如果触碰认证、缓存、内容模型、部署配置，应优先按本文执行，再参考通用 Payload 规则。

---

## 1. 官方语义优先级

后续开发默认按以下顺序判断方案是否可接受：

1. Payload 官方语义：认证、邮箱验证、Local API、access control、collection hooks。
2. Next.js 官方语义：`use cache`、`cacheTag`、`cacheLife`、`revalidateTag`、`connection()`。
3. OpenNext Cloudflare 官方语义：R2 incremental cache、D1 tag cache、Queue、Workers runtime。
4. 本仓库已有封装：`src/app/api/auth/_lib/`、`src/app/(frontend)/lib/cacheTags.ts`、`src/hooks/revalidateFrontendCache.ts`。

如果官方语义和本地封装冲突，应先修正本地封装。

参考：

- Next `revalidateTag`: <https://nextjs.org/docs/app/api-reference/functions/revalidateTag>
- Next `cacheLife`: <https://nextjs.org/docs/app/api-reference/functions/cacheLife>
- OpenNext Cloudflare caching: <https://opennext.js.org/cloudflare/caching>
- Cloudflare Workers Headers: <https://developers.cloudflare.com/workers/runtime-apis/headers/>
- Payload auth operations: <https://payloadcms.com/docs/authentication/operations>

---

## 2. CMS 内容缓存规范

本项目的 CMS 公共内容缓存采用 tag-driven 模型：

- 读取端：`'use cache'` + `cacheLife(...)` + `cacheTag(...)`
- 写入端：Payload collection hooks 统一调用 `revalidateTag(tag, 'max')`
- 不使用短周期 `cacheLife('minutes')` 作为 CMS 内容刷新机制
- 不在自定义 API route 里分散写 `revalidateTag`，除非该 mutation 不经过 Payload collection

当前缓存生命周期定义在：

- `src/app/(frontend)/lib/cacheTags.ts`

公共 CMS 缓存应继续使用：

```ts
cacheLife({
  stale: 300,
  revalidate: Infinity,
  expire: Infinity,
})
```

这个配置表示服务端内容主要依赖 tag invalidation 刷新，避免重新引入 Cloudflare/OpenNext 的短周期 time-based revalidation 风险。

### 2.1 新增 cached reader 的要求

新增公开内容读取函数时，必须同时完成：

1. 在读取函数内声明 `'use cache'`。
2. 使用 `cacheLife`，优先复用 `CMS_CONTENT_CACHE_LIFE` 或 `CMS_STRUCTURE_CACHE_LIFE`。
3. 使用稳定、细粒度的 `cacheTag`。
4. 在对应 Payload collection hook 中补齐 `revalidateTag(tag, 'max')`。
5. 为 tag 计算或 hook 行为补测试。

### 2.2 禁止缓存用户态数据

以下数据不得使用公共 `'use cache'`：

- 当前登录用户信息
- 用户草稿、隐藏文章作者预览
- 编辑器、用户中心、权限相关查询
- 依赖 `headers()`、`cookies()`、session、JWT 的数据

如果页面本身依赖请求态信息，应使用 `connection()` 明确声明动态边界。

---

## 3. Payload mutation 与缓存失效

内容缓存失效职责归 Payload collection hooks：

- `posts` 修改后失效文章列表、详情、学校页、频道页相关 tag
- `schools` 修改后失效学校结构和文章列表 tag
- `school-sub-channels` 修改后失效频道结构和文章列表 tag

当前统一入口：

- `src/hooks/revalidateFrontendCache.ts`

更新文章时必须同时考虑 `doc` 和 `previousDoc`。这样才能覆盖以下场景：

- 修改 `slug`
- 修改 `school`
- 修改 `subChannel`
- 发布状态变化
- 删除文章

如果未来新增 collection 会影响前台 cached reader，必须把失效逻辑加到 collection hook，而不是只加到某个自定义 API route。

---

## 4. Payload Local API 安全规则

当 Local API 传入 `user` 时，必须显式设置：

```ts
overrideAccess: false
```

否则 Payload Local API 默认绕过 access control，会造成权限漏洞。

在 hooks 中执行嵌套 `req.payload.create/update/delete/find` 时，必须传入同一个 `req`，保证事务和上下文一致：

```ts
await req.payload.update({
  collection: 'posts',
  id,
  data,
  req,
})
```

如果 hook 内部操作可能再次触发同类 hook，必须使用 `context` flag 防止循环。

---

## 5. 鉴权与邮箱验证规范

认证边界由 Payload Auth 负责，Next.js API route 只做薄封装：

- 登录代理 Payload REST `/api/users/login`
- 注册、验证、重发验证、重置密码保持 Payload 官方语义
- 未验证用户不能进入编辑器和用户中心
- 前端只在 `currentUser._verified === true` 时从登录/注册页自动跳走

Cloudflare Workers 上转发登录 cookie 时，必须兼容多值 `Set-Cookie`：

1. 优先使用 Node/undici `headers.getSetCookie()`
2. Cloudflare Workers 使用 `headers.getAll('Set-Cookie')`
3. 最后才 fallback 到 `headers.get('set-cookie')`

当前统一实现：

- `src/app/api/auth/_lib/authResponses.ts`

不要在其他 route 中手写新的 cookie 转发逻辑。

---

## 6. Next.js Cache Components 页面规则

使用 `cacheComponents` 时：

- 登录、注册、用户中心、编辑器等请求态页面必须通过 `connection()` 或请求 API 明确动态化。
- 聚合页面函数不要额外包一层 `'use cache'`，优先缓存叶子数据读取函数。
- `generateMetadata()` 如果不能安全读取用户态数据，应继续使用 published-only 查询。
- 不要把 author-only preview、hidden post 可见性判断放入公共 cache。

---

## 7. Cloudflare / OpenNext 部署规范

Cloudflare 端保持 OpenNext 官方缓存结构：

- R2 incremental cache
- D1 tag cache
- Durable Object queue
- `WORKER_SELF_REFERENCE`

即使当前 CMS 内容不依赖短周期 time-based revalidation，也不要随意删除这些绑定。它们仍是 OpenNext Cloudflare 缓存能力的一部分。

注意事项：

- `wrangler.jsonc` 的环境字段不继承，`env.dev` / production 需要分别确认 D1、R2、KV、service binding。
- 非生产部署使用 `pnpm run deploy:dev`。
- 生产部署使用 `pnpm run deploy:production`。
- 不要用 dev 命令覆盖 production，也不要用 production 命令验证 dev 资源。
- `build:cloudflare:dev` 出现本地 internal Durable Object warning 不等于构建失败；以命令退出码和 `.open-next` 产物为准。

---

## 8. 验证要求

修改代码后按影响范围验证：

### 8.1 Payload schema 或 collection 改动

```bash
pnpm run generate:types
pnpm exec tsc --noEmit
```

如果涉及 Admin component path，再运行：

```bash
pnpm run generate:importmap
```

### 8.2 鉴权、缓存、Cloudflare 相关改动

至少运行：

```bash
pnpm exec tsc --noEmit
pnpm run build:cloudflare:dev
```

并补充对应 Vitest：

```bash
pnpm exec vitest run <changed-tests> --config ./vitest.config.mts
```

### 8.3 部署前检查

部署前确认：

- `.open-next/worker.js` 已生成
- `.open-next/assets` 已生成
- `.next/prerender-manifest.json` 没有意外的短周期 `initialRevalidateSeconds`
- `wrangler.jsonc` 目标环境绑定完整

---

## 9. 新功能检查清单

提交前检查：

- [ ] 是否新增了 cached reader？如果是，是否有对应 `cacheTag` 和 collection hook 失效？
- [ ] 是否传了 `user` 给 Payload Local API？如果是，是否设置 `overrideAccess: false`？
- [ ] 是否在 hook 中做了嵌套 Payload 操作？如果是，是否传了 `req`？
- [ ] 是否读取了 session、headers、cookies？如果是，是否避免公共缓存？
- [ ] 是否改了 Payload schema？如果是，是否运行 `generate:types`？
- [ ] 是否触碰 Cloudflare 配置？如果是，是否分别检查 dev 和 production 环境？
- [ ] 是否触碰登录 cookie？如果是，是否复用 `appendSetCookieHeaders()`？
