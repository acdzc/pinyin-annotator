#!/usr/bin/env python3
"""重建内嵌的 Andika 拼音子集字体。

上游：Andika Regular 6.101（SIL International，SIL OFL 1.1）
      https://software.sil.org/andika/  ->  Andika-6.101.zip / Andika-Regular.ttf

用法：
    python fonts/build-andika.py <Andika-Regular.ttf 路径>

做法：以当前内嵌字体已有的码位为基线（只增不减，避免误删字形），
再并入 EXTRA 里的补充字符，重新子集化为 woff2，写回
    fonts/andika-py.b64.txt      —— 纯 base64（打包用）
    fonts/andika-face.css.txt    —— @font-face 片段（build.js 注入）

依赖：pip install fonttools brotli
"""
import base64
import io
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# 现有子集之外需要补齐的字符：
#   ếềểễệ  ê 的四声（拼音标 ê 时用）
#   ḿ       〝呣〞的读音，引擎会输出
#   U+0300.. 组合调号 / 组合下点：m̄ n̄ 这类无法预组合的音节与 THL 备用
#   ‛      印刷体撇号（拼音隔音符号的排版形式）
#   ⁰⁴     威妥瑪/注音二式等方案用上标数字标调
EXTRA = "ếềểễệḿ\u0300\u0301\u0303\u0304\u0306\u0307\u030c\u0323\u2019\u2070\u2074\u2075"

# unicode-range 必须覆盖新码位，否则浏览器不会把字符交给这个字体
UNICODE_RANGE = "U+0000-02FF, U+0300-036F, U+1E00-1EFF, U+2019, U+2070-2079"

CSS_HEAD = """  /* 内置拼音字体：Andika Regular 子集（拉丁字母与拼音声调字母，woff2 base64 内嵌，离线可用
   Andika © SIL International，以 SIL Open Font License 1.1 授权（https://openfontlicense.org），
   可免费商用、可内嵌分发；本子集仅包含拼音所需字形。 */
  @font-face {{
    font-family: "AndikaPy";
    font-style: normal;
    font-weight: 400;
    src: url(data:font/woff2;base64,{b64}) format("woff2");
    font-display: swap;
    unicode-range: {rng};
  }}
"""


def main():
    if len(sys.argv) < 2:
        sys.exit("用法: python fonts/build-andika.py <Andika-Regular.ttf>")
    src = sys.argv[1]

    b64_path = os.path.join(HERE, "andika-py.b64.txt")
    old_b64 = io.open(b64_path, encoding="utf-8").read().strip()
    old_font = TTFont(io.BytesIO(base64.b64decode(old_b64)))
    base_cps = {c for c in old_font.getBestCmap() if c != 0xFFFF}

    full = TTFont(src)
    full_cps = set(full.getBestCmap())
    target = base_cps | {ord(c) for c in EXTRA}
    missing = sorted(target - full_cps)
    if missing:
        sys.exit("上游字体缺少字符: " + " ".join("U+%04X" % c for c in missing))

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.glyph_names = False       # post 表用 format 3，减小体积
    opts.hinting = False           # 屏幕显示不需要 hinting
    opts.symbol_cmap = True
    opts.legacy_cmap = True
    opts.notdef_glyph = True
    opts.notdef_outline = True
    opts.recommended_glyphs = True
    opts.recalc_bounds = True
    opts.recalc_timestamp = False

    font = subset.load_font(src, opts)
    sub = subset.Subsetter(options=opts)
    sub.populate(unicodes=sorted(target))
    sub.subset(font)

    tmp = os.path.join(HERE, ".andika-subset.tmp.woff2")
    subset.save_font(font, tmp, opts)
    data = io.open(tmp, "rb").read()
    os.remove(tmp)

    new_font = TTFont(io.BytesIO(data))
    new_cps = set(new_font.getBestCmap())
    assert not (target - new_cps), "子集缺少字符: %s" % sorted(target - new_cps)

    b64 = base64.b64encode(data).decode("ascii")
    io.open(b64_path, "w", encoding="utf-8", newline="").write(b64)
    io.open(os.path.join(HERE, "andika-face.css.txt"), "w", encoding="utf-8", newline="").write(
        CSS_HEAD.format(b64=b64, rng=UNICODE_RANGE)
    )
    print("ok: %d 码位 / %d 字形 / %.1f KB（原 %.1f KB）"
          % (len(new_cps), len(new_font.getGlyphOrder()), len(data) / 1024, len(base64.b64decode(old_b64)) / 1024))


if __name__ == "__main__":
    main()
