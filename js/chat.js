/**
 * Hyundai AutoEver Careers - AI Chat (Claude API Streaming)
 */

(function () {
  'use strict';

  // ============================================
  // Constants
  // ============================================
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-sonnet-4-20250514';
  const MAX_TOKENS = 2048;
  const STORAGE_KEY = 'haev_claude_api_key';
  const SESSION_KEY = 'haev_chat_messages';

  // ============================================
  // DOM Elements
  // ============================================
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const apiKeyPanel = document.getElementById('apiKeyPanel');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const apiKeyToggle = document.getElementById('apiKeyToggle');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const deleteKeyBtn = document.getElementById('deleteKeyBtn');
  const togglePwBtn = document.getElementById('togglePwBtn');
  const newChatBtn = document.getElementById('newChatBtn');

  // ============================================
  // State
  // ============================================
  let apiKey = localStorage.getItem(STORAGE_KEY) || '';
  let messages = [];
  let isStreaming = false;
  let jobsData = [];
  let systemPrompt = '';

  // ============================================
  // Init
  // ============================================
  async function init() {
    await loadJobsData();
    buildSystemPrompt();
    restoreSession();
    updateApiKeyUI();

    if (!apiKey) {
      apiKeyPanel.classList.add('open');
      apiKeyToggle.classList.add('active');
    }
  }

  async function loadJobsData() {
    try {
      const res = await fetch('data/jobs.json');
      jobsData = await res.json();
    } catch {
      jobsData = [];
    }
  }

  function buildSystemPrompt() {
    const jobsSummary = jobsData.map(j =>
      `- ${j.title} (${j.department}, ${j.type}, ${j.location}, 경력: ${j.experience}, 마감: ${j.deadline}): ${j.description}`
    ).join('\n');

    systemPrompt = `당신은 현대오토에버(Hyundai AutoEver)의 채용 AI 도우미입니다.

역할:
- 현대오토에버 채용 관련 질문에 친절하고 전문적으로 답변합니다.
- 현재 진행 중인 채용공고 정보를 정확하게 안내합니다.
- 채용 절차, 기업문화, 복지, 회사 소개 등에 대해 안내합니다.
- 한국어로 답변하되, 사용자가 영어로 질문하면 영어로 답변합니다.

회사 소개:
현대오토에버는 현대자동차그룹의 ICT 핵심 계열사로, 모빌리티 소프트웨어, IT 서비스(ERP/MES), 클라우드 인프라, 사이버 보안 분야를 담당합니다.
임직원 6,000명 이상, 글로벌 14개국에 해외 법인을 운영하고 있습니다.

기업문화:
- 자율 출퇴근제, 원격 근무, 거점 오피스
- 기술 교육비 지원, 사내 기술 세미나, 자격증 취득 지원
- 직급 대신 '님' 호칭, 수평적 소통
- 건강검진, 자녀 학자금, 사내 동호회, 리프레시 휴가

채용 절차: 지원서 접수 → 서류 전형 → 코딩 테스트 → 면접 전형(기술/임원) → 최종 합격

현재 진행 중인 채용공고:
${jobsSummary || '(현재 등록된 공고 없음)'}

응답 가이드라인:
- 간결하고 구조화된 답변을 제공하세요.
- 필요 시 마크다운 형식(굵은 글씨, 목록 등)을 활용하세요.
- 확실하지 않은 정보는 추측하지 말고, 공식 채용 페이지를 안내하세요.`;
  }

  // ============================================
  // API Key Management
  // ============================================
  function updateApiKeyUI() {
    if (apiKey) {
      apiKeyStatus.innerHTML = '<span class="status-dot green"></span><span>API 키가 설정되었습니다</span>';
      apiKeyInput.value = apiKey;
    } else {
      apiKeyStatus.innerHTML = '<span class="status-dot red"></span><span>API 키가 설정되지 않았습니다</span>';
      apiKeyInput.value = '';
    }
    updateSendBtn();
  }

  apiKeyToggle.addEventListener('click', () => {
    apiKeyPanel.classList.toggle('open');
    apiKeyToggle.classList.toggle('active');
  });

  saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showToast('API 키를 입력해주세요.', true);
      return;
    }
    apiKey = key;
    localStorage.setItem(STORAGE_KEY, apiKey);
    updateApiKeyUI();
    showToast('API 키가 저장되었습니다.');
    apiKeyPanel.classList.remove('open');
    apiKeyToggle.classList.remove('active');
  });

  deleteKeyBtn.addEventListener('click', () => {
    apiKey = '';
    localStorage.removeItem(STORAGE_KEY);
    apiKeyInput.value = '';
    updateApiKeyUI();
    showToast('API 키가 삭제되었습니다.');
  });

  togglePwBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
  });

  // ============================================
  // Chat Input
  // ============================================
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    updateSendBtn();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (isStreaming) {
      // Stop button functionality could be added here
      return;
    }
    sendMessage();
  });

  function updateSendBtn() {
    sendBtn.disabled = !chatInput.value.trim() || !apiKey || isStreaming;
  }

  // ============================================
  // Send Message
  // ============================================
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !apiKey || isStreaming) return;

    // Add user message
    messages.push({ role: 'user', content: text });
    appendMessage('user', text);

    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendBtn();

    // Create assistant message placeholder
    const assistantEl = appendMessage('assistant', '');
    const contentEl = assistantEl.querySelector('.message-content');
    contentEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    isStreaming = true;
    sendBtn.classList.add('loading');
    updateSendBtn();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        handleApiError(response.status, errBody);
        contentEl.innerHTML = '';
        assistantEl.remove();
        messages.pop(); // Remove user message since it failed
        return;
      }

      // Stream SSE response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                fullText += parsed.delta.text;
                contentEl.innerHTML = renderMarkdown(fullText);
                scrollToBottom();
              }

              if (parsed.type === 'error') {
                showToast(parsed.error?.message || 'API 오류가 발생했습니다.', true);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }

      if (fullText) {
        messages.push({ role: 'assistant', content: fullText });
        saveSession();
      } else {
        assistantEl.remove();
      }

    } catch (err) {
      contentEl.innerHTML = '';
      assistantEl.remove();
      if (messages.length && messages[messages.length - 1].role === 'user') {
        messages.pop();
      }
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        showToast('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.', true);
      } else {
        showToast('오류가 발생했습니다: ' + err.message, true);
      }
    } finally {
      isStreaming = false;
      sendBtn.classList.remove('loading');
      updateSendBtn();
      chatInput.focus();
    }
  }

  function handleApiError(status, body) {
    switch (status) {
      case 401:
        showToast('API 키가 유효하지 않습니다. 키를 확인해주세요.', true);
        apiKeyPanel.classList.add('open');
        apiKeyToggle.classList.add('active');
        break;
      case 429:
        showToast('요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', true);
        break;
      case 400:
        showToast('잘못된 요청입니다. 대화를 초기화해주세요.', true);
        break;
      case 529:
        showToast('API 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.', true);
        break;
      default:
        showToast(`API 오류 (${status})가 발생했습니다.`, true);
    }
  }

  // ============================================
  // Message Rendering
  // ============================================
  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message message-${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'You' : 'AI';

    const content = document.createElement('div');
    content.className = 'message-content';
    if (text) {
      content.innerHTML = role === 'user' ? escapeHtml(text).replace(/\n/g, '<br>') : renderMarkdown(text);
    }

    div.appendChild(avatar);
    div.appendChild(content);
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ============================================
  // Markdown Rendering (lightweight)
  // ============================================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMarkdown(text) {
    let html = escapeHtml(text);

    // Code blocks (```...```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code (`...`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**...**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic (*...*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered lists (- item)
    html = html.replace(/^- (.+)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)\n?/gs, (match) => {
      if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
      return match;
    });
    // Clean up nested ul tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists (1. item)
    html = html.replace(/^\d+\.\s(.+)/gm, '<li>$1</li>');

    // Headers (### ...)
    html = html.replace(/^### (.+)/gm, '<strong>$1</strong>');
    html = html.replace(/^## (.+)/gm, '<strong>$1</strong>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up extra br around block elements
    html = html.replace(/<br>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<br>/g, '$1');
    html = html.replace(/<br>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<br>/g, '$1');

    return html;
  }

  // ============================================
  // Session Management
  // ============================================
  function saveSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  }

  function restoreSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        messages = JSON.parse(saved);
        messages.forEach(msg => {
          appendMessage(msg.role, msg.content);
        });
      }
    } catch {
      messages = [];
    }
  }

  // ============================================
  // New Chat
  // ============================================
  newChatBtn.addEventListener('click', () => {
    if (isStreaming) return;
    messages = [];
    sessionStorage.removeItem(SESSION_KEY);

    // Keep only the welcome message
    const welcomeMsg = chatMessages.querySelector('.message-assistant');
    chatMessages.innerHTML = '';
    if (welcomeMsg) chatMessages.appendChild(welcomeMsg);

    showToast('새 대화가 시작되었습니다.');
    chatInput.focus();
  });

  // ============================================
  // Toast
  // ============================================
  function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ============================================
  // Start
  // ============================================
  init();
})();
