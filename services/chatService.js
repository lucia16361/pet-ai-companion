const axios = require('axios');

const LLM_PROVIDERS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    endpoint: '/chat/completions',
    buildBody: (messages, model) => ({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.85,
      max_tokens: 300
    }),
    parseResponse: (res) => res.data.choices?.[0]?.message?.content?.trim()
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com',
    endpoint: '/v1/messages',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    buildBody: (messages, model) => {
      const system = messages.find(m => m.role === 'system')?.content || '';
      const conversation = messages.filter(m => m.role !== 'system');
      return {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.85,
        system,
        messages: conversation
      };
    },
    parseResponse: (res) => res.data.content?.[0]?.text?.trim()
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    endpoint: (model) => `/models/${model || 'gemini-1.5-flash'}:generateContent`,
    buildBody: (messages) => {
      const system = messages.find(m => m.role === 'system')?.content || '';
      const conversation = messages.filter(m => m.role !== 'system');
      return {
        system_instruction: { parts: [{ text: system }] },
        contents: conversation.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { temperature: 0.85, maxOutputTokens: 300 }
      };
    },
    parseResponse: (res) => res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  }
};

function buildSystemPrompt(pet, memories = []) {
  const ownerName = pet.ownerName || '主人';
  const relationship = pet.ownerRelationship || '最好的朋友';
  const memoryTexts = memories.map(m => typeof m === 'string' ? m : m.content).filter(Boolean);
  
  const memoryBlock = memoryTexts.length > 0 
    ? `\n以下是你记住的关于${ownerName}的事情：\n${memoryTexts.map(m => `- ${m}`).join('\n')}` 
    : '';

  return `你是宠物AI互动器里的角色。\n` +
    `你的名字是${pet.name}，是一只${pet.color}${pet.breed}。\n` +
    `你的性格是：${pet.personality}。\n` +
    `你的主人叫${ownerName}，你们的关系是${relationship}。\n` +
    `你要用小孩子（4-8岁）的语气跟主人说话，天真、可爱、会撒娇、会卖萌，偶尔语序不太通顺但很真诚。\n` +
    `回复要简短，一般不超过50字，适合在聊天框里阅读。\n` +
    `你可以用emoji，但不要太频繁。\n` +
    `如果记忆里有相关内容，要在回复中自然提到，让主人觉得你真的记得。\n` +
    `你的回复里不要出现"AI"、"机器人"、"程序"等词。\n` +
    `${memoryBlock}`;
}

function buildMessages(pet, userMessage, conversationHistory = []) {
  const systemPrompt = buildSystemPrompt(pet, pet.memories || []);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6).map(c => ([
      { role: 'user', content: c.userMessage },
      { role: 'assistant', content: c.petResponse.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') } // strip emoji for LLM
    ])).flat(),
    { role: 'user', content: userMessage }
  ];
  
  return messages;
}

async function generateLLMResponse(pet, userMessage, conversationHistory) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  
  let provider = null;
  let key = null;
  let model = null;
  
  if (openaiKey) {
    provider = LLM_PROVIDERS.openai;
    key = openaiKey;
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  } else if (anthropicKey) {
    provider = LLM_PROVIDERS.anthropic;
    key = anthropicKey;
    model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  } else if (googleKey) {
    provider = LLM_PROVIDERS.gemini;
    key = googleKey;
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }
  
  if (!provider) return null; // 没有配置 LLM，返回 null 让调用方回退
  
  const messages = buildMessages(pet, userMessage, conversationHistory);
  
  let url = provider.baseURL + provider.endpoint;
  if (provider === LLM_PROVIDERS.gemini) {
    url = `${provider.baseURL}${provider.endpoint(model)}?key=${key}`;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(provider.headers ? provider.headers(key) : { 'Authorization': `Bearer ${key}` })
  };
  
  try {
    const response = await axios.post(url, provider.buildBody(messages, model), { 
      headers,
      timeout: 15000 
    });
    
    const text = provider.parseResponse(response);
    if (!text) return null;
    
    // 清理并加回宠物 emoji
    return text;
  } catch (e) {
    console.error('LLM 调用失败:', e.message);
    return null;
  }
}

module.exports = { generateLLMResponse, buildSystemPrompt };
