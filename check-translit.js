#!/usr/bin/env node
/* 音标转写全量对照检查：通用拼音 / 耶鲁拼音 / 威妥玛（严式、简式）/ 注音二式
 * ---------------------------------------------------------------------------
 * 用 kfcd/pinyin 的 pinyinbiao（CC BY 3.0，2095 个音节）逐条核对
 * template.html 里的五套转写规则，拼写与调值都要一致。
 *
 * 用法：
 *   node check-translit.js [对照表路径]
 *   默认读取 ./.ty-biao.tsv；没有该文件时按提示下载：
 *     gh api repos/kfcd/pinyin/contents/pinyinbiao \
 *        -H "Accept: application/vnd.github.raw" > .ty-biao.tsv
 *
 * 比对口径
 *   - 调号：对照表里通用拼音、耶鲁用符号，威妥玛、注音二式用数字；项目输出形态相同，
 *     但耶鲁的空韵（jr/chr/shr/r/dz/tsz/sz）用空格调号、轻声用间隔号，
 *     所以两边都先拆成「基础音节 + 调值」再比。
 *   - 轻声与一声：通用拼音、耶鲁都不标调，比较时归为同一档；
 *     注音二式一声标 ¯、轻声不标，两者要分开比。
 *   - hm / hng：对照表的拼音列不带调号（只有编号列有），调值无从对应，只比拼写。
 *   - 已知的对照表偏差（脚本单独计数，不算失败）：
 *       Yale  -un 韵：表里 dun/kun/hun… 写 -wen、gun/lun/run/shun 写 -wun，自身不统一；
 *             按 Yale 韵母表统一作 -wun（Wikipedia「Yale romanization of Mandarin」）。
 *       WG    yan：表里作 yan，Wade-Giles 标准作 yen（煙 yen）。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const TSV = process.argv[2] || path.join(ROOT, ".ty-biao.tsv");

/* ---------- 1. 抽取被测规则块 ---------- */
function extract(text, begin, end, label) {
  const i = text.indexOf(begin), j = text.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error("找不到标记: " + label);
  const start = text.indexOf("*/", i);
  if (start < 0 || start > j) throw new Error("标记格式异常: " + label);
  return text.slice(start + 2, j);
}

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const block = extract(template, "/* @check-translit:begin", "/* @check-translit:end */", "@check-translit");

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(block + "\nthis.api = { tyText, yaleText, wgText, wgsText, mps2Text, grText, cyrText, wgsOpts, phSplitTone };", sandbox);
const { tyText, yaleText, wgText, wgsText, mps2Text, grText, cyrText, wgsOpts, phSplitTone } = sandbox.api;

/* ---------- 2. 调号解析 ---------- */
const SPACING = { "\u02C9": 1, "\u02CA": 2, "\u02C7": 3, "\u02CB": 4, "\u02D9": 5, "\u00B7": 5,
  "\u00AF": 1, "\u00B4": 2, "`": 4 };
const COMBINING = { "\u0304": 1, "\u0301": 2, "\u030C": 3, "\u0300": 4, "\u0307": 5 };

function parseSyllable(s) {
  let tone = 0, base = "";
  const str = String(s);
  const last = str.slice(-1);
  if (SPACING[last] && str.length > 1) { tone = SPACING[last]; s = str.slice(0, -1); }
  for (const ch of String(s).normalize("NFD")) {
    if (SPACING[ch]) { tone = SPACING[ch]; continue; }
    if (COMBINING[ch]) { tone = COMBINING[ch]; continue; }
    base += ch;
  }
  return { base: base.normalize("NFC"), tone: tone };
}
const toneKey = (t) => (t === 0 || t === 1 || t === 5 ? 0 : t);

function parseWg(s) {
  let tone = 0, base = String(s);
  while (base && "¹²³⁴⁵".indexOf(base.slice(-1)) >= 0) {
    tone = "¹²³⁴⁵".indexOf(base.slice(-1)) + 1;
    base = base.slice(0, -1);
  }
  return { base: base, tone: tone };
}

/* 注音二式对照列：音节末尾缀 1-5 的阿拉伯数字 */
function parseNum(s) {
  const str = String(s);
  const m = /([1-5])$/.exec(str);
  return m ? { base: str.slice(0, -1), tone: Number(m[1]) } : { base: str, tone: 0 };
}
/* 注音二式：一声标 ¯、轻声不标，两者必须分开，只把轻声归 0 */
const normTone = (t) => (t === 5 ? 0 : t);

