const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ 数据存储（内存） ============
let pets = {};
let conversations = {};
let storylines = {};
let petIdCounter = 1;

// ============ 宠物品种数据 ============
const breedDatabase = {
  dog: {
    breeds: ['金毛寻回犬', '柯基', '柴犬', '哈士奇', '泰迪', '边境牧羊犬', '法国斗牛犬', '萨摩耶', '拉布拉多', '博美'],
    personalities: ['活泼好动', '温柔粘人', '傲娇高冷', '憨厚贪吃', '聪明机智', '胆小害羞', '调皮捣蛋', '忠诚勇敢'],
    colors: ['金色', '棕色', '黑白', '白色', '灰色', '黑色', '奶油色', '三花色'],
    defaultVoice: '汪汪！我是{name}！今天也想和你一起玩！'
  },
  cat: {
    breeds: ['英短蓝猫', '布偶猫', '橘猫', '暹罗猫', '美短', '波斯猫', '缅因猫', '苏格兰折耳猫', '无毛猫', '奶牛猫'],
    personalities: ['傲娇高冷', '慵懒佛系', '粘人撒娇', '好奇探险家', '优雅贵妇', '话痨', '社恐', '小吃货'],
    colors: ['橘色', '白色', '黑色', '灰色', '三花色', '虎斑', '蓝灰色', '奶牛色'],
    defaultVoice: '喵～我是{name}，今天的阳光真好啊，想晒太阳了～'
  },
  rabbit: {
    breeds: ['荷兰垂耳兔', '安哥拉兔', '侏儒兔', '狮子兔', '雷克斯兔', '熊猫兔'],
    personalities: ['软萌可爱', '活泼好动', '胆小谨慎', '粘人精', '小吃货', '傲娇小公主'],
    colors: ['白色', '灰色', '棕色', '黑白', '金色', '花色'],
    defaultVoice: '蹦蹦跳跳～{name}来啦！有什么好吃的吗？'
  },
  hamster: {
    breeds: ['金丝熊', '银狐仓鼠', '布丁仓鼠', '三线仓鼠', '奶茶仓鼠', '紫仓'],
    personalities: ['囤货狂魔', '跑轮达人', '小吃货', '社恐小可爱', '好奇宝宝', '瞌睡虫'],
    colors: ['金色', '白色', '灰色', '棕色', '奶茶色', '黑色'],
    defaultVoice: '吱吱～{name}刚睡醒！今天囤了什么好吃的呀？'
  },
  bird: {
    breeds: ['虎皮鹦鹉', '玄凤鹦鹉', '牡丹鹦鹉', '金丝雀', '文鸟', '八哥'],
    personalities: ['话痨', '歌唱家', '好奇宝宝', '傲娇', '粘人精', '调皮鬼'],
    colors: ['绿色', '蓝色', '黄色', '白色', '灰色', '彩色'],
    defaultVoice: '啾啾！{name}会唱歌哦！今天想听什么曲子呀？'
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
    '粘人精': ['贴贴！', '别走！', '一直在一起！', '最最最喜欢你！', '陪我！']
  };

  const petTypeEmojis = {
    dog: ['🐕', '🐶', '🦴', '🐾'],
    cat: ['🐱', '😺', '🐟', '🧶'],
    rabbit: ['🐰', '🥕', '🐇'],
    hamster: ['🐹', '🌻', '🐭'],
    bird: ['🐦', '🦜', '🐤', '🎵']
  };

  const phrases = personalityPhrases[pet.personality] || ['嘿嘿～', '嗯嗯！', '好呀好呀！'];
  const emojis = petTypeEmojis[pet.type] || ['🐾'];
  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  // 根据用户消息内容生成更相关的回复
  let response = '';
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('吃') || msg.includes('零食') || msg.includes('饭')) {
    const foodResponses = {
      dog: `${randomEmoji} 有好吃的吗？${pet.name}闻到香味啦！是肉肉吗？是骨头吗？快给我看看！`,
      cat: `${randomEmoji} 终于到饭点了吗？${pet.name}等了好久好久...今天有小鱼干吗？`,
      rabbit: `${randomEmoji} 是胡萝卜吗？是青菜吗？${pet.name}的鼻子已经动起来了！`,
      hamster: `${randomEmoji} 囤货时间到！${pet.name}要把好吃的都藏到腮帮子里！`,
      bird: `${randomEmoji} 开饭啦开饭啦！${pet.name}今天想吃小米！`
    };
    response = foodResponses[pet.type] || `${randomEmoji} ${randomPhrase} 有好吃的吗？`;
  } else if (msg.includes('玩') || msg.includes('出去') || msg.includes('散步')) {
    const playResponses = {
      dog: `${randomEmoji} 出去玩出去玩！${pet.name}已经等不及啦！绳子呢绳子呢？`,
      cat: `${randomEmoji} 玩？${pet.name}勉强陪你玩一下逗猫棒吧...（其实超兴奋）`,
      rabbit: `${randomEmoji} 蹦蹦跳跳！${pet.name}最喜欢在草地上跑来跑去啦！`,
      hamster: `${randomEmoji} 跑轮时间到！看${pet.name}的速度！呼呼呼～`,
      bird: `${randomEmoji} 飞飞飞！${pet.name}带你飞高高！`
    };
    response = playResponses[pet.type] || `${randomEmoji} ${randomPhrase} 一起玩吧！`;
  } else if (msg.includes('爱') || msg.includes('喜欢') || msg.includes('想你')) {
    const loveResponses = {
      dog: `${randomEmoji} ${pet.name}也最爱最爱主人啦！你是世界上最好的主人！舔舔～`,
      cat: `${randomEmoji} 哼...${pet.name}才没有很想你呢（偷偷蹭了蹭你的腿）`,
      rabbit: `${randomEmoji} ${pet.name}的心扑通扑通的！最喜欢主人摸摸头啦！`,
      hamster: `${randomEmoji} 吱吱～${pet.name}虽然小小的，但对主人的爱是大大大大的！`,
      bird: `${randomEmoji} ${pet.name}学会了新词：我爱你！我爱你！我爱你！`
    };
    response = loveResponses[pet.type] || `${randomEmoji} ${randomPhrase} ${pet.name}也好喜欢主人！`;
  } else if (msg.includes('睡') || msg.includes('晚安') || msg.includes('困')) {
    const sleepResponses = {
      dog: `${randomEmoji} 呼...${pet.name}可以睡在主人床边吗？就睡一点点位置就好～`,
      cat: `${randomEmoji} 晚安～${pet.name}晚上会偷偷守护你的（然后自己呼呼大睡）`,
      rabbit: `${randomEmoji} 困了困了，${pet.name}的耳朵都垂下来了...晚安主人～`,
      hamster: `${randomEmoji} 白天睡够了，${pet.name}现在精力充沛！但主人晚安～`,
      bird: `${randomEmoji} 天黑了，${pet.name}把头埋进翅膀里，晚安啾～`
    };
    response = sleepResponses[pet.type] || `${randomEmoji} 晚安主人～${pet.name}也要睡了！`;
  } else {
    const genericResponses = [
      `${randomEmoji} ${randomPhrase} ${pet.name}听主人说话就开心！`,
      `${randomEmoji} 嗯嗯！${pet.name}在认真听呢！虽然可能听不懂，但是好喜欢主人的声音～`,
      `${randomEmoji} ${pet.name}歪着头看着主人，好像在说：继续继续！`,
      `${randomEmoji} ${randomPhrase} 和主人在一起的每一秒都好幸福呀！`,
      `${randomEmoji} ${pet.name}摇了摇尾巴（如果有的话），表示超级赞同！`
    ];
    response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
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
    '小吃货': `\n\n${pet.name}的肚子准时咕咕叫了。它用最无辜的眼神看着主人，仿佛在说：你看我这么可爱，不给点好吃的说得过去吗？`
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
    `在主人难过的时候，默默地陪在身边～`
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

// ============ API 路由 ============

// 获取品种数据
app.get('/api/breeds', (req, res) => {
  res.json(breedDatabase);
});

// 创建宠物
app.post('/api/pets', (req, res) => {
  const { name, type, breed, personality, color, customTraits } = req.body;
  
  if (!name || !type || !breed || !personality) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const id = petIdCounter++;
  const pet = {
    id,
    name,
    type,
    breed,
    personality,
    color: color || breedDatabase[type]?.colors[0] || '默认',
    customTraits: customTraits || '',
    avatar: generateAvatarUrl(name, type, breed, personality, color),
    level: 1,
    exp: 0,
    mood: 'happy',
    createdAt: new Date().toISOString()
  };

  pets[id] = pet;
  conversations[id] = [];
  storylines[id] = [];

  res.json(pet);
});

function generateAvatarUrl(name, type, breed, personality, color) {
  // 使用 DiceBear 生成可爱的宠物头像
  const seed = encodeURIComponent(`${name}-${type}-${breed}`);
  // 根据不同宠物类型使用不同的头像风格
  const styles = {
    dog: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    cat: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffd5dc,d1d4f9,c0aede,ffdfbf,b6e3f4`,
    rabbit: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,b6e3f4,d1d4f9,c0aede`,
    hamster: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=ffd5dc,ffdfbf,d1d4f9,b6e3f4,c0aede`,
    bird: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,ffdfbf,ffd5dc,d1d4f9,c0aede`
  };
  return styles[type] || styles.dog;
}

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

// 删除宠物
app.delete('/api/pets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!pets[id]) return res.status(404).json({ error: '宠物不存在' });
  delete pets[id];
  delete conversations[id];
  delete storylines[id];
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

// ============ 启动服务 ============
app.listen(PORT, () => {
  console.log(`🐾 宠物AI互动器已启动: http://localhost:${PORT}`);
});
