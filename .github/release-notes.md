<!--
  发版说明（三语）。打 tag 前更新本文件，内容与本次 tag 一一对应；
  构建时 {{VERSION}} 与 {{PREV}} 会被替换为当前 tag 与上一个 tag。
  不更新本文件的话，Release 会沿用上一次的文字——发版时记得改。
-->

## 简体中文

**对齐排版（issue #29）**：排版设置新增「对齐」，三档——**左对齐**（默认，与以前完全一样）、**居中**（每行各自居中，律诗绝句的标题作者自动居中）、**诗词**（整块收到最长一行的宽度再居中、各行左边界对齐，适合词、赋、现代诗）。

**逐行微调**：诗词档下可以只改某一行。电脑上点预览左侧的行号；手机上长按任意一行（首次会有一条一次性提示）。菜单里有「跟随全文 / 居中 / 左对齐」，设过的行会留标记，随时能改回去。比如让标题居中、正文保持左齐，就是课本上的排法。

**几个容易踩的坑已经填好**：跨页时不会每页各缩一个宽度（那样第 2 页会突然变窄）；个别特别长的句子自动折行，不会把整块撑成满版心；只调对齐不改分页，页数不变；打印 / 导出 PDF 不带行号，行号只在屏幕上出现。

## 繁體中文

**對齊排版（issue #29）**：排版設定新增「對齊」，三檔——**左對齊**（預設，與以前完全相同）、**置中**（每行各自置中，律詩絕句的標題作者自動置中）、**詩詞**（整塊收到最長一行的寬度再置中、各行左邊界對齊，適合詞、賦、現代詩）。

**逐行微調**：詩詞檔可以只改某一行。電腦上點預覽左側的行號；手機長按任意一行（第一次會有一條一次性提示）。選單裡有「跟隨全文 / 置中 / 左對齊」，設過的行會留標記，隨時能改回去。例如讓標題置中、正文保持左齊，就是課本上的排法。

**幾個容易踩的坑已經填好**：跨頁時不會每頁各縮一個寬度（那樣第 2 頁會突然變窄）；個別特別長的句子自動折行，不會把整塊撐成滿版心；只調對齊不改分頁，頁數不變；列印 / 匯出 PDF 不帶行號，行號只在螢幕上出現。

## English

**Alignment (issue #29).** Layout settings gain an **Alignment** row with three modes: **Left** (the default, pixel-identical to before), **Center** (each line centred on its own — the title and author of a regular verse centre themselves), and **Poem** (the block narrows to the longest line, then centres, with every line flush left — for ci, fu and free verse).

**Per-line tweaks.** In Poem mode you can change a single line: click the line numbers to the left of the preview on a desktop, or long-press a line on a phone (a one-time hint appears the first time). The menu offers "Same as text / Center / Left", changed lines stay marked, and you can always revert. Centring just the title while the body stays flush left gives you the textbook layout.

**Sharp edges handled**: page breaks never shrink the block per page (which used to make page 2 suddenly narrower); an over-long line wraps on its own instead of stretching the whole block to the full page; alignment never changes pagination, so page counts stay put; and the line numbers are screen-only — they never reach the printed page or the PDF.

---

**Full Changelog**: https://github.com/tjsky/pinyin-annotator/compare/{{PREV}}...{{VERSION}}
