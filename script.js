const loading = document.querySelector('#loading');
const work = document.querySelector('#work');
const bg = document.getElementById('bg');

window.addEventListener('load', () => {
    loading.classList.add('loaded');
});

function toggle() {
    document.querySelector('.menubutton').classList.toggle('open');
    document.querySelector('.menu').classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const menu = document.querySelector('.menu');
    const button = document.querySelector('.menubutton');

    // メニュー開いてないなら何もしない
    if (!menu.classList.contains('open')) return;

    // メニュー内クリック or ボタンクリックなら無視
    if (menu.contains(e.target) || button.contains(e.target)) return;

    // それ以外 → 閉じる
    menu.classList.remove('open');
    button.classList.remove('open');
});

const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
const heroContent = document.getElementById('heroContent');

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let centerX = 0;
let centerY = 0;
let startTime = null;

const NODE_COUNT = 150;
const nodes = [];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  centerX = width / 2;
  centerY = height / 2;
  createNodes();
}

function createNodes() {
  nodes.length = 0;

  const margin = Math.min(width, height) * 0.06;
  const clusterRadiusX = Math.min(width * 0.34, 480);
  const clusterRadiusY = Math.min(height * 0.28, 300);

  for (let index = 0; index < NODE_COUNT; index += 1) {
    const angle = random(0, Math.PI * 2);
    const radius = Math.sqrt(Math.random());

    nodes.push({
      x: random(margin, width - margin),
      y: random(margin, height - margin),
      targetX: centerX + Math.cos(angle) * clusterRadiusX * radius,
      targetY: centerY + Math.sin(angle) * clusterRadiusY * radius,
      radius: random(0.7, 2.1),
      alpha: random(0.45, 1),
      pulseSpeed: random(0.8, 2.2),
      pulseOffset: random(0, Math.PI * 2),
      driftX: random(-7, 7),
      driftY: random(-7, 7),
    });
  }
}

function getNodePosition(node, progress, elapsedSeconds) {
  const gather = easeInOutCubic(clamp((progress - 0.42) / 0.30));
  const driftAmount = 1 - gather;

  return {
    x:
      node.x +
      Math.sin(elapsedSeconds * 0.22 + node.pulseOffset) * node.driftX * driftAmount +
      (node.targetX - node.x) * gather,
    y:
      node.y +
      Math.cos(elapsedSeconds * 0.20 + node.pulseOffset) * node.driftY * driftAmount +
      (node.targetY - node.y) * gather,
  };
}

function drawBackground(progress) {
  const lightProgress = easeInOutCubic(clamp((progress - 0.78) / 0.18));
  const dark = { r: 2, g: 6, b: 15 };
  const light = { r: 245, g: 245, b: 243 };

  const r = Math.round(dark.r + (light.r - dark.r) * lightProgress);
  const g = Math.round(dark.g + (light.g - dark.g) * lightProgress);
  const b = Math.round(dark.b + (light.b - dark.b) * lightProgress);

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, width, height);
}

function drawConnections(positions, progress) {
  const connectionProgress = easeOutCubic(clamp((progress - 0.16) / 0.28));
  const fadeProgress = easeInOutCubic(clamp((progress - 0.72) / 0.18));
  const threshold = 54 + connectionProgress * 78;
  const opacity = 0.22 * connectionProgress * (1 - fadeProgress);

  if (opacity <= 0.001) return;

  ctx.lineWidth = 0.65;

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const distance = Math.hypot(dx, dy);

      if (distance > threshold) continue;

      const strength = 1 - distance / threshold;
      ctx.strokeStyle = `rgba(126, 181, 255, ${opacity * strength})`;
      ctx.beginPath();
      ctx.moveTo(positions[i].x, positions[i].y);
      ctx.lineTo(positions[j].x, positions[j].y);
      ctx.stroke();
    }
  }
}

