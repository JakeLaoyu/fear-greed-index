# Fear & Greed Index

[![Update data](https://github.com/JakeLaoyu/fear-greed-index/actions/workflows/update-data.yml/badge.svg)](https://github.com/JakeLaoyu/fear-greed-index/actions/workflows/update-data.yml)
[![Deploy Pages](https://github.com/JakeLaoyu/fear-greed-index/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/JakeLaoyu/fear-greed-index/actions/workflows/deploy-pages.yml)

**Live: https://jakelaoyu.github.io/fear-greed-index/**

[English](#english) · [中文](#中文)

---

## English

An interactive chart of the CNN Fear & Greed Index from 2011 to today, updated automatically every US trading day.

- Time ranges: 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y and All (the selected range is kept in the URL hash, e.g. `#2y`, so it can be shared)
- Stats for the selected range: average, high, low and change
- Drag across the chart to select any custom range; the chart zooms in and the stats follow. Press ✕ or Esc to go back, and share it as a link like `#2020-02-01..2020-04-30`
- On phones, slide a finger along the chart to read values; press and hold, then drag, to select a range
- Colored sentiment bands: Extreme Fear / Fear / Neutral / Greed / Extreme Greed
- English and Chinese, chosen from the browser language (English by default)
- Dark and light themes that follow the system, and a layout that works on phones
- A plain static site: no build step, no framework

### How it works

```
whit3rabbit/fear-greed-data  ──(fear-greed.csv)──▶  scripts/update_data.py  ──▶  data/fear-greed.json  ──▶  GitHub Pages
```

1. **Data**: `scripts/update_data.py` downloads [`fear-greed.csv`](https://github.com/whit3rabbit/fear-greed-data/blob/main/fear-greed.csv) from [whit3rabbit/fear-greed-data](https://github.com/whit3rabbit/fear-greed-data). That file combines a historical archive for 2011–2021 with data pulled from CNN's endpoint from 2021-02-01 onward. The script validates the CSV and writes `data/fear-greed.json` as compact `[date, score, ratingIndex]` rows.
2. **Validation**: nothing is written, and the workflow fails, if the data has duplicate or unordered dates, has fewer rows than the current data, or its latest date has moved backwards.
3. **Automation**: [`update-data.yml`](.github/workflows/update-data.yml) runs Monday to Friday at 23:30 UTC, after the upstream refresh at 23:00 UTC, and can also be run manually. It commits only when the data changed, then deploys.
4. **Deploy**: [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) publishes `index.html`, `assets/` and `data/` to GitHub Pages on every push to `main`.

Sentiment labels come straight from CNN's `Rating` column. Bands: Extreme Fear 0–25, Fear 25–45, Neutral 45–55, Greed 55–75, Extreme Greed 75–100. CNN's labels at the exact band edges may differ slightly from these round numbers.

### Run locally

```bash
python3 scripts/update_data.py   # refresh data/fear-greed.json (Python 3.9+, standard library only)
python3 -m http.server 8000      # open http://localhost:8000
```

### Fork it

1. Fork the repo.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Run the **Update data** or **Deploy Pages** workflow once from the **Actions** tab.

---

## 中文

CNN 恐慌与贪婪指数（Fear & Greed Index）从 2011 年至今的交互式走势图，每个美股交易日自动更新。

- 时间范围：1 个月、3 个月、6 个月、1 年、2 年、5 年、10 年、全部。选中的范围会写入 URL（如 `#2y`），方便分享
- 显示所选区间的均值、最高、最低和区间变化
- 在图表上横向拖拽可选择任意区间，图表会放大到该区间并同步更新统计；点 ✕ 或按 Esc 返回。自定义区间也会写入链接，如 `#2020-02-01..2020-04-30`
- 手机上：手指滑动查看数值，长按后再拖动选择区间
- 五档情绪色带：极度恐慌 / 恐慌 / 中性 / 贪婪 / 极度贪婪
- 支持中英文，根据浏览器语言自动选择，无法识别时用英文
- 深色和浅色主题跟随系统，适配手机
- 纯静态页面，无需构建，不依赖前端框架

### 工作原理

1. **数据**：`scripts/update_data.py` 从 [whit3rabbit/fear-greed-data](https://github.com/whit3rabbit/fear-greed-data) 下载 `fear-greed.csv`。该文件把 2011–2021 年的历史存档和 2021-02-01 起从 CNN 接口抓取的数据拼在一起。脚本校验后输出紧凑格式的 `data/fear-greed.json`。
2. **校验**：如果日期重复或乱序、行数比现有数据少，或者最新日期倒退，脚本不写入任何内容，工作流报错。
3. **自动化**：`update-data.yml` 在周一到周五 23:30 UTC 运行，排在上游 23:00 UTC 更新之后，也可以手动触发。只有数据变化时才提交并部署。
4. **部署**：`deploy-pages.yml` 在 `main` 分支有推送时发布到 GitHub Pages。

情绪标签直接使用 CNN 提供的 `Rating`。在分档边界附近，CNN 的标签可能和上面的整数阈值略有出入。

### 本地运行

```bash
python3 scripts/update_data.py
python3 -m http.server 8000
```

---

## Credits / 致谢

- Data: [CNN Fear & Greed Index](https://www.cnn.com/markets/fear-and-greed), compiled by [whit3rabbit/fear-greed-data](https://github.com/whit3rabbit/fear-greed-data) (MIT)
- Chart: [Apache ECharts](https://echarts.apache.org/)

## Disclaimer / 免责声明

For informational purposes only. Not investment advice. This project is not affiliated with CNN.

仅供参考，不构成投资建议。本项目与 CNN 无关。

## License

[MIT](LICENSE)
