const loading = document.querySelector('#loading');
const worksContent = document.querySelector('#worksContent');
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

const projects = [
  {
    id: 'memorization-tool',
    name: 'memorization_tool',
    image: 'memorization_app.png',
    summary: '復習すべき内容を、その日にすぐ取り出せる暗記支援デスクトップアプリ。',
    problem: '資格勉強では、復習のタイミングをExcelや手書きで管理すると、今日復習する項目を毎回探す必要があり、管理そのものが負担になる。',
    approach: 'FastAPI本格入門のメモアプリを土台に、初めてのアプリ開発として復習管理へ作り替えた。',
    solution: '検索時に全項目の予定日を毎回計算するのではなく、登録時点で1週間後・2か月後などの復習予定データもDBへ追加する設計にした。',
    result: '当日分の予定日だけを検索できるため、復習対象を素早く取り出せる構成になった。SQLiteによるDB設計とElectronによるデスクトップ化にも初挑戦した。',
    challenges: ['初めてのWebアプリ開発', '初めてのデータベース導入', 'デスクトップアプリ化'],
    skills: ['Python', 'JavaScript', 'FastAPI', 'SQLite', 'Electron', 'HTML', 'CSS'],
    categories: { language: ['Python', 'JavaScript'], framework: ['FastAPI'], database: ['SQLite'], infrastructure: ['Electron'], ai: ['なし'], other: ['HTML', 'CSS'] }
  },
  {
    id: 'competitive-debug-studio',
    name: 'Competitive Debug Studio',
    image: 'wa_checker.png',
    summary: '競技プログラミングのWA原因を、ランダムテストと実行分析から探すCLIツール。',
    problem: 'WAになったコードは、どの入力で間違えるのかを人手だけで特定するのが難しい。',
    approach: '正解コードと対象コードを同じ入力で実行し、出力差分が生じるケースを自動で探す仕組みを考えた。',
    solution: 'ランダムテストケース生成に加えて、関数の依存関係や呼び出し回数も確認できるようにし、競技プログラミング以外のコード調査にも使える構成にした。',
    result: '失敗入力の探索とコード構造の確認を一つのCLIで行えるようにした。',
    challenges: ['ランダムテストケース生成', '関数依存関係の可視化', '呼び出し回数の計測'],
    skills: ['Python', 'CLI', 'YAML'],
    categories: { language: ['Python'], framework: ['なし'], database: ['なし'], infrastructure: ['CLIツール'], ai: ['なし'], other: ['YAML'] }
  },
  {
    id: 'knowledge-hub',
    name: 'Knowledge Hub',
    image: 'site_catalog.png',
    summary: 'PCとスマートフォンで同じ知識カードを保存・閲覧できる同期型メモアプリ。',
    problem: '日々の学習や調査で得た知識を、場所や端末を問わず保存し、同じデータとして見られる環境が必要だった。',
    approach: 'Web版とデスクトップ版で別々のデータを持たず、Supabaseを共通の保存先にする構成を採用した。',
    solution: 'ReactとViteでフロントエンドを構築し、Supabase Realtimeで同期。Web版はVercelへデプロイし、Electron Shellのデスクトップ版からも同じデータへアクセスできるようにした。',
    result: 'PCとスマートフォン間で知識カードを共有できるようになった。特に、スマートフォンから安全にアクセスできる公開方法と同期設計を検討・実装した。',
    challenges: ['端末間のデータ同期', 'スマートフォンからのアクセス', 'Web版とデスクトップ版のデータ共通化'],
    skills: ['JavaScript', 'TypeScript', 'React', 'Vite', 'Supabase', 'Vercel', 'Electron Shell', 'Supabase Realtime'],
    categories: { language: ['JavaScript', 'TypeScript'], framework: ['React', 'Vite'], database: ['Supabase'], infrastructure: ['Vercel', 'Electron Shell'], ai: ['なし'], other: ['Supabase Realtime'] }
  },
  {
    id: 'design-hub',
    name: 'Design Hub',
    image: 'ai-site.png',
    summary: '分散しがちな設計情報を一元管理し、設計を思考活動として支援する開発ツール。',
    problem: 'システム開発では要件、画面、API、DBなどの設計成果物を個別に管理しやすく、変更時に整合性が崩れやすい。',
    approach: '設計書を単に作成するのではなく、共通情報を一元管理しながら、利用者が考えやすいUIを提供することを目標にした。',
    solution: 'FastAPI・React・PostgreSQLで構成し、SQLAlchemyを利用。PostgreSQL環境はDockerで管理し、将来的なSupabase移行も考慮した境界を設けている。',
    result: '設計情報を統合する基盤は構築中。思考しやすいUIについては答えを固定せず、試作と検証を続けている。',
    challenges: ['設計成果物間の整合性', '思考を妨げないUI', '将来のSupabase移行'],
    skills: ['Python', 'TypeScript', 'FastAPI', 'React', 'Vite', 'PostgreSQL', 'Docker', 'REST API', 'SQLAlchemy'],
    categories: { language: ['Python', 'TypeScript'], framework: ['FastAPI', 'React', 'Vite'], database: ['PostgreSQL'], infrastructure: ['Docker', 'REST API'], ai: ['実装予定'], other: ['SQLAlchemy'] }
  }
];

