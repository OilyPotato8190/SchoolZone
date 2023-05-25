const puppeteer = require('puppeteer');

async function main() {
   async function login(username, password) {
      await page.goto('https://schoolzone.epsb.ca/cf/index.cfm');
      if ((await page.title()) != 'SchoolZone - Sign In') return console.log('already logged in');
      await page.type('#userID', username);
      await page.type('#loginPassword', password);
      await page.click('input[name="btnSignIn"]');
      console.log('login success');
   }

   async function getProgress() {
      await page.goto('https://schoolzone.epsb.ca/cf/profile/progressInterim/index.cfm');
      await page.waitForSelector('#reportsTable tr');

      const rows = await page.evaluate(() => {
         const rowElements = Array.from(document.querySelectorAll('#reportsTable tr'));
         let rows = [];

         for (let i = 0; i < rowElements.length; i++) {
            const row = rowElements[i];
            let rowData = {};

            const cells = Array.from(row.querySelectorAll('td'));
            for (let j = 0; j < cells.length; j++) {
               const cell = cells[j];

               switch (j) {
                  case 0:
                     rowData.category = cell.textContent;
                     break;
                  case 1:
                     rowData.class = cell.textContent;
                     break;
                  case 2:
                     rowData.date = cell.textContent;
                     break;
                  case 3:
                     let href = cell.querySelector('a').getAttribute('href');
                     let link = 'https://schoolzone.epsb.ca/cf/profile/progressInterim/Launch.cfm?' + href.slice(25, -12);
                     rowData.report = link;
                     break;
                  case 4:
                     rowData.parentViewed = cell.textContent;
                     break;
                  case 5:
                     rowData.studentViewed = cell.textContent;
                     break;
               }
            }
            rows.push(rowData);
         }
         return rows;
      });
      console.log(rows);
   }

   const browser = await puppeteer.launch({ headless: 'new' });
   const page = await browser.newPage();
   page.on('console', (message) => console.log(message.text()));
   await login('o.schneider', 'KjvFSNMHbhAC8q');
   let progress = await getProgress();
}

main();
