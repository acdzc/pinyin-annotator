<!--
  发版说明（三语）。打 tag 前更新本文件，内容与本次 tag 一一对应；
  构建时 {{VERSION}} 与 {{PREV}} 会被替换为当前 tag 与上一个 tag。
  不更新本文件的话，Release 会沿用上一次的文字——发版时记得改。
  写给用户看：只讲能做什么、怎么用，不写实现细节。
-->

## 简体中文

**访问统计换成自己的了**：GitHub Pages 的访问统计做得太烂——只统计仓库页面，跟站点访问根本没关系，所以改为接自己的统计。它只数页面访问量，不用 Cookie、不读取也不上传你贴的文章，也不记录能追到个人的信息。从 Release 下载的离线包、以及 fork 后自建的版本，都不带这段代码。

## 繁體中文

**訪問統計換成自己的了**：GitHub Pages 的訪問統計做得太爛——只統計倉庫頁面，跟站點訪問根本沒關係，所以改為接自己的統計。它只數頁面訪問量，不用 Cookie、不讀取也不上傳你貼的文章，也不記錄能追到個人的資訊。從 Release 下載的離線包、以及 fork 後自建的版本，都不帶這段程式碼。

## English

**Traffic stats now come from a self-hosted counter.** GitHub Pages' built-in traffic page is useless for a website — it only counts views of the repository, not the pages people actually visit — so the site now reports to its own counter. It only counts page views: no cookies, it never reads or uploads the text you paste, and nothing it stores can be traced back to a person. The offline zip downloaded from Releases, and any self-hosted copy after forking, contain none of that code.

---

**Full Changelog**: https://github.com/tjsky/pinyin-annotator/compare/{{PREV}}...{{VERSION}}
