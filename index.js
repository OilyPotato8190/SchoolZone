const puppeteer = require('puppeteer');
const pdf = require('pdf-parse');

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

      const rows = await page.evaluate(getRows);

      const text = await getPDFText(
         'https://schoolzone.epsb.ca/cf/profile/progressInterim/Launch.cfm?sequenceNo=50768324&signature=624B20BE90C2EA450CB604CC18D34880322505438945FF5323739872D8056EBF'
      );
   }

   async function getPDFText(url) {
      const pdfArray = await page.evaluate(async (url) => {
         const response = await fetch(url);
         const blob = await response.blob();
         return Array.from(new Uint8Array(await blob.arrayBuffer()));
      }, url);
      const pdfData = await pdf(Buffer.from(pdfArray));
      return pdfData.text;
   }

   function getRows() {
      function getRowData(row) {
         let rowData = {};

         const cells = Array.from(row.querySelectorAll('td'));
         if (!cells.length) return;

         for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];

            switch (j) {
               case 0:
                  if (cell.textContent != 'Interim Marks') return;
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
               case 5:
                  rowData.studentViewed = cell.textContent;
                  break;
            }
         }

         return rowData;
      }

      const rowElements = Array.from(document.querySelectorAll('#reportsTable tr'));
      let rows = [];

      for (let i = 0; i < rowElements.length; i++) {
         const rowData = getRowData(rowElements[i]);
         if (rowData) {
            rows.push(rowData);
         }
      }
      return rows;
   }

   const browser = await puppeteer.launch({ headless: 'new' });
   const page = await browser.newPage();
   page.on('console', (message) => console.log(message.text()));
   await login('o.schneider', 'KjvFSNMHbhAC8q');
   let progress = await getProgress();
}

main();
