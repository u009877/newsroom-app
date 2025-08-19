import React, { useEffect, useMemo, useState } from "react";

/**
 * 편집부 신문/뉴스레터 웹사이트 — 단일 파일 React 앱
 * - 기사 게시, 검색/태그, 뉴스레터 아카이브, 구독 폼(메일to), 에디터(로컬 스토리지 저장)
 * - JSON 내보내기/가져오기 지원 → 백업 및 서버 이관 용이
 * - Tailwind를 사용한 심플한 UI (프로젝트에 Tailwind가 없는 경우 기본 스타일로도 동작)
 *
 * 배포: 이 파일을 index.jsx로 저장 → Vite 또는 CRA로 빌드해서 Netlify/GitHub Pages 배포
 */

// ---------- 유틸 ----------
const STORAGE_KEYS = {
  articles: "club_articles",
  newsletters: "club_newsletters",
};

const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);

const defaultArticles = [
  {
    id: cryptoRandomId(),
    title: "창간호: 우리 편집부의 약속",
    author: "편집국장",
    date: fmtDate(new Date()),
    category: "사설",
    tags: ["창간", "비전"],
    summary:
      "편집부 창간호를 맞아 학생들이 만든 신문이 어떤 가치를 지향할지 전합니다.",
    content:
      `# 창간호

우리 편집부는 **기록**과 **검증**을 소명으로 삼습니다.\n\n- 더 정확하게\n- 더 빠르게\n- 더 책임있게\n\n독자 여러분의 제보와 비판을 기다립니다.`,
    cover: "",
  },
  {
    id: cryptoRandomId(),
    title: "캠퍼스 식단, 가격은 올랐는데 품질은?",
    author: "사회부",
    date: fmtDate(new Date(Date.now() - 86400000 * 3)),
    category: "사회",
    tags: ["캠퍼스", "식단", "물가"],
    summary: "학생식당 가격 인상 이후 품질 논란을 짚었습니다.",
    content:
      `학생식당이 최근 가격을 인상했습니다. 학생 설문 *412명* 중 67%가 \"가격 대비 품질이 아쉽다\"고 응답했습니다. 요일별 메뉴와 대체 식단 제안 등을 기사에서 다룹니다.`,
    cover:
      "",
  },
];

const defaultNewsletters = [
  {
    id: cryptoRandomId(),
    title: "주간 편집노트 #1",
    date: fmtDate(new Date()),
    highlight: "창간호 비하인드 & 취재 일정 공개",
    content:
      "이번 주에는 창간호 제작기, 다음 호 취재 일정, 독자 질문 모음을 담았습니다.",
  },
];

