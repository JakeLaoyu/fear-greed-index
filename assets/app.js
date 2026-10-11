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
      dragHint: "Drag across the chart to select a range",
      dragHintTouch: "Slide to read values · press and hold, then drag to select a range",
      clearSel: "Clear selection",
      docTitle: "Fear & Greed Index",
      zonesTitle: "Time in each zone",
      distTitle: "Score distribution",
      heatTitle: "Monthly average",
      lowsTitle: "Monthly low",
      yearsTitle: "By year",
      yearsNote: "Box: middle 50% of days, line: median, whiskers: low and high.",
      longest: (n) => `longest run ${n} ${n === 1 ? "day" : "days"}`,
      streakNow: (z, n) => `In ${z} for ${n} trading ${n === 1 ? "day" : "days"} in a row`,
      streakEnd: (z, n) => `Ended on a run of ${n} trading ${n === 1 ? "day" : "days"} in ${z}`,
      pctile: (d, v, p, m) => `${d}: ${v}, higher than ${p}% of trading days in this range · median ${m}`,
      binDays: (n, p) => `${n} trading days · ${p}`,
      allHistory: "All history",
      zoomMonth: "click a month to zoom in",
      zoomMonthTouch: "tap a month twice to zoom in",
      zoomYear: "click a year to zoom in",
      zoomYearTouch: "tap a year twice to zoom in",
      avg: "Average",
      median: "Median",
      mid50: "Middle 50%",
      hi: "High",
      lo: "Low",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
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
      dragHint: "在图表上横向拖拽可选择区间",
      dragHintTouch: "滑动查看数值 · 长按后拖动选择区间",
      clearSel: "清除选择",
      docTitle: "恐慌与贪婪指数",
      zonesTitle: "各情绪区间占比",
      distTitle: "读数分布",
      heatTitle: "月度均值",
      lowsTitle: "月度最低值",
      yearsTitle: "年度分布",
      yearsNote: "箱体：中间 50% 的交易日，横线：中位数，须线：最低与最高。",
      longest: (n) => `最长连续 ${n} 天`,
      streakNow: (z, n) => `已连续 ${n} 个交易日处于${z}`,
      streakEnd: (z, n) => `区间结束时已连续 ${n} 个交易日处于${z}`,
      pctile: (d, v, p, m) => `${d} 读数 ${v}，高于本区间 ${p}% 的交易日 · 中位数 ${m}`,
      binDays: (n, p) => `${n} 个交易日 · ${p}`,
      allHistory: "全部历史",
      zoomMonth: "点击月份可放大查看",
      zoomMonthTouch: "连点两次月份可放大查看",
      zoomYear: "点击年份可放大查看",
      zoomYearTouch: "连点两次年份可放大查看",
      avg: "均值",
      median: "中位数",
      mid50: "中间 50%",
      hi: "最高",
      lo: "最低",
      months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
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
  const CUSTOM_RE = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
  let range = "1y";      // preset key, or "custom"
  let custom = null;     // [fromIso, toIso] when range === "custom"
  let chart = null;
  let dist = null;       // analytics charts
  let heat = null;
  let lows = null;
  let years = null;
  let hist = null;       // { months, years } summaries of the full history
  const coarseMq = window.matchMedia("(pointer: coarse)");
  let touchMode = coarseMq.matches;

  function readHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (RANGE_KEYS.includes(h)) return { range: h, custom: null };
    const m = h.match(CUSTOM_RE);
    if (m && m[1] < m[2]) return { range: "custom", custom: [m[1], m[2]] };
    return null;
  }
  {
    const h = readHash();
    if (h) ({ range, custom } = h);
  }

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

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hexToRgba(hex, a) {
    return `rgba(${hexToRgb(hex).join(",")},${a})`;
  }

  // Dark or white text, whichever contrasts more with the fill.
  function ink(hex) {
    const lin = (v) => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const [r, g, b] = hexToRgb(hex).map(lin);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return (L + 0.05) / 0.0575 >= 1.05 / (L + 0.05) ? "#11151c" : "#ffffff";
  }

  function bandOf(v) {
    let i = BANDS.length - 1;
    while (i > 0 && v < BANDS[i][0]) i--;
    return i;
  }

  // ---------- range ----------
  function localIso(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function sliceBetween(from, to) {
    return rows.filter((r) => r[0] >= from && r[0] <= to);
  }

  function currentSlice() {
    if (range === "custom" && custom) {
      const s = sliceBetween(custom[0], custom[1]);
      if (s.length >= 2) return s;
    }
    return sliceForRange(range === "custom" ? "1y" : range);
  }

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
    if (range === "custom" && custom) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "custom-chip";
      chip.setAttribute("aria-pressed", "true");
      chip.title = t.clearSel;
      chip.setAttribute("aria-label", `${custom[0]} – ${custom[1]}. ${t.clearSel}`);
      chip.innerHTML = `<span>${custom[0]} → ${custom[1]}</span><b aria-hidden="true">×</b>`;
      chip.addEventListener("click", clearCustom);
      nav.appendChild(chip);
    }
    $("hint").textContent = touchMode ? t.dragHintTouch : t.dragHint;

    const c = colors();
    const legend = BANDS.map(
      ([a, b], i) => `<li><i style="background:${c.bands[i]}"></i>${t.ratings[i]} ${a}–${b}</li>`
    ).join("");
    $("legend").innerHTML = legend;
    $("heat-legend").innerHTML = legend;
    $("lows-legend").innerHTML = legend;
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
        splitNumber: narrow ? 4 : 8,
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
      brush: {
        xAxisIndex: 0,
        brushType: "lineX",
        brushMode: "single",
        transformable: false,
        throttleType: "debounce",
        brushStyle: { color: hexToRgba(c.line, 0.18), borderColor: hexToRgba(c.line, 0.7), borderWidth: 1 },
        outOfBrush: { colorAlpha: 1 },
      },
      toolbox: { show: false, feature: { brush: { type: ["lineX"] } } },
    };
    // Merge (not replace) so the tooltip DOM survives re-renders; series and bands are replaced.
    chart.setOption(option, { replaceMerge: ["series"] });
    applyCursor();
  }

  // Mouse: dragging always selects (hover already shows values).
  // Touch: a plain slide reads values; press-and-hold, then drag, selects.
  function applyCursor() {
    chart.dispatchAction({
      type: "takeGlobalCursor",
      key: "brush",
      brushOption: touchMode ? { brushType: false } : { brushType: "lineX", brushMode: "single" },
    });
  }

  function commitSelection(a, b) {
    if (a > b) [a, b] = [b, a];
    const sel = sliceBetween(localIso(a), localIso(b));
    if (sel.length < 2) return; // a click or a tiny drag: ignore
    // Re-render after ECharts finishes handling this pointer event.
    chart.dispatchAction({ type: "hideTip" });
    setTimeout(() => setCustom(sel[0][0], sel[sel.length - 1][0]), 0);
  }

  // ---------- touch: long-press to select ----------
  const LONG_PRESS_MS = 380;
  const MOVE_TOLERANCE = 10;
  let press = null; // { x0, y0, timer, selecting, a, b }

  function touchPoint(e) {
    const t0 = e.touches[0] || e.changedTouches[0];
    const r = $("chart").getBoundingClientRect();
    return { x: t0.clientX - r.left, y: t0.clientY - r.top };
  }

  function xToTime(x) {
    const slice = currentSlice();
    const lo = new Date(slice[0][0] + "T00:00:00").getTime();
    const hi = new Date(slice[slice.length - 1][0] + "T00:00:00").getTime();
    const v = chart.convertFromPixel({ xAxisIndex: 0 }, x);
    return Math.min(hi, Math.max(lo, v));
  }

  function drawPress() {
    const a = Math.min(press.a, press.b);
    const b = Math.max(press.a, press.b);
    chart.dispatchAction({
      type: "brush",
      areas: [{ brushType: "lineX", xAxisIndex: 0, coordRange: [a, b] }],
    });
    $("hint").textContent = `${localIso(a)} → ${localIso(b)}`;
    $("hint").classList.add("live");
  }

  function endPress(commit) {
    if (!press) return;
    clearTimeout(press.timer);
    const p = press;
    press = null;
    $("chart").classList.remove("selecting");
    if (!p.selecting) return;
    chart.dispatchAction({ type: "brush", areas: [] });
    $("hint").classList.remove("live");
    $("hint").textContent = t.dragHintTouch;
    if (commit) commitSelection(p.a, p.b);
  }

  function initTouch() {
    const el = $("chart");
    const opts = { capture: true, passive: false };

    el.addEventListener("touchstart", (e) => {
      if (!touchMode || !rows.length) return;
      if (e.touches.length !== 1) { endPress(false); return; }
      const p = touchPoint(e);
      press = { x0: p.x, y0: p.y, selecting: false, a: 0, b: 0 };
      press.timer = setTimeout(() => {
        if (!press) return;
        press.selecting = true;
        press.a = press.b = xToTime(press.x0);
        el.classList.add("selecting");
        chart.dispatchAction({ type: "hideTip" });
        if (navigator.vibrate) navigator.vibrate(12);
        drawPress();
      }, LONG_PRESS_MS);
    }, opts);

    el.addEventListener("touchmove", (e) => {
      if (!press) return;
      const p = touchPoint(e);
      if (!press.selecting) {
        // Moved before the hold completed: it's a slide (read values) or a scroll.
        if (Math.hypot(p.x - press.x0, p.y - press.y0) > MOVE_TOLERANCE) endPress(false);
        return;
      }
      // Selecting: keep the page still and keep ECharts' tooltip out of it.
      e.preventDefault();
      e.stopPropagation();
      press.b = xToTime(p.x);
      drawPress();
    }, opts);

    const finish = (commit) => (e) => {
      if (press && press.selecting) e.stopPropagation();
      endPress(commit);
    };
    el.addEventListener("touchend", finish(true), opts);
    el.addEventListener("touchcancel", finish(false), opts);
    // Stop the long-press context menu / text callout on Android and iOS.
    el.addEventListener("contextmenu", (e) => { if (touchMode) e.preventDefault(); });
  }

  function onBrushEnd(params) {
    if (touchMode) return; // touch selections are committed by the long-press handler
    const area = params.areas && params.areas[0];
    chart.dispatchAction({ type: "brush", areas: [] }); // remove the drawn band
    if (!area || !area.coordRange) return;
    commitSelection(area.coordRange[0], area.coordRange[1]);
  }

  // ---------- analytics ----------
  const BIN = 5;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ARM_MS = 4000;
  let armed = null; // touch: { key, at } of the month or year tapped once, waiting for a second tap

  const pct = (x) => (x * 100).toFixed(1) + "%";

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
  }

  function summarize(key, list) {
    let sum = 0;
    let max = list[0];
    let min = list[0];
    for (const r of list) {
      sum += r[1];
      if (r[1] > max[1]) max = r;
      if (r[1] < min[1]) min = r;
    }
    const vals = list.map((r) => r[1]).sort((a, b) => a - b);
    return {
      key,
      n: list.length,
      mean: sum / list.length,
      min,
      max,
      q1: quantile(vals, 0.25),
      median: quantile(vals, 0.5),
      q3: quantile(vals, 0.75),
      from: list[0][0],
      to: list[list.length - 1][0],
    };
  }

  // Rows are sorted by date, so each month or year is one contiguous run.
  function groupBy(prefixLen) {
    const out = [];
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      const key = rows[start][0].slice(0, prefixLen);
      if (i === rows.length || rows[i][0].slice(0, prefixLen) !== key) {
        out.push(summarize(key, rows.slice(start, i)));
        start = i;
      }
    }
    return out;
  }

  function overlaps(g, slice) {
    return slice.length === rows.length || (g.to >= slice[0][0] && g.from <= slice[slice.length - 1][0]);
  }

  function tipStyle(c) {
    return {
      backgroundColor: c.card,
      borderColor: c.border,
      textStyle: { color: c.text, fontSize: 13 },
      confine: true,
    };
  }

  // Tooltip body: a heading, the zone of `v`, then label/value rows.
  function tipBody(c, head, v, lines) {
    const i = bandOf(v);
    return `<div style="font-family:var(--mono);color:${c.muted}">${head}</div>` +
      `<div style="display:flex;align-items:center;gap:6px;margin:4px 0 2px;font-weight:600">` +
      `<i style="width:10px;height:10px;border-radius:3px;background:${c.bands[i]}"></i>${t.ratings[i]}</div>` +
      lines.map(([k, val]) =>
        `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:2px">` +
        `<span style="color:${c.muted}">${k}</span><span style="font-family:var(--mono)">${val}</span></div>`
      ).join("");
  }

  function renderZones(slice) {
    const c = colors();
    const n = slice.length;
    const count = [0, 0, 0, 0, 0];
    const longest = [0, 0, 0, 0, 0];
    let run = 0;
    slice.forEach((r, i) => {
      run = i && slice[i - 1][2] === r[2] ? run + 1 : 1;
      count[r[2]]++;
      if (run > longest[r[2]]) longest[r[2]] = run;
    });
    const peak = Math.max(...count);
    $("zones").innerHTML = count.map((k, i) =>
      `<li><span class="z-name"><i style="background:${c.bands[i]}"></i>${t.ratings[i]}</span>` +
      `<span class="z-track"><b style="width:${(k / peak) * 100}%;background:${c.bands[i]}"></b></span>` +
      `<span class="z-pct">${pct(k / n)}</span>` +
      `<span class="z-sub">${t.days(k.toLocaleString("en-US"))}${k ? " · " + t.longest(longest[i]) : ""}</span></li>`
    ).join("");

    // The run the range ends on, counted back through the full history.
    const end = slice[n - 1];
    let j = rows.indexOf(end);
    const atLatest = j === rows.length - 1;
    let streak = 0;
    while (j >= 0 && rows[j][2] === end[2]) {
      streak++;
      j--;
    }
    $("zones-note").textContent = (atLatest ? t.streakNow : t.streakEnd)(t.ratings[end[2]], streak);
  }

  function renderDist(slice) {
    const c = colors();
    const narrow = window.innerWidth < 720;
    const mono = cssVar("--mono");
    const n = slice.length;
    const counts = new Array(100 / BIN).fill(0);
    for (const r of slice) counts[Math.min(counts.length - 1, Math.floor(r[1] / BIN))]++;
    const last = slice[n - 1];
    const below = slice.reduce((k, r) => k + (r[1] < last[1] ? 1 : 0), 0);
    const median = quantile(slice.map((r) => r[1]).sort((a, b) => a - b), 0.5);
    $("dist-note").textContent = t.pctile(last[0], fmt(last[1]), Math.round((below / n) * 100), fmt(median));

    dist.setOption({
      animation: false,
      grid: { left: narrow ? 38 : 44, right: 14, top: 24, bottom: 26 },
      tooltip: {
        ...tipStyle(c),
        trigger: "item",
        formatter: (p) => {
          const [a, b, share, k] = p.value;
          return tipBody(c, `${a}–${b}`, a, []) +
            `<div style="margin-top:2px;font-family:var(--mono)">${t.binDays(k.toLocaleString("en-US"), pct(share / 100))}</div>`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { lineStyle: { color: c.border } },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 12 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        splitNumber: 3,
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 12, formatter: (v) => `${v}%` },
        splitLine: { lineStyle: { color: c.grid } },
      },
      series: [
        {
          type: "custom",
          data: counts.map((k, i) => [i * BIN, (i + 1) * BIN, (k / n) * 100, k]),
          encode: { x: [0, 1], y: 2 },
          renderItem: (params, api) => {
            const cs = params.coordSys;
            const [x0, top] = api.coord([api.value(0), api.value(2)]);
            const [x1, base] = api.coord([api.value(1), 0]);
            const w = Math.max(1, Math.min(24, x1 - x0 - 2)); // 2px gap between bars
            return {
              type: "group",
              children: [
                // Full-height hit area, so short bars are easy to hover.
                {
                  type: "rect",
                  shape: { x: x0, y: cs.y, width: x1 - x0, height: cs.height },
                  style: { fill: "rgba(0,0,0,0)" },
                  emphasis: { style: { fill: hexToRgba(c.muted, 0.14) } },
                },
                {
                  type: "rect",
                  shape: { x: (x0 + x1 - w) / 2, y: top, width: w, height: base - top, r: [3, 3, 0, 0] },
                  style: { fill: c.line },
                },
              ],
            };
          },
          markArea: {
            silent: true,
            data: BANDS.map(([a, b], i) => [
              { xAxis: a, itemStyle: { color: hexToRgba(c.bands[i], c.bandAlpha) } },
              { xAxis: b },
            ]),
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: c.text, width: 1.5, type: "solid" },
            label: { color: c.text, fontFamily: mono, fontWeight: 600, formatter: fmt(last[1]) },
            data: [{ xAxis: last[1] }],
          },
        },
      ],
    }, { replaceMerge: ["series"] });
  }

  function heatLayout() {
    const rowH = window.innerWidth < 720 ? 22 : 26;
    const h = `${hist.years.length * rowH + 28}px`;
    $("heat").style.height = h;
    $("lows").style.height = h;
  }

  // Month-by-year heatmap colored by one value per month: its average ("mean")
  // or its lowest daily reading ("low").
  function renderHeat(ch, slice, metric) {
    const c = colors();
    const narrow = window.innerWidth < 720;
    const mono = cssVar("--mono");
    const yearKeys = hist.years.map((y) => y.key);
    const full = slice.length === rows.length;
    const valueOf = metric === "low" ? (m) => m.min[1] : (m) => m.mean;
    ch.setOption({
      animation: false,
      grid: { left: narrow ? 38 : 46, right: 2, top: 24, bottom: 2 },
      tooltip: {
        ...tipStyle(c),
        trigger: "item",
        formatter: (p) => {
          const m = hist.months[p.dataIndex];
          const avg = [t.avg, fmt(m.mean)];
          const hi = [t.hi, `${fmt(m.max[1])} · ${m.max[0].slice(5)}`];
          const lo = [t.lo, `${fmt(m.min[1])} · ${m.min[0].slice(5)}`];
          // The value the cell is colored by comes first.
          const lines = metric === "low" ? [lo, avg, hi] : [avg, hi, lo];
          return tipBody(c, m.key, valueOf(m), [...lines, ["", t.days(m.n)]]);
        },
      },
      xAxis: {
        type: "category",
        position: "top",
        data: t.months,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: narrow ? 10 : 12, interval: 0 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: yearKeys,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 12, fontFamily: mono },
        splitLine: { show: false },
      },
      series: [
        {
          type: "custom",
          data: hist.months.map((m) => [Number(m.key.slice(5)) - 1, yearKeys.indexOf(m.key.slice(0, 4)), valueOf(m)]),
          encode: { x: 0, y: 1 },
          renderItem: (params, api) => {
            const m = hist.months[params.dataIndex];
            const v = valueOf(m);
            const [cx, cy] = api.coord([api.value(0), api.value(1)]);
            const [w, h] = api.size([1, 1]);
            const fill = c.bands[bandOf(v)];
            // Outline the months in the selected range (all of them for "All" is just noise).
            const picked = !full && overlaps(m, slice);
            return {
              type: "rect",
              shape: { x: cx - w / 2 + 1, y: cy - h / 2 + 1, width: w - 2, height: h - 2, r: 3 },
              style: { fill, stroke: picked ? c.text : null, lineWidth: 2 },
              emphasis: { style: { stroke: c.text, lineWidth: 2 } },
              textContent: w >= 24 ? {
                style: { text: String(Math.round(v)), fill: ink(fill), font: `600 ${narrow ? 10 : 12}px ${mono}` },
              } : undefined,
              textConfig: { position: "inside" },
            };
          },
        },
      ],
    }, { replaceMerge: ["series"] });
  }

  function renderYears(slice) {
    const c = colors();
    const narrow = window.innerWidth < 720;
    years.setOption({
      animation: false,
      grid: { left: narrow ? 34 : 52, right: narrow ? 8 : 16, top: 12, bottom: 28 },
      tooltip: {
        ...tipStyle(c),
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: hexToRgba(c.muted, 0.14) } },
        formatter: (ps) => {
          const y = hist.years[ps[0].dataIndex];
          return tipBody(c, y.key, y.mean, [
            [t.avg, fmt(y.mean)],
            [t.median, fmt(y.median)],
            [t.mid50, `${fmt(y.q1)}–${fmt(y.q3)}`],
            [t.hi, `${fmt(y.max[1])} · ${y.max[0].slice(5)}`],
            [t.lo, `${fmt(y.min[1])} · ${y.min[0].slice(5)}`],
            ["", t.days(y.n)],
          ]);
        },
      },
      xAxis: {
        type: "category",
        data: hist.years.map((y) => y.key),
        axisLine: { lineStyle: { color: c.border } },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 12 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { color: c.muted, fontSize: narrow ? 11 : 12 },
        splitLine: { lineStyle: { color: c.grid } },
      },
      series: [
        {
          type: "boxplot",
          // Years in the selected range in the accent color, the rest in gray.
          data: hist.years.map((y) => {
            const on = overlaps(y, slice);
            return {
              value: [y.min[1], y.q1, y.median, y.q3, y.max[1]],
              itemStyle: on
                ? { color: hexToRgba(c.line, 0.3), borderColor: c.line }
                : { color: hexToRgba(c.muted, 0.1), borderColor: hexToRgba(c.muted, 0.55) },
            };
          }),
          boxWidth: [6, 24],
          itemStyle: { borderWidth: 1.5 },
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
    }, { replaceMerge: ["series"] });
  }

  function renderAnalytics(slice) {
    const span = `${slice[0][0]} → ${slice[slice.length - 1][0]}`;
    $("zones-sub").textContent = span;
    $("dist-sub").textContent = span;
    $("heat-sub").textContent = `${t.allHistory} · ${touchMode ? t.zoomMonthTouch : t.zoomMonth}`;
    $("lows-sub").textContent = $("heat-sub").textContent;
    $("years-sub").textContent = `${t.allHistory} · ${touchMode ? t.zoomYearTouch : t.zoomYear}`;
    renderZones(slice);
    renderDist(slice);
    renderHeat(heat, slice, "mean");
    renderHeat(lows, slice, "low");
    renderYears(slice);
  }

  // Clicking a month or year zooms the main chart to it. On touch the first tap
  // only shows the tooltip, so reading a value doesn't change the range; the
  // second tap must land on the same cell within ARM_MS.
  function zoomTo(key, from, to) {
    const now = Date.now();
    if (touchMode && (!armed || armed.key !== key || now - armed.at > ARM_MS)) {
      armed = { key, at: now };
      return;
    }
    armed = null;
    if (sliceBetween(from, to).length < 2) return;
    setCustom(from, to);
    const nav = $("ranges");
    if (nav.getBoundingClientRect().top < 0) {
      nav.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    }
  }

  function initAnalytics() {
    dist = echarts.init($("dist"), null, { renderer: "canvas" });
    heat = echarts.init($("heat"), null, { renderer: "canvas" });
    lows = echarts.init($("lows"), null, { renderer: "canvas" });
    years = echarts.init($("years"), null, { renderer: "canvas" });
    [heat, lows].forEach((ch) => ch.on("click", (p) => {
      const m = hist.months[p.dataIndex];
      // Per chart, so a tap on each heatmap doesn't count as a double tap.
      zoomTo(`${ch.getDom().id}:${m.key}`, m.from, m.to);
    }));
    // Anywhere in a year's column counts, not just the box.
    years.getZr().on("click", (e) => {
      const at = [e.offsetX, e.offsetY];
      if (!hist || !years.containPixel("grid", at)) return;
      const y = hist.years[Math.round(years.convertFromPixel({ xAxisIndex: 0 }, at[0]))];
      if (y) zoomTo(y.key, y.from, y.to);
    });
  }

  function resizeAnalytics() {
    heatLayout();
    [dist, heat, lows, years].forEach((ch) => ch.resize());
  }

  function renderAll() {
    armed = null; // a range, language or theme change starts over
    renderStatic();
    renderHeader();
    const slice = currentSlice();
    renderStats(slice);
    renderChart(slice);
    renderAnalytics(slice);
  }

  let lastPreset = range === "custom" ? "1y" : range;

  function setHash(h) {
    if (location.hash.slice(1) !== h) history.replaceState(null, "", "#" + h);
  }

  function setRange(k) {
    range = k;
    custom = null;
    lastPreset = k;
    setHash(k);
    renderAll();
  }

  function setCustom(from, to) {
    range = "custom";
    custom = [from, to];
    setHash(`${from}..${to}`);
    renderAll();
  }

  function clearCustom() {
    setRange(lastPreset);
  }

  // ---------- boot ----------
  chart = echarts.init($("chart"), null, { renderer: "canvas" });
  chart.on("brushEnd", onBrushEnd);
  initTouch();
  initAnalytics();
  const onPointerType = () => {
    touchMode = coarseMq.matches;
    endPress(false);
    if (rows.length) renderAll();
  };
  if (coarseMq.addEventListener) coarseMq.addEventListener("change", onPointerType);
  else if (coarseMq.addListener) coarseMq.addListener(onPointerType);
  renderStatic();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && range === "custom") clearCustom();
  });

  $("lang-toggle").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    t = I18N[lang];
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
    renderAll();
  });

  window.addEventListener("hashchange", () => {
    const h = readHash();
    if (!h) return;
    if (h.range === "custom") {
      if (!custom || h.custom[0] !== custom[0] || h.custom[1] !== custom[1]) setCustom(h.custom[0], h.custom[1]);
    } else if (h.range !== range) {
      setRange(h.range);
    }
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      chart.resize();
      if (!rows.length) return;
      resizeAnalytics();
      const slice = currentSlice();
      renderChart(slice);
      renderAnalytics(slice);
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
      hist = { months: groupBy(7), years: groupBy(4) };
      resizeAnalytics();
      renderAll();
    })
    .catch(() => {
      $("meta").textContent = t.loadError;
    });
})();
