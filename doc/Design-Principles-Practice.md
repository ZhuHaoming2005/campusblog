# 设计原则在 CampusBlog 项目中的应用

本文结合 CampusBlog 的开发实践，简要说明六个常见面向对象与软件设计原则的含义，以及它们在本项目中的具体体现。CampusBlog 是一个基于 Next.js、Payload CMS 和 Cloudflare Workers 的校园博客系统，主要功能包括用户认证、文章发布、学校/子频道管理、标签、评论互动、订阅、媒体配额和前台缓存刷新。

## 1. 利斯科夫替换原则（里氏代换原则）

利斯科夫替换原则强调：父类型能够出现的地方，子类型或具体实现也应该可以替换使用，并且不破坏原有行为约定。

在本项目中，Payload 的 `Access`、`CollectionConfig`、Hook 函数等都遵循统一的接口约定。例如 `authenticated`、`adminOnly`、`adminOrSelf`、`adminOrPublishedOrAuthor` 都是访问控制函数，虽然内部判断逻辑不同，但都能作为 Payload collection 的 `access.read/create/update/delete` 配置使用。`Posts` 集合可以把 `read` 设置为 `adminOrPublishedOrAuthor`，`Users` 集合可以把 `read` 设置为 `adminOrSelf`，Payload 调用它们时不需要关心具体实现，只依赖统一的访问控制契约。

这种做法使权限逻辑可以被替换和复用。例如后续如果要新增“管理员或编辑可管理文章”的访问规则，只要新函数仍然满足 Payload `Access` 的返回约定，就可以替换到对应 collection 配置中，而不需要改动 Payload 的调用方式。

## 2. 单一职责原则

单一职责原则要求一个模块、类或函数只负责一类变化原因，避免把多种业务混在一起。

本项目在文章发布流程中体现得较明显。`Posts` 集合本身负责声明字段、权限和 Hook 编排，而具体业务被拆到独立 Hook 中：`setCurrentAuthor` 负责设置作者，`validatePostChannelRelation` 负责校验学校与子频道关系，`validatePostTags` 负责标签校验，`validatePostQuota` 负责发布配额，`setPublishedAt` 负责发布时间，`revalidateFrontendCache` 负责前台缓存失效。

这样做的好处是，当配额规则变化时，主要修改 `validatePostQuota`；当前台缓存规则变化时，主要修改 `revalidateFrontendCache`；当频道关系规则变化时，主要修改 `validatePostChannelRelation`。每个模块的修改原因清晰，降低了回归风险。

## 3. 开闭原则

开闭原则要求系统对扩展开放、对修改关闭。也就是说，新增能力时尽量通过扩展配置或新增模块完成，而不是反复改动稳定核心代码。

CampusBlog 使用 Payload collection 配置和 Hook 数组来扩展行为。例如 `Posts` 集合通过 `beforeValidate`、`beforeChange`、`afterChange`、`afterDelete` 等 Hook 挂载业务逻辑。后续如果新增“文章审核通知”或“发布后同步搜索索引”，可以继续新增 Hook 并挂到对应生命周期中，而不需要重写整个文章保存流程。

缓存系统也体现了开闭原则。`src/hooks/revalidateFrontendCache.ts` 将不同 collection 的缓存 tag 计算封装为独立函数，例如文章、学校、子频道、标签、媒体和用户分别计算自己的失效范围。新增一个影响前台展示的 collection 时，可以新增对应的 tag 计算和 Hook，而不必改动所有读取端代码。

## 4. 德（迪）米特法则

德米特法则也叫最少知识原则，要求模块之间尽量只和直接依赖通信，减少对其他模块内部结构的了解。

本项目中，前台页面不会直接关心 Payload、D1、R2、KV 的所有底层细节，而是通过 `src/app/(frontend)/lib/` 下的数据读取与展示转换函数获取需要的数据。认证相关 API route 也复用 `src/app/api/auth/_lib/` 中的 cookie、响应、限流、输入校验等封装，避免每个 route 都直接操作底层 Header 或 Payload REST 细节。

编辑器标签功能同样遵循该原则。前端提交标签名，`editorPostTags.ts` 负责归一化、查找、创建和返回标签 ID。文章发布流程只需要拿到解析后的标签 ID，不需要知道标签查找时是按 `name`、`slug`，还是如何处理并发创建冲突。

## 5. 依赖倒转原则

依赖倒转原则要求高层业务模块不直接依赖低层实现细节，而应依赖抽象；低层实现再去满足抽象。

在编辑器标签解析中，`resolveEditorPostTagIds` 不直接绑定某个具体数据库实现，而是依赖 `EditorPostTagClient` 这个抽象接口。只要对象提供 `find` 和 `create` 能力，就可以用于标签解析。实际运行时可以接入 Payload 客户端，测试时也可以传入模拟客户端，从而让业务逻辑更容易测试和替换。

访问控制也有类似思想。Collection 不直接写死复杂的权限判断，而是依赖 `adminOrSelf`、`adminOrVerifiedActiveUser` 等访问控制函数。Collection 只声明“这个操作使用哪个访问策略”，具体判断由独立策略模块实现。

## 6. 合成复用原则

合成复用原则强调优先通过组合已有对象或函数来获得能力，而不是通过继承层级复用行为。

CampusBlog 的前端组件和后端业务都大量使用组合。例如编辑器页面由 `EditorForm`、`TiptapEditor`、`TiptapToolbar`、`TiptapMenus` 等组件组合完成，而不是把所有编辑器逻辑堆在一个巨大的组件中。认证页面也由 `AuthShell`、`LoginForm`、`RegisterForm`、`PasswordInput` 等组件组合出不同页面。

后端同样采用组合方式。`Posts` 集合通过多个 Hook 组合出完整发布流程，缓存失效通过多个 tag 计算函数组合出完整失效范围，Cloudflare 部署则通过 Wrangler 配置、OpenNext 配置和脚本组合完成不同环境的构建与部署。相比继承式复用，组合方式更灵活，也更适合 Next.js 与 Payload CMS 这种配置驱动的项目结构。

## 小结

在 CampusBlog 项目中，这些设计原则不是孤立的理论概念，而是体现在具体工程实践中：访问控制函数满足统一契约，Hook 拆分体现单一职责，生命周期配置支持扩展，封装层降低模块耦合，抽象接口支撑测试与替换，组件和 Hook 组合提升复用能力。通过这些原则，项目在功能持续增加时仍能保持清晰的边界和较低的维护成本。
