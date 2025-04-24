#!/usr/bin/env node

import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { PDFDocument, PageSizes, degrees, grayscale, rgb } from 'pdf-lib';
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
const BADGE_NAME_HEIGHT= 40;

const pdfDoc = await PDFDocument.create();
pdfDoc.registerFontkit(fontkit)

const badgeTemplate = await embedBadgeTemplate(pdfDoc);
const eagleLakeFont = await embedEagleLakeFont(pdfDoc);


const records = await processCSV('./data.csv');

let record = 0;

do {
  let page = addPage();

  for(let row = 0; row < 4; row++) {
    for(let col = 0; col < 3; col++) {
      // bottom left coordinate of this badge
      let { x, y } = getXY(row, col);

      const camper = records[record];

      if (!camper) continue;

      console.log(`${record}: badge for ${camper.badge_name}`);

      y = setName(camper.badge_name, page, x, y);
      setPronouns(camper.badge_gender, page, x, y);

      record++;
    }
  }
} while (record < records.length);


writePDF(pdfDoc);



async function embedBadgeTemplate(pdfDoc, filename = './img/badge-template.jpg') {
  const filepath = resolve(filename);
  const filebuffer = await readFile(filepath, 'base64');

  const badgeTemplate = await pdfDoc.embedJpg(filebuffer);

  return badgeTemplate;
}

async function embedEagleLakeFont(pdfDoc, filename = './fonts/EagleLake-Regular.ttf') {
  const filepath = resolve(filename);
  const filebuffer = await readFile(filepath);

  const eagleLakeFont = await pdfDoc.embedFont(filebuffer);

  return eagleLakeFont;
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

function addPage() {
  const page = pdfDoc.addPage(PageSizes.Letter);

  // Create grid of badges
  for(let row = 0; row < 4; row++) {
    for(let col = 0; col < 3; col++) {
      const { x, y } = getXY(row, col);
      page.drawImage(badgeTemplate, {
        x, y,
        width: BADGE_SIZE,
        height: BADGE_SIZE,
      });
    }
  }

  return page;
}

async function processCSV(filename) {
  const filebuffer = await readFile(filename, 'utf8');

  const records = parse(filebuffer.toString(), {
    columns: true,
    skip_empty_lines: true
  });

  return records;
}

function setPronouns(pn, page, x, y) {
  if (!pn) return;

  const pronoun = `(${pn})`;
  const size = 14;
  const X_CENTER = x + BADGE_SIZE / 2;
  const width = eagleLakeFont.widthOfTextAtSize(pronoun, size);

  page.drawText(pronoun, {
    x: X_CENTER - (width / 2),
    y: y - 24,
    size,
    font: eagleLakeFont,
  });
}

function setName(name, page, x, y) {
  const X_CENTER = x + BADGE_SIZE / 2;

  const nameParts = name.trim().split(' ', 2);

  let currentY = y + 115;

  let size = 24;
  for (let i = 0; i < nameParts.length; i++) {
    const name = nameParts[i];
    const {
      fontSize,
      width,
    } = findStringSize(name, size, eagleLakeFont, BADGE_NAME_WIDTH);
    size = fontSize;

    currentY -= eagleLakeFont.heightAtSize(size) * 0.8 * i;

    page.drawText(name, {
      x: X_CENTER - (width / 2),
      y: currentY,
      size,
      font: eagleLakeFont,
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
