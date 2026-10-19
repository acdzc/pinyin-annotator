#!/usr/bin/env node
/* 通用拼音全量对照检查
 * ---------------------------------------------------------------------------
 * 用 kfcd/pinyin 的 pinyinbiao（CC BY 3.0，2095 个音节）第 7 列 Tongyong
 * 逐条核对 template.html 里的通用拼音规则，拼写与声调都要一致。
 *
 * 用法：
 *   node check-tongyong.js [对照表路径]
 *   默认读取 ./.ty-biao.tsv；没有该文件时按提示下载：
 *     gh api repos/kfcd/pinyin/contents/pinyinbiao \
 *        -H "Accept: application/vnd.github.raw" > .ty-biao.tsv
 *
 * 声调判定说明：
 *   对照表用「空格调号」写叹词（mˊ / nˇ / ngˋ），项目输出用「合成字符」
 *   写同一批音节（ḿ / ň / ǹg），轻声与一声一律不标。两者字面不同但语义相同，
 *   所以不能按字符串比，必须先把两边都拆成「基础音节 + 调值」再比：
 *     - 空格调号 ˉ ˊ ˇ ˋ ˙（含间隔号 ·）
 *     - 组合调号 U+0304 / 0301 / 030C / 0300 / 0307（m̄、m̀ 等）
 *     - 合成字符经 NFD 分解后自动落到上面两类
 *   轻声（对照表 ·）与一声在通用拼音里都不标调，比较时归为同一档。
 *
 * 输入怎么来：
 *   对照表的「编号列」与「拼音列」各有笔误（编号列把 lüe 写成 lue、
 *   拼音列把 lüan 写成 luan），所以基音节以拼音列为准，但当编号列带 v
 *   （明确表示 ü）时改用编号列，调值一律取编号列末尾的数字。
 *   随后按汉语拼音的标调规则把调号补回，作为被测转换函数的输入。
 *   hm / hng 本身没有元音、带不了调号（对照表也只写 hm + 编号），
 *   这两类先转写成 heng 再施调，等同于验证「hm → heng 且调值不丢」。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const TSV = process.argv[2] || path.join(ROOT, ".ty-biao.tsv");

/* ---------- 1. 从源码中抽取被测规则 -------------------------------- */
function extract(text, begin, end, label) {
  const i = text.indexOf(begin), j = text.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error("找不到标记: " + label);
  // 标记本身是注释，跳过所在注释的结尾，避免把 "*/" 当成代码
  const start = text.indexOf("*/", i);
  if (start < 0 || start > j) throw new Error("标记格式异常: " + label);
  return text.slice(start + 2, j);
}

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const tongyong = extract(template, "/* @check-tongyong:begin", "/* @check-tongyong:end */", "@check-tongyong");

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(tongyong + "\nthis.tyText = tyText;", sandbox);
const tyText = sandbox.tyText;
if (typeof tyText !== "function") throw new Error("规则块里没有取到 tyText");

/* ---------- 2. 调号 ↔ 调值 ----------------------------------------- */
const SPACING = { "\u02C9": 1, "\u02CA": 2, "\u02C7": 3, "\u02CB": 4, "\u02D9": 5, "\u00B7": 5 };
const COMBINING = { "\u0304": 1, "\u0301": 2, "\u030C": 3, "\u0300": 4, "\u0307": 5 };

/* 拆出基础音节与调值；0 表示没有任何调号 */
function parseSyllable(s) {
  let tone = 0, base = "";
  for (const ch of String(s).normalize("NFD")) {
    if (SPACING[ch]) { tone = SPACING[ch]; continue; }
    if (COMBINING[ch]) { tone = COMBINING[ch]; continue; }
    base += ch;
  }
  return { base: base.normalize("NFC"), tone: tone };
}

/* 通用拼音不标一声、也不标轻声：两者输出都是「无调号」，比较时归一 */
const toneKey = (t) => (t === 0 || t === 1 || t === 5 ? 0 : t);

const MARKS = {
  a: ["a", "\u0101", "\u00E1", "\u01CE", "\u00E0"],
  e: ["e", "\u0113", "\u00E9", "\u011B", "\u00E8"],
  i: ["i", "\u012B", "\u00ED", "\u01D0", "\u00EC"],
  o: ["o", "\u014D", "\u00F3", "\u01D2", "\u00F2"],
  u: ["u", "\u016B", "\u00FA", "\u01D4", "\u00F9"],
  "ü": ["ü", "\u01D6", "\u01D8", "\u01DA", "\u01DC"],
  "ê": ["ê", "ê\u0304", "\u1EBF", "ê\u030C", "\u1EC1"],
  m: ["m", "m\u0304", "\u1E3F", "m\u030C", "m\u0300"],
  n: ["n", "n\u0304", "\u0144", "\u0148", "\u01F9"]
};

