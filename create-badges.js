#!/usr/bin/env node

import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { PDFDocument, PageSizes, StandardFonts, degrees, grayscale, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const args = checkCLIArgs();

// pdf-lib library represent dimensions of page sizes in points.
// In the PDF coordinate system, 72 points equal 1 inch.
const PAGE_HEIGHT = 792; // 11" in points
const PAGE_WIDTH = 612; // 8.5" in points
const X_PADDING = 6;
const Y_PADDING = 4;
const L_PADDING = 14;
const B_PADDING = 10;

const BADGE_SIZE = 189.36; // 2.63" in points
const BADGE_NAME_WIDTH = 100;
const BADGE_TEXT_COLOR = rgb(0.4, 0.1, 0.1);
// const BADGE_TEXT_COLOR = rgb(0, 0, 0);

const pdfDoc = await PDFDocument.create();
pdfDoc.registerFontkit(fontkit)

const badges = await embedBadgeTemplates(pdfDoc);
const plainBadge = badges.find(b => b.regex.test('No title or job'));
// const font = await embedFont(pdfDoc, './fonts/EagleLake-Regular.ttf');
const font = await embedFont(pdfDoc, './fonts/Arial-Bold.ttf');
// const font = await embedFont(pdfDoc, StandardFonts.TimesRomanBold);

const records = await processCSV('./data.csv');

let record = 0;

do {
  let page = pdfDoc.addPage(PageSizes.Letter);

  for(let row = 0; row < 4; row++) {
    for(let col = 0; col < 3; col++) {
      // bottom left coordinate of this badge
      let { x, y } = getXY(row, col);

      const camper = records[record];

      if (!camper) {
        addBadge('', page, x, y);

        continue;
      };

      console.log(`${record}: badge for ${camper.badge_name}`);
      addBadge(camper.badge_title, page, x, y);

      y = placeName(camper.badge_name, page, x, y);
      placePronouns(camper.badge_gender, page, x, y);

      record++;
    }
  }
} while (record < records.length);


writePDF(pdfDoc);



async function embedBadgeTemplates(pdfDoc) {
  const badges = [
    { regex: 'Security', file: './img/template-CC.png' },
    { regex: 'Community Care', file: './img/template-CC.png' },
    { regex: 'Committee', file: './img/template-Comm.png' },
    { regex: 'Instructor', file: './img/template-Instructor.png' },
    { regex: 'Board', file: './img/template-LTA.png' },
    { regex: 'Manager', file: './img/template-Manager.png' },
    { regex: 'Office', file: './img/template-Office.png' },
    { regex: 'Setup', file: './img/template-SetupTear.png' },
    { regex: 'No title or job', file: './img/template-Plain.png' },
    { regex: 'Volunteer', file: './img/template-RegVolunteer.png' },
    { regex: 'Bus Driver', file: './img/template-Bus.png' },
  ];

  await Promise.all(badges.map(async (badge) => {
    const filepath = resolve(badge.file);
    const filebuffer = await readFile(filepath, 'base64');

    const badgeTemplate = await pdfDoc.embedPng(filebuffer);

    badge.file = badgeTemplate;
    badge.regex = new RegExp(badge.regex, 'i');
  }));

  return badges;
}

async function embedFont(pdfDoc, arg) {
  let toEmbed = arg;
  try {
    const filepath = resolve(arg);
    toEmbed = await readFile(filepath);
  } catch(e) {
    // do nothing
  }

  return pdfDoc.embedFont(toEmbed);
}

async function writePDF(pdfDoc) {
  const pdfBytes = await pdfDoc.save();
  await writeFile('badges.pdf', pdfBytes);
}

function getXY(row, col) {
  const x = L_PADDING + (BADGE_SIZE * col) + (X_PADDING * col);
  const y = B_PADDING + (BADGE_SIZE * row) + (Y_PADDING * row);

  return { x, y };
}

function addBadge(title, page, x, y) {
  // let badgeTemplate;
  // 
  // switch (true) {
  //   case badges.cc1.regex.test(title):
  //     badgeTemplate = badges.cc1.file;
  //     break;
  //   case badges.cc2.regex.test(title):
  //     badgeTemplate = badges.cc2.file;
  //     break;
  //   case badges.com.regex.test(title):
  //     badgeTemplate = badges.com.file;
  //     break;
  //   case badges.instructor.regex.test(title):
  //     badgeTemplate = badges.instructor.file;
  //     break;
  //   case badges.board.regex.test(title):
  //     badgeTemplate = badges.board.file;
  //     break;
  //   case badges.manager.regex.test(title):
  //     badgeTemplate = badges.manager.file;
  //     break;
  //   case badges.office.regex.test(title):
  //     badgeTemplate = badges.office.file;
  //     break;
  //   case badges.setup.regex.test(title):
  //     badgeTemplate = badges.setup.file;
  //     break;
  //   case badges.volunteer.regex.test(title):
  //     badgeTemplate = badges.volunteer.file;
  //     break;
  //   case badges.bus.regex.test(title):
  //     badgeTemplate = badges.bus.file;
  //     break;

  //   default:
  //     badgeTemplate = badges.plain.file;
  //     break;
  // }

  const badgeTemplate = (badges.find(b => b.regex.test(title)) || plainBadge).file;

  page.drawImage(badgeTemplate, {
    x, y,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  });
}

async function processCSV(filename) {
  const filebuffer = await readFile(filename, 'utf8');

  const records = parse(filebuffer.toString(), {
    columns: true,
    skip_empty_lines: true
  });

  return records;
}

function placePronouns(pn, page, x, y) {
  if (!pn) return;

  const pronoun = `(${pn})`;
  const size = 14;
  const X_CENTER = x + BADGE_SIZE / 2;
  const width = font.widthOfTextAtSize(pronoun, size);

  page.drawText(pronoun, {
    x: X_CENTER - (width / 2),
    y: y - 24,
    size,
    font,
    color: BADGE_TEXT_COLOR,
  });
}

function placeName(name, page, x, y) {
  const X_CENTER = x + BADGE_SIZE / 2;

  let nameParts = name.replace(/\s*/, ' ').trim().split(' ');
  nameParts = [nameParts[0], nameParts.slice(1).join(' ')];

  let currentY = y + 115;

  let size = 30;
  for (let i = 0; i < nameParts.length; i++) {
    const name = nameParts[i];
    const {
      fontSize,
      width,
    } = findStringSize(name, size, font, BADGE_NAME_WIDTH);
    size = fontSize;

    let spacing = 1;
    if (font.name === 'EagleLake-Regular') spacing = 0.8;
    currentY -= font.heightAtSize(size) * spacing * i;

    const textx = X_CENTER - (width / 2);
    const texty = currentY;

    page.drawText(name, {
      x: textx + 1,
      y: texty - 1,
      size: size,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    page.drawText(name, {
      x: textx + 0.5,
      y: texty - 0.5,
      size: size,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(name, {
      x: textx,
      y: texty,
      size,
      font,
      color: BADGE_TEXT_COLOR,
    });

    size = size * 0.8;
  }

  return currentY;
}

function findStringSize(string, startSize, font, widthLimit) {
  let width = 0;
  let fontSize = startSize + 1;
  do {
    fontSize--;
    width = font.widthOfTextAtSize(string, fontSize);
  } while (width > widthLimit);

  return { fontSize, width };
}

function checkCLIArgs() {
  const args = process.argv.slice(2);

  return args;
}
