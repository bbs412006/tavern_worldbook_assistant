# 设置与 AI 配置内嵌功能页重构设计

## 背景

世界书助手当前通过 `SettingsModal.vue` 和 `AIConfigModal.vue` 渲染“设置”和“AI 配置”功能。两个组件使用 Vue `Teleport` 将 overlay 传送到宿主文档的 `body`，并依赖跨 document 的事件传播、定位、层叠上下文和宿主 WebView 行为。

该路径在普通浏览器测试中能够创建 DOM，但在用户实际使用的手机 App 宿主中，两个按钮依旧无法正常使用。此前围绕 Teleport 目标、事件屏蔽和 overlay CSS 的兼容性修复没有解决真实宿主问题。因此本次不再继续修补跨 document 弹窗，而是移除问题边界。

## 目标

将“设置”和“AI 配置”重构为世界书助手面板内部的独立功能页，保持原有业务能力和持久化格式不变，并彻底取消这两个功能对跨 document Teleport、全屏 overlay 和宿主事件屏蔽的依赖。

## 非目标

本次不包含：

- 修改世界书数据结构或持久化格式；
- 修改 AI 配置提示词生成、响应解析或变更应用算法；
- 重构其他弹窗或历史功能；
- 改变 API 密钥的现有存储方式；
- 新增设置项或 AI 配置能力；
- 发布新版本 Tag。发布应在用户真实宿主确认后单独执行。

## 总体方案

### 内部功能页导航

`App.vue` 增加单一的内部功能页状态：

```ts
type UtilityPage = 'main' | 'settings' | 'ai-config';
```

所有“设置”按钮统一调用 `openSettingsPage()`，所有“AI配置”按钮统一调用 `openAiConfigPage()`，避免模板中散落直接布尔赋值。

进入功能页前记录当前主界面上下文，包括移动端 Tab、专注模式和工具区状态所依赖的现有响应式状态。返回时只将 `utilityPage` 切回 `main`，不重建根组件、不重新读取世界书、不清空草稿或选择状态，因此原页面自然恢复。

### 功能页外壳

新增一个轻量的共享页头/外壳模式，功能页直接位于助手根内容区域中：

```text
┌──────────────────────────────┐
│ ← 返回              页面标题 │
├──────────────────────────────┤
│                              │
│        功能页可滚动内容        │
│                              │
└──────────────────────────────┘
```

功能页必须：

- 使用助手已有主题变量；
- 填满当前面板内容区域；
- 自身负责纵向滚动；
- 桌面和手机共用同一渲染路径；
- 不创建 fixed overlay；
- 不访问父页面 `body`；
- 不依赖 `z-index` 盖住宿主 UI。

## 设置功能页

### 组件

将 `SettingsModal.vue` 替换为普通内容组件：

```text
src/worldbook_assistant_build/components/SettingsPage.vue
```

组件通过 props 接收现有状态，通过 emits 调用父组件现有操作。组件不得直接拥有或复制业务状态。

### 保留功能

必须保留以下设置：

- 显示悬浮按钮；
- 显示楼层提取按钮；
- 显示 AI 对话模块；
- 启用多选配置联动；
- 多选联动时同步高级字段和 extra JSON；
- 父标签删除策略；
- 排序模式；
- 排序后重新分配 UID；
- 主题选择；
- 毛玻璃特效；
- 当前版本、构建分支、commit 和构建时间；
- 检查最新版本；
- 复制固定版本导入链接；
- 自定义 API 与酒馆连接预设模式；
- 使用主 API；
- API URL、密钥、最大 Tokens、温度；
- 加载模型列表；
- 模型选择或手动输入。

### 事件契约

保留现有设置组件的业务事件语义：

```ts
close
set-fab-visible
 toggle-floor-btns
update-persisted-state
set-tag-delete-parent-mode
set-theme
update-api-config
load-model-list
check-latest-version
copy-version-import-url
```

其中 `close` 在页面语义下表示返回主界面。实现时可统一命名为 `back`，但父子组件和结构测试必须使用一致名称。

## AI 配置功能页

### 组件

将 `AIConfigModal.vue` 替换为普通内容组件：

```text
src/worldbook_assistant_build/components/AIConfigPage.vue
```

组件内部展示三个阶段，但生成和应用逻辑仍由 `App.vue` 持有：

```ts
type AIConfigStage = 'input' | 'generating' | 'preview';
```

阶段可以由现有 `generating`、`preview` 和页面可见状态派生，避免创建第二套业务真相。

### 输入阶段

保留：

- 目标世界书选择；
- 自然语言配置指令；
- 自定义系统提示词；
- 恢复默认提示词；
- 加载默认提示词；
- 发送给 AI 分析；
- 原有禁用条件。

顶部返回按钮回到助手主界面，并保留当前输入、目标世界书和自定义提示词，以便再次进入后继续编辑。

### 生成阶段

显示原有生成中反馈。生成进行时禁用返回操作，避免用户离开后对运行状态产生误解。父组件已有生成状态和异常处理保持不变。

### 预览阶段

保留：

- 条目名称；
- 设置项名称；
- 旧值和新值；
- 单项勾选；
- 全选；
- 全不选；
- 应用选中变化；
- 选中数量；
- 无选中项时禁用应用。

预览页顶部返回回到输入阶段，不退出整个 AI 配置功能页，并保留输入内容。应用完成后的页面行为沿用父组件当前成功流程；若当前流程关闭预览，则回到输入阶段或主界面的具体状态必须由现有实现决定，不改变业务语义。

## App.vue 集成

### 渲染优先级

助手根内容区域按以下优先级渲染：

