const puppeteer = require('puppeteer');
const fs = require('fs');
const moment = require('moment/moment');
var shell = require('shelljs');
const currentLogData = require("./leech-logs/log.json");
let currentNovals = require("./list.json");

const ttvRoot = "https://truyen.tangthuvien.vn/"
const ttvCategories = "the-loai"
const ttvCategoryPaths = [
  "tien-hiep",
  "huyen-huyen",
  "do-thi",
  "khoa-huyen",
  "ky-huyen",
  "vo-hiep",
  "lich-su",
  "dong-nhan",
  "quan-su",
  "du-hi",
  "canh-ky",
  "linh-di"
]
const ttvSearchPath = "https://truyen.tangthuvien.vn/tong-hop?rank=vw&page="

module.exports = (async (ignoreContent = false) => {
  const rememberData = currentLogData || {
    totalPage: 0,
    currentPage: 1,
  };
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(ttvSearchPath);
  const searchValue = await page.$$('ul.pagination li a', (element) => {
    return element
  });
  const lastPageUrl = await (await searchValue[searchValue.length - 2].getProperty("href")).jsonValue();
  totalPage = rememberData.totalPage || parseInt((new URLSearchParams((new URL(lastPageUrl)).search)).get("page"));
  shell.cd("novals");
  for (let p = (currentLogData.currentPage || 1); p <= (currentLogData.totalPage || totalPage); p++) {
    shell.echo(
      `>>LOAD PAGE ${p} - ${moment().format("YYYY-MM-DD HH:mm:ss.sssZ")}<<`
    );
    shell.exec(
      `echo "LOAD PAGE ${ttvSearchPath}${p} - ${moment().format(
        "YYYY-MM-DD HH:mm:ss.sssZ"
      )}" >> ../leech-logs/last.txt`
    );
    await page.goto(`${ttvSearchPath}${p}`);
    try {
      // await page.evaluate(() => window.scrollTo(0, Number.MAX_SAFE_INTEGER));
      // await page.waitForTimeout(setTimeout(() => {}, 50));
      const novalsInfo = await page.$$("div.book-img-text ul li", (element) => {
        return element.asElement();
      });
      for (let index = 0; index < novalsInfo.length; index++) {
        try {
          shell.echo(
            `>>GET NOVAL SUMMARY INFO ${index + 1} - ${moment().format(
              "YYYY-MM-DD HH:mm:ss.sssZ"
            )}<<`
          );
          shell.exec(
            `echo "GET NOVAL SUMMARY INFO ${index + 1} - ${moment().format(
              "YYYY-MM-DD HH:mm:ss.sssZ"
            )}" >> ../leech-logs/last.txt`
          );
          const novalInfoJSNode = novalsInfo[index];
          let novalName = await novalInfoJSNode.$eval(
            ".book-mid-info h4 a",
            (element) => element.innerText
          )
          if (!novalName) {
            novalName = "no-name"
          }
          const ttvUrl = await novalInfoJSNode.$eval(
            ".book-img-box a",
            (element) => element.getAttribute("href")
          )
          const listText = ttvUrl?.split("/") || [];
          if (typeof currentNovals === "string") {
            currentNovals = [];
          }
          const fIndex = currentNovals.findIndex(item => item.id === listText[listText.length - 1]);
          if (fIndex < 0) {
            currentNovals.push(
              {
                id: listText[listText.length - 1],
                url: ttvUrl,
                name: novalName
              }
            );
            await fs.writeFile(
              `../list.json`,
              JSON.stringify(currentNovals),
              function (err) {
                if (err) throw err;
              }
            );
            if (!ignoreContent) {
              const novalInfo = {
                // imageThumb: await novalInfo.$eval(".book-img-box a img", (element) => element.getAttribute("src"));
                ttvUrl,
                imageAlt: await novalInfoJSNode.$eval(
                  ".book-img-box a img",
                  (element) => element.getAttribute("alt")
                ),
                name: novalName,
                category: ttvCategoryPaths.find(async (item) =>
                  (
                    await novalInfoJSNode.$eval(
                      ".author a[data-eid=qd_C42]",
                      (element) => element.getAttribute("href")
                    )
                  ).includes(item)
                ),
                author: {
                  image: await novalInfoJSNode.$eval(
                    ".book-mid-info .author img",
                    (element) => element.getAttribute("src")
                  ),
                  name: await novalInfoJSNode.$eval(
                    ".book-mid-info .author img",
                    (element) => element.innerText
                  ),
                },
                status: await novalInfoJSNode.$eval(
                  ".book-mid-info span",
                  (element) => element.innerText
                ),
                chapterAmount: await novalInfoJSNode.$eval(
                  ".book-mid-info span span",
                  (element) => element.innerText
                ),
                description: await novalInfoJSNode.$eval(
                  ".book-mid-info .intro",
                  (element) => element.innerText
                ),
                updated: moment(
                  await novalInfoJSNode.$eval(
                    ".book-mid-info .update span",
                    (element) => element.innerText
                  ),
                  "YYYY-MM-DD HH:mm:ss"
                ).unix(),
              };
              shell.echo(
                `>>WRITING DATA SUMMARY INFO ${novalName} - ${moment().format(
                  "YYYY-MM-DD HH:mm:ss.sssZ"
                )}<<`
              );
              shell.echo(
                `echo "WRITING DATA SUMMARY INFO ${
                  novalName
                } - ${moment().format(
                  "YYYY-MM-DD HH:mm:ss.sssZ"
                )}" >> ./leech-logs/last.txt`
              );
              try {
                shell.mkdir(novalName);
                shell.cd(novalName);
                await fs.writeFile(
                  `sortInfo.json`,
                  JSON.stringify(novalInfo),
                  function (err) {
                    if (err) throw err;
                  }
                );
                shell.cd("..");
              } catch(error) {
  
              }
              shell.echo(
                `>>>>>DONE WRITING DATA SUMMARY INFO ${
                  novalName
                } - ${moment().format("YYYY-MM-DD HH:mm:ss.sssZ")}<<<<<`
              );
              shell.exec(
                `echo "DONE WRITING DATA SUMMARY INFO ${
                  novalName
                } - ${moment().format(
                  "YYYY-MM-DD HH:mm:ss.sssZ"
                )}" >> ../leech-logs/last.txt`
              );
            } 
          } else {
            shell.exec(
              `echo "UPDATE noval name ${
                novalName
              } - ${moment().format(
                "YYYY-MM-DD HH:mm:ss.sssZ"
              )}" >> ../leech-logs/last.txt`
            );
            currentNovals[fIndex].name = novalName;
            await fs.writeFile(
              `../list.json`,
              JSON.stringify(currentNovals),
              function (err) {
                if (err) throw err;
              }
            );
            shell.exec(
              `echo "IGNORE WRITING DATA SUMMARY INFO ${
                novalName
              } - ${moment().format(
                "YYYY-MM-DD HH:mm:ss.sssZ"
              )}" >> ../leech-logs/last.txt`
            );
          }
          
        } catch (error) {
          shell.echo(
            `>>>>>GET NOVAL SUMMARY INFO ERROR: ${
              error?.message
            } - ${moment().format("YYYY-MM-DD HH:mm:ss.sssZ")}<<<<<`
          );
          shell.exec(
            `echo "GET NOVAL SUMMARY INFO ERROR: ${
              error?.message
            } - ${moment().format(
              "YYYY-MM-DD HH:mm:ss.sssZ"
            )}" >> ../leech-logs/last.txt`
          );
        }
      }
      rememberData.currentPage = p;
      const logFileName = `log.json`;
      await fs.writeFile(
        `../leech-logs/${logFileName}`,
        JSON.stringify(rememberData),
        function (err) {
          if (err) throw err;
        }
      );
    } catch (error) {
      shell.echo(`>>>>>GET PAGE DATA ERROR: ${error?.message}<<<<<`);
    }
  }
  shell.echo(`>>>>>LEECH DONE!!<<<<<`);
  await browser.close();
});