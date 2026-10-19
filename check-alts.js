#!/usr/bin/env node
/* 候选读音自检：确认三种音标方案下的候选列表都干净。
 * ---------------------------------------------------------------------------
 * 逐个扫描 CJK 基本区的多音字，把引擎的候选读音过一遍 template.html 里的
 * cleanAlts()，检查四件事：
 *   1. 方案显示不了的读音没有被留下（注音模式下不应出现拉丁字母）；
 *   2. 教材不用的边缘读音（ê 系）没有进候选；
 *   3. 同一方案下没有显示结果重复的选项；
 *   4. 清洗后候选非空（空了会退化成「—」）。
 *
 * 用法：node check-alts.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;

function extract(text, begin, end, label) {
  const i = text.indexOf(begin), j = text.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error("找不到标记: " + label);
  const start = text.indexOf("*/", i);
  if (start < 0 || start > j) throw new Error("标记格式异常: " + label);
  return text.slice(start + 2, j);
}

/* ---------- 引擎与规则 ---------- */
const engineCtx = { console: console };
engineCtx.window = engineCtx; engineCtx.globalThis = engineCtx; engineCtx.self = engineCtx;
vm.createContext(engineCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "vendor", "engine-3.29.5.js"), "utf8"), engineCtx);
const lib = engineCtx.pinyinPro;

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const altBlock = extract(template, "/* @check-alts:begin", "/* @check-alts:end */", "@check-alts");
const tyBlock = extract(template, "/* @check-tongyong:begin", "/* @check-tongyong:end */", "@check-tongyong");

const py2zy = fs.readFileSync(path.join(ROOT, "vendor", "py2zy.snippet.js"), "utf8")
  .replace(/if \(typeof module[\s\S]*$/, "");

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(py2zy + "\n" + tyBlock + "\n" + altBlock + "\nthis.tyText = tyText; this.cleanAlts = cleanAlts;", sandbox);

/* 与 template.html 的 zyText 保持一致的注音渲染（仅用于比对显示结果） */
function zyText(py) {
  const r = sandbox.pyToZhuyin(py);
  if (!r) return py;
  return (r.tone === 5 ? "\u02D9" : "") + r.syms +
    (r.tone >= 2 && r.tone <= 4 ? ["", "", "\u02CA", "\u02C7", "\u02CB"][r.tone] : "");
}

const SCHEMES = [
  { id: "py", render: (s) => s, latin: true },
  { id: "ty", render: (s) => sandbox.tyText(s), latin: true },
  { id: "zy", render: zyText, latin: false }
];

/* ---------- 扫描 ---------- */
const issues = [];
let scanned = 0, multi = 0;
const stripped = { py: [], ty: [], zy: [] };

for (let cp = 0x4e00; cp <= 0x9fa5; cp++) {
  const ch = String.fromCharCode(cp);
  let poly;
  try { poly = lib.polyphonic(ch); } catch (e) { continue; }
  if (!poly || !poly.length) continue;
  scanned++;
  const alts = poly[0].split(/\s+/).filter(Boolean);
  if (alts.length < 2) continue;
  multi++;

  for (const sc of SCHEMES) {
    const clean = sandbox.cleanAlts(alts, "", sc.render, sc.latin);
    if (!clean.length) issues.push(`${ch} [${sc.id}] 清洗后为空（原始：${alts.join(" ")}）`);
    if (clean.length !== alts.length) stripped[sc.id].push(ch + " " + alts.join("/") + " → " + clean.join("/"));
    const seen = new Set();
    for (const r of clean) {
      const shown = sc.render(r);
      if (seen.has(shown)) issues.push(`${ch} [${sc.id}] 显示重复：${shown}`);
      seen.add(shown);
      if (!sc.latin && /[a-z]/i.test(shown)) issues.push(`${ch} [${sc.id}] 残留拉丁字母：${r} → ${shown}`);
      if (r.normalize("NFD").indexOf("e\u0302") >= 0) issues.push(`${ch} [${sc.id}] ê 系未过滤：${r}`);
    }
  }
}

/* ---------- 输出 ---------- */
console.log("扫描汉字 %d 个，其中多音字 %d 个", scanned, multi);
for (const sc of SCHEMES) {
  console.log("  %s：%d 个字有候选被过滤", sc.id, stripped[sc.id].length);
  stripped[sc.id].slice(0, 5).forEach((s) => console.log("      " + s));
}
console.log("\n欸 的候选：");
for (const sc of SCHEMES) {
  const raw = lib.polyphonic("欸")[0].split(/\s+/).filter(Boolean);
  const clean = sandbox.cleanAlts(raw, "", sc.render, sc.latin);
  console.log("  %s → %s", sc.id, clean.map((r) => sc.render(r)).join("  "));
}

if (issues.length) {
  console.log("\n问题 %d 条：", issues.length);
  issues.slice(0, 30).forEach((s) => console.log("  " + s));
  process.exit(1);
}
console.log("\n候选列表干净 ✓");
