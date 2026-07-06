export interface Cell {
  char: string;
  fg: string;
  bold: boolean;
}

export class Grid {
  width: number;
  height: number;
  cells: Cell[][];

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.cells = [];
    this.clear();
  }

  clear() {
    this.cells = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ char: " ", fg: "", bold: false }))
    );
  }

  set(x: number, y: number, char: string, fg = "", bold = false) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.cells[y][x] = { char: char[0] || " ", fg, bold };
    }
  }

  drawString(x: number, y: number, str: string, fg = "", bold = false) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], fg, bold);
    }
  }

  drawBox(x: number, y: number, w: number, h: number, title = "", borderFg = "\x1b[90m") {
    // top
    this.drawString(x, y, "┌" + "─".repeat(w - 2) + "┐", borderFg);
    // bottom
    this.drawString(x, y + h - 1, "└" + "─".repeat(w - 2) + "┘", borderFg);
    // sides
    for (let row = y + 1; row < y + h - 1; row++) {
      this.set(x, row, "│", borderFg);
      this.set(x + w - 1, row, "│", borderFg);
    }
    // title
    if (title) {
      const paddedTitle = ` ${title} `;
      this.drawString(x + 2, y, paddedTitle, borderFg, true);
    }
  }

  drawWrappedText(x: number, y: number, w: number, h: number, text: string, fg = "", bold = false) {
    const paragraphs = text.split("\n");
    let row = y;
    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let line = "";
      for (const word of words) {
        if (line.length + word.length + 1 > w) {
          this.drawString(x, row, line.trim(), fg, bold);
          line = word + " ";
          row++;
          if (row >= y + h) {
            break;
          }
        } else {
          line += word + " ";
        }
      }
      if (row >= y + h) {
        break;
      }
      if (line.trim()) {
        this.drawString(x, row, line.trim(), fg, bold);
        row++;
      } else if (paragraph === "") {
        row++;
      }
      if (row >= y + h) {
        break;
      }
    }
  }

  toString(): string {
    let out = "";
    out += "\x1b[?25l"; // Hide cursor
    out += "\x1b[H"; // Move cursor to 0,0

    for (let y = 0; y < this.height; y++) {
      let currentRow = "";
      let currentFg = "";
      let currentBold = false;
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        if (cell.fg !== currentFg || cell.bold !== currentBold) {
          currentRow += "\x1b[0m"; // reset
          if (cell.fg) {
            currentRow += cell.fg;
          }
          if (cell.bold) {
            currentRow += "\x1b[1m";
          }
          currentFg = cell.fg;
          currentBold = cell.bold;
        }
        currentRow += cell.char;
      }
      out += currentRow;
      if (y < this.height - 1) {
        out += "\n";
      }
    }
    out += "\x1b[0m"; // final reset
    out += "\x1b[?25h"; // Show cursor
    return out;
  }
}
