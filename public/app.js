// ============ 全局状态 ============
let state = {
  pets: [],
  currentPetId: null,
  breedData: null,
  selectedType: null,
  selectedPersonality: null,
  selectedColor: null,
  uploadedPhotoUrl: null,
  selectedMultiPets: new Set()
};

// ============ 初始化 ============
async function init() {
  await loadBreedData();
  await loadPets();
}

async function loadBreedData() {
  try {
    const res = await fetch('/api/breeds');
    state.breedData = await res.json();
  } catch (e) {
    console.error('加载品种数据失败:', e);
  }
}

async function loadPets() {
  try {
    const res = await fetch('/api/pets');
    state.pets = await res.json();
    renderPetList();
    
    if (state.currentPetId) {
      const pet = state.pets.find(p => p.id === state.currentPetId);
      if (pet) {
        selectPet(state.currentPetId);
      } else {
        state.currentPetId = null;
        showWelcome();
      }
    }
  } catch (e) {
    console.error('加载宠物列表失败:', e);
  }
}

// ============ 导航 ============
function showWelcome() {
  document.getElementById('welcomeScreen').classList.remove('hidden');
  document.getElementById('petInteraction').classList.add('hidden');
  state.currentPetId = null;
}

function showPetInteraction() {
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('petInteraction').classList.remove('hidden');
}