/* 汉语拼音标调位置：a > o > e > ê；iu 标 u、ui 标 i；单韵母标自身 */
function toneIndex(base) {
  if (base === "m" || base === "n" || base === "ng") return 0;
  const iu = base.indexOf("iu");
  if (iu >= 0) return iu + 1;
  const ui = base.indexOf("ui");
  if (ui >= 0) return ui;
  for (const v of ["a", "o", "e", "ê"]) {
    const i = base.indexOf(v);
    if (i >= 0) return i;
  }
  for (let i = base.length - 1; i >= 0; i--) if ("iuü".indexOf(base.charAt(i)) >= 0) return i;
  return -1;
}

/* 给不带调的音节补上调号（一声 / 轻声不标） */
function markTone(base, tone) {
  if (tone <= 1 || tone === 5) return base;
  const idx = toneIndex(base);
  if (idx < 0) return base;
  const row = MARKS[base.charAt(idx)];
  if (!row) return base;
  return base.slice(0, idx) + row[tone] + base.slice(idx + 1);
}

/* ---------- 3. 逐条对照 -------------------------------------------- */
if (!fs.existsSync(TSV)) {
  console.error("找不到对照表：" + TSV);
  console.error("请先下载：");
  console.error('  gh api repos/kfcd/pinyin/contents/pinyinbiao -H "Accept: application/vnd.github.raw" > .ty-biao.tsv');
  process.exit(2);
}

const rows = fs.readFileSync(TSV, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));
if (rows.length && rows[0].length < 7) {
  console.error("对照表列数不足：期望至少 7 列，实际 " + rows[0].length);
  process.exit(2);
}

const spellBad = [], toneBad = [];
let checked = 0, merged = 0, neutral = 0;

for (const r of rows) {
  const num = r[0] || "";
  const m = /^([a-zê]+)([1-5])$/.exec(num);
  if (!m) continue;
  const numBase = m[1], tone = Number(m[2]);

  // 基音节：拼音列为准，编号列带 v 时以编号列为准（拼音列偶尔丢 ü）
  let base = parseSyllable((r[1] || "").replace(/\u00B7/g, "")).base;
  if (numBase.indexOf("v") >= 0) base = numBase.replace(/v/g, "ü");
  if (!base) continue;
  if (/\u00B7/.test(r[1] || "")) neutral++;

  // hm / hng 没有元音，带不了调号：先转写成 heng 再施调
  let input;
  if (base === "hm" || base === "hng") {
    input = markTone(tyText(base), tone);
    merged++;
  } else {
    input = markTone(base, tone);
  }

  const mine = tyText(input);
  const pMine = parseSyllable(mine);
  const pRef = parseSyllable(r[6] || "");
  checked++;

  if (pMine.base !== pRef.base) {
    spellBad.push({ num, input, ref: r[6], mine });
    continue;
  }
  if (toneKey(pMine.tone) !== toneKey(pRef.tone)) {
    toneBad.push({ num, input, ref: r[6], mine, refTone: pRef.tone, myTone: pMine.tone });
  }
}

/* ---------- 4. 输出 ------------------------------------------------- */
const fmt = (d) => `${d.num}  输入 ${JSON.stringify(d.input)}  →  项目 ${JSON.stringify(d.mine)}  对照 ${JSON.stringify(d.ref)}`;
console.log("通用拼音对照：%d 个音节（轻声 %d、hm/hng 归并 %d）", checked, neutral, merged);
console.log("  拼写：%d 条不一致", spellBad.length);
console.log("  声调：%d 条不一致", toneBad.length);

for (const [label, list] of [["拼写", spellBad], ["声调", toneBad]]) {
  if (!list.length) continue;
  console.log("\n" + label + "不一致：");
  for (const d of list.slice(0, 30)) console.log("  " + fmt(d));
  if (list.length > 30) console.log("  … 另有 " + (list.length - 30) + " 条");
}

const ok = spellBad.length === 0 && toneBad.length === 0;
console.log("\n" + (ok ? "全部一致 ✓" : "存在不一致 ✗"));
process.exit(ok ? 0 : 1);
