import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { parse } from 'csv-parse/sync';
import fontkit from '@pdf-lib/fontkit';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const badgeConfig = [
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

export const timesRomanBold = StandardFonts.TimesRomanBold;

// pdf-lib library represent dimensions of page sizes in points.
// In the PDF coordinate system, 72 points equal 1 inch.
export const PAGE_HEIGHT = 792; // 11" in points
export const PAGE_WIDTH = 612; // 8.5" in points
export const X_PADDING = 6;
export const Y_PADDING = 4;
export const L_PADDING = 14;
export const B_PADDING = 10;

export const BADGE_SIZE = 189.36; // 2.63" in points
export const BADGE_NAME_WIDTH = 100;
export const BADGE_TEXT_COLOR = rgb(0.4, 0.1, 0.1);

export async function createPdfDoc() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const addPage = () => pdfDoc.addPage(PageSizes.Letter);
  // const embedFont = async (font) => embedFont(pdfDoc, './fonts/Arial-Bold.ttf')
  const embedFont = async (arg) => {
    let toEmbed = arg;
    try {
      const filepath = resolve(arg);
      toEmbed = await readFile(filepath);
    } catch(e) { // eslint-disable-line no-unused-vars
      // do nothing, assume this is a standard font
    }

    return pdfDoc.embedFont(toEmbed);
  };

  return { pdfDoc, addPage, embedFont };
}

export async function writePDF(pdfDoc, filename) {
  const pdfBytes = await pdfDoc.save();
  await writeFile(filename, pdfBytes);
}

export function getXY(row, col) {
  const x = L_PADDING + (BADGE_SIZE * col) + (X_PADDING * col);
  const y = B_PADDING + (BADGE_SIZE * row) + (Y_PADDING * row);

  return { x, y };
}

export function addBadge(badgeTemplate, page, row, col) {
  const { x, y } = getXY(row, col);

  page.drawImage(badgeTemplate, {
    x, y,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  });
}

export function placeName(name, page, font, row, col) {
  let { x, y } = getXY(row, col);

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

  return { x, y: currentY };
}

export function placePronouns(pn, page, font, x, y) {
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

export async function processCSV(filename) {
  const filebuffer = await readFile(filename, 'utf8');

  const records = parse(filebuffer.toString(), {
    columns: true,
    skip_empty_lines: true
  });

  return records;
}


export function findStringSize(string, startSize, font, widthLimit) {
  let width = 0;
  let fontSize = startSize + 1;
  do {
    fontSize--;
    width = font.widthOfTextAtSize(string, fontSize);
  } while (width > widthLimit);

  return { fontSize, width };
}

export function checkCLIArgs(argv) {
  const args = argv.slice(2);

  return args;
}

export async function embedBadgeTemplates(pdfDoc) {
  const badges = [];

  await Promise.all(badgeConfig.map(async (b) => {
    const filepath = resolve(b.file);
    const filebuffer = await readFile(filepath, 'base64');

    const badgeTemplate = await pdfDoc.embedPng(filebuffer);

    badges.push({
      file: badgeTemplate,
      regex: new RegExp(b.regex, 'i'),
    });
  }));

  return badges;
}