/* 对照表拼音列偶尔丢 ü（lüan 写成 luan），用编号列补；并补回调号 */
const PY_TONE = {
  a: ["a", "ā", "á", "ǎ", "à"], e: ["e", "ē", "é", "ě", "è"], i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"], u: ["u", "ū", "ú", "ǔ", "ù"], "ü": ["ü", "ǖ", "ǘ", "ǚ", "ǜ"]
};
function markPyTone(base, tone) {
  if (tone === 5) return base;
  let idx = -1;
  const iu = base.indexOf("iu"); if (iu >= 0) idx = iu + 1;
  if (idx < 0) { const ui = base.indexOf("ui"); if (ui >= 0) idx = ui; }
  if (idx < 0) for (const v of ["a", "o", "e", "ê"]) { const i = base.indexOf(v); if (i >= 0) { idx = i; break; } }
  if (idx < 0) for (let i = base.length - 1; i >= 0; i--) if ("iuü".indexOf(base.charAt(i)) >= 0) { idx = i; break; }
  if (idx < 0) return base;
  const row = PY_TONE[base.charAt(idx)];
  return row ? base.slice(0, idx) + row[tone] + base.slice(idx + 1) : base;
}

/* ---------- 3. 逐条对照 ---------- */
if (!fs.existsSync(TSV)) {
  console.error("找不到对照表：" + TSV);
  console.error("请先下载：");
  console.error('  gh api repos/kfcd/pinyin/contents/pinyinbiao -H "Accept: application/vnd.github.raw" > .ty-biao.tsv');
  process.exit(2);
}
const rows = fs.readFileSync(TSV, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));

const bad = { ty: [], yale: [], wg: [], mps2: [], gr: [], cyr: [] };
const known = { yale: [], wg: [], gr: [], cyr: [] };
let checked = 0, nasal = 0, eRows = 0;

/* 对照表自身的已知偏差 */
const KNOWN_YALE_UN = /^(chun|cun|dun|hun|kun|nun|sun|tun|zhun|zun)$/;
const KNOWN_WG = /^(yan)$/;
/* 国语罗马字列的已知偏差（脚本单独计数，不算失败）：
   ① m/n/l/r 声母 + 轻声：表里作「.lha」这种一声形，1928 规范轻声用基本式（.la），
      实际 GR 读物也写作 ma / le / ne 一类；
   ② 零星音节：表里把它们当非 m/n/l/r 声母或按错韵母处理（dhen、diar、lhiuarn、
      thei、waa、yae 等），按 1928 规则应为 den、dya、liuan、tei、woa、yeai。 */
const KNOWN_GR_ARTIFACT = /^(den|dia|lo|lvan|lvn|me|nun|tei)$/;
function grKnown(numBase, tone, ref) {
  if (tone === 5 && /^[mnlr]/.test(numBase)) return "轻声（m/n/l/r）";
  if (KNOWN_GR_ARTIFACT.test(numBase)) return "音节取值";
  if (ref && (numBase === "wa" || numBase === "yai") && tone === 3) return "音节取值";
  return null;
}

for (const r of rows) {
  const num = r[0] || "";
  const m = /^([a-zê]+)([1-5])$/.exec(num);
  if (!m) continue;
  const numBase = m[1], tone = Number(m[2]);
  const isNasal = /^(hm|hng|m|n|ng)$/.test(numBase);
  if (isNasal) nasal++;
  const input = numBase.indexOf("v") >= 0
    ? markPyTone(numBase.replace(/v/g, "ü"), tone)
    : (r[1] || "").replace(/\u00B7/g, "");
  checked++;

  /* 通用拼音 */
  {
    const mine = parseSyllable(tyText(input));
    const ref = parseSyllable(r[6] || "");
    if (mine.base !== ref.base || (!isNasal && toneKey(mine.tone) !== toneKey(ref.tone))) {
      bad.ty.push([num, input, tyText(input), r[6]]);
    }
  }

  /* 耶鲁拼音 */
  {
    const refRaw = r[5] || "";
    if (/^ê/.test(refRaw) && /[1-5]$/.test(refRaw)) {
      eRows++;   // 对照表把 ê 写成 "ê1"，不是合法转写，跳过
    } else {
      const mine = parseSyllable(yaleText(input));
      const ref = parseSyllable(refRaw);
      if (mine.base !== ref.base || (!isNasal && toneKey(mine.tone) !== toneKey(ref.tone))) {
        const item = [num, input, yaleText(input), refRaw];
        (KNOWN_YALE_UN.test(numBase) ? known.yale : bad.yale).push(item);
      }
    }
  }

  /* 威妥玛严式（送气符按 ʻ 输出，对照表用 '，比较前统一） */
  {
    const mine = parseWg(wgText(input).replace(/ʻ/g, "'"));
    const ref = parseWg(r[3] || "");
    if (mine.base !== ref.base || (!isNasal && mine.tone !== ref.tone)) {
      const item = [num, input, wgText(input), r[3]];
      (KNOWN_WG.test(numBase) ? known.wg : bad.wg).push(item);
    }
  }

  /* 注音二式（对照表用数字调） */
  {
    const mine = parseSyllable(mps2Text(input));
    const ref = parseNum(r[4] || "");
    if (mine.base !== ref.base || (!isNasal && normTone(mine.tone) !== normTone(ref.tone))) {
      bad.mps2.push([num, input, mps2Text(input), r[4]]);
    }
  }

  /* 国语罗马字：拼写本身承载声调，直接逐字符比对。
     鼻音行的拼音列不带调号（调值只在编号列），这里按调值补组合调号再转。 */
  {
    const grIn = isNasal
      ? numBase + ["", "\u0304", "\u0301", "\u030C", "\u0300", ""][tone]
      : input;
    const mine = grText(grIn);
    if (mine !== (r[7] || "")) {
      const item = [num, grIn, mine, r[7]];
      (grKnown(numBase, tone, r[7]) ? known.gr : bad.gr).push(item);
    }
  }

  /* 西里尔转写：对照表用上标数字调，与项目输出同形，直接逐字符比 */
  {
    const input2 = isNasal
      ? numBase + ["", "\u0304", "\u0301", "\u030C", "\u0300", ""][tone]
      : input;
    const mine = cyrText(input2);
    if (mine !== (r[9] || "")) {
      const item = [num, input2, mine, r[9]];
      /* 对照表把 ㄌㄛ（咯 / 囉）写作 лё（/lʲo/），按 Palladius 惯例应为 ло */
      (numBase === "lo" ? known.cyr : bad.cyr).push(item);
    }
  }
}