function cryptoRandomId() {
  // 브라우저 crypto가 없으면 fallback
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => n.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clsx(...args) {
  return args.filter(Boolean).join(" ");
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

// 매우 가벼운 마크다운 렌더 (굵게/기울임/제목/리스트/링크 정도)
function miniMarkdown(md = "") {
  let html = md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/\n- (.*)/gim, "<ul><li>$1</li></ul>")
    .replace(/\n\n/g, "<br/>\n");
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noreferrer">$1<\/a>');
  // 연속된 <ul> 정리
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  return html;
}

// ---------- 컴포넌트 ----------
function Header({ view, setView }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗞️</span>
          <h1 className="text-xl font-bold">편집부 뉴스룸</h1>
        </div>
        <nav className="flex items-center gap-2">
          {[
            ["home", "홈"],
            ["articles", "기사"],
            ["newsletters", "뉴스레터"],
            ["editor", "에디터"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-sm",
                view === k ? "bg-black text-white" : "hover:bg-gray-100"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SearchBar({ query, setQuery, tag, setTag, categories }) {
  return (
    <div className="flex flex-col md:flex-row gap-2 md:items-center">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목/본문/기자 검색"
        className="w-full md:flex-1 px-3 py-2 rounded-xl border"
      />
      <select
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="px-3 py-2 rounded-xl border"
      >
        <option value="">태그 전체</option>
        {categories.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

function ArticleCard({ article, onOpen }) {
  return (
    <article
      className="rounded-2xl border hover:shadow-md transition p-4 bg-white"
      onClick={() => onOpen(article)}
      role="button"
    >
      <div className="flex gap-4">
        {article.cover ? (
          <img
            src={article.cover}
            alt="cover"
            className="w-28 h-28 object-cover rounded-xl border"
          />
        ) : (
          <div className="w-28 h-28 rounded-xl border grid place-content-center text-3xl">
            📰
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg line-clamp-2">{article.title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {article.author} · {fmtDate(article.date)} · {article.category}
          </p>
          <p className="text-sm mt-2 line-clamp-2">{article.summary}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {article.tags?.map((t) => (
              <span
                key={t}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded-full"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="max-w-3xl w-full max-h-[85vh] overflow-auto rounded-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="ml-auto block mb-3 text-sm px-2 py-1 rounded-lg border hover:bg-gray-50"
          onClick={onClose}
        >
          닫기
        </button>
        {children}
      </div>
    </div>
  );
}

function ArticleViewer({ article }) {
  if (!article) return null;
  return (
    <div>
      <h2 className="text-2xl font-bold">{article.title}</h2>
      <p className="text-sm text-gray-600 mt-1">
        {article.author} · {fmtDate(article.date)} · {article.category}
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {article.tags?.map((t) => (
          <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            #{t}
          </span>
        ))}
      </div>
      {article.cover && (
        <img src={article.cover} alt="cover" className="w-full mt-4 rounded-xl border" />
      )}
      <div
        className="prose max-w-none mt-6"
        dangerouslySetInnerHTML={{ __html: miniMarkdown(article.content) }}
      />
    </div>
  );
}

function ArticlesPage({ articles, setArticles }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const categories = useMemo(() => {
    const s = new Set();
    articles.forEach((a) => a.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) =>
        !q
          ? true
          : [a.title, a.author, a.summary, a.content, a.category, a.tags?.join(" ")]
              .filter(Boolean)
              .some((v) => v.toLowerCase().includes(q))
      )
      .filter((a) => (tag ? a.tags?.includes(tag) : true))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [articles, query, tag]);

  const onOpen = (a) => {
    setCurrent(a);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <SearchBar
        query={query}
        setQuery={setQuery}
        tag={tag}
        setTag={setTag}
        categories={categories}
      />
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((a) => (
          <ArticleCard key={a.id} article={a} onOpen={onOpen} />)
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ArticleViewer article={current} />
        <div className="mt-6 flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            onClick={() => {
              const ok = confirm("이 기사를 삭제할까요?");
              if (!ok) return;
              setArticles((prev) => prev.filter((x) => x.id !== current.id));
              setOpen(false);
            }}
          >
            기사 삭제
          </button>
          <button
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("페이지 주소를 복사했어요. 배포 후 공유하세요!");
            }}
          >
            링크 복사
          </button>
        </div>
      </Modal>
    </div>
  );
}

function NewslettersPage({ newsletters, setNewsletters }) {
  const sorted = [...newsletters].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">뉴스레터 아카이브</h2>
        <a
          href="mailto:editor@example.com?subject=뉴스레터%20구독신청&body=이름과%20학번/부서를%20적어주세요"
          className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
        >
          구독 신청(메일)
        </a>
      </div>
      <ul className="space-y-2">
        {sorted.map((n) => (
          <li key={n.id} className="rounded-2xl border p-4 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{n.title}</h3>
                <p className="text-sm text-gray-600">{fmtDate(n.date)}</p>
                <p className="text-sm mt-2">{n.highlight}</p>
              </div>
              <details className="ml-auto">
                <summary className="px-3 py-1 rounded-lg border hover:bg-gray-50 cursor-pointer text-sm">
                  내용 보기
                </summary>
                <div className="mt-3 text-sm max-w-md">
                  {n.content}
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageToDataUrl({ label, value, onChange }) {
  const [preview, setPreview] = useState(value || "");
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-700">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            setPreview(dataUrl);
            onChange?.(dataUrl);
          };
          reader.readAsDataURL(file);
        }}
        className="block"
      />
      {preview && (
        <img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-xl border" />
      )}
    </div>
  );
}

function EditorPage({ articles, setArticles, newsletters, setNewsletters }) {
  const emptyArticle = {
    id: cryptoRandomId(),
    title: "",
    author: "",
    date: fmtDate(new Date()),
    category: "일반",
    tags: [],
    summary: "",
    content: "",
    cover: "",
  };

  const [draft, setDraft] = useState(emptyArticle);
  const [tagInput, setTagInput] = useState("");

  const [letter, setLetter] = useState({
    id: cryptoRandomId(),
    title: "",
    date: fmtDate(new Date()),
    highlight: "",
    content: "",
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (draft.tags.includes(t)) return;
    setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
    setTagInput("");
  };

  const exportAll = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { articles, newsletters },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsroom-export-${fmtDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.articles)) setArticles(data.articles);
        if (Array.isArray(data.newsletters)) setNewsletters(data.newsletters);
        alert("가져오기가 완료되었습니다.");
      } catch (e) {
        alert("가져오기 실패: JSON 형식을 확인하세요.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* 기사 작성 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">기사 작성</h2>
        <div className="grid gap-3">
          <input
            className="px-3 py-2 rounded-xl border"
            placeholder="제목"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="기자"
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            />
            <input
              type="date"
              className="px-3 py-2 rounded-xl border"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-xl border"
              placeholder="카테고리 (예: 사회/문화/스포츠/사설)"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                className="px-3 py-2 rounded-xl border w-full"
                placeholder="태그 입력 후 +"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
              <button className="px-3 rounded-xl border" onClick={addTag}>
                +
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                #{t}
                <button
                  className="ml-1 text-gray-500"
                  onClick={() =>
                    setDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== t) }))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <textarea
            className="px-3 py-2 rounded-xl border min-h-[60px]"
            placeholder="요약"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          />
          <ImageToDataUrl
            label="대표 이미지 (선택)"
            value={draft.cover}
            onChange={(dataUrl) => setDraft({ ...draft, cover: dataUrl })}
          />
          <textarea
            className="px-3 py-2 rounded-xl border min-h-[160px] font-mono"
            placeholder={"본문 (간단한 마크다운 지원: #, ##, **굵게**, *기울임*, - 목록, [링크](https://))"}
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-black text-white"
              onClick={() => {
                if (!draft.title || !draft.author) {
                  alert("제목과 기자를 입력하세요.");
                  return;
                }
                setArticles((prev) => [{ ...draft, id: cryptoRandomId() }, ...prev]);
                setDraft({ ...emptyArticle, id: cryptoRandomId() });
                alert("기사가 게시되었습니다.");
              }}
            >
              게시하기
            </button>
            <button
              className="px-4 py-2 rounded-xl border"
              onClick={() => setDraft({ ...emptyArticle, id: cryptoRandomId() })}
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      {/* 뉴스레터 작성 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">뉴스레터 작성</h2>
        <div className="grid gap-3">
          <input
            className="px-3 py-2 rounded-xl border"
            placeholder="제목"
            value={letter.title}
            onChange={(e) => setLetter({ ...letter, title: e.target.value })}
          />
          <input
            type="date"
            className="px-3 py-2 rounded-xl border"
            value={letter.date}
            onChange={(e) => setLetter({ ...letter, date: e.target.value })}
          />
          <input
            className="px-3 py-2 rounded-xl border"
            placeholder="하이라이트 (요약)"
            value={letter.highlight}
            onChange={(e) => setLetter({ ...letter, highlight: e.target.value })}
          />
          <textarea
            className="px-3 py-2 rounded-xl border min-h-[160px]"
            placeholder="본문"
            value={letter.content}
            onChange={(e) => setLetter({ ...letter, content: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-black text-white"
              onClick={() => {
                if (!letter.title) {
                  alert("제목을 입력하세요.");
                  return;
                }
                setNewsletters((prev) => [{ ...letter, id: cryptoRandomId() }, ...prev]);
                setLetter({ id: cryptoRandomId(), title: "", date: fmtDate(new Date()), highlight: "", content: "" });
                alert("뉴스레터가 추가되었습니다.");
              }}
            >
              추가하기
            </button>
            <button className="px-4 py-2 rounded-xl border" onClick={() => exportAll()}>
              JSON 내보내기
            </button>
            <label className="px-4 py-2 rounded-xl border cursor-pointer">
              JSON 가져오기
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importAll(f);
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

function Home({ articles, newsletters, setView }) {
  const latest = [...articles].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-5 bg-white">
        <h2 className="text-xl font-semibold mb-2">헤드라인</h2>
        {latest ? (
          <div className="flex flex-col md:flex-row gap-4">
            {latest.cover ? (
              <img src={latest.cover} alt="cover" className="w-full md:w-64 h-40 object-cover rounded-xl border" />
            ) : (
              <div className="w-full md:w-64 h-40 rounded-xl border grid place-content-center text-4xl">📰</div>
            )}
            <div>
              <h3 className="text-2xl font-bold">{latest.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {latest.author} · {fmtDate(latest.date)} · {latest.category}
              </p>
              <p className="mt-3">{latest.summary}</p>
              <div className="mt-4">
                <button
                  className="px-4 py-2 rounded-xl bg-black text-white"
                  onClick={() => setView("articles")}
                >
                  전체 기사 보기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>아직 기사가 없습니다. 에디터에서 첫 기사를 등록하세요.</p>
        )}
      </section>
      <section className="rounded-2xl border p-5 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">최신 뉴스레터</h2>
          <button className="px-3 py-1.5 rounded-xl border" onClick={() => setView("newsletters")}>
            모두 보기
          </button>
        </div>
        <ul className="mt-3 grid md:grid-cols-2 gap-3">
          {[...newsletters]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4)
            .map((n) => (
              <li key={n.id} className="rounded-2xl border p-4">
                <h3 className="font-semibold">{n.title}</h3>
                <p className="text-sm text-gray-600">{fmtDate(n.date)}</p>
                <p className="text-sm mt-1">{n.highlight}</p>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export default function NewsroomApp() {
  const [view, setView] = useState("home");
  const [articles, setArticles] = useState(() => load(STORAGE_KEYS.articles, defaultArticles));
  const [newsletters, setNewsletters] = useState(() => load(STORAGE_KEYS.newsletters, defaultNewsletters));

  useEffect(() => save(STORAGE_KEYS.articles, articles), [articles]);
  useEffect(() => save(STORAGE_KEYS.newsletters, newsletters), [newsletters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header view={view} setView={setView} />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-2xl border p-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-sm opacity-80">학생이 만드는, 학생을 위한</p>
              <h2 className="text-lg font-semibold">편집부 신문 & 뉴스레터</h2>
            </div>
            <div className="flex gap-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.querySelector("footer");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3 py-1.5 rounded-xl border border-white/30 hover:bg-white/10 text-sm"
              >
                연락/문의
              </a>
            </div>
          </div>
        </div>

        {view === "home" && (
          <Home articles={articles} newsletters={newsletters} setView={setView} />
        )}
        {view === "articles" && (
          <ArticlesPage articles={articles} setArticles={setArticles} />
        )}
        {view === "newsletters" && (
          <NewslettersPage newsletters={newsletters} setNewsletters={setNewsletters} />
        )}
        {view === "editor" && (
          <EditorPage
            articles={articles}
            setArticles={setArticles}
            newsletters={newsletters}
            setNewsletters={setNewsletters}
          />
        )}
      </main>

      <footer className="border-t mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p>© {new Date().getFullYear()} 편집부. All rights reserved.</p>
            <p>
              문의: <a className="underline" href="mailto:editor@example.com">editor@example.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
