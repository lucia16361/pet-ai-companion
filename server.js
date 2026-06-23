const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const app = express();
const PORT = 3000;

// ============ 数据持久化 ============
const dataDir = path.join(__dirname, 'data');
const dataFiles = {
  pets: path.join(dataDir, 'pets.json'),
  conversations: path.join(dataDir, 'conversations.json'),
  storylines: path.join(dataDir, 'storylines.json'),
  counter: path.join(dataDir, 'counter.json')
};

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function loadData() {
  try {
    if (fs.existsSync(dataFiles.pets)) {
      const loadedPets = JSON.parse(fs.readFileSync(dataFiles.pets, 'utf8'));
      pets = loadedPets;
    }
    if (fs.existsSync(dataFiles.conversations)) {
      conversations = JSON.parse(fs.readFileSync(dataFiles.conversations, 'utf8'));
    }
    if (fs.existsSync(dataFiles.storylines)) {
      storylines = JSON.parse(fs.readFileSync(dataFiles.storylines, 'utf8'));
    }
    if (fs.existsSync(dataFiles.counter)) {
      const counter = JSON.parse(fs.readFileSync(dataFiles.counter, 'utf8'));
      petIdCounter = counter.petIdCounter || 1;
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
}

function saveData() {
  try {
    fs.writeFileSync(dataFiles.pets, JSON.stringify(pets, null, 2));
    fs.writeFileSync(dataFiles.conversations, JSON.stringify(conversations, null, 2));
    fs.writeFileSync(dataFiles.storylines, JSON.stringify(storylines, null, 2));
    fs.writeFileSync(dataFiles.counter, JSON.stringify({ petIdCounter }, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

// ============ 文件上传配置 ============
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const portraitsDir = path.join(uploadsDir, 'portraits');

[uploadsDir, photosDir, portraitsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `pet-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('只支持 JPG/PNG/WEBP/HEIC 图片格式'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// ============ 数据存储（内存） ============
let pets = {};
let conversations = {};
let storylines = {};
let petIdCounter = 1;
let generationQueue = [];

// ============ 宠物品种数据库（扩充版） ============
const breedDatabase = {
  dog: {
    breeds: [
      '金毛寻回犬', '柯基', '柴犬', '哈士奇', '泰迪', '边境牧羊犬', '法国斗牛犬', '萨摩耶', '拉布拉多', '博美',
      '比熊', '雪纳瑞', '吉娃娃', '腊肠犬', '阿拉斯加', '松狮', '秋田犬', '马犬', '杜宾', '罗威纳',
      '约克夏', '西高地白梗', '马尔济斯', '贝灵顿梗', '牛头梗', '比特犬', '圣伯纳', '伯恩山犬', '大丹犬', '哈士奇',
      '德国牧羊犬', '苏牧', '喜乐蒂', '可卡犬', '史宾格', '威玛猎犬', '比格犬', '巴哥', '沙皮狗', '中华田园犬',
      '贵宾犬（巨型）', '贵宾犬（标准）', '柯利牧羊犬', '纽芬兰犬', '大白熊犬', '藏獒', '昆明犬', '下司犬', '五红犬', '土松'
    ],
    personalities: ['活泼好动', '温柔粘人', '傲娇高冷', '憨厚贪吃', '聪明机智', '胆小害羞', '调皮捣蛋', '忠诚勇敢', '慵懒佛系', '好奇探险家'],
    colors: ['金色', '棕色', '黑白', '白色', '灰色', '黑色', '奶油色', '三花色', '红色', '虎斑', '米色', '蓝色', '香槟色'],
    defaultVoice: '汪汪！我是{name}！今天也想和你一起玩！'
  },
  cat: {
    breeds: [
      '英短蓝猫', '布偶猫', '橘猫', '暹罗猫', '美短', '波斯猫', '缅因猫', '苏格兰折耳猫', '无毛猫', '奶牛猫',
      '狸花猫', '金渐层', '银渐层', '蓝白英短', '蓝猫', '豹猫', '孟加拉豹猫', '阿比西尼亚', '俄罗斯蓝猫', '挪威森林猫',
      '土耳其安哥拉', '孟买猫', '喜马拉雅猫', '重点色短毛猫', '曼基康矮脚猫', '拿破仑矮脚猫', '金吉拉', '东方短毛猫', '索马里猫', '伯曼猫',
      '中华田园猫', '山东狮子猫', '临清狮子猫', '简州猫', '三花猫', '玳瑁猫', '白猫', '黑猫', '奶牛猫', '狸花加白',
      '虎斑猫', '鱼骨纹虎斑', '经典纹虎斑', '银虎斑', '棕虎斑', '重点色', '海豹色', '蓝重点', '丁香色', '肉桂色'
    ],
    personalities: ['傲娇高冷', '慵懒佛系', '粘人撒娇', '好奇探险家', '优雅贵妇', '话痨', '社恐', '小吃货', '温柔安静', '独立自信'],
    colors: ['橘色', '白色', '黑色', '灰色', '三花色', '虎斑', '蓝灰色', '奶牛色', '金色', '银色', '重点色', '玳瑁色', '丁香色'],
    defaultVoice: '喵～我是{name}，今天的阳光真好啊，想晒太阳了～'
  },
  rabbit: {
    breeds: [
      '荷兰垂耳兔', '安哥拉兔', '侏儒兔', '狮子兔', '雷克斯兔', '熊猫兔', '道奇兔', '新西兰白兔', '加利福尼亚兔', '佛兰芒巨兔',
      '海棠兔', '喜马拉雅兔', '荷兰兔', '英国垂耳兔', '法国垂耳兔', '迷你垂耳兔', '波兰兔', '荷兰侏儒兔', '银貂兔', '香槟兔',
      '狮子头兔', '泽西羊毛兔', '美国费斯兰兔', '比利时野兔', '日本白兔', '青紫蓝兔', '花巨兔', '法系安哥拉', '英系安哥拉', '德系安哥拉',
      '中国白兔', '塞北兔', '豫丰黄兔', '哈白兔', '比利时兔', '八点黑', '獭兔', '肉兔', '长毛兔', '宠物兔（混血）'
    ],
    personalities: ['软萌可爱', '活泼好动', '胆小谨慎', '粘人精', '小吃货', '傲娇小公主', '好奇心强', '安静优雅', '调皮捣蛋', '温顺乖巧'],
    colors: ['白色', '灰色', '棕色', '黑白', '金色', '花色', '奶茶色', '蓝色', '巧克力色', '重点色', '霜白色', '银貂色', '虎斑色'],
    defaultVoice: '蹦蹦跳跳～{name}来啦！有什么好吃的吗？'
  },
  hamster: {
    breeds: [
      '金丝熊', '银狐仓鼠', '布丁仓鼠', '三线仓鼠', '奶茶仓鼠', '紫仓', '白熊', '西施熊', '叙利亚仓鼠', '罗伯罗夫斯基仓鼠',
      '冬白仓鼠', '一线仓鼠', '黑线仓鼠', '花仓', '琥珀仓鼠', '金狐仓鼠', '奶牛熊', '原始仓鼠', '侏儒仓鼠', '老公公仓鼠',
      '老婆婆仓鼠', '加卡利亚仓鼠', '坎贝尔仓鼠', '短毛仓鼠', '长毛仓鼠', '卷毛仓鼠', '黑熊', '米熊', '虎纹熊', '眼圈熊',
      '雪球', '雨点', '纯银', '杂银', '肉桂', '蓝毛', '黑波利', '黄波利', '蜜波利', '黑黄波利'
    ],
    personalities: ['囤货狂魔', '跑轮达人', '小吃货', '社恐小可爱', '好奇宝宝', '瞌睡虫', '越狱高手', '埋屎专家', '聪明机灵', '温顺任人撸'],
    colors: ['金色', '白色', '灰色', '棕色', '奶茶色', '黑色', '奶油色', '花斑', '虎纹', '黑白', '银白色', '米黄色', '蓝灰色'],
    defaultVoice: '吱吱～{name}刚睡醒！今天囤了什么好吃的呀？'
  },
  bird: {
    breeds: [
      '虎皮鹦鹉', '玄凤鹦鹉', '牡丹鹦鹉', '金丝雀', '文鸟', '八哥', '鹩哥', '画眉', '百灵', '相思鸟',
      '黄桃脸牡丹', '绿桃脸牡丹', '紫罗兰牡丹', '蓝银顶牡丹', '松石牡丹', '原始灰玄凤', '黄化玄凤', '珍珠玄凤', '派特玄凤', '白子玄凤',
      '和尚鹦鹉', '小太阳鹦鹉', '金太阳鹦鹉', '锥尾鹦鹉', '亚马逊鹦鹉', '非洲灰鹦鹉', '葵花鹦鹉', '金刚鹦鹉', '凯克鹦鹉', '塞内加尔鹦鹉',
      '虎皮大头', '云斑虎皮', '原始蓝虎皮', '原始绿虎皮', '黄化虎皮', '白化虎皮', '珍珠虎皮', '绣眼鸟', '珍珠鸟', '五彩文鸟',
      '麻雀', '燕子', '黄鹂', '杜鹃', '喜鹊', '乌鸦', '鸽子', '斑鸠', '鹦鹉（混血）', '鸟类（其他）'
    ],
    personalities: ['话痨', '歌唱家', '好奇宝宝', '傲娇', '粘人精', '调皮鬼', '安静优雅', '聪明模仿', '胆小害羞', '社交达人'],
    colors: ['绿色', '蓝色', '黄色', '白色', '灰色', '彩色', '红色', '橙色', '紫色', '粉色', '黑色', '花色', '珍珠色'],
    defaultVoice: '啾啾！{name}会唱歌哦！今天想听什么曲子呀？'
  },
  // 额外宠物类型
  reptile: {
    breeds: [
      '鬃狮蜥', '豹纹守宫', '睫角守宫', '肥尾守宫', '蓝舌石龙子', '玉米蛇', '球蟒', '王蛇', '猪鼻蛇', '奶蛇',
      '绿鬣蜥', '水龙', '变色龙', '高冠变色龙', '七彩变色龙', '中华草龟', '巴西龟', '麝香龟', '剃刀龟', '陆龟',
      '红耳龟', '黄缘盒龟', '鳄龟', '黄喉拟水龟', '东部箱龟', '辐射陆龟', '苏卡达陆龟', '豹纹陆龟', '赫曼陆龟', '缘翘陆龟',
      '蜥蜴（其他）', '守宫（其他）', '蛇（其他）', '龟（其他）', '角蛙', '树蛙', '蟾蜍', '牛蛙', '雨蛙', '老爷树蛙'
    ],
    personalities: ['慵懒淡定', '高冷观察家', '吃货', '胆小躲藏', '好奇探索', '慢条斯理', '夜行性', '晒太阳爱好者', '独居安静', '温顺可撸'],
    colors: ['绿色', '棕色', '黄色', '橙色', '红色', '蓝色', '黑色', '白色', '灰色', '花色', '豹纹', '橘色', '奶油色'],
    defaultVoice: '嘶嘶～{name}今天晒够太阳了吗？'
  },
  other: {
    breeds: [
      '龙猫', '蜜袋鼯', '荷兰猪', '豚鼠', '刺猬', '雪貂', '安格鲁貂', '貂（其他）', '狐狸', '耳廓狐',
      '小香猪', '迷你猪', '羊驼', '矮马', '柯尔鸭', '番鸭', '宠物鹅', '宠物鸡', '荷兰鼠', '飞鼠',
      '土拨鼠', '花栗鼠', '松鼠', '红腹松鼠', '魔王松鼠', '雪地松鼠', '仓鼠（其他）', '兔子（其他）', '豚鼠（其他）', '龙猫（其他）',
      '甲虫', '锹甲', '独角仙', '螳螂', '竹节虫', '蜗牛', '寄居蟹', '招潮蟹', '螃蟹', '鱼（其他）',
      '乌龟（其他）', '仓鼠（混血）', '豚鼠（混血）', '兔子（混血）', '猫咪（混血）', '狗狗（混血）', '其他宠物', '未知品种', '待识别', '定制品种'
    ],
    personalities: ['活泼好动', '安静温顺', '好奇宝宝', '胆小谨慎', '粘人精', '小吃货', '独立自主', '聪明机灵', '调皮捣蛋', '慵懒佛系'],
    colors: ['白色', '黑色', '棕色', '灰色', '金色', '花色', '三花色', '虎斑', '斑点', '纯色', '杂色', '渐变色', '透明色'],
    defaultVoice: '嗨！我是{name}，我是独一无二的宠物伙伴！'
  }
};

// ============ 剧情模板 ============
const storylineTemplates = [
  {
    id: 'adventure',
    title: '冒险日记',
    icon: '🗺️',
    scenarios: [
      '今天{name}偷偷溜出家门，在小区里发现了一个神秘的小花园...',
      '{name}在后院挖到了一个宝贝！会是什么呢？',
      '下雨天，{name}和主人一起在家搭了一个超大的枕头城堡！',
      '{name}第一次去宠物公园，遇到了好多新朋友！'
    ]
  },
  {
    id: 'friendship',
    title: '友谊故事',
    icon: '💕',
    scenarios: [
      '{name}在宠物店认识了新朋友，两只小家伙一见如故！',
      '邻居家的猫咪来找{name}玩，它们一起分享了小鱼干～',
      '{name}最好的朋友生病了，它决定去探望...',
      '公园里{name}和一只流浪猫成了好朋友，还给它带了好吃的！'
    ]
  },
  {
    id: 'daily',
    title: '日常趣事',
    icon: '🌟',
    scenarios: [
      '早上{name}用特别的方式叫主人起床——直接跳到了床上！',
      '主人上班后，{name}在家到底做了什么？监控录像曝光！',
      '洗澡时间到！{name}和主人的斗智斗勇开始了...',
      '{name}偷偷学会了开门，今天给主人准备了一个惊喜（惊吓）！'
    ]
  },
  {
    id: 'holiday',
    title: '节日特辑',
    icon: '🎉',
    scenarios: [
      '{name}的第一个生日派对！所有宠物朋友都来啦！',
      '过年啦！{name}穿上了新衣服，还收到了大红包！',
      '万圣节{name}cosplay大赛，猜猜它扮成了什么？',
      '圣诞节{name}当了一回圣诞老人的小助手！'
    ]
  },
  {
    id: 'dream',
    title: '梦想剧场',
    icon: '🌙',
    scenarios: [
      '{name}做了一个梦，梦见自己变成了超级英雄！',
      '如果{name}会说话一整天，它最想对主人说什么？',
      '{name}幻想自己开了一家宠物餐厅，菜单上全是它爱吃的！',
      '平行宇宙里的{name}是一只网红宠物，有百万粉丝！'
    ]
  }
];

// 尝试从用户消息中提取记忆
function extractMemory(pet, userMessage) {
  const msg = userMessage.trim();
  const memories = [];
  
  // 1. 主人名字
  const namePatterns = [
    /我(?:叫|是)([^，。！？\s]{1,6})/,
    /主人(?:叫|是)([^，。！？\s]{1,6})/,
    /你可以叫我([^，。！？\s]{1,6})/,
    /我的名字是([^，。！？\s]{1,6})/
  ];
  for (const pattern of namePatterns) {
    const match = msg.match(pattern);
    if (match && match[1] && match[1] !== pet.name) {
      memories.push(`主人的名字是${match[1]}`);
      break;
    }
  }
  
  // 2. 主人喜欢什么
  const likePatterns = [
    /我(?:最)?爱吃(.{1,10})/,
    /我(?:最)?喜欢(.{1,15})/,
    /我爱(.{1,15})/,
    /我喜欢吃(.{1,10})/,
    /我喜欢(.{1,15})/
  ];
  for (const pattern of likePatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const target = match[1].replace(/[了着过]/, '').trim();
      if (target.length > 0 && target.length < 15) {
        memories.push(`主人最喜欢${target}`);
      }
    }
  }
  
  // 3. 宠物喜欢什么
  const petLikePatterns = [
    /你(?:最)?喜欢(.{1,15})/,
    /你爱吃(.{1,10})/,
    /你喜欢(.{1,15})/
  ];
  for (const pattern of petLikePatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const target = match[1].replace(/[了着过]/, '').trim();
      if (target.length > 0 && target.length < 15) {
        memories.push(`${pet.name}最喜欢${target}`);
      }
    }
  }
  
  // 4. 一起做过的事
  const eventPatterns = [
    /我们(?:昨天|今天|上周|上周日|上周末|前几天|一起)(.{1,20})/,
    /我(?:昨天|今天|上周|上周日|上周末|前几天)(.{1,20})/
  ];
  for (const pattern of eventPatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const target = match[1].replace(/[了着过]/, '').trim();
      if (target.length > 0 && target.length < 20) {
        memories.push(`和主人一起${target}`);
      }
    }
  }
  
  // 5. 主人的状态/情绪
  const moodPatterns = [
    /我(开心|难过|伤心|生气|累|困|饿|无聊|紧张|害怕|兴奋)/,
    /我觉得(开心|难过|伤心|生气|累|困|饿|无聊|紧张|害怕|兴奋)/
  ];
  for (const pattern of moodPatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      memories.push(`主人现在很${match[1]}`);
    }
  }
  
  return memories;
}

function formatMemoriesForResponse(pet, userMessage) {
  if (!pet.memories || pet.memories.length === 0) return null;
  
  const msg = userMessage.toLowerCase();
  let relevantMemories = [];
  
  // 简单相关性匹配：如果消息关键词出现在记忆中
  pet.memories.forEach(memory => {
    const memoryText = typeof memory === 'string' ? memory : memory.content;
    if (!memoryText) return;
    
    // 提取记忆关键词
    const keywords = memoryText.replace(/主人|最|喜欢|和|一起|现在|很|是/g, '').split(/[，、]/).filter(w => w.length >= 2);
    
    for (const keyword of keywords) {
      if (msg.includes(keyword.toLowerCase()) || keyword.length <= 3 && msg.includes(keyword)) {
        relevantMemories.push(memoryText);
        break;
      }
    }
  });
  
  // 如果消息包含"记得"，返回所有记忆
  if (msg.includes('记得')) {
    relevantMemories = pet.memories.map(m => typeof m === 'string' ? m : m.content);
  }
  
  if (relevantMemories.length === 0) return null;
  
  // 最多返回 2 条相关记忆
  return relevantMemories.slice(0, 2);
}

// ============ 对话生成 ============
function generatePetResponse(pet, userMessage) {
  const personalityPhrases = {
    '活泼好动': ['耶耶耶！', '太好玩啦！', '再来再来！', '好开心呀！', '我们一起玩吧！'],
    '温柔粘人': ['抱抱～', '最喜欢你了', '不要走嘛', '贴贴！', '好想你呀～'],
    '傲娇高冷': ['哼！', '随便啦', '才不是因为喜欢你呢', '勉强陪你一下', '真是拿你没办法'],
    '憨厚贪吃': ['有好吃的吗？', '我饿了！', '这个能吃吗？', '再给一点嘛～', '肚子咕咕叫了'],
    '聪明机智': ['我知道你在想什么！', '这个简单！', '让我来帮你！', '我有个好主意！', '看我的！'],
    '胆小害羞': ['呜...有点怕', '你保护我好不好', '躲在身后偷看', '小声说话...', '不要吓我啦'],
    '调皮捣蛋': ['嘿嘿嘿～', '又被我骗到了吧！', '来抓我呀！', '我有个恶作剧！', '闯祸了...'],
    '忠诚勇敢': ['我来保护你！', '有我在呢！', '别怕别怕', '我守着你！', '坏人走开！'],
    '慵懒佛系': ['好困啊...', '随便吧', '让我再睡一会儿', '晒太阳真舒服', '懒得动...'],
    '粘人撒娇': ['陪我玩嘛～', '不要不理我', '你最好了！', '亲亲！', '我就要跟你在一起！'],
    '好奇探险家': ['那是什么？', '我想去看看！', '好神奇！', '我们去探险吧！', '发现新大陆！'],
    '优雅贵妇': ['请注意你的言辞', '优雅永不过时', '这个品味不错', '勉强认可', '保持优雅～'],
    '话痨': ['我跟你说哦...', '然后呢然后呢？', '你知道吗！', '我再讲一个！', '你听我说！'],
    '社恐': ['人好多...', '躲起来', '只想和你在家', '外面好可怕', '有你陪着就好'],
    '小吃货': ['这是什么好吃的？', '再来一口！', '好吃好吃！', '还有吗还有吗？', '我的零食呢？'],
    '软萌可爱': ['啾咪～', '人家很乖的', '嘿嘿', '给你卖个萌', '蹭蹭～'],
    '胆小谨慎': ['安全第一！', '先观察一下', '小心一点', '这个没问题吧？', '慢慢来...'],
    '傲娇小公主': ['本公主才不需要呢', '算你有眼光', '这是你的荣幸', '哼，勉强喜欢', '要好好对我哦'],
    '囤货狂魔': ['这个我要存起来！', '藏到哪里好呢？', '这些都是我的！', '囤够过冬啦！', '再来一点！'],
    '跑轮达人': ['冲啊！', '我还能跑！', '速度就是一切！', '一圈又一圈！', '运动使我快乐！'],
    '瞌睡虫': ['呼...呼...', '再睡五分钟', '好困', '梦里什么都有', '不想起床...'],
    '歌唱家': ['啦啦啦～', '听我唱歌！', '这首歌送给你！', '我的新曲！', '来听演唱会！'],
    '粘人精': ['贴贴！', '别走！', '一直在一起！', '最最最喜欢你！', '陪我！'],
    '安静优雅': ['嗯～', '嘘...', '慢慢来', '你好呀', '要保持优雅'],
    '独立自信': ['我自己可以！', '没问题！', '交给我吧！', '看我的！', '我可是很厉害的！'],
    '聪明模仿': ['学你！', '我会这个！', '再看一遍！', '我也会啦！', '让我试试！'],
    '夜行性': ['天黑了就是我的时间！', '月亮出来了！', '晚上好精神！', '你睡了我才嗨！', '夜生活开始！'],
    '慢条斯理': ['慢慢来...', '不着急', '一步一步来', '急什么？', '时间还早呢'],
    '高冷观察家': ['我在观察...', '你的一举一动我都看见了', '哼，小样', '我什么都懂', '静静看着'],
    '社交达人': ['新朋友！', '一起玩！', '大家好！', '认识一下！', '我最喜欢热闹了！'],
    '越狱高手': ['门没锁哦！', '我要出去看看！', '这个栅栏困不住我！', '世界那么大！', '我又溜出来了！'],
    '埋屎专家': ['要埋好！', '干净最重要！', '这个味道要盖住！', '完美掩埋！', '卫生第一！'],
    '温顺任人撸': ['随便摸！', '手感好就继续！', '舒服～', '我不动！', '你喜欢就好！']
  };

  const petTypeEmojis = {
    dog: ['🐕', '🐶', '🦴', '🐾'],
    cat: ['🐱', '😺', '🐟', '🧶'],
    rabbit: ['🐰', '🥕', '🐇'],
    hamster: ['🐹', '🌻', '🐭'],
    bird: ['🐦', '🦜', '🐤', '🎵'],
    reptile: ['🦎', '🐢', '🐍', '🦖'],
    other: ['🐾', '🌟', '💫', '✨']
  };

  const phrases = personalityPhrases[pet.personality] || ['嘿嘿～', '嗯嗯！', '好呀好呀！'];
  const emojis = petTypeEmojis[pet.type] || ['🐾'];
  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  // 根据用户消息内容生成更相关的回复
  let response = '';
  const msg = userMessage.toLowerCase();
  
  // 提取记忆
  const newMemories = extractMemory(pet, userMessage);
  if (newMemories.length > 0) {
    if (!pet.memories) pet.memories = [];
    pet.memories.push(...newMemories.map(m => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      content: m,
      createdAt: new Date().toISOString()
    })));
    
    // 如果记忆包含主人名字，同步更新 ownerName
    const nameMemory = newMemories.find(m => m.startsWith('主人的名字是'));
    if (nameMemory) {
      pet.ownerName = nameMemory.replace('主人的名字是', '').trim();
    }
  }
  
  // 获取相关记忆
  const relevantMemories = formatMemoriesForResponse(pet, userMessage);
  
  // 特殊关键词：AI肖像/照片
  if (msg.includes('照片') || msg.includes('长得') || msg.includes('像不像') || msg.includes('肖像')) {
    const photoResponses = {
      dog: `${randomEmoji} 我的照片超帅的！${pet.name}觉得主人拍得最好看的那张就是我最可爱的样子！`,
      cat: `${randomEmoji} 哼，${pet.name}的照片当然是最美的。不过本喵觉得你拍得还不够出我的神韵～`,
      rabbit: `${randomEmoji} ${pet.name}的耳朵拍得清楚吗？我最满意我的大门牙照片！`,
      hamster: `${randomEmoji} 我的照片里腮帮子鼓鼓的最可爱！${pet.name}要囤很多好吃的才能保持！`,
      bird: `${randomEmoji} 啾啾！${pet.name}展翅高飞的那张照片最威风了！`,
      reptile: `${randomEmoji} ${pet.name}冷冷的眼神拍照超有范儿，主人你说对不对？`,
      other: `${randomEmoji} ${pet.name}的每张照片都是独一无二的回忆，主人最喜欢哪一张？`
    };
    response = photoResponses[pet.type] || `${randomEmoji} ${pet.name}的照片很可爱的！`;
  } else if (msg.includes('吃') || msg.includes('零食') || msg.includes('饭')) {
    const foodResponses = {
      dog: `${randomEmoji} 有好吃的吗？${pet.name}闻到香味啦！是肉肉吗？是骨头吗？快给我看看！`,
      cat: `${randomEmoji} 终于到饭点了吗？${pet.name}等了好久好久...今天有小鱼干吗？`,
      rabbit: `${randomEmoji} 是胡萝卜吗？是青菜吗？${pet.name}的鼻子已经动起来了！`,
      hamster: `${randomEmoji} 囤货时间到！${pet.name}要把好吃的都藏到腮帮子里！`,
      bird: `${randomEmoji} 开饭啦开饭啦！${pet.name}今天想吃小米！`,
      reptile: `${randomEmoji} 小虫虫时间到了吗？${pet.name}已经等不及要用舌头卷走它啦！`,
      other: `${randomEmoji} 有好吃的吗？${pet.name}肚子咕咕叫啦！`
    };
    response = foodResponses[pet.type] || `${randomEmoji} ${randomPhrase} 有好吃的吗？`;
  } else if (msg.includes('玩') || msg.includes('出去') || msg.includes('散步')) {
    const playResponses = {
      dog: `${randomEmoji} 出去玩出去玩！${pet.name}已经等不及啦！绳子呢绳子呢？`,
      cat: `${randomEmoji} 玩？${pet.name}勉强陪你玩一下逗猫棒吧...（其实超兴奋）`,
      rabbit: `${randomEmoji} 蹦蹦跳跳！${pet.name}最喜欢在草地上跑来跑去啦！`,
      hamster: `${randomEmoji} 跑轮时间到！看${pet.name}的速度！呼呼呼～`,
      bird: `${randomEmoji} 飞飞飞！${pet.name}带你飞高高！`,
      reptile: `${randomEmoji} ${pet.name}想找个温暖的地方趴着，顺便看看外面有什么新鲜事～`,
      other: `${randomEmoji} 一起玩吧！${pet.name}精力充沛！`
    };
    response = playResponses[pet.type] || `${randomEmoji} ${randomPhrase} 一起玩吧！`;
  } else if (msg.includes('爱') || msg.includes('喜欢') || msg.includes('想你')) {
    const loveResponses = {
      dog: `${randomEmoji} ${pet.name}也最爱最爱主人啦！你是世界上最好的主人！舔舔～`,
      cat: `${randomEmoji} 哼...${pet.name}才没有很想你呢（偷偷蹭了蹭你的腿）`,
      rabbit: `${randomEmoji} ${pet.name}的心扑通扑通的！最喜欢主人摸摸头啦！`,
      hamster: `${randomEmoji} 吱吱～${pet.name}虽然小小的，但对主人的爱是大大大大的！`,
      bird: `${randomEmoji} ${pet.name}学会了新词：我爱你！我爱你！我爱你！`,
      reptile: `${randomEmoji} ${pet.name}虽然看起来冷冷淡淡，但心里其实很暖很暖，因为你一直都在呀。`,
      other: `${randomEmoji} ${pet.name}也好喜欢主人！贴贴！`
    };
    response = loveResponses[pet.type] || `${randomEmoji} ${randomPhrase} ${pet.name}也好喜欢主人！`;
  } else if (msg.includes('睡') || msg.includes('晚安') || msg.includes('困')) {
    const sleepResponses = {
      dog: `${randomEmoji} 呼...${pet.name}可以睡在主人床边吗？就睡一点点位置就好～`,
      cat: `${randomEmoji} 晚安～${pet.name}晚上会偷偷守护你的（然后自己呼呼大睡）`,
      rabbit: `${randomEmoji} 困了困了，${pet.name}的耳朵都垂下来了...晚安主人～`,
      hamster: `${randomEmoji} 白天睡够了，${pet.name}现在精力充沛！但主人晚安～`,
      bird: `${randomEmoji} 天黑了，${pet.name}把头埋进翅膀里，晚安啾～`,
      reptile: `${randomEmoji} 晚安～${pet.name}要找个暖暖的地方睡觉觉啦，明天见！`,
      other: `${randomEmoji} 晚安主人～${pet.name}也要睡了！`
    };
    response = sleepResponses[pet.type] || `${randomEmoji} 晚安主人～${pet.name}也要睡了！`;
  } else if (msg.includes('名字') || msg.includes('叫什么')) {
    response = `${randomEmoji} 我叫${pet.name}呀！${pet.breed}，${pet.color}，性格是${pet.personality}，你记住我了吗？`;
  } else {
    const genericResponses = [
      `${randomEmoji} ${randomPhrase} ${pet.name}听${pet.ownerName}说话就开心！`,
      `${randomEmoji} 嗯嗯！${pet.name}在认真听呢！虽然可能听不懂，但是好喜欢${pet.ownerName}的声音～`,
      `${randomEmoji} ${pet.name}歪着头看着${pet.ownerName}，好像在说：继续继续！`,
      `${randomEmoji} ${randomPhrase} 和${pet.ownerName}在一起的每一秒都好幸福呀！`,
      `${randomEmoji} ${pet.name}摇了摇尾巴（如果有的话），表示超级赞同！`,
      `${randomEmoji} ${pet.ownerName}你知道吗？${pet.name}今天又有一个小秘密想告诉你！`,
      `${randomEmoji} ${randomPhrase} ${pet.name}最近发现${pet.ownerName}是世界上最好的${pet.ownerRelationship}！`,
      `${randomEmoji} ${pet.name}想要永远做${pet.ownerName}的小跟班！${randomPhrase}`
    ];
    response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }
  
  // 如果有相关记忆，自然融入回复
  if (relevantMemories && relevantMemories.length > 0) {
    const memory = relevantMemories[0];
    const memoryOpeners = ['嘿嘿，', '对了，', '我还记得，', '主人你知道吗，'];
    const randomOpener = memoryOpeners[Math.floor(Math.random() * memoryOpeners.length)];
    
    if (memory.includes('主人最喜欢') || memory.includes('和主人一起')) {
      response = `${response}\n\n${randomOpener}${memory}，${pet.name}一直记得呢！${randomEmoji}`;
    } else if (memory.includes('主人的名字是')) {
      const ownerName = memory.replace('主人的名字是', '');
      response = `${response}\n\n${randomOpener}${pet.name}记住${ownerName}的名字啦！以后就叫你${ownerName}～${randomEmoji}`;
    } else if (memory.includes('主人现在很')) {
      response = `${response}\n\n${pet.name}知道${memory.replace('主人现在很', '')}... ${pet.name}会一直陪着${pet.ownerName}的！${randomEmoji}`;
    } else {
      response = `${response}\n\n${randomOpener}${memory}，${pet.name}都没有忘哦！${randomEmoji}`;
    }
  }

  return response;
}

function generateStoryline(pet, templateId) {
  const template = storylineTemplates.find(t => t.id === templateId) || 
                   storylineTemplates[Math.floor(Math.random() * storylineTemplates.length)];
  
  const scenario = template.scenarios[Math.floor(Math.random() * template.scenarios.length)];
  const title = scenario.replace('{name}', pet.name).split('！')[0].split('，')[0];
  
  // 生成故事正文
  const storyParts = generateStoryContent(pet, scenario);
  
  return {
    id: Date.now().toString(),
    templateId: template.id,
    templateTitle: template.title,
    templateIcon: template.icon,
    title: title,
    scenario: scenario.replace('{name}', pet.name),
    content: storyParts,
    petName: pet.name,
    petType: pet.type,
    petPersonality: pet.personality,
    createdAt: new Date().toISOString()
  };
}

function generateStoryContent(pet, scenario) {
  const content = scenario.replace('{name}', pet.name);
  
  const personalityStoryAddons = {
    '活泼好动': `\n\n${pet.name}完全停不下来！它绕着主人转了十七圈，然后冲出去又冲回来，兴奋得像个小旋风。主人笑着想：这家伙的电池是不是永远用不完啊？`,
    '温柔粘人': `\n\n${pet.name}用脑袋轻轻蹭了蹭主人的手，眼睛里满是温柔。它不喜欢到处乱跑，只想安安静静地待在主人身边，这就够了。`,
    '傲娇高冷': `\n\n${pet.name}假装不在意，但尾巴尖却不争气地轻轻晃动。哼，才不是因为开心呢！只是...只是今天的天气刚刚好而已。`,
    '憨厚贪吃': `\n\n${pet.name}的鼻子比什么都灵！它闻到了零食的味道，眼睛立刻亮了起来，口水都快滴下来了。主人看着它的样子，忍不住笑出了声。`,
    '聪明机智': `\n\n${pet.name}眼珠一转，计上心头。它用爪子指了指门口，等主人去看的时候，迅速完成了自己的小计划。这个小机灵鬼！`,
    '胆小害羞': `\n\n${pet.name}躲在主人腿后面，只露出半个脑袋偷偷张望。虽然有主人在身边，但还是有点紧张呢。主人蹲下来摸摸它的头："别怕别怕，有我在。"`,
    '调皮捣蛋': `\n\n${pet.name}露出了它标志性的坏笑。嘿嘿，又有好主意了！主人看到它的表情就知道——这个小捣蛋又要开始搞事情了！`,
    '忠诚勇敢': `\n\n${pet.name}挺起胸膛，站在主人前面。虽然它个子不大，但那份守护主人的心意，比谁都坚定。有它在，主人什么都不用怕。`,
    '慵懒佛系': `\n\n${pet.name}打了个哈欠，翻了个身继续晒太阳。急什么？生活嘛，就是要慢慢来。主人看着它悠闲的样子，也觉得心情放松了不少。`,
    '粘人撒娇': `\n\n${pet.name}使出浑身解数撒娇——蹭蹭、打滚、用小爪子扒拉主人的裤脚。今天一定要让主人多陪陪它！`,
    '好奇探险家': `\n\n${pet.name}的眼睛闪闪发光，这里闻闻那里看看，每一个角落都不能放过。这个世界太有趣了，每天都有新发现！`,
    '小吃货': `\n\n${pet.name}的肚子准时咕咕叫了。它用最无辜的眼神看着主人，仿佛在说：你看我这么可爱，不给点好吃的说得过去吗？`,
    '高冷观察家': `\n\n${pet.name}静静地趴在角落，眼神锐利地观察着一切。表面上波澜不惊，心里其实早就把周围的情况分析得一清二楚。`,
    '夜行性': `\n\n太阳落山后，${pet.name}的精神头来了。白天懒洋洋的它，现在变得格外活跃，眼神里也多了几分神秘。`,
    '慢条斯理': `\n\n${pet.name}不慌不忙，一步一步按照自己的节奏来。它相信，最好的事情都值得等待。`,
    '独立自信': `\n\n${pet.name}昂首挺胸，用行动证明：它完全可以自己搞定。虽然偶尔也需要主人，但更多的时候它都在努力成为主人的骄傲。`
  };

  const addon = personalityStoryAddons[pet.personality] || 
    `\n\n${pet.name}开心极了，这一天它永远不会忘记。和主人在一起的每一个瞬间，都是最珍贵的回忆。`;

  return content + addon;
}

function generateMultiPetStory(pets) {
  if (pets.length < 2) return null;
  
  const petNames = pets.map(p => p.name).join('和');
  const story = `
在一个阳光明媚的下午，${petNames}聚在了一起。

${pets[0].name}先开口了："嘿！今天主人不在家，我们来开个秘密会议吧！"

${pets.length > 1 ? pets[1].name + '好奇地凑过来："什么秘密会议呀？"' : ''}

${pets[0].name}神秘兮兮地说："我们来讨论一下——怎么让主人更开心！"

${pets.map((p, i) => {
  if (i === 0) return '';
  const ideas = [
    `每天早上用最萌的方式叫主人起床！`,
    `主人回家的时候，我们要用最热情的欢迎仪式！`,
    `偷偷学会一个新技能，给主人一个惊喜！`,
    `在主人难过的时候，默默地陪在身边～`,
    `把主人的拖鞋藏起来，让它找我们玩！`
  ];
  return `${p.name}想了想说："${ideas[i % ideas.length]}"`;
}).filter(Boolean).join('\n\n')}

大家越说越兴奋，不知不觉天都黑了。

这时候门开了——主人回来了！

${petNames}立刻冲了过去，用最最最热情的方式迎接主人。

主人被萌得心都要化了："你们今天怎么这么乖呀？"

${pets[0].name}和${pets.length > 1 ? pets[1].name : '小伙伴们'}交换了一个心照不宣的眼神——

这是我们的秘密！嘿嘿～

（完）
  `.trim();

  return {
    id: Date.now().toString(),
    title: `${petNames}的秘密会议`,
    content: story,
    pets: pets.map(p => ({ name: p.name, type: p.type })),
    createdAt: new Date().toISOString()
  };
}

// ============ 头像生成 ============
function generateAvatarUrl(name, type, breed, personality, color) {
  // 默认使用 DiceBear 生成可爱头像
  const seed = encodeURIComponent(`${name}-${type}-${breed}`);
  const styles = {
    dog: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    cat: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffd5dc,d1d4f9,c0aede,ffdfbf,b6e3f4`,
    rabbit: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,b6e3f4,d1d4f9,c0aede`,
    hamster: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffd5dc,ffdfbf,d1d4f9,b6e3f4,c0aede`,
    bird: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,ffdfbf,ffd5dc,d1d4f9,c0aede`,
    reptile: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=86efac,d1fae5,bbf7d0,6ee7b7,a7f3d0`,
    other: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=fde68a,fed7aa,d8b4fe,fbcfe8,a7f3d0`
  };
  return styles[type] || styles.dog;
}

// ============ API 路由 ============

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '图片太大了，请上传小于5MB的图片' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// 获取品种数据
app.get('/api/breeds', (req, res) => {
  res.json(breedDatabase);
});

// 上传宠物照片
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传图片' });
  }
  
  const photoUrl = `/uploads/photos/${req.file.filename}`;
  res.json({ 
    success: true, 
    photoUrl,
    filename: req.file.filename,
    message: '照片上传成功！' 
  });
});

// 创建宠物（支持照片）
app.post('/api/pets', (req, res) => {
  const { name, type, breed, personality, color, customTraits, photoUrl } = req.body;
  
  if (!name || !type || !breed || !personality) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }
  
  if (!breedDatabase[type]) {
    return res.status(400).json({ error: '不支持的宠物类型' });
  }

  const id = petIdCounter++;
  const avatar = photoUrl || generateAvatarUrl(name, type, breed, personality, color);
  
  const pet = {
    id,
    name,
    type,
    breed,
    personality,
    color: color || breedDatabase[type]?.colors[0] || '默认',
    customTraits: customTraits || '',
    avatar,
    originalPhoto: photoUrl || null,
    hasAIPortrait: false,
    ownerName: '主人',
    ownerRelationship: '最好的朋友',
    memories: [],
    level: 1,
    exp: 0,
    mood: 'happy',
    createdAt: new Date().toISOString()
  };

  pets[id] = pet;
  conversations[id] = [];
  storylines[id] = [];
  
  saveData();

  res.json(pet);
});

// 获取所有宠物
app.get('/api/pets', (req, res) => {
  res.json(Object.values(pets));
});

// 获取单个宠物
app.get('/api/pets/:id', (req, res) => {
  const pet = pets[parseInt(req.params.id)];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  res.json(pet);
});

// 更新宠物头像（用于AI生成后）
app.put('/api/pets/:id/avatar', (req, res) => {
  const pet = pets[parseInt(req.params.id)];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  const { avatarUrl } = req.body;
  if (!avatarUrl) return res.status(400).json({ error: '请提供头像地址' });
  
  pet.avatar = avatarUrl;
  pet.hasAIPortrait = true;
  
  saveData();
  
  res.json({ success: true, pet });
});

// 更新宠物资料（主人信息、记忆等）
app.put('/api/pets/:id', (req, res) => {
  const pet = pets[parseInt(req.params.id)];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  const { ownerName, ownerRelationship, memories, customTraits, name, color, personality } = req.body;
  
  if (ownerName !== undefined) pet.ownerName = ownerName.trim() || pet.ownerName;
  if (ownerRelationship !== undefined) pet.ownerRelationship = ownerRelationship.trim() || pet.ownerRelationship;
  if (memories !== undefined && Array.isArray(memories)) pet.memories = memories;
  if (customTraits !== undefined) pet.customTraits = customTraits;
  if (name !== undefined && name.trim()) pet.name = name.trim();
  if (color !== undefined) pet.color = color;
  if (personality !== undefined) pet.personality = personality;
  
  saveData();
  res.json({ success: true, pet });
});

// 添加宠物记忆
app.post('/api/pets/:id/memories', (req, res) => {
  const pet = pets[parseInt(req.params.id)];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  const { memory } = req.body;
  if (!memory || !memory.trim()) return res.status(400).json({ error: '记忆内容不能为空' });
  
  if (!pet.memories) pet.memories = [];
  pet.memories.push({
    id: Date.now(),
    content: memory.trim(),
    createdAt: new Date().toISOString()
  });
  
  saveData();
  res.json({ success: true, memory: memory.trim() });
});

// 删除宠物记忆
app.delete('/api/pets/:id/memories/:memoryId', (req, res) => {
  const pet = pets[parseInt(req.params.id)];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  const memoryId = parseInt(req.params.memoryId);
  if (!pet.memories) pet.memories = [];
  pet.memories = pet.memories.filter(m => m.id !== memoryId && m !== memoryId);
  
  saveData();
  res.json({ success: true });
});
app.delete('/api/pets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!pets[id]) return res.status(404).json({ error: '宠物不存在' });
  
  // 删除相关图片
  if (pets[id].originalPhoto) {
    const photoPath = path.join(__dirname, 'public', pets[id].originalPhoto);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }
  if (pets[id].avatar && pets[id].avatar.startsWith('/uploads/portraits/')) {
    const portraitPath = path.join(__dirname, 'public', pets[id].avatar);
    if (fs.existsSync(portraitPath)) fs.unlinkSync(portraitPath);
  }
  
  delete pets[id];
  delete conversations[id];
  delete storylines[id];
  saveData();
  res.json({ success: true });
});

// 发送消息（对话互动）
app.post('/api/pets/:id/chat', (req, res) => {
  const petId = parseInt(req.params.id);
  const pet = pets[petId];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: '消息不能为空' });

  const response = generatePetResponse(pet, message);
  
  const conversation = {
    id: Date.now(),
    userMessage: message,
    petResponse: response,
    timestamp: new Date().toISOString()
  };

  if (!conversations[petId]) conversations[petId] = [];
  conversations[petId].push(conversation);

  // 增加经验值
  pet.exp += 10;
  if (pet.exp >= pet.level * 100) {
    pet.level += 1;
    pet.exp = 0;
    conversation.levelUp = true;
    conversation.newLevel = pet.level;
  }

  saveData();

  res.json(conversation);
});

// 获取对话历史
app.get('/api/pets/:id/conversations', (req, res) => {
  const petId = parseInt(req.params.id);
  res.json(conversations[petId] || []);
});

// 生成剧情
app.post('/api/pets/:id/storyline', (req, res) => {
  const petId = parseInt(req.params.id);
  const pet = pets[petId];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });

  const { templateId } = req.body;
  const storyline = generateStoryline(pet, templateId || null);

  if (!storylines[petId]) storylines[petId] = [];
  storylines[petId].push(storyline);

  saveData();

  res.json(storyline);
});

// 获取剧情历史
app.get('/api/pets/:id/storylines', (req, res) => {
  const petId = parseInt(req.params.id);
  res.json(storylines[petId] || []);
});

// 多宠物互动剧情
app.post('/api/pets/multi-story', (req, res) => {
  const { petIds } = req.body;
  if (!petIds || petIds.length < 2) {
    return res.status(400).json({ error: '至少需要2只宠物' });
  }

  const selectedPets = petIds.map(id => pets[id]).filter(Boolean);
  if (selectedPets.length < 2) {
    return res.status(400).json({ error: '部分宠物不存在' });
  }

  const story = generateMultiPetStory(selectedPets);
  res.json(story);
});

// 获取剧情模板
app.get('/api/storyline-templates', (req, res) => {
  res.json(storylineTemplates);
});

// 获取待生成的AI肖像队列（用于agent处理）
app.get('/api/pending-portraits', (req, res) => {
  res.json(generationQueue);
});

// 提交AI肖像生成请求（加入队列）
app.post('/api/pets/:id/request-ai-portrait', (req, res) => {
  const petId = parseInt(req.params.id);
  const pet = pets[petId];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  if (!pet.originalPhoto) {
    return res.status(400).json({ error: '请先在宠物资料中上传照片' });
  }
  
  // 自动生成描述性提示词，方便agent生成时使用
  const prompt = `A cute ${pet.breed} pet ${pet.type === 'cat' ? 'cat' : pet.type === 'dog' ? 'dog' : pet.type} cartoon portrait, Pixar animation style, ${pet.color} fur/feathers/scales, ${pet.personality} expression, big expressive eyes, soft pastel colors, clean white background, adorable kawaii pet illustration, high quality digital art. Keep the breed characteristics of ${pet.breed}.`;
  
  // 如果已经在队列中，更新提示词
  const existing = generationQueue.find(item => item.petId === petId);
  if (existing) {
    existing.prompt = prompt;
    existing.status = 'pending';
    existing.requestedAt = new Date().toISOString();
  } else {
    generationQueue.push({
      petId,
      petName: pet.name,
      breed: pet.breed,
      color: pet.color,
      personality: pet.personality,
      photoPath: pet.originalPhoto,
      prompt,
      status: 'pending',
      requestedAt: new Date().toISOString()
    });
  }
  
  res.json({ 
    success: true, 
    message: `AI肖像生成请求已提交。请在聊天窗口告诉我："请帮我生成 ${pet.name} 的 AI 肖像"，我会立即为你生成！`,
    queueLength: generationQueue.length,
    suggestedPrompt: prompt
  });
});

// Agent 回调：完成AI肖像生成
app.post('/api/pets/:id/ai-portrait-complete', (req, res) => {
  const petId = parseInt(req.params.id);
  const pet = pets[petId];
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  
  const { portraitUrl, removeFromQueue } = req.body;
  if (portraitUrl) {
    pet.avatar = portraitUrl;
    pet.hasAIPortrait = true;
  }
  
  if (removeFromQueue) {
    generationQueue = generationQueue.filter(item => item.petId !== petId);
  }
  
  saveData();
  
  res.json({ success: true, pet });
});

// 定期保存数据（每30秒）
setInterval(saveData, 30000);

// ============ 启动服务 ============
loadData();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐾 宠物AI互动器已启动: http://localhost:${PORT}`);
});