function drawNodes(positions, progress, elapsedSeconds) {
  const appearProgress = easeOutCubic(clamp(progress / 0.18));
  const fadeProgress = easeInOutCubic(clamp((progress - 0.74) / 0.17));
  const networkEmphasis = easeInOutCubic(clamp((progress - 0.32) / 0.30));

  nodes.forEach((node, index) => {
    const flicker = 0.78 + Math.sin(
      elapsedSeconds * node.pulseSpeed + node.pulseOffset
    ) * 0.22;
    const stagger = clamp((progress * NODE_COUNT * 1.35 - index) / 22);
    const alpha =
      node.alpha *
      flicker *
      appearProgress *
      easeOutCubic(stagger) *
      (1 - fadeProgress);

    if (alpha <= 0.005) return;

    const radius = node.radius * (1 + networkEmphasis * 0.16);
    const position = positions[index];

    ctx.beginPath();
    ctx.fillStyle = `rgba(225, 239, 255, ${alpha})`;
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCoreGlow(progress) {
  const glowIn = easeOutCubic(clamp((progress - 0.55) / 0.19));
  const glowOut = easeInOutCubic(clamp((progress - 0.76) / 0.14));
  const strength = glowIn * (1 - glowOut);

  if (strength <= 0.001) return;

  const radius = 70 + strength * 210;
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius
  );

  gradient.addColorStop(0, `rgba(210, 233, 255, ${0.54 * strength})`);
  gradient.addColorStop(0.20, `rgba(95, 166, 255, ${0.25 * strength})`);
  gradient.addColorStop(0.55, `rgba(39, 105, 201, ${0.09 * strength})`);
  gradient.addColorStop(1, 'rgba(14, 42, 82, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function animate(timestamp) {
  if (startTime === null) startTime = timestamp;

  const elapsed = timestamp - startTime;
  const duration = 6200;
  const progress = clamp(elapsed / duration);
  const elapsedSeconds = elapsed / 1000;

  drawBackground(progress);

  const positions = nodes.map((node) =>
    getNodePosition(node, progress, elapsedSeconds)
  );

  drawConnections(positions, progress);
  drawCoreGlow(progress);
  drawNodes(positions, progress, elapsedSeconds);

  if (progress >= 0.71) {
    heroContent.classList.remove('is-hidden');
  }

  if (progress >= 0.80) {
    document.body.classList.add('is-white');
  }

  if (progress < 1) {
    requestAnimationFrame(animate);
    return;
  }

  canvas.style.opacity = '0';
  heroContent.classList.remove('is-hidden');
  document.body.classList.add('is-white');

  window.setTimeout(() => {
    canvas.style.pointerEvents = 'none';
  }, 1300);
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
requestAnimationFrame(animate);

const lists = [
    {
        name: 'memorization-tool',
        img: 'memorization_app.png',
        explain: '忘却曲線に基づき、最適なタイミングで復習を促す暗記支援アプリ',
        detail: 'ユーザーの理解度に応じて復習間隔を調整し、効率的な記憶定着を実現。',
        skills: 'FastAPI / Python / SQLite',
    },
    {
        name: 'ウェブカタログビルダー',
        img: 'site_catalog.png',
        explain: 'パーツを選択するだけでWebサイトを構築できるアプリ',
        detail: 'UI選択による構成生成により、非エンジニアでもサイト作成が可能。',
        skills: 'HTML / CSS / JavaScript',
    },
    {
        name: 'WAチェッカー',
        img: 'wa_checker.png',
        explain: '競技プログラミングにおいてWA（誤答）を引き起こす入力を検出するツール',
        detail: '境界値や例外ケースを自動生成し、提出前のバグ検出を支援。',
        skills: 'Python',
    },
    {
        name: '論文分析AI',
        img: 'paper_analyzer.png',
        explain: 'arXiv論文を解析し、論文同士の関係性を可視化するアプリ',
        detail: 'キーワード・引用関係を基に論文マップを生成し、研究理解を支援。',
        skills: 'Python / FastAPI / Network分析',
    },
];

lists.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'work-item';

    if (index % 2 === 1) {
        article.classList.add('reverse');
    }

    article.innerHTML = `
        <div class="work-text">
            <h2>${item.name}</h2>
            <p>${item.explain}</p>
            <p>${item.detail}</p>
            <p class="tech">Tech: ${item.skills}</p>
        </div>

        <div class="work-image">
            <img src="images/${item.img}" alt="${item.name}">
        </div>
    `;

    work.appendChild(article);
});

window.addEventListener('load', () => {
  if (window.location.hash === '#contact') {
    const contactSection = document.getElementById('contact');
    const nameInput = document.getElementById('name');

    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (nameInput) {
      setTimeout(() => {
        nameInput.focus();
      }, 500);
    }
  }
});

const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');
const contactSubmitButton = document.getElementById('contactSubmitButton');

if (contactForm && contactStatus && contactSubmitButton) {
  const BLOCKED_WORDS = [
    '死ね',
    '殺す',
    '詐欺師',
    'ばか',
    'バカ',
    'fuck',
    'shit'
  ];

  const SUBMIT_COOLDOWN_MS = 60 * 1000;

  function setContactStatus(message, type = 'error') {
    contactStatus.textContent = message;
    contactStatus.className = `contact-status ${type}`;
  }

  function clearContactStatus() {
    contactStatus.textContent = '';
    contactStatus.className = 'contact-status';
  }

  function countUrls(text) {
    const matches = text.match(/https?:\/\/|www\./gi);
    return matches ? matches.length : 0;
  }

  function hasBlockedWord(text) {
    const normalized = text.toLowerCase();
    return BLOCKED_WORDS.some((word) => normalized.includes(word.toLowerCase()));
  }

  contactForm.addEventListener('submit', (event) => {
    clearContactStatus();

    const name = document.getElementById('name')?.value.trim() ?? '';
    const email = document.getElementById('email')?.value.trim() ?? '';
    const category = document.getElementById('category')?.value.trim() ?? '';
    const subject = document.getElementById('subject')?.value.trim() ?? '';
    const message = document.getElementById('message')?.value.trim() ?? '';
    const consent = document.getElementById('consent')?.checked ?? false;
    const honeypot = document.getElementById('website')?.value.trim() ?? '';

    const mergedText = `${name}\n${email}\n${category}\n${subject}\n${message}`;

    if (honeypot !== '') {
      event.preventDefault();
      setContactStatus('送信できませんでした。');
      return;
    }

    if (!consent) {
      event.preventDefault();
      setContactStatus('個人情報の取扱いと問い合わせポリシーへの同意が必要です。');
      return;
    }

    if (name.length < 2) {
      event.preventDefault();
      setContactStatus('お名前は2文字以上で入力してください。');
      return;
    }

    if (subject.length < 3) {
      event.preventDefault();
      setContactStatus('件名は3文字以上で入力してください。');
      return;
    }

    if (message.length < 20) {
      event.preventDefault();
      setContactStatus('お問い合わせ内容は20文字以上で入力してください。');
      return;
    }

    if (message.length > 1500) {
      event.preventDefault();
      setContactStatus('お問い合わせ内容は1500文字以内で入力してください。');
      return;
    }

    if (hasBlockedWord(mergedText)) {
      event.preventDefault();
      setContactStatus('送信できない表現が含まれています。内容をご確認ください。');
      return;
    }

    if (countUrls(mergedText) > 2) {
      event.preventDefault();
      setContactStatus('URLの記載は2件までにしてください。');
      return;
    }

    const lastSubmittedAt = Number(localStorage.getItem('contact_last_submitted_at') || '0');
    const now = Date.now();

    if (now - lastSubmittedAt < SUBMIT_COOLDOWN_MS) {
      event.preventDefault();
      setContactStatus('短時間での連続送信はできません。少し時間を空けてください。');
      return;
    }

    localStorage.setItem('contact_last_submitted_at', String(now));

    contactSubmitButton.disabled = true;
    contactSubmitButton.textContent = '送信中...';
    setContactStatus('送信しています...', 'success');
  });
}