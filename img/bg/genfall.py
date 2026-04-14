from PIL import Image

# Config
FRAME_SIZE = 128
GRID_SIZE = 4
SHEET_SIZE = FRAME_SIZE * GRID_SIZE

# Parametri fisici
gravity = 1.38
drag = 0.90
max_speed = 20

# Carica immagini
apertura = Image.open("apertura.png").convert("RGBA")
colors = Image.open("norms.png").convert("RGBA")
mask = Image.open("mask.png").convert("RGB")

# Output
output = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE))
output.paste(apertura, (0, 0))

velocity = 0
offset = 0

for row in range(GRID_SIZE):
    for col in range(GRID_SIZE):

        # Aggiorna fisica
        velocity += gravity
        velocity *= drag
        if velocity > max_speed:
            velocity = max_speed

        offset += velocity
        S = int(offset)

        x0 = col * FRAME_SIZE
        y0 = row * FRAME_SIZE

        visible_height = max(0, FRAME_SIZE - S)
        if visible_height <= 0:
            continue

        color_crop = colors.crop((x0, y0, x0 + FRAME_SIZE, y0 + visible_height))
        mask_crop = mask.crop((x0, y0, x0 + FRAME_SIZE, y0 + visible_height))

        for y in range(visible_height):
            for x in range(FRAME_SIZE):

                # Check maschera
                if mask_crop.getpixel((x, y))[0] < 127:

                    src = color_crop.getpixel((x, y))  # RGBA
                    dst = output.getpixel((x0 + x, y0 + y + S))

                    src_r, src_g, src_b, src_a = src
                    dst_r, dst_g, dst_b, dst_a = dst

                    # Normalizza alpha
                    a = src_a / 255.0
                    inv_a = 1.0 - a

                    # Alpha compositing
                    out_r = int(src_r * a + dst_r * inv_a)
                    out_g = int(src_g * a + dst_g * inv_a)
                    out_b = int(src_b * a + dst_b * inv_a)

                    # Alpha finale (standard "over")
                    out_a = int(src_a + dst_a * inv_a)

                    out_x = x0 + x
                    out_y = y0 + y + S

                    if out_y < SHEET_SIZE:
                        output.putpixel((out_x, out_y), (out_r, out_g, out_b, out_a))

# Salva
output.save("output.png")
print("Spritesheet generato con alpha compositing!")
