const fs = require("fs");

module.exports = async (page, sh, currentDir) => {
  try {
    // if (!fs.existsSync(`${currentDir}/list-chapters.json`)) {
      const chaptersTab = await page.$("#j-bookCatalogPage", elem => elem);
      try {
        await chaptersTab.click();
      } catch (error) {
        console.log("click error", error)
      }
      await page.waitForTimeout(setTimeout(() => {}, 50));
      sh.touch("list-chapters.json");
      await fs.writeFile(
        `list-chapters.json`,
        JSON.stringify([]),
        function (err) {
          if (err) throw err;
        }
      );
      let chapters = [];
      let nextPageBtn = null;
      do {
        try {
          const chapterJSNodes = await page.$$eval("#max-volume ul li a[target=_blank]", (elements) => {
            return elements.map(element => ({
              url : element.getAttribute("href"),
              title : element.getAttribute("title"),
            }))
          });
          chapters = [
            ...chapters,
            ...chapterJSNodes
          ]
          try {
            nextPageBtn = await page.$("ul.pagination li a[aria-label=Next]", (elem) => elem);
            activeBtnText = await page.$eval("ul.pagination li.active a", (elem) => elem.innerText);
            sh.echo(`get chapters from page ${activeBtnText}`)
            try {
              await nextPageBtn?.click();
            } catch (error) {
              try {
                await page.click("ul.pagination li a[aria-label=Next]", {});
              } catch (error) {
              }
            }
            await page.waitForTimeout(setTimeout(() => {}, 0));
          } catch (error) {
            nextPageBtn = null;
          }
        } catch (error) {
          sh.echo("GET LIST CHAPTERS ERROR");
          nextPageBtn = null;
        }
      }
      while(nextPageBtn);

      await fs.writeFile(
        `list-chapters.json`,
        JSON.stringify(chapters.map((c, index) => ({
          ...c,
          no: index + 1
        }))),
        function (err) {
          if (err) throw err;
        }
      );
      return chapters;
    // } else {
    //   const chapters = require(`${currentDir}/list-chapters.json`);
    //   return chapters;
    // }
  } catch (error) {
    sh.echo("CHECK file data error");
  }
};