1. `utilityPage === 'settings'`：渲染 `SettingsPage`；
2. `utilityPage === 'ai-config'`：渲染 `AIConfigPage`；
3. 否则：渲染现有手机/桌面主界面。

功能页状态只替换助手内部主体，不替换宿主 shell、标题栏、悬浮按钮或根挂载节点。

### 按钮统一

项目中所有设置入口必须使用同一函数：

```ts
function openSettingsPage(): void {
  utilityPage.value = 'settings';
}
```

所有 AI 配置入口必须使用同一函数：

```ts
function openAiConfigPage(): void {
  // 沿用当前打开时所需的初始化逻辑
  utilityPage.value = 'ai-config';
}
```

`openAiConfigPage()` 必须保留当前 `openAiConfigModal()` 对目标世界书、输入状态或预览状态所做的初始化，不允许仅机械替换赋值。

### 返回行为

设置页返回：

```ts
utilityPage.value = 'main';
```

AI 配置输入页返回：

```ts
utilityPage.value = 'main';
```

AI 配置预览页返回：关闭预览并返回输入阶段，但保持 `utilityPage === 'ai-config'`。

生成阶段不允许返回。

## 删除的兼容层

当两个内嵌页面稳定接入后，删除仅为这两个弹窗服务的依赖：

- 两个组件中的 `Teleport`；
- 两个组件中的 overlay 根节点；
- 两个组件对 `modal-shared.css` 的依赖；
- `App.vue` 中为这两个组件计算的 `modalTeleportTarget`，前提是没有其他消费者；
- `host/modalHost.ts`，前提是没有其他消费者；
- `hostBridge.ts` 中仅用于这两个弹窗的目标解析或事件屏蔽导出，前提是没有其他消费者。

删除前必须搜索所有引用。仍被其他功能使用的宿主桥接代码不得顺带删除。

## 样式与响应式设计

设置页和 AI 配置页使用局部、语义化 class，避免继续堆叠内联样式。建议共享以下基础结构：

```text
.utility-page
.utility-page-header
.utility-page-back
.utility-page-title
.utility-page-body
.utility-section
.utility-actions
```

手机端：

- 页头固定在助手面板内部顶部；
- 内容区 `min-height: 0`、`overflow-y: auto`；
- 表格预览允许横向滚动或转换为可读的紧凑布局；
- 按钮保持触控尺寸；
- 不使用 viewport 级 fixed 定位。

桌面端：

- 内容宽度可设合理上限并居中；
- 设置区块按现有顺序展示；
- AI 预览利用可用宽度显示表格。

## 错误处理

本次沿用现有父组件错误处理和 toastr 提示，不引入新的错误通道。

必须保证：

- 加载模型列表失败时页面仍可继续手动输入模型；
- AI 生成失败后退出 generating 状态并回到可编辑输入阶段；
- 应用变化失败时保留预览和选择状态；
- 功能页返回不得清空未提交的世界书编辑草稿。

## 测试策略

### 结构 RED-GREEN 检查

先扩展 `scripts/check-settings-ai-modals.py` 或将其重命名为更准确的页面检查脚本。检查至少包括：

- `SettingsPage.vue` 和 `AIConfigPage.vue` 存在；
- `App.vue` 导入并实际渲染两个页面；
- 所有设置按钮调用统一打开函数；
- 所有 AI 配置按钮调用统一打开函数；
- 两个页面不包含 `Teleport`；
- 两个页面不包含 overlay 根结构；
- 原有关键字段和事件仍存在；
- AI 配置输入、生成、预览和应用三个阶段仍存在；
- 旧 modal 组件不再被 `App.vue` 使用。

必须先运行并观察检查因新组件缺失而失败，再实施代码。

### 组件交互测试

使用 Vitest 和 Vue 测试工具建立最小交互覆盖：

- 点击设置入口后显示设置页；
- 设置页返回后恢复主界面；
- 点击 AI 配置入口后显示输入页；
- AI 输入值通过 emit 更新父状态；
- 生成中状态显示且返回禁用；
- 预览返回到输入阶段；
- 全选、全不选和应用按钮保持原行为。

如直接挂载完整 `App.vue` 需要大量宿主 mock，应优先测试页面组件契约，并使用本地宿主 harness 覆盖 App 集成，不为了测试而引入生产代码分支。

### 完整验证

实现完成后运行：

```bash
corepack pnpm test:worldbook-domain
corepack pnpm verify:worldbook
node --check dist/worldbook_assistant_build/index.js
```

并使用本地浏览器 harness 实际点击两个入口，验证：

- 点击事件到达；
- 页面状态切换；
- DOM 在助手根文档内生成；
- 返回恢复主界面；
- 设置控件可交互；
- AI 配置输入和预览可交互；
- 控制台无 Vue/JavaScript 异常。

构建后恢复仅由 build metadata 引起的 bundle churn，只提交任务明确要求的生产 bundle。

## 实施与提交边界

建议按以下独立切片提交：

1. `test: guard inline settings and ai config pages`：新增失败结构检查；
2. `refactor: render settings as an inline page`：设置页及统一导航；
3. `refactor: render ai config as an inline page`：AI 配置三阶段页面；
4. `test: cover inline utility page interactions`：组件与 harness 回归覆盖；
5. 如需要发布，另开提交更新版本、构建 bundle、创建 Tag，并在真实手机宿主确认后执行。

## 成功标准

- 手机 App 中点击“设置”和“AI配置”均能进入对应内嵌页面；
- 两个功能不再使用 Teleport 或宿主文档 overlay；
- 原有设置项、AI 分析、预览和应用能力全部保留；
- 返回后原编辑状态保持；
- 完整专项测试与生产构建通过；
- 用户真实宿主确认前不移动稳定版本 Tag。