/* ---------- 4. 简式：严式去掉送气符 ---------- */
const wgsBad = [];
for (const r of rows) {
  const num = r[0] || "";
  const m = /^([a-zê]+)([1-5])$/.exec(num);
  if (!m) continue;
  const input = m[1].indexOf("v") >= 0
    ? markPyTone(m[1].replace(/v/g, "ü"), Number(m[2]))
    : (r[1] || "").replace(/\u00B7/g, "");
  const expect = wgText(input).replace(/ʻ/g, "");
  if (wgsText(input) !== expect) wgsBad.push([num, input, wgsText(input), expect]);
}
/* 简式开关：ü→u 与去调 */
const uSample = wgsText("jūn");
wgsOpts.u = true;
const uOut = wgsText("jūn");
wgsOpts.u = false;
wgsOpts.tone = false;
const noTone = wgsText("jūn");
wgsOpts.tone = true;

/* ---------- 5. 输出 ---------- */
function report(name, list, knownList) {
  console.log("%s：%d 条不一致%s", name, list.length,
    knownList && knownList.length ? "（另有 " + knownList.length + " 条对照表已知偏差）" : "");
  for (const d of list.slice(0, 12)) {
    console.log("  %s  输入 %s  →  项目 %s  对照 %s", d[0], JSON.stringify(d[1]), JSON.stringify(d[2]), JSON.stringify(d[3]));
  }
  if (list.length > 12) console.log("  … 另有 " + (list.length - 12) + " 条");
}

console.log("对照音节 %d 个（鼻音行 %d、耶鲁 ê 行跳过 %d）", checked, nasal, eRows);
report("通用拼音", bad.ty);
report("耶鲁拼音", bad.yale, known.yale);
report("威妥玛（严式）", bad.wg, known.wg);
report("威妥玛（简式）", wgsBad);
report("注音二式", bad.mps2);
report("国语罗马字", bad.gr, known.gr);
report("西里尔转写", bad.cyr, known.cyr);

if (known.yale.length) console.log("  耶鲁已知偏差：%d 条 -un 韵，对照表写法不统一，按韵母表统一作 -wun", known.yale.length);
if (known.gr.length) console.log("  国语罗马字已知偏差：%d 条（轻声 m/n/l/r 用基本式、零星音节取值）", known.gr.length);
if (known.wg.length) console.log("  威妥玛已知偏差：%d 条 yan，标准作 yen", known.wg.length);
console.log("  简式开关自检：%s / ü→u：%s / 去调：%s", uSample, uOut, noTone);

const ok = !bad.ty.length && !bad.yale.length && !bad.wg.length && !wgsBad.length &&
  !bad.mps2.length && !bad.gr.length && !bad.cyr.length &&
  uSample === "chün¹" && uOut === "chun¹" && noTone === "chün";
console.log("\n" + (ok ? "全部一致 ✓" : "存在不一致 ✗"));
process.exit(ok ? 0 : 1);
