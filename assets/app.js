(() => {
  "use strict";

  // ---------- i18n ----------
  const I18N = {
    en: {
      title: "Fear & Greed Index",
      meta: (a, b, n) => `${a} to ${b} · ${n} trading days`,
      ranges: { "1m": "1M", "3m": "3M", "6m": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y", "10y": "10Y", all: "All" },
      mean: "Average",
      high: "High",
      low: "Low",
      change: "Change",
      days: (n) => `${n} trading days`,
      since: (d) => `since ${d}`,
      ratings: ["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"],
      source: "Data",
      updated: (d) => `Updated ${d}`,
      disclaimer: "For informational purposes only. Not investment advice.",
      loadError: "Failed to load data.",
      otherLang: "中文",
      docTitle: "Fear & Greed Index",
    },
    zh: {
      title: "恐慌与贪婪指数",
      meta: (a, b, n) => `${a} 至 ${b} · 共 ${n} 个交易日`,
      ranges: { "1m": "1 个月", "3m": "3 个月", "6m": "6 个月", "1y": "1 年", "2y": "2 年", "5y": "5 年", "10y": "10 年", all: "全部" },
      mean: "区间均值",
      high: "区间最高",
      low: "区间最低",
      change: "区间变化",
      days: (n) => `${n} 个交易日`,
      since: (d) => `自 ${d}`,
      ratings: ["极度恐慌", "恐慌", "中性", "贪婪", "极度贪婪"],
      source: "数据来源",
      updated: (d) => `更新于 ${d}`,
      disclaimer: "仅供参考，不构成投资建议。",
      loadError: "数据加载失败。",
      otherLang: "English",
      docTitle: "恐慌与贪婪指数",
    },
  };

  const LANG_KEY = "fgi-lang";
  const RANGE_KEYS = ["1m", "3m", "6m", "1y", "2y", "5y", "10y", "all"];
  const RANGE_MONTHS = { "1m": 1, "3m": 3, "6m": 6, "1y": 12, "2y": 24, "5y": 60, "10y": 120 };
  const BANDS = [
    [0, 25],
    [25, 45],
    [45, 55],
    [55, 75],
    [75, 100],
  ];

  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && I18N[saved]) return saved;
    } catch (_) { /* storage unavailable */ }
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (const l of langs) {
      const code = String(l).toLowerCase();
      if (code.startsWith("zh")) return "zh";
      if (code.startsWith("en")) return "en";
    }
    return "en";
  }

  let lang = detectLang();
  let t = I18N[lang];

  // ---------- state ----------
  let rows = [];       // [date, score, ratingIdx]
  let generatedAt = "";
  let range = RANGE_KEYS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "1y";
  let chart = null;

  const $ = (id) => document.getElementById(id);
  const fmt = (v) => v.toFixed(1);

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function colors() {
    return {
      bands: [0, 1, 2, 3, 4].map((i) => cssVar(`--c${i}`)),
      line: cssVar("--line"),
      text: cssVar("--text"),
      muted: cssVar("--muted"),
      grid: cssVar("--grid"),
      card: cssVar("--card"),
      border: cssVar("--border"),
      bandAlpha: parseFloat(cssVar("--band-alpha")) || 0.12,
    };
  }

  function hexToRgba(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- range ----------
  function sliceForRange(key) {
    if (key === "all" || !rows.length) return rows;
    const last = new Date(rows[rows.length - 1][0] + "T00:00:00Z");
    const start = new Date(last);
    start.setUTCMonth(start.getUTCMonth() - RANGE_MONTHS[key]);
    const startIso = start.toISOString().slice(0, 10);
    let i = rows.findIndex((r) => r[0] >= startIso);
    if (i < 0) i = 0;
    return rows.slice(i);
  }

  // ---------- render ----------
  function renderStatic() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t.docTitle;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = t[el.dataset.i18n];
      if (typeof v === "string") el.textContent = v;
    });
    $("lang-toggle").textContent = t.otherLang;

    const nav = $("ranges");
    nav.innerHTML = "";
    RANGE_KEYS.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t.ranges[k];
      b.setAttribute("aria-pressed", String(k === range));
      b.addEventListener("click", () => setRange(k));
      nav.appendChild(b);
    });

    const c = colors();
    $("legend").innerHTML = BANDS.map(
      ([a, b], i) => `<li><i style="background:${c.bands[i]}"></i>${t.ratings[i]} ${a}–${b}</li>`
    ).join("");
  }

  function renderHeader() {
    if (!rows.length) return;
    const first = rows[0];
    const last = rows[rows.length - 1];
    $("meta").textContent = t.meta(first[0], last[0], rows.length.toLocaleString("en-US"));
    $("now-value").textContent = fmt(last[1]);
    const badge = $("now-badge");
    badge.textContent = t.ratings[last[2]];
    badge.style.background = colors().bands[last[2]];
    if (generatedAt) $("updated").textContent = t.updated(generatedAt.slice(0, 10));
  }

  function renderStats(slice) {
    if (!slice.length) return;
    let sum = 0;
    let max = slice[0];
    let min = slice[0];
    for (const r of slice) {
      sum += r[1];
      if (r[1] > max[1]) max = r;
      if (r[1] < min[1]) min = r;
    }
    const chg = slice[slice.length - 1][1] - slice[0][1];
    $("s-mean").textContent = fmt(sum / slice.length);
    $("s-mean-sub").textContent = t.days(slice.length.toLocaleString("en-US"));
    $("s-max").textContent = fmt(max[1]);
    $("s-max-sub").textContent = max[0];
    $("s-min").textContent = fmt(min[1]);
    $("s-min-sub").textContent = min[0];
    $("s-chg").textContent = (chg > 0 ? "+" : chg < 0 ? "−" : "") + fmt(Math.abs(chg));
    $("s-chg-sub").textContent = t.since(slice[0][0]);
  }

  function renderChart(slice) {
    const c = colors();
    const narrow = window.innerWidth < 720;
    const option = {
      animation: false,
      grid: { left: narrow ? 34 : 52, right: narrow ? 22 : 32, top: 18, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: c.card,
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 13 },
        axisPointer: { type: "line", lineStyle: { color: c.muted, type: "dashed" } },
        formatter: (params) => {
          const p = params[0];
          const r = slice[p.dataIndex];
          if (!r) return "";
          return `<div style="font-family:var(--mono);color:${c.muted}">${r[0]}</div>` +
            `<div style="margin-top:4px"><b style="font-family:var(--mono);font-size:16px">${fmt(r[1])}</b>` +
            ` <span style="color:${c.bands[r[2]]};font-weight:600">${t.ratings[r[2]]}</span></div>`;
        },
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLine: { lineStyle: { color: c.border } },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          fontSize: narrow ? 11 : 13,
          hideOverlap: true,
          formatter: {
            year: "{yyyy}",
            month: "{yyyy}-{MM}",
            day: "{MM}-{dd}",
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 13 },
        splitLine: { lineStyle: { color: c.grid } },
      },
      series: [
        {
          type: "line",
          data: slice.map((r) => [r[0], r[1]]),
          showSymbol: false,
          symbolSize: 6,
          lineStyle: { color: c.line, width: 2 },
          itemStyle: { color: c.line },
          emphasis: { disabled: true },
          markArea: {
            silent: true,
            data: BANDS.map(([a, b], i) => [
              { yAxis: a, itemStyle: { color: hexToRgba(c.bands[i], c.bandAlpha) } },
              { yAxis: b },
            ]),
          },
        },
      ],
    };
    chart.setOption(option, true);
  }

  function renderAll() {
    renderStatic();
    renderHeader();
    const slice = sliceForRange(range);
    renderStats(slice);
    renderChart(slice);
  }

  function setRange(k) {
    range = k;
    if (location.hash.slice(1) !== k) history.replaceState(null, "", "#" + k);
    renderAll();
  }

  // ---------- boot ----------
  chart = echarts.init($("chart"), null, { renderer: "canvas" });
  renderStatic();

  $("lang-toggle").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    t = I18N[lang];
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
    renderAll();
  });

  window.addEventListener("hashchange", () => {
    const k = location.hash.slice(1);
    if (RANGE_KEYS.includes(k) && k !== range) setRange(k);
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      chart.resize();
      if (rows.length) renderChart(sliceForRange(range));
    }, 120);
  });

  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onScheme = () => rows.length && renderAll();
  if (mq.addEventListener) mq.addEventListener("change", onScheme);
  else if (mq.addListener) mq.addListener(onScheme);

  fetch("data/fear-greed.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then((json) => {
      rows = json.data;
      generatedAt = json.generated_at || "";
      renderAll();
    })
    .catch(() => {
      $("meta").textContent = t.loadError;
    });
})();
