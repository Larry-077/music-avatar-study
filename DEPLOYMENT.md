# Music Avatar Studio - 部署指南

## ✅ 已完成的工作

1. **Next.js 项目设置** - React + Next.js 15 (App Router)
2. **UI 组件修改**：
   - GestureGallery (Step 1) → 纯展示，无选择功能
   - MappingStudio (Step 2) → 显示全部 7 种 effector
3. **数据采集埋点**：
   - Session 管理 (session.js)
   - 日志工具 (logger.js)
   - 11 个事件埋点（effector选择、intensity调节、播放控制、绘制路径等）
4. **API Routes**：
   - `/api/log` - 记录用户事件
   - `/api/sessions` - 查询session数据（可选，供研究者使用）

---

## 📋 接下来的步骤

### Phase 4: 设置 Supabase 数据库

#### 4.1 创建 Supabase 项目

1. 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `music-avatar-study`
   - **Database Password**: （保存好这个密码）
   - **Region**: 选择离你最近的区域
   - **Pricing Plan**: Free

4. 等待项目创建完成（约2分钟）

#### 4.2 创建数据表

1. 在 Supabase Dashboard 中，点击左侧菜单的 **SQL Editor**
2. 点击 "New Query"
3. 复制粘贴以下 SQL 并执行（点击 Run）：

\`\`\`sql
-- Sessions 表：记录每个 session 的元信息
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  condition TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  total_mappings INTEGER,
  metadata JSONB
);

-- Events 表：记录所有用户事件
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引加速查询
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_sessions_condition ON sessions(condition);
\`\`\`

4. 确认执行成功（应该显示 "Success. No rows returned"）

#### 4.3 获取 API 凭据

1. 在 Supabase Dashboard 中，点击左侧菜单的 **Settings** → **API**
2. 找到以下两个值并复制：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJh...` （一个很长的 JWT token）

#### 4.4 配置环境变量

在 `web-next` 目录下创建 `.env.local` 文件：

\`\`\`bash
cd web-next
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EOF
\`\`\`

**重要**: 替换上面的 `YOUR_PROJECT_ID` 和 `YOUR_ANON_KEY_HERE` 为你在步骤 4.3 中复制的实际值。

---

### Phase 6: 本地测试

#### 6.1 安装依赖并启动开发服务器

\`\`\`bash
cd web-next
npm install
npm run dev
\`\`\`

#### 6.2 测试功能

1. 访问 `http://localhost:3000`
2. 测试完整流程：
   - Step 1: 浏览所有 7 种动作（无选择功能）
   - Step 2:
     - 为 4 个音乐元素选择 effector（应该显示全部选项）
     - 调节 intensity 滑块
     - 播放/暂停/重置音频
     - 如果选择 "Custom Arm Path"，测试绘制路径功能

#### 6.3 验证数据采集

1. 打开浏览器开发者工具（F12）→ Network 标签页
2. 在应用中进行操作（切换步骤、选择 effector等）
3. 应该能看到 `POST /api/log` 请求

4. 在 Supabase Dashboard 中验证数据：
   - **Table Editor** → `sessions` 表 → 应该看到你的 session 记录
   - **Table Editor** → `events` 表 → 应该看到你的操作事件

#### 6.4 测试 URL 参数

访问 `http://localhost:3000?sessionId=test123&condition=A`，确认：
- sessionId 正确传递
- condition 记录在 sessions 表中

---

### Phase 7: 部署到 Vercel

#### 7.1 推送代码到 GitHub

\`\`\`bash
cd web-next
git init
git add .
git commit -m "feat: Music Avatar Studio research website"
git branch -M main

# 创建 GitHub 仓库后：
git remote add origin https://github.com/YOUR_USERNAME/music-avatar-study.git
git push -u origin main
\`\`\`

#### 7.2 连接 Vercel

1. 访问 [https://vercel.com/new](https://vercel.com/new)
2. 使用 GitHub 账号登录
3. 点击 "Import Git Repository"
4. 选择 `music-avatar-study` 仓库
5. 配置项目：
   - **Framework Preset**: Next.js（自动检测）
   - **Root Directory**: `./`（如果仓库根目录就是 web-next）或 `web-next`（如果有多个项目）
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### 7.3 添加环境变量

在 Vercel 部署配置页面，点击 "Environment Variables"，添加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` |

**重要**: 使用你在 Supabase 中获取的实际值。

#### 7.4 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（约2-3分钟）
3. 部署成功后，Vercel 会提供一个 URL，例如：
   `https://music-avatar-study.vercel.app`

#### 7.5 验证生产环境

1. 访问 Vercel 提供的 URL
2. 测试完整流程（同 6.2）
3. 在 Supabase 中检查数据是否正确记录

#### 7.6 自定义域名（可选）

1. 在 Vercel 项目页面，点击 "Settings" → "Domains"
2. 添加你的自定义域名（例如 `music-avatar-study.com`）
3. 按照指引配置 DNS

---

## 📊 查看研究数据

### 方法 1: Supabase Dashboard

1. 登录 Supabase Dashboard
2. 点击 "Table Editor"
3. 查看 `sessions` 和 `events` 表

### 方法 2: 使用查询 API

访问 `https://your-domain.vercel.app/api/sessions` 查看所有 sessions

访问 `https://your-domain.vercel.app/api/sessions?sessionId=xxx` 查看特定 session 的所有事件

### 方法 3: SQL Editor

在 Supabase SQL Editor 中运行查询：

\`\`\`sql
-- 查看所有 sessions
SELECT * FROM sessions ORDER BY started_at DESC;

-- 查看特定 session 的所有事件
SELECT * FROM events WHERE session_id = 'session_xxx' ORDER BY timestamp;

-- 统计每种 effector 的选择次数
SELECT
  data->>'effector' as effector,
  COUNT(*) as count
FROM events
WHERE event_type = 'effector_selected'
GROUP BY data->>'effector'
ORDER BY count DESC;
\`\`\`

---

## 🔧 故障排查

### 问题：本地运行时看不到数据记录

**检查**：
1. `.env.local` 文件是否存在且配置正确
2. Supabase URL 和 Key 是否正确
3. 浏览器控制台是否有错误信息

### 问题：Vercel 部署后数据不记录

**检查**：
1. Vercel 环境变量是否正确配置
2. 在 Vercel 项目页面 → Settings → Environment Variables 中确认
3. 重新部署（Vercel Dashboard → Deployments → 最新部署 → Redeploy）

### 问题：数据表创建失败

**检查**：
1. 确保在 Supabase SQL Editor 中执行 SQL
2. 检查是否有权限错误
3. 尝试删除已存在的表后重新创建

---

## 📝 分享链接格式

研究参与者链接格式：

\`\`\`
https://your-domain.vercel.app?sessionId=participant_001&condition=A
\`\`\`

参数说明：
- `sessionId`: 唯一标识符（可以是参与者编号）
- `condition`: 实验条件标识（例如 A/B测试的组别）

---

## 🎯 下一步建议

1. **测试完整流程** - 在本地和生产环境都测试一遍
2. **准备参与者链接** - 为每个参与者生成唯一的 sessionId
3. **伦理审查** - 确保数据收集符合 IRB/REB 要求
4. **备份数据** - 定期从 Supabase 导出数据备份

有任何问题请参考 Next.js 和 Supabase 官方文档，或检查浏览器控制台的错误信息。
