/* 拼音(带调) → 注音 转换算法（构建时内嵌到产物；规则见下方各表注释）
   规则依据：教育部《國語注音符號手冊》
   - 轻声「˙」横式标在字音前方（左侧）；二三四声标在最后一个符号右上角；阴平不标
   - 转换失败（非标准音节）返回 null，调用方回退显示原拼音 */
var ZY_INI = { b:"ㄅ",p:"ㄆ",m:"ㄇ",f:"ㄈ",d:"ㄉ",t:"ㄊ",n:"ㄋ",l:"ㄌ",g:"ㄍ",k:"ㄎ",h:"ㄏ",j:"ㄐ",q:"ㄑ",x:"ㄒ",zh:"ㄓ",ch:"ㄔ",sh:"ㄕ",r:"ㄖ",z:"ㄗ",c:"ㄘ",s:"ㄙ" };
var ZY_FIN = {
  "a":"ㄚ","o":"ㄛ","e":"ㄜ","ê":"ㄝ","er":"ㄦ","ai":"ㄞ","ei":"ㄟ","ao":"ㄠ","ou":"ㄡ","an":"ㄢ","en":"ㄣ","ang":"ㄤ","eng":"ㄥ",
  "i":"ㄧ","u":"ㄨ","ü":"ㄩ","ong":"ㄨㄥ",
  "ia":"ㄧㄚ","io":"ㄧㄛ","ie":"ㄧㄝ","iao":"ㄧㄠ","iou":"ㄧㄡ","iu":"ㄧㄡ","ian":"ㄧㄢ","in":"ㄧㄣ","iang":"ㄧㄤ","ing":"ㄧㄥ","iong":"ㄩㄥ",
  "ua":"ㄨㄚ","uo":"ㄨㄛ","uai":"ㄨㄞ","uei":"ㄨㄟ","ui":"ㄨㄟ","uan":"ㄨㄢ","uen":"ㄨㄣ","un":"ㄨㄣ","uang":"ㄨㄤ","ueng":"ㄨㄥ",
  "üe":"ㄩㄝ","üan":"ㄩㄢ","ün":"ㄩㄣ",
  /* ㄧㄞ：台湾读「崖 / 厓 / 啀」为 yái，汉语拼音不作标准音节，注音有对应韵符 */
  "iai":"ㄧㄞ"
};
var ZY_SPECIAL = { "m":"ㄇ","n":"ㄣ","ng":"ㄥ","hm":"ㄏㄇ","hng":"ㄏㄥ" };
/* 带调拼音 → 基础音节 + 调值(1-5)。用 NFD 拆组合调号：
   ê̄ / m̄ / m̀ 这类只能组合书写的音节也能转写。旧写法按码位查表，
   多码位键（如 "m̀"）在 charAt 循环里永远匹配不到，会退化成原样输出。 */
var ZY_COMBINING = { "\u0304": 1, "\u0301": 2, "\u030C": 3, "\u0300": 4, "\u0307": 5 };
function zySplitTone(py) {
  var tone = 5, base = "";
  var d = String(py).normalize("NFD");
  for (var i = 0; i < d.length; i++) {
    var ch = d.charAt(i);
    if (ZY_COMBINING[ch]) { tone = ZY_COMBINING[ch]; continue; }
    base += ch;
  }
  return { base: base.normalize("NFC"), tone: tone };
}
/* 基础音节（无调号）→ 注音符号串（不含调号） */
function zyBase(base) {
  if (ZY_SPECIAL[base] != null) return ZY_SPECIAL[base];
  /* 儿化尾 r：去掉 r 转换剩余部分，追加 ㄦ（er 本身是独立韵母，不在此处理） */
  if (base.length > 2 && base !== "er" && base.charAt(base.length - 1) === "r") {
    var stem = zyBase(base.slice(0, -1));
    return stem ? stem + "ㄦ" : null;
  }
  /* y / w 头变换（yi/yin/ying 直接去掉 y；其余 y+a/o/e → i+a/o/e） */
  var s = base;
  if (s.slice(0, 2) === "yu") s = "ü" + s.slice(2);
  else if (s.charAt(0) === "y") s = (s.charAt(1) === "i") ? "i" + s.slice(2) : "i" + s.slice(1);
  else if (s.slice(0, 2) === "wu") s = "u" + s.slice(2);
  else if (s.charAt(0) === "w") s = "u" + s.slice(1);
  /* 拆声母（zh/ch/sh 双字母优先；ZY_INI 全为辅音，元音开头自然落入零声母） */
  var ini = "", rest = s;
  if (s.slice(0, 2) === "zh" || s.slice(0, 2) === "ch" || s.slice(0, 2) === "sh") {
    ini = s.slice(0, 2); rest = s.slice(2);
  } else if (ZY_INI[s.charAt(0)]) {
    ini = s.charAt(0); rest = s.slice(1);
  }
  /* j/q/x 后的 u 实为 ü；l/n 后的 ue 亦为 üe */
  if ((ini === "j" || ini === "q" || ini === "x") && rest.charAt(0) === "u") {
    if (rest.slice(0, 2) === "ue") rest = "üe" + rest.slice(2);
    else if (rest.slice(0, 3) === "uan") rest = "üan" + rest.slice(3);
    else if (rest.slice(0, 2) === "un") rest = "ün" + rest.slice(2);
    else rest = "ü" + rest.slice(1);
  } else if ((ini === "l" || ini === "n") && rest.slice(0, 2) === "ue") {
    rest = "üe" + rest.slice(2);
  }
  /* zh/ch/sh/r/z/c/s + i（舌尖元音）：注音不写出韵符 */
  if ((ini === "zh" || ini === "ch" || ini === "sh" || ini === "r" || ini === "z" || ini === "c" || ini === "s") && rest === "i") rest = "";
  if (!rest) return ini ? ZY_INI[ini] : null;
  var fin = ZY_FIN[rest];
  if (!fin) return null;
  return ini ? ZY_INI[ini] + fin : fin;
}
/* 带调拼音音节 → { syms, tone } 或 null */
function pyToZhuyin(py) {
  if (!py) return null;
  var sp = zySplitTone(py);
  var syms = zyBase(sp.base.replace(/v/g, "ü").toLowerCase());
  if (!syms) return null;
  return { syms: syms, tone: sp.tone };
}
if (typeof module !== "undefined") module.exports = { pyToZhuyin: pyToZhuyin, zyBase: zyBase };
