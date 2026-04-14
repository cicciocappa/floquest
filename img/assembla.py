#!/usr/bin/env python3
"""
Assembla immagini singole in uno spritesheet a griglia.

Uso:
  python make_spritesheet.py <cartella_frame> <output.png> [--cols 8] [--size 64]

Esempio:
  python make_spritesheet.py ./color_frames spritesheet_color.png --cols 8 --size 64
  python make_spritesheet.py ./normal_frames spritesheet_normal.png --cols 8 --size 64

I frame vengono ordinati alfabeticamente/numericamente.
Se --size è specificato, ogni frame viene ridimensionato a size x size pixel.
"""

import argparse
import math
import os
import sys
from PIL import Image


def find_frames(folder):
    extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tga", ".tiff"}
    frames = []
    for f in os.listdir(folder):
        if os.path.splitext(f)[1].lower() in extensions:
            frames.append(os.path.join(folder, f))
    frames.sort()
    return frames


def make_spritesheet(frames, output_path, cols, size=None):
    if not frames:
        print("Nessun frame trovato.")
        sys.exit(1)

    n = len(frames)
    rows = math.ceil(n / cols)

    # Carica il primo frame per determinare le dimensioni
    sample = Image.open(frames[0])
    if size:
        fw, fh = size, size
    else:
        fw, fh = sample.size
    sample.close()

    print(f"Frame trovati: {n}")
    print(f"Griglia: {cols} x {rows}")
    print(f"Dimensione frame: {fw} x {fh}")
    print(f"Dimensione spritesheet: {cols * fw} x {rows * fh}")

    sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))

    for i, path in enumerate(frames):
        img = Image.open(path).convert("RGBA")
        if size:
            img = img.resize((fw, fh), Image.LANCZOS)

        col = i % cols
        row = i // cols
        sheet.paste(img, (col * fw, row * fh))
        img.close()

    sheet.save(output_path)
    print(f"Spritesheet salvato: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Assembla frame in spritesheet")
    parser.add_argument("folder", help="Cartella con i frame")
    parser.add_argument("output", help="File di output (PNG)")
    parser.add_argument("--cols", type=int, default=8, help="Colonne nella griglia (default: 8)")
    parser.add_argument("--size", type=int, default=None, help="Ridimensiona ogni frame a NxN pixel")
    args = parser.parse_args()

    frames = find_frames(args.folder)
    make_spritesheet(frames, args.output, args.cols, args.size)


if __name__ == "__main__":
    main()
