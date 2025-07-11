#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

import {
  checkCLIArgs,
  createPdfDoc,
  getXY,
  BADGE_SIZE,
  writePDF,
} from './shared.js';

const args = checkCLIArgs(process.argv);

const { pdfDoc, page } = await createPdfDoc();


const filepath = resolve('./img/template-Plain.png');
const filebuffer = await readFile(filepath, 'base64');

const badgeTemplate = await pdfDoc.embedPng(filebuffer);

for(let row = 0; row < 4; row++) {
  for(let col = 0; col < 3; col++) {
    // bottom left coordinate of this badge
    let { x, y } = getXY(row, col);

    page.drawImage(badgeTemplate, {
      x, y,
      width: BADGE_SIZE,
      height: BADGE_SIZE,
    });
  }
}


writePDF(pdfDoc, 'blank-badges.pdf');


