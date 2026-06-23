# 🐾 宠物AI互动器 - Pet AI Companion

> 一个 vibe coding 项目：为每个宠物主人定制专属AI宠物，实现AI肖像化 + 小孩子般对话互动。

---

## 🌟 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 🎨 AI 肖像生成 | ✅ 可用 | 根据宠物信息生成卡通肖像（文本生成），支持上传真实照片 |
| 💬 小孩子般对话 | ✅ 可用 | 规则+记忆引擎，支持接入 OpenAI/Claude/Gemini |
| 🧠 宠物记忆系统 | ✅ 可用 | 自动从聊天中提取主人名字、喜好、共同经历 |
| 👤 宠物主人档案 | ✅ 可用 | 设置主人称呼和与宠物的关系 |
| 📖 剧情故事生成 | ✅ 可用 | 5 大主题模板自动生成趣味故事 |
| 👥 多宠互动 | ✅ 可用 | 2+ 只宠物生成互动剧情 |
| 💾 数据持久化 | ✅ 可用 | JSON 文件存储，服务器重启不丢数据 |
| 🐕 品种库 | ✅ 300+ | 7 大宠物类型，覆盖狗狗/猫咪/兔兔/仓鼠/小鸟/爬行类/其他 |

---

## 🚀 快速启动

```bash
# 1. 克隆项目
git clone https://github.com/lucia16361/pet-ai-companion.git
cd pet-ai-companion

# 2. 安装依赖
npm install

# 3. （可选）配置 LLM API
cp .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY 或 ANTHROPIC_API_KEY 或 GOOGLE_API_KEY

# 4. 启动
npm start

# 5. 浏览器打开 http://localhost:3000
```

---

## 🎨 AI 肖像生成

### 当前能力
- 上传真实宠物照片后，系统会显示为宠物头像
- 点击「AI生成肖像」会基于宠物品种/毛色/性格生成卡通风格头像
- 当前环境为 **文本生成**，因为缺少图生图 API key

### 接入真实图生图（可选）

在 `.env` 中配置：

```
OPENAI_API_KEY=sk-your-key
IMAGE_PROVIDER=openai
```

然后修改 `server.js` 中的 `/api/pets/:id/request-ai-portrait` 路由，调用 OpenAI DALL-E 3 的 `images/generations` 或 `images/edits` 接口。

---

## 💬 小孩子般对话

### 当前能力（无 API key）
- 基于规则的可爱回复
- 自动提取记忆并在回复中引用
- 根据宠物类型、性格、消息意图匹配不同回复风格

### 接入真实 LLM（强烈推荐）

在 `.env` 中配置任一 key：

```bash
# OpenAI（推荐，成本最低）
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini

# 或 Claude
ANTHROPIC_API_KEY=sk-ant-your-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# 或 Gemini
GOOGLE_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash
```

配置后，聊天会自动调用 LLM，回复会立刻变得更自然、更像小孩子。

---

## 🧠 记忆系统

宠物会自动记住：

- 主人的名字（`我叫小明`）
- 主人的喜好（`我最爱吃草莓`）
- 宠物的喜好（`你最喜欢吃鸡肉`）
- 共同经历（`我们昨天去了公园`）
- 主人的情绪（`我今天很开心`）

记忆会在后续聊天中自然出现，让宠物感觉真的认识你。

---

## 📁 项目结构

```
pet-ai-companion/
├── public/              # 前端静态文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式
│   └── app.js          # 前端逻辑
├── services/
│   └── chatService.js  # LLM 对话服务（OpenAI/Claude/Gemini）
├── data/               # 运行时数据（gitignore）
│   ├── pets.json
│   ├── conversations.json
│   ├── storylines.json
│   └── counter.json
├── public/uploads/     # 上传的照片和AI肖像（gitignore）
│   ├── photos/
│   └── portraits/
├── server.js           # Express 后端主入口
├── .env.example        # 环境变量模板
└── package.json
```

---

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **前端**: 原生 HTML / CSS / JavaScript
- **存储**: 内存 + JSON 文件持久化
- **LLM**: 支持 OpenAI / Anthropic / Google Gemini
- **AI 图像**: 可扩展 OpenAI DALL-E / Replicate / Stability AI

---

## 📝 版本历史

```bash
git log --oneline
```

```
d181496 ✨ feat: 接入LLM对话架构（OpenAI/Claude/Gemini）
0b71abf ✨ feat: 宠物主人档案 + 宠物记忆系统 + 个性化对话
8502ac2 ✨ feat: 数据持久化 + AI肖像提示词自动生成
94f969b ✨ feat: 大幅扩充品种库 + 支持上传宠物照片生成AI肖像
9e90fe5 ✨ feat: 宠物对话加入打字机动画效果
90bdb74 🎉 初始版本：宠物AI互动器 v1.0
```

---

## 🎯 下一步建议

1. **配置 LLM API key** → 对话质量质的飞跃
2. **配置图生图 API** → 让 AI 肖像真正像用户的宠物
3. **部署到云服务器** → 让朋友也能使用
4. **添加更多互动玩法** → 宠物任务、装扮、日记

---

## 🤝 使用提示

- 所有数据保存在 `data/` 和 `public/uploads/`，部署时注意备份
- 上传的照片最大支持 5MB
- 对话记录默认保留在内存和 JSON 文件中

---

Made with 💜 for pet lovers.