// ============ 宠物列表渲染 ============
function renderPetList() {
  const list = document.getElementById('petList');
  if (state.pets.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🐾</div>
        <p>还没有宠物哦～</p>
        <p class="empty-hint">点击上方按钮创建你的第一只AI宠物吧！</p>
      </div>`;
    return;
  }

  list.innerHTML = state.pets.map(pet => `
    <div class="pet-list-item ${state.currentPetId === pet.id ? 'active' : ''}" 
         onclick="selectPet(${pet.id})">
      <div class="pet-list-avatar">
        ${pet.avatar ? `<img src="${pet.avatar}" alt="${pet.name}" onerror="this.parentElement.textContent='🐾'">` : '🐾'}
      </div>
      <div class="pet-list-info">
        <div class="pet-list-name">${pet.name}</div>
        <div class="pet-list-breed">${pet.breed} · ${pet.personality}</div>
        <div class="pet-list-level">⭐ Lv.${pet.level}</div>
      </div>
      <button class="pet-list-delete" onclick="event.stopPropagation(); deletePet(${pet.id})" title="删除">🗑️</button>
    </div>
  `).join('');
}

// ============ 选择宠物 ============
async function selectPet(petId) {
  state.currentPetId = petId;
  showPetInteraction();
  renderPetList();
  await loadPetProfile(petId);
  await loadConversations(petId);
}

async function loadPetProfile(petId) {
  try {
    const res = await fetch(`/api/pets/${petId}`);
    const pet = await res.json();
    
    document.getElementById('petNameDisplay').innerHTML = `${pet.name} ${getPortraitBadge(pet)}`;
    document.getElementById('petTypeTag').textContent = getTypeName(pet.type);
    document.getElementById('petBreedTag').textContent = pet.breed;
    document.getElementById('petPersonalityTag').textContent = pet.personality;
    document.getElementById('petLevel').textContent = pet.level;
    document.getElementById('petCustomTraits').textContent = pet.customTraits || '';
    document.getElementById('chatPetName').textContent = pet.name;
    
    // AI 肖像按钮状态
    const aiPortraitBtn = document.getElementById('aiPortraitBtn');
    aiPortraitBtn.disabled = !pet.originalPhoto;
    aiPortraitBtn.textContent = pet.hasAIPortrait ? '✨ 重新生成AI肖像' : '🎨 AI生成肖像';
    
    // 头像
    const avatarImg = document.getElementById('petAvatarImg');
    avatarImg.style.display = 'block';
    avatarImg.src = pet.avatar || '';
    avatarImg.onerror = () => {
      avatarImg.style.display = 'none';
      document.getElementById('petAvatarLarge').textContent = getTypeEmoji(pet.type);
      document.getElementById('petAvatarLarge').style.fontSize = '60px';
    };
    
    // 心情
    const moods = { happy: '😊', excited: '🤩', sleepy: '😴', hungry: '😋', playful: '😝' };
    document.getElementById('petMood').textContent = moods[pet.mood] || '😊';
    
    // 经验条
    const expPercent = Math.min(100, (pet.exp / (pet.level * 100)) * 100);
    document.getElementById('expFill').style.width = expPercent + '%';
    document.getElementById('expText').textContent = `${pet.exp}/${pet.level * 100}`;
    
    // 重置剧情区
    document.getElementById('storylineSection').classList.add('hidden');
  } catch (e) {
    console.error('加载宠物信息失败:', e);
  }
}

async function loadConversations(petId) {
  try {
    const res = await fetch(`/api/pets/${petId}/conversations`);
    const conversations = await res.json();
    renderConversations(conversations);
  } catch (e) {
    console.error('加载对话历史失败:', e);
  }
}

function renderConversations(conversations) {
  const container = document.getElementById('chatMessages');
  const welcome = document.getElementById('chatWelcome');
  
  if (conversations.length === 0) {
    welcome.classList.remove('hidden');
    container.innerHTML = '';
    container.appendChild(welcome);
  } else {
    welcome.classList.add('hidden');
    container.innerHTML = conversations.map(conv => `
      <div class="message user">
        <div class="message-avatar">👤</div>
        <div>
          <div class="message-bubble">${escapeHtml(conv.userMessage)}</div>
          <div class="message-time">${formatTime(conv.timestamp)}</div>
        </div>
      </div>
      ${conv.levelUp ? `<div class="level-up-badge">🎉 升级啦！Lv.${conv.newLevel}！</div>` : ''}
      <div class="message pet">
        <div class="message-avatar">${getTypeEmoji(state.pets.find(p => p.id === state.currentPetId)?.type || 'dog')}</div>
        <div>
          <div class="message-bubble">${escapeHtml(conv.petResponse)}</div>
          <div class="message-time">${formatTime(conv.timestamp)}</div>
        </div>
      </div>
    `).join('');
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
  }
}

// ============ 发送消息 ============
async function sendMessage() {
  if (!state.currentPetId) return;
  
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  
  input.value = '';
  input.focus();
  
  // 显示用户消息
  const container = document.getElementById('chatMessages');
  document.getElementById('chatWelcome').classList.add('hidden');
  
  container.innerHTML += `
    <div class="message user">
      <div class="message-avatar">👤</div>
      <div>
        <div class="message-bubble">${escapeHtml(message)}</div>
        <div class="message-time">刚刚</div>
      </div>
    </div>
  `;
  
  // 显示加载状态
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message pet';
  loadingDiv.innerHTML = `
    <div class="message-avatar">🤔</div>
    <div><div class="message-bubble">正在思考...</div></div>
  `;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  
  try {
    const res = await fetch(`/api/pets/${state.currentPetId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const result = await res.json();
    
    // 移除加载状态
    loadingDiv.remove();
    
    // 检查升级
    if (result.levelUp) {
      container.innerHTML += `<div class="level-up-badge">🎉 升级啦！现在 Lv.${result.newLevel}！</div>`;
      setTimeout(() => loadPetProfile(state.currentPetId), 500);
    }
    
    // 显示宠物回复 - 打字机动画
    const pet = state.pets.find(p => p.id === state.currentPetId);
    const avatarContent = pet && (pet.avatar || pet.originalPhoto) 
      ? `<img src="${pet.avatar || pet.originalPhoto}" alt="${pet.name}" onerror="this.parentElement.textContent='${getTypeEmoji(pet.type)}'">`
      : (pet ? getTypeEmoji(pet.type) : '🐾');
    const petMsgDiv = document.createElement('div');
    petMsgDiv.className = 'message pet';
    petMsgDiv.innerHTML = `
      <div class="message-avatar">${avatarContent}</div>
      <div>
        <div class="message-bubble"><span class="typing-cursor">▊</span></div>
        <div class="message-time">刚刚</div>
      </div>
    `;
    container.appendChild(petMsgDiv);
    
    // 打字机效果
    const bubble = petMsgDiv.querySelector('.message-bubble');
    const fullText = result.petResponse;
    let charIndex = 0;
    const typingSpeed = 30 + Math.random() * 40; // 30-70ms 随机速度，更自然
    
    await new Promise(resolve => {
      const typeChar = () => {
        if (charIndex < fullText.length) {
          charIndex++;
          bubble.innerHTML = escapeHtml(fullText.substring(0, charIndex)) + '<span class="typing-cursor">▊</span>';
          container.scrollTop = container.scrollHeight;
          setTimeout(typeChar, typingSpeed);
        } else {
          bubble.innerHTML = escapeHtml(fullText);
          resolve();
        }
      };
      typeChar();
    });
    
    container.scrollTop = container.scrollHeight;
    
    // 更新侧边栏
    await loadPets();
  } catch (e) {
    loadingDiv.remove();
    container.innerHTML += `
      <div class="message pet">
        <div class="message-avatar">😿</div>
        <div><div class="message-bubble">呜...网络不太好，再说一次好吗？</div></div>
      </div>
    `;
  }
}

function sendQuickMessage(message) {
  document.getElementById('chatInput').value = message;
  sendMessage();
}

// ============ 剧情生成 ============
async function generateStoryline() {
  if (!state.currentPetId) return;
  
  showToast('📖 正在生成剧情...');
  
  try {
    const res = await fetch(`/api/pets/${state.currentPetId}/storyline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const storyline = await res.json();
    displayStoryline(storyline);
    showToast('✅ 剧情生成完成！');
  } catch (e) {
    showToast('❌ 剧情生成失败，请重试');
  }
}

function displayStoryline(storyline) {
  const section = document.getElementById('storylineSection');
  const content = document.getElementById('storylineContent');
  
  section.classList.remove('hidden');
  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="font-size: 32px;">${storyline.templateIcon}</span>
      <h4 style="margin-top: 8px; color: var(--primary-dark);">${storyline.title}</h4>
      <span style="font-size: 12px; color: var(--text-light);">${storyline.templateTitle} · ${formatTime(storyline.createdAt)}</span>
    </div>
    <div class="storyline-content">${escapeHtml(storyline.content)}</div>
  `;
  
  section.scrollIntoView({ behavior: 'smooth' });
}

function closeStoryline() {
  document.getElementById('storylineSection').classList.add('hidden');
}

// ============ 多宠互动 ============
function generateMultiStory() {
  if (state.pets.length < 2) {
    showToast('需要至少2只宠物才能进行多宠互动哦～');
    return;
  }
  
  state.selectedMultiPets = new Set();
  if (state.currentPetId) state.selectedMultiPets.add(state.currentPetId);
  
  renderMultiPetSelect();
  document.getElementById('multiStoryContent').classList.add('hidden');
  document.getElementById('multiStoryModal').classList.remove('hidden');
  updateMultiStoryBtn();
}

function renderMultiPetSelect() {
  const container = document.getElementById('multiPetSelect');
  container.innerHTML = state.pets.map(pet => `
    <div class="multi-pet-option ${state.selectedMultiPets.has(pet.id) ? 'selected' : ''}"
         onclick="toggleMultiPet(${pet.id})">
      <span class="multi-pet-check">${state.selectedMultiPets.has(pet.id) ? '✅' : '☐'}</span>
      <span>${getTypeEmoji(pet.type)}</span>
      <span>${pet.name}</span>
      <span style="font-size: 12px; opacity: 0.7;">(${pet.breed})</span>
    </div>
  `).join('');
}

function toggleMultiPet(petId) {
  if (state.selectedMultiPets.has(petId)) {
    if (state.selectedMultiPets.size > 1) {
      state.selectedMultiPets.delete(petId);
    }
  } else {
    state.selectedMultiPets.add(petId);
  }
  renderMultiPetSelect();
  updateMultiStoryBtn();
}

function updateMultiStoryBtn() {
  const btn = document.getElementById('multiStoryBtn');
  btn.disabled = state.selectedMultiPets.size < 2;
}

async function createMultiStory() {
  const petIds = Array.from(state.selectedMultiPets);
  if (petIds.length < 2) return;
  
  showToast('🎭 正在生成多宠互动剧情...');
  
  try {
    const res = await fetch('/api/pets/multi-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petIds })
    });
    const story = await res.json();
    
    const content = document.getElementById('multiStoryContent');
    content.classList.remove('hidden');
    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 32px;">🎭</span>
        <h4 style="margin-top: 8px; color: var(--primary-dark);">${story.title}</h4>
      </div>
      <div class="storyline-content">${escapeHtml(story.content)}</div>
    `;
    showToast('✅ 多宠互动剧情生成完成！');
  } catch (e) {
    showToast('❌ 生成失败，请重试');
  }
}

function closeMultiStory() {
  document.getElementById('multiStoryModal').classList.add('hidden');
}

// ============ 创建宠物 ============
function showCreatePet() {
  state.selectedType = null;
  state.selectedPersonality = null;
  state.selectedColor = null;
  state.uploadedPhotoUrl = null;
  
  // 重置UI
  document.querySelectorAll('.type-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('petDetailsForm').classList.add('hidden');
  document.getElementById('petName').value = '';
  document.getElementById('petCustomTraitsInput').value = '';
  document.getElementById('petBreed').innerHTML = '<option value="">请先选择宠物类型</option>';
  document.getElementById('personalitySelector').innerHTML = '';
  document.getElementById('colorSelector').innerHTML = '';
  
  // 重置照片上传
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('photoPreview').src = '';
  document.getElementById('photoPlaceholder').classList.remove('hidden');
  document.getElementById('photoRemove').classList.add('hidden');
  document.getElementById('photoUploadArea').classList.remove('has-photo');
  document.getElementById('photoStatus').textContent = '';
  document.getElementById('photoStatus').className = 'photo-status';
  document.getElementById('petPhoto').value = '';
  
  document.getElementById('createPetModal').classList.remove('hidden');
}

function closeCreatePet() {
  document.getElementById('createPetModal').classList.add('hidden');
}

function selectType(type) {
  state.selectedType = type;
  
  // UI 更新
  document.querySelectorAll('.type-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.type === type);
  });
  
  // 显示详细信息表单
  document.getElementById('petDetailsForm').classList.remove('hidden');
  
  // 更新品种选项
  const breedSelect = document.getElementById('petBreed');
  const data = state.breedData[type];
  breedSelect.innerHTML = '<option value="">选择品种...</option>' + 
    data.breeds.map(b => `<option value="${b}">${b}</option>`).join('');
  
  // 更新性格选项
  const personalityContainer = document.getElementById('personalitySelector');
  personalityContainer.innerHTML = data.personalities.map(p => `
    <div class="personality-option" data-personality="${p}" onclick="selectPersonality('${p}')">${p}</div>
  `).join('');
  state.selectedPersonality = null;
  
  // 更新颜色选项
  const colorContainer = document.getElementById('colorSelector');
  const colorMap = {
    '金色': '#f59e0b', '棕色': '#92400e', '黑白': 'linear-gradient(90deg, #1e293b 50%, #f8fafc 50%)',
    '白色': '#f8fafc', '灰色': '#94a3b8', '黑色': '#1e293b', '奶油色': '#fef3c7',
    '橘色': '#f97316', '三花色': 'linear-gradient(90deg, #f97316 33%, #1e293b 33%, #1e293b 66%, #f8fafc 66%)',
    '虎斑': 'linear-gradient(45deg, #78716c 25%, #a8a29e 25%, #a8a29e 50%, #78716c 50%, #78716c 75%, #a8a29e 75%)',
    '蓝灰色': '#7c8db5', '奶牛色': 'linear-gradient(90deg, #f8fafc 50%, #1e293b 50%)',
    '奶茶色': '#d4a574', '绿色': '#22c55e', '蓝色': '#3b82f6', '黄色': '#eab308',
    '彩色': 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6)',
    '花色': 'linear-gradient(90deg, #f8fafc 50%, #92400e 50%)',
    '红色': '#ef4444', '橙色': '#f97316', '紫色': '#8b5cf6', '粉色': '#ec4899',
    '豹纹': 'repeating-linear-gradient(45deg, #92400e, #92400e 5px, #d4a574 5px, #d4a574 10px)',
    '玳瑁色': 'linear-gradient(45deg, #1e293b 25%, #f97316 25%, #f97316 50%, #f8fafc 50%, #f8fafc 75%, #f97316 75%)',
    '重点色': 'linear-gradient(90deg, #f8fafc 60%, #1e293b 60%)',
    '银白色': '#e5e7eb', '米黄色': '#fde68a', '巧克力色': '#7c2d12', '霜白色': '#f0f9ff',
    '蓝重点': 'linear-gradient(90deg, #f8fafc 60%, #7c8db5 60%)', '香槟色': '#fde68a',
    '斑点': 'radial-gradient(circle, #1e293b 20%, #f8fafc 20%)', '渐变色': 'linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6)',
    '透明色': 'linear-gradient(135deg, #e0f2fe, #fef3c7)', '纯色': '#f3f4f6', '杂色': 'repeating-conic-gradient(#f3f4f6 0% 25%, #d1d5db 0% 50%)'
  };
  
  colorContainer.innerHTML = data.colors.map(c => {
    const bg = colorMap[c] || '#e2e8f0';
    return `<div class="color-option" data-color="${c}" 
                 style="background: ${bg}; ${c === '白色' ? 'border: 2px solid #e2e8f0;' : ''}"
                 onclick="selectColor('${c}')" title="${c}"></div>`;
  }).join('');
  state.selectedColor = null;
}

function selectPersonality(personality) {
  state.selectedPersonality = personality;
  document.querySelectorAll('.personality-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.personality === personality);
  });
}

function selectColor(color) {
  state.selectedColor = color;
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

async function createPet() {
  const name = document.getElementById('petName').value.trim();
  const breed = document.getElementById('petBreed').value;
  const personality = state.selectedPersonality;
  const color = state.selectedColor;
  const customTraits = document.getElementById('petCustomTraitsInput').value.trim();
  
  // 验证
  if (!name) return showToast('请给你的宠物起个名字吧！');
  if (!breed) return showToast('请选择品种哦～');
  if (!personality) return showToast('请选择宠物的性格～');
  if (!color) return showToast('请选择毛色～');
  
  try {
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, type: state.selectedType, breed, personality, color, customTraits,
        photoUrl: state.uploadedPhotoUrl
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      return showToast('❌ ' + err.error);
    }
    
    const pet = await res.json();
    closeCreatePet();
    await loadPets();
    selectPet(pet.id);
    showToast(`🎉 ${pet.name} 创建成功！快来和它聊天吧！`);
  } catch (e) {
    showToast('❌ 创建失败，请重试');
  }
}

// ============ 照片上传 ============
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const status = document.getElementById('photoStatus');
  status.textContent = '正在上传...';
  status.className = 'photo-status';
  
  // 简单预览
  const preview = document.getElementById('photoPreview');
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    document.getElementById('photoPlaceholder').classList.add('hidden');
    document.getElementById('photoRemove').classList.remove('hidden');
    document.getElementById('photoUploadArea').classList.add('has-photo');
  };
  reader.readAsDataURL(file);
  
  try {
    const formData = new FormData();
    formData.append('photo', file);
    
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      body: formData
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.error || '上传失败');
    }
    
    state.uploadedPhotoUrl = result.photoUrl;
    status.textContent = '✅ 照片上传成功！';
    status.className = 'photo-status success';
  } catch (e) {
    status.textContent = '❌ 上传失败：' + e.message;
    status.className = 'photo-status error';
    removePhoto();
  }
}

function removePhoto() {
  state.uploadedPhotoUrl = null;
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('photoPreview').src = '';
  document.getElementById('photoPlaceholder').classList.remove('hidden');
  document.getElementById('photoRemove').classList.add('hidden');
  document.getElementById('photoUploadArea').classList.remove('has-photo');
  document.getElementById('photoStatus').textContent = '';
  document.getElementById('photoStatus').className = 'photo-status';
  document.getElementById('petPhoto').value = '';
}

// ============ AI 肖像生成 ============
async function requestAIPortrait() {
  if (!state.currentPetId) return;
  
  const pet = state.pets.find(p => p.id === state.currentPetId);
  if (!pet || !pet.originalPhoto) {
    showToast('请先上传宠物照片才能生成AI肖像哦～');
    return;
  }
  
  showToast('🎨 已提交AI肖像生成请求，请稍候...');
  
  try {
    const res = await fetch(`/api/pets/${state.currentPetId}/request-ai-portrait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    
    if (!res.ok) {
      throw new Error(result.error || '请求失败');
    }
    
    showToast('✅ ' + result.message);
  } catch (e) {
    showToast('❌ ' + e.message);
  }
}

// ============ 删除宠物 ============
async function deletePet(petId) {
  const pet = state.pets.find(p => p.id === petId);
  if (!confirm(`确定要删除 ${pet?.name || '这只宠物'} 吗？\n删除后对话记录和剧情也会丢失哦～`)) return;
  
  try {
    await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
    if (state.currentPetId === petId) {
      state.currentPetId = null;
      showWelcome();
    }
    await loadPets();
    showToast('已删除');
  } catch (e) {
    showToast('❌ 删除失败');
  }
}

// ============ 工具函数 ============
function getTypeName(type) {
  const names = { 
    dog: '🐕 狗狗', 
    cat: '🐱 猫咪', 
    rabbit: '🐰 兔兔', 
    hamster: '🐹 仓鼠', 
    bird: '🐦 小鸟',
    reptile: '🦎 爬行类',
    other: '🌟 其他'
  };
  return names[type] || type;
}

function getTypeEmoji(type) {
  const emojis = { 
    dog: '🐕', 
    cat: '🐱', 
    rabbit: '🐰', 
    hamster: '🐹', 
    bird: '🐦',
    reptile: '🦎',
    other: '🌟'
  };
  return emojis[type] || '🐾';
}

function getPortraitBadge(pet) {
  if (pet.hasAIPortrait) return '<span class="portrait-badge ai">✨ AI肖像</span>';
  if (pet.originalPhoto) return '<span class="portrait-badge photo">📷 真实照片</span>';
  return '<span class="portrait-badge none">🎲 默认头像</span>';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ============ 启动 ============
document.addEventListener('DOMContentLoaded', init);

// 点击弹窗遮罩关闭
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeCreatePet();
    closeMultiStory();
  }
});