const otherProjects = [
  {
    name: 'Retro Short Studio',
    type: 'デスクトップアプリ',
    summary: 'ピクセルアート制作とタイムライン編集を組み合わせた、レトロ動画制作ツール。',
    skills: ['React', 'TypeScript', 'Electron']
  },
  {
    name: 'StudyWithMeエンジン',
    type: 'ライブラリ',
    summary: 'ポモドーロ時間と会話・BGMなどのイベントを制御する実行エンジン。',
    skills: ['Python', 'Pyxel', 'YAML']
  },
  {
    name: '開発ダッシュボード',
    type: 'デスクトップアプリ',
    summary: '複数の個人開発プロジェクトとGitHubの更新状況をまとめて確認するツール。',
    skills: ['Python', 'Electron', 'GitHub API']
  },
  {
    name: '論文アナライザー',
    type: 'Webアプリ',
    summary: 'arXiv論文の取得・翻訳・分析・通知を一つにまとめた調査支援ツール。',
    skills: ['Python', 'arXiv API', 'Discord']
  },
  {
    name: 'AI文脈漢字入力ツール',
    type: 'Chrome拡張',
    summary: '読みが分からない漢字を、部首や文章の文脈から入力するブラウザ拡張。',
    skills: ['JavaScript', 'Chrome Extension', 'AI API']
  },
  {
    name: 'ウェブサイトカタログ',
    type: 'Webアプリ',
    summary: 'WebサイトのUI部品を選び、組み合わせをリアルタイムで確認するツール。',
    skills: ['HTML', 'CSS', 'JavaScript']
  },
  {
    name: '動画シーン管理ボード',
    type: 'Webアプリ',
    summary: '動画の構成・台本・制作状況をシーン単位で管理するボード。',
    skills: ['JavaScript', 'UI設計', '状態管理']
  },
  {
    name: 'AI秘書 LIFE MANAGER',
    type: 'デスクトップアプリ',
    summary: '目標・タスク・学習・振り返りを一元管理する個人活動基盤。',
    skills: ['Python', 'Electron', 'AI設計']
  },
  {
    name: 'DerbyViz',
    type: 'Webアプリ',
    summary: '競馬データを整理し、予測結果と買い方を確認する分析ツール。',
    skills: ['Python', 'データ分析', 'Web UI']
  },
  {
    name: '将棋AI',
    type: 'AI',
    summary: '強さだけでなく学習体験を重視して設計した教育用将棋AI。',
    skills: ['Python', '機械学習', 'ゲームAI']
  },
  // {
  //   name: '北斗無双スロット',
  //   type: 'デスクトップアプリ',
  //   summary: '内部抽選やモード遷移を状態として再現したスロットシミュレーター。',
  //   skills: ['Python', '状態遷移', '確率処理']
  // }
];

