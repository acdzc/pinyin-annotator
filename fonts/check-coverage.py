#!/usr/bin/env python3
"""内嵌字体覆盖度自检：确认音标方案会用到的字符都在字体里。

检查三件事：
  1. 内嵌 AndikaPy 子集是否覆盖拼音 / 通用拼音的全部字符（含组合调号）；
  2. 内嵌 BpmfSubset 是否覆盖 37 个注音符号与 5 个调号；
  3. @font-face 的 unicode-range 是否把这些码位放行（漏写范围 = 有字形也不会用）。

用法：python fonts/check-coverage.py
依赖：pip install fonttools brotli
"""
import base64
import io
import os
import re
import sys

from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))

# 拼音 / 通用拼音：基础字母、四声调号字母、ê 与鼻音叹词、组合调号、隔音与上标
PINYIN = (
    "abcdefghijklmnopqrstuvwxyz"
    "üê"
    "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ"
    "ếềểễệ"
    "ḿńňǹ"
    "\u0300\u0301\u0304\u030C\u0307"   # m̄ ḿ m̀ m̌，以及任意分解式调号
    "'\u2019\u00B7\u02BB\u02BC"          # 隔音符、间隔号、威妥瑪送气符
    "\u00B9\u00B2\u00B3\u2070\u2074"      # 上标数字调（威妥瑪 / 注音二式）
)
# 注音：37 个符号 + 5 个调号
ZHUYIN = "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˉˊˇˋ˙"


def load_b64_css(path):
    s = io.open(path, encoding="utf-8").read()
    b64 = re.sub(r"\s", "", re.search(r"base64,([A-Za-z0-9+/=]+)", s).group(1))
    return TTFont(io.BytesIO(base64.b64decode(b64))), s


def load_b64(path):
    return TTFont(io.BytesIO(base64.b64decode(io.open(path, encoding="utf-8").read().strip())))


def parse_range(text):
    """解析 unicode-range: U+0000-02FF, U+1E00-1EFF, ..."""
    m = re.search(r"unicode-range:\s*([^;]+);", text)
    if not m:
        return []
    out = []
    for part in m.group(1).split(","):
        part = part.strip().upper().replace("U+", "")
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-")
            out.append((int(a, 16), int(b, 16)))
        else:
            out.append((int(part, 16), int(part, 16)))
    return out


def missing(charset, cmap):
    return [c for c in dict.fromkeys(charset) if ord(c) not in cmap]


def main():
    ok = True

    andika, css = load_b64_css(os.path.join(HERE, "andika-face.css.txt"))
    cmap = set(andika.getBestCmap())
    miss = missing(PINYIN, cmap)
    rng = parse_range(css)
    out_of_range = [c for c in dict.fromkeys(PINYIN) if not any(a <= ord(c) <= b for a, b in rng)]

    print("AndikaPy：%d 码位 / %d 字形" % (len(cmap), len(andika.getGlyphOrder())))
    print("  unicode-range: " + (", ".join("U+%04X-%04X" % r for r in rng) or "未声明"))
    print("  拼音字符：%s" % ("全部覆盖" if not miss else "缺 " + " ".join(miss)))
    print("  范围放行：%s" % ("全部通过" if not out_of_range else "未放行 " + " ".join(out_of_range)))
    if miss or out_of_range:
        ok = False

    bpmf = load_b64(os.path.join(HERE, "bpmf-face.b64.txt"))
    bcmap = set(bpmf.getBestCmap())
    bmiss = missing(ZHUYIN, bcmap)
    print("BpmfSubset：%d 码位 / %d 字形" % (len(bcmap), len(bpmf.getGlyphOrder())))
    print("  注音字符：%s" % ("全部覆盖" if not bmiss else "缺 " + " ".join(bmiss)))
    if bmiss:
        ok = False

    print("\n" + ("覆盖完整 ✓" if ok else "存在缺口 ✗"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
