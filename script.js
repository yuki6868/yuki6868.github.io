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

const STAR_COUNT = 260;
const stars = [];
let startTime = null;

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;

  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  centerX = width / 2;
  centerY = height / 2;

  createStars();
}

// =======================
// 星生成
// =======================
function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createStars() {
  stars.length = 0;

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: random(0, width),
      y: random(0, height),
      size: random(0.7, 2.3),
      alpha: random(0.3, 1),
      pulse: random(0.8, 2.4),
      offset: random(0, Math.PI * 2),
    });
  }
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// =======================
// 背景描画
// =======================
function drawBackground(progress) {
  // 以前より遅く明るくする
  const bgFadeStart = 0.50;
  const bgFadeDuration = 0.22;

  if (progress < bgFadeStart) {
    ctx.fillStyle = '#02040a';
  } else {
    const fade = Math.min((progress - bgFadeStart) / bgFadeDuration, 1);
    const easedFade = easeInOutSine(fade);
    const shade = Math.floor(2 + (245 - 2) * easedFade);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade - 2})`;
  }

  ctx.fillRect(0, 0, width, height);
}

function drawStars(progress, elapsedSec) {
  const gatherStart = 0.22;
  const gatherDuration = 0.48;

  const gatherProgress =
    progress <= gatherStart
      ? 0
      : Math.min((progress - gatherStart) / gatherDuration, 1);

  const fadeStart = 0.68;
  const fadeDuration = 0.18;

  const fadeProgress =
    progress <= fadeStart
      ? 0
      : Math.min((progress - fadeStart) / fadeDuration, 1);

  stars.forEach((star) => {
    const gatherEase = easeInOutCubic(gatherProgress);

    const currentX =
      star.x + (centerX - star.x) * gatherEase;

    const currentY =
      star.y + (centerY - star.y) * gatherEase;

    const flicker =
      0.75 +
      Math.sin(elapsedSec * star.pulse + star.offset) * 0.25;

    const alpha =
      star.alpha *
      flicker *
      (1 - easeOutQuad(fadeProgress));

    if (alpha <= 0.01) return;

    const radius =
      star.size * (1 - gatherEase * 0.18);

    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 中央の光を「徐々に」出す
  const glowStart = 0.38;
  const glowDuration = 0.20;

  const glowProgress =
    progress <= glowStart
      ? 0
      : Math.min((progress - glowStart) / glowDuration, 1);

  const glowEase = easeInOutSine(glowProgress);

  if (glowEase > 0.001) {
    const fadeEase = 1 - easeOutQuad(fadeProgress);

    const coreAlpha = 0.85 * glowEase * fadeEase;
    const glowRadius = 30 + 150 * glowEase;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      glowRadius
    );

    gradient.addColorStop(0, `rgba(255,255,255,${coreAlpha})`);
    gradient.addColorStop(0.18, `rgba(255,255,255,${coreAlpha * 0.55})`);
    gradient.addColorStop(0.42, `rgba(255,255,255,${coreAlpha * 0.18})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animate(timestamp) {
  if (!startTime) startTime = timestamp;

  const elapsed = timestamp - startTime;
  const duration = 5600; 

  const progress = Math.min(elapsed / duration, 1);
  const elapsedSec = elapsed / 1000;

  drawBackground(progress);
  drawStars(progress, elapsedSec);

  if (progress >= 0.72) {
    document.body.classList.add('is-white');
  }

  if (progress >= 0.57) {
    heroContent.classList.remove('is-hidden');
  }

  if (progress < 1) {
    requestAnimationFrame(animate);
  } else {
    ctx.clearRect(0, 0, width, height);

    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1.2s ease';

    heroContent.classList.remove('is-hidden');
    document.body.classList.add('is-white');

    setTimeout(() => {
      canvas.style.pointerEvents = 'none';
    }, 1300);
  }
}

// =======================
// 実行
// =======================
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