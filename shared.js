import { PDFDocument, PageSizes, StandardFonts, degrees, grayscale, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFile, readFile } from 'node:fs/promises';

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

  const page = pdfDoc.addPage(PageSizes.Letter);

  return { pdfDoc, page };
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

export function addBadge(page, x, y) {
  page.drawImage(badgeTemplate, {
    x, y,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
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

export function placePronouns(pn, page, x, y) {
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

export function placeName(name, page, x, y) {
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