const skillDescriptions = {
  Python: 'API、CLI、データ処理など、プロダクトの中核処理を実装。',
  JavaScript: 'ブラウザUIとデスクトップ画面の動作を実装。',
  TypeScript: '型を使ってフロントエンドの変更に強い構成を設計。',
  FastAPI: 'REST API、入力検証、データアクセスを実装。',
  React: '状態に応じて変化する編集・閲覧UIを構築。',
  Vite: 'React開発環境とビルド構成を整備。',
  SQLite: '小規模アプリの永続化と検索を設計。',
  PostgreSQL: '設計情報を扱うリレーショナルDBとして利用。',
  Supabase: '認証・DB・端末間同期の共通基盤として利用。',
  Electron: 'Web技術でデスクトップアプリ化。',
  'Electron Shell': 'Web版と同じデータを利用するデスクトップ版を構築。',
  Docker: 'PostgreSQLを含む開発環境を再現可能に管理。',
  Vercel: 'スマートフォンからアクセスできるWeb版を公開。',
  'REST API': 'フロントエンドとバックエンドの責務を分離。',
  SQLAlchemy: 'Python側のDBアクセスとモデル管理に利用。',
  CLI: '画面を必要としない検証ツールとして提供。',
  YAML: '設定やテスト条件を読み書きしやすい形式で管理。'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

const sectionContent = {
  works: {
    featured: {
      kicker: 'FEATURED PROJECTS',
      title: '代表作品',
      description: '課題、設計、実装の過程まで紹介している主要なプロジェクトです。'
    },
    other: {
      kicker: 'OTHER PROJECTS',
      title: 'その他の作品',
      description: '試作・学習・検証を通して制作したプロジェクトです。'
    }
  },
  skills: {
    primary: {
      kicker: 'CORE SKILLS',
      title: '主要スキル',
      description: '代表的な開発経験につながる6つの技術です。'
    },
    other: {
      kicker: 'OTHER SKILLS',
      title: 'その他のスキル',
      description: 'カテゴリごとにまとめています。クリックすると使用実績を確認できます。'
    }
  }
};

function renderGroupHeading({ kicker, title, description }, titleId) {
  return `
    <div class="section-group-heading">
      <p class="section-group-kicker">${escapeHtml(kicker)}</p>
      <h2 id="${titleId}">${escapeHtml(title)}</h2>
      <p class="section-group-description">${escapeHtml(description)}</p>
    </div>
  `;
}

function renderWorks() {
  if (!worksContent) return;

  worksContent.innerHTML = `
    <section class="featured-works" aria-labelledby="featuredWorksTitle">
      ${renderGroupHeading(sectionContent.works.featured, 'featuredWorksTitle')}
      <div id="work">
        ${projects.map((project, index) => `
          <article class="work-card" data-project-id="${project.id}">
            <button class="work-card-button" type="button" data-project-id="${project.id}" aria-label="${escapeHtml(project.name)}の詳細を見る">
              <div class="work-card-image"><img src="images/${project.image}" alt="${escapeHtml(project.name)}"></div>
              <div class="work-card-body">
                <p class="work-card-kicker">Project ${String(index + 1).padStart(2, '0')}</p>
                <h3>${escapeHtml(project.name)}</h3>
                <p>${escapeHtml(project.summary)}</p>
                <div class="tag-list">${project.skills.slice(0, 4).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}</div>
                <span class="work-card-link">課題と解決を見る <span aria-hidden="true">→</span></span>
              </div>
            </button>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="other-works" aria-labelledby="otherWorksTitle">
      ${renderGroupHeading(sectionContent.works.other, 'otherWorksTitle')}
      <div id="otherWorksGrid" class="other-works-grid"></div>
      <button id="otherWorksToggle" class="other-works-toggle" type="button" aria-expanded="false">
        さらに表示
      </button>
    </section>
  `;

  document.getElementById('otherWorksToggle')?.addEventListener('click', () => {
    isOtherWorksExpanded = !isOtherWorksExpanded;
    renderOtherWorks();
  });

  renderOtherWorks();
}

const OTHER_WORKS_INITIAL_COUNT = 6;
let isOtherWorksExpanded = false;

function renderOtherWorks() {
  const grid = document.getElementById('otherWorksGrid');
  const toggle = document.getElementById('otherWorksToggle');
  if (!grid) return;

  const visibleProjects = isOtherWorksExpanded
    ? otherProjects
    : otherProjects.slice(0, OTHER_WORKS_INITIAL_COUNT);

  grid.innerHTML = visibleProjects.map((project) => `
    <article class="other-work-card">
      <div class="other-work-main">
        <div class="other-work-meta">${escapeHtml(project.type)}</div>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.summary)}</p>
      </div>
      <div class="other-work-tags">
        ${project.skills.slice(0, 3).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('')}
      </div>
    </article>
  `).join('');

  if (!toggle) return;

  const hasHiddenProjects = otherProjects.length > OTHER_WORKS_INITIAL_COUNT;
  toggle.hidden = !hasHiddenProjects;
  toggle.textContent = isOtherWorksExpanded ? '閉じる' : `さらに表示（残り${otherProjects.length - OTHER_WORKS_INITIAL_COUNT}件）`;
  toggle.setAttribute('aria-expanded', String(isOtherWorksExpanded));
}

function getFeaturedProjectsBySkill(skill) {
  return projects.filter((project) => project.skills.includes(skill));
}

function getOtherProjectsBySkill(skill) {
  return otherProjects.filter((project) => project.skills.includes(skill));
}

const primarySkillNames = ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker'];

const skillCategories = [
  {
    label: 'Backend',
    skills: ['SQLAlchemy', 'CLI', 'pytest']
  },
  {
    label: 'Frontend',
    skills: ['JavaScript', 'Vite', 'HTML', 'CSS', '状態管理', 'UI設計']
  },
  {
    label: 'Database',
    skills: ['SQLite', 'Supabase', 'Supabase Realtime']
  },
  {
    label: 'Infrastructure',
    skills: ['Electron', 'Electron Shell', 'Vercel', 'REST API', 'GitHub API', 'Chrome Extension']
  },
  {
    label: 'Other',
    skills: ['YAML', 'Pyxel', 'arXiv API', 'Discord', 'AI API', 'AI設計', 'データ分析', 'Web UI', '機械学習', 'ゲームAI']
  }
];

function getSkillUsageCount(skill) {
  return getFeaturedProjectsBySkill(skill).length + getOtherProjectsBySkill(skill).length;
}

function renderSkillCard(name) {
  const featuredCount = getFeaturedProjectsBySkill(name).length;
  const otherCount = getOtherProjectsBySkill(name).length;
  const countText = otherCount > 0
    ? `代表 ${featuredCount}件・その他 ${otherCount}件`
    : `代表作品 ${featuredCount}件`;

  return `
    <article class="skill-card">
      <button type="button" class="skill-card-button" data-skill="${escapeHtml(name)}">
        <span class="skill-card-count">${countText}</span>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(skillDescriptions[name] || '作品の実装を通して利用した技術です。')}</p>
        <span class="skill-card-link">使用実績を見る →</span>
      </button>
    </article>`;
}

function renderSkills() {
  const grid = document.getElementById('skillsContent');
  if (!grid) return;

  const availableSkills = new Set([
    ...projects.flatMap((project) => project.skills),
    ...otherProjects.flatMap((project) => project.skills)
  ]);

  const primarySkills = primarySkillNames.filter((name) => availableSkills.has(name));
  const categorizedSkills = new Set(skillCategories.flatMap((category) => category.skills));
  const uncategorizedSkills = [...availableSkills]
    .filter((name) => !primarySkillNames.includes(name) && !categorizedSkills.has(name))
    .sort((a, b) => getSkillUsageCount(b) - getSkillUsageCount(a));

  const categories = skillCategories
    .map((category) => ({
      ...category,
      skills: category.skills.filter((name) => availableSkills.has(name))
    }))
    .filter((category) => category.skills.length > 0);

  if (uncategorizedSkills.length > 0) {
    const otherCategory = categories.find((category) => category.label === 'Other');
    if (otherCategory) {
      otherCategory.skills.push(...uncategorizedSkills);
    } else {
      categories.push({ label: 'Other', skills: uncategorizedSkills });
    }
  }

  grid.innerHTML = `
    <section class="primary-skills" aria-labelledby="primarySkillsTitle">
      ${renderGroupHeading(sectionContent.skills.primary, 'primarySkillsTitle')}
      <div class="primary-skill-grid">
        ${primarySkills.map(renderSkillCard).join('')}
      </div>
    </section>

    <section class="secondary-skills" aria-labelledby="secondarySkillsTitle">
      ${renderGroupHeading(sectionContent.skills.other, 'secondarySkillsTitle')}
      <div class="skill-category-list">
        ${categories.map((category) => `
          <div class="skill-category">
            <h4>${escapeHtml(category.label)}</h4>
            <div class="skill-chip-list">
              ${category.skills.map((name) => `
                <button type="button" class="skill-chip" data-skill="${escapeHtml(name)}">
                  <span>${escapeHtml(name)}</span>
                  <small>${getSkillUsageCount(name)} projects</small>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>`;
}

const projectModal = document.getElementById('projectModal');
const projectModalContent = document.getElementById('projectModalContent');

function openProject(projectId, highlightedSkill = '') {
  const project = projects.find((item) => item.id === projectId);
  if (!project || !projectModal || !projectModalContent) return;
  const categoryLabels = { language: '言語', framework: 'フレームワーク', database: 'データベース', infrastructure: 'インフラ', ai: 'AI', other: 'その他' };
  projectModalContent.innerHTML = `
    <header class="project-detail-header">
      <p class="project-detail-kicker">PROJECT DETAIL</p>
      <h2 id="projectModalTitle">${escapeHtml(project.name)}</h2>
      <p>${escapeHtml(project.summary)}</p>
      ${highlightedSkill ? `<p class="skill-entry-note">Skillsから「${escapeHtml(highlightedSkill)}」の実績として開いています。</p>` : ''}
      <div class="tag-list">${project.skills.map((skill) => `<span class="${skill === highlightedSkill ? 'is-highlighted' : ''}">${escapeHtml(skill)}</span>`).join('')}</div>
    </header>
    <div class="project-detail-visual"><img src="images/${project.image}" alt="${escapeHtml(project.name)}"></div>
    <div class="project-detail-flow">
      <section><span>01</span><h3>課題</h3><p>${escapeHtml(project.problem)}</p></section>
      <section><span>02</span><h3>考えたこと</h3><p>${escapeHtml(project.approach)}</p></section>
      <section><span>03</span><h3>解決方法</h3><p>${escapeHtml(project.solution)}</p></section>
      <section><span>04</span><h3>結果・現在地</h3><p>${escapeHtml(project.result)}</p></section>
    </div>
    <section class="project-detail-section"><h3>工夫・挑戦</h3><ul>${project.challenges.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <section class="project-detail-section"><h3>使用技術</h3><div class="technology-groups">${Object.entries(project.categories).map(([key, values]) => `<div><span>${categoryLabels[key]}</span><strong>${values.map(escapeHtml).join(' / ')}</strong></div>`).join('')}</div></section>
  `;
  projectModal.classList.add('is-open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  projectModal.querySelector('.project-modal-close')?.focus();
}

function closeProject() {
  if (!projectModal) return;
  projectModal.classList.remove('is-open');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function openSkill(skill) {
  const featuredProjects = getFeaturedProjectsBySkill(skill);
  const relatedOtherProjects = getOtherProjectsBySkill(skill);
  if (!projectModal || !projectModalContent) return;

  projectModalContent.innerHTML = `
    <header class="project-detail-header skill-detail-header">
      <p class="project-detail-kicker">SKILL DETAIL</p>
      <h2 id="projectModalTitle">${escapeHtml(skill)}</h2>
      <p>${escapeHtml(skillDescriptions[skill] || '作品の実装を通して利用した技術です。')}</p>
      <p class="skill-experience-summary">
        代表作品 ${featuredProjects.length}件${relatedOtherProjects.length ? `・その他の作品 ${relatedOtherProjects.length}件` : ''}で使用
      </p>
    </header>

    <section class="skill-project-group" aria-labelledby="featuredSkillProjectsTitle">
      <div class="skill-project-group-heading">
        <p>FEATURED PROJECTS</p>
        <h3 id="featuredSkillProjectsTitle">代表作品での実績</h3>
      </div>
      <div class="skill-related-list">
        ${featuredProjects.map((project) => `<button type="button" data-project-id="${project.id}" data-highlight-skill="${escapeHtml(skill)}"><img src="images/${project.image}" alt=""><span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.summary)}</small></span><b>→</b></button>`).join('')}
      </div>
    </section>

    ${relatedOtherProjects.length ? `
      <section class="skill-project-group skill-other-projects" aria-labelledby="otherSkillProjectsTitle">
        <div class="skill-project-group-heading">
          <p>OTHER PROJECTS</p>
          <h3 id="otherSkillProjectsTitle">その他の使用実績</h3>
          <span>詳細説明は省き、制作経験として簡潔に掲載しています。</span>
        </div>
        <div class="skill-other-project-list">
          ${relatedOtherProjects.map((project) => `
            <article class="skill-other-project-item">
              <div>
                <span>${escapeHtml(project.type)}</span>
                <h4>${escapeHtml(project.name)}</h4>
                <p>${escapeHtml(project.summary)}</p>
              </div>
              <div class="skill-other-project-tags">
                ${project.skills.filter((name) => name !== skill).slice(0, 2).map((name) => `<span>${escapeHtml(name)}</span>`).join('')}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}`;

  projectModal.classList.add('is-open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

document.addEventListener('click', (event) => {
  const projectButton = event.target.closest('[data-project-id]');
  if (projectButton) {
    openProject(projectButton.dataset.projectId, projectButton.dataset.highlightSkill || '');
    return;
  }
  const skillButton = event.target.closest('[data-skill]');
  if (skillButton) openSkill(skillButton.dataset.skill);
  if (event.target.closest('[data-close-modal]')) closeProject();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeProject();
});

renderWorks();
renderSkills();

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