const currentNovals = require("./list.json");
const sh = require("shelljs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const get_list_chapter = require("./get_list_chapter");

module.exports = async () => {
  for (let i = 0; i < currentNovals.length; i++) {
    try {
      const browser = await puppeteer.launch({
        launch: {
          headless: false,
          product: "chrome",
          args: ["--start-maximized"],
          defaultViewport: { width: 1700, height: 800 },
          devtools: true,
        },
        browserContext: "default",
      });
      const page = await browser.newPage();
      const noval = currentNovals[i];
      sh.echo(`START LEECH noval ${noval.name}`);
      const novalData = require(`./novals/${noval.name}/sortInfo.json`);
      await page.goto(noval.url);
      if (!noval.done) {
        try {
          sh.cd(`novals`);
          sh.cd(noval.name);
          sh.touch(`log.txt`);
          sh.echo(`LEECH noval ${noval.name}`);
          sh.exec(`echo "LEECH noval ${noval.name}"  >> log.txt`);
          const novalInfo = {
            image: await page.$eval("div.book-img a img", (elem) =>
              elem.getAttribute("src")
            ),
            name: await page.$eval(
              "div.book-info h1",
              (elem) => elem.innerText
            ),
            author: await page.$eval(
              "div.book-info p.tag a.blue",
              (elem) => elem.innerText
            ),
            status: await page.$eval(
              "div.book-info p.tag span",
              (elem) => elem.innerText
            ),
            categoryText: await page.$eval(
              "div.book-info p.tag a.red",
              (elem) => elem.innerText
            ),
            category: (
              await page.$eval("div.book-info p.tag a.red", (elem) =>
                elem.getAttribute("href")
              )
            )
              ?.split("/")
              .reverse()[0],
            intro: await page.$eval(
              "div.book-info p.intro",
              (elem) => elem.innerText
            ),
          };
          sh.touch("fullInfo.json");
          await fs.writeFile(
            `fullInfo.json`,
            JSON.stringify(novalInfo),
            function (err) {
              if (err) throw err;
            }
          );
          const bookIntroFull = await page.$eval(
            "div.book-info-detail div.book-intro",
            (elem) => elem.innerHTML
          );
          sh.touch("bookIntroFull.md");
          await fs.writeFile(`bookIntroFull.md`, bookIntroFull, function (err) {
            if (err) throw err;
          });
          await sh.mkdir("chapters");
          await sh.cd("chapters");
          try {
            if (!fs.existsSync(`./novals/${noval.name}/chapters/data.json`)) {
              await sh.touch("data.json");
              await fs.writeFile(
                `data.json`,
                JSON.stringify({}),
                function (err) {
                  if (err) throw err;
                }
              );
            }
          } catch (error) {
            await sh.echo("CHECK file data error");
          }
          let currentChapterData = {};
          try {
            currentChapterData = require(`./novals/${noval.name}/chapters/data.json`);
          } catch (error) {
            sh.echo(`CREATE data.json`);
            sh.exec(`echo "CREATE data.json"  >> log.txt`);
          }
          const listChapters = await get_list_chapter(
            page,
            sh,
            `./novals/${noval.name}/chapters`
          );
          await browser.close();
          let retry = 0;
          for (
            let c = currentChapterData.chapter || 0;
            c < listChapters?.length;
            c++
          ) {
            try {
              sh.echo(`LEECH chapter ${c + 1} - ${noval.name}`);
              sh.exec(
                `echo "LEECH chapter ${c + 1} - ${noval.name}"  >> ../log.txt`
              );
              sh.touch(`chapter-${c + 1}.md`);
              sh.touch(`chapter-${c + 1}-title.md`);
              const chapterBrowser = await puppeteer.launch();
              const chapterPage = await chapterBrowser.newPage();
              await chapterPage.goto(
                listChapters[c].url || `${noval.url}/chuong-${c + 1}`
              );
              const titleString = await chapterPage.$eval(
                "h5 a.more-chap",
                (element) => element.innerHTML
              );
              const contentString = await chapterPage.$eval(
                "div.box-chap",
                (element) => element.innerHTML
              );
              sh.echo(`writing chapter ${c + 1} to file`);
              sh.exec(`echo "writing chapter ${c + 1} to file"  >> ../log.txt`);
              await fs.writeFile(
                `chapter-${c + 1}-title.md`,
                titleString,
                function (err) {
                  if (err) throw err;
                }
              );
              await fs.writeFile(
                `chapter-${c + 1}.md`,
                contentString,
                function (err) {
                  if (err) throw err;
                }
              );
              sh.echo(`LEECH chapter ${c + 1} done`);
              sh.exec(`echo "LEECH chapter ${c + 1} done"  >> ../log.txt`);
              currentChapterData = {
                chapter: c,
              };
              await fs.writeFile(
                `data.json`,
                JSON.stringify(currentChapterData),
                function (err) {
                  if (err) throw err;
                }
              );
              retry = 0;
              await chapterBrowser.close();
            } catch (error) {
              sh.echo(`IGNORE chapter ${c + 1} by error ${error.message}`);
              sh.exec(
                `echo "IGNORE chapter ${c + 1} by error ${
                  error.message
                }"  >> log.txt`
              );
              if (retry < 3) {
                c--;
                retry++;
              } else {
                retry = 0;
              }
            }
          }
          sh.cd("..");
          sh.echo(`LEECH noval ${noval.name} Done`);
          sh.exec(`echo "LEECH noval ${noval.name} Done"  >> log.txt`);
          
          sh.cd(`..`);
          sh.cd(`..`);
          currentNovals[i].done = true;
          await fs.writeFile(
            `./list.json`,
            JSON.stringify(currentNovals),
            function (err) {
              if (err) throw err;
            }
          );
        } catch (error) {
          sh.echo(`LEECH noval ${noval.name} error`);
          sh.exec(`echo LEECH noval ${noval.name} error >> log.txt`);
        }
      }
      await browser.close();
    } catch (error) {
      sh.echo(`unknown error`);
    }
  }
};
