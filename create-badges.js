#!/usr/bin/env node

import {
  checkCLIArgs,
  createPdfDoc,
  embedBadgeTemplates,
  processCSV,
  writePDF,
  addBadge,
  placeName,
  placePronouns,
} from './shared.js';

checkCLIArgs(process.argv);

const { pdfDoc, addPage, embedFont } = await createPdfDoc();
const badges = await embedBadgeTemplates(pdfDoc);
const font = await embedFont('./fonts/Arial-Bold.ttf');

const plainBadge = badges.find(b => b.regex.test('No title or job'));
const records = await processCSV('./data.csv');

let record = 0;

do {
  let page = addPage();

  // starts bottom left coordinate
  for(let row = 0; row < 4; row++) {
    for(let col = 0; col < 3; col++) {

      const camper = records[record];

      if (!camper) {
        addBadge(plainBadge.file, page, row, col);

        continue;
      };

      const badgeTemplate = (badges.find(b => b.regex.test(camper.badge_title)) || plainBadge).file;

      console.log(`${record}: badge for ${camper.badge_name}`);
      addBadge(badgeTemplate, page, row, col);

      const { x, y } = placeName(camper.badge_name, page, font, row, col);
      placePronouns(camper.badge_gender, page, font, x, y);

      record++;
    }
  }
} while (record < records.length);


writePDF(pdfDoc, 'badges.pdf');
