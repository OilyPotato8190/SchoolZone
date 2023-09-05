const puppeteer = require('puppeteer');
const pdf = require('pdf-parse');
const PdfReader = import('pdfreader');

let password = process.env.PASSWORD;
let username = process.env.USERNAME;

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

      const rowElement = page.$("#reportsTable");
      const rows = getRows(rowElement);
      console.log(rows)

      // const pdfBuffer = await getPDFBuffer(
      //    'https://schoolzone.epsb.ca/cf/profile/progressInterim/Launch.cfm?sequenceNo=52310755&signature=0CB90CFE6528626F10E45CA53E4F4B6506B316F485C90240A9B2E29FE4A043CD'
      // );

      // console.log(await readPDF(pdfBuffer));

      // const text = await getPDFText(
      //    'https://schoolzone.epsb.ca/cf/profile/progressInterim/Launch.cfm?sequenceNo=50768324&signature=624B20BE90C2EA450CB604CC18D34880322505438945FF5323739872D8056EBF'
      // );
   }

   async function readPDF(buffer) {
      let pdfData = [];
      const pdfReader = new (await PdfReader).PdfReader();

      let finish;
      let finishReading = new Promise(function (resolve) {
         finish = resolve;
      });

      pdfReader.parseBuffer(buffer, (_err, item) => {
         if (!item) return finish();
         if (!item.text) return;

         const text = item.text;
         console.log(text);
         if (text.includes('Class')) {
            pdfData.push({ class: text.split(') ')[1].split(' (')[0] });
         } else if (text.includes('Teacher')) {
            pdfData[0].teacher = text.replace('Teacher: ', '');
         } else if (pdfData.length === 1 && text.includes('%') && text.length > 1) {
            pdfData[0].finalMark = text;
         } else if (pdfData.length === 1 && text.includes('Flags')) {
            pdfData.push({}, {});
         } else if (pdfData.length > 1) {
            const index = pdfData.length - 2;

            if (pdfData[index + 1])
               if (text.split('/').length === 3) {
                  pdfData[index].date = text;
               } else if (text === 'Category Summary') {
                  pdfData[index + 1];
               } else if (text.includes('Major') || text.includes('Minor') || text.includes('Formative')) {
                  pdfData[index].type = text.split(' ')[0];
               } else if (!pdfData[index].name && isNaN(text)) {
                  pdfData[index].name = text;
               } else if (text.includes('%') && !isNaN(text.replace('%', ''))) {
                  pdfData[index].mark = text;
                  pdfData.push({});
               }
         }
      });

      await finishReading;
      return pdfData;
   }

   async function getPDFBuffer(url) {
      const pdfArray = await page.evaluate(async (url) => {
         const response = await fetch(url);
         const blob = await response.blob();
         return Array.from(new Uint8Array(await blob.arrayBuffer()));
      }, url);
      return Buffer.from(pdfArray);
      // const pdfData = await pdf(Buffer.from(pdfArray));
      // return pdfData.text;
   }

   function getRows(tableElement) {
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

      const rowElements = Array.from(tableElement);
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
   await login(username, password);
   let progress = await getProgress();
}

main();
