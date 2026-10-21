<!--
  发版说明（三语）。打 tag 前更新本文件，内容与本次 tag 一一对应；
  构建时 {{VERSION}} 与 {{PREV}} 会被替换为当前 tag 与上一个 tag。
  不更新本文件的话，Release 会沿用上一次的文字——发版时记得改。
-->

## 简体中文

**界面文案重写**：四个版本的按钮与说明按「一眼看懂」重写，命名统一成 2–4 字（输入文章 / 排版设置 / 预览 / 阅读模式 / 复制 / 易错字），去掉了「电脑里的字体」「左边输入框」这类只对某一端成立的说法，手机和平板用户不再被排除在外。版本选择页的四张卡片只讲真正的差别——词典大小、简繁转换、注音芫荽 IVS，并补上一句「四个版本的界面、排版、打印、阅读模式完全一致」。

**修复**：任何短文都会在顶部冒出一条空的「退出长文模式」横幅（`#lm-banner` 的 `display:flex` 盖过了 `[hidden]`），现在只有真正进入长文模式才出现。

**文档**：README 补齐九种音标方案的逐个说明（原先漏了汉语拼音、注音符号、威妥玛简式），字体版权章节不再重复同一段提醒，并把整份说明拆成**简体 / 繁体 / English** 三份，顶部按钮随时切换。

## 繁體中文

**介面文案重寫**：四個版本的按鈕與說明依「一眼看懂」重寫，命名統一成 2–4 字（輸入文章 / 排版設定 / 預覽 / 閱讀模式 / 複製 / 易錯字），去掉「電腦裡的字型」「左邊輸入框」這類只對某一端成立的說法，手機與平板使用者不再被排除在外。版本選擇頁的四張卡片只講真正的差別——詞典大小、繁簡轉換、注音芫荽 IVS，並補上一句「四個版本的介面、排版、列印、閱讀模式完全一致」。

**修正**：任何短文都會在頂端冒出一條空的「退出長文模式」橫幅（`#lm-banner` 的 `display:flex` 蓋過了 `[hidden]`），現在只有真正進入長文模式才會出現。

**文件**：README 補齊九種音標方案的逐項說明（原先漏了漢語拼音、注音符號、威妥瑪簡式），字型版權章節不再重複同一段提醒，並把整份說明拆成**簡體 / 繁體 / English** 三份，頂端按鈕隨時切換。

## English

**Rewritten interface copy.** Buttons and help text in all four builds now use plain, everyday wording with consistent 2–4 character names (Article / Layout / Preview / Read mode / Copy / Tricky characters). Wording that only held on one kind of device is gone — "fonts on this computer" and "the box on the left" no longer leave out phone and tablet users. The version chooser cards describe only what actually differs: dictionary size, simplified/traditional conversion and the BpmfIansui IVS table, plus one line stating that all four builds share the same interface, layout, printing and read mode.

**Fixed**: every short text showed an empty "Exit long-text mode" banner at the top (`display:flex` on `#lm-banner` overrode `[hidden]`); it now appears only in long-text mode for real.

**Docs**: the README now introduces all nine notation systems one by one (Hanyu Pinyin, Zhuyin and Wade-Giles plain were missing before), the font licensing section no longer repeats the same caveat three times, and the whole document is split into **Simplified / Traditional / English** with switcher buttons at the top.

---

**Full Changelog**: https://github.com/tjsky/pinyin-annotator/compare/{{PREV}}...{{VERSION}}
