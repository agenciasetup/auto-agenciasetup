# Folha de conferência: as imagens de uma pasta lado a lado, com o nome em cima. Serve para mostrar as opções de foto ao
# Filipe antes de montar e para olhar as capas de um lote juntas.
# Uso: python templates/carrossel/ferramentas/folha.py <pasta> <saida.jpg> [colunas]
import glob
import os
import sys

from PIL import Image, ImageDraw

pasta, saida, colunas = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 5
fora = ('previa', 'zoom-', 'capa-')  # numa pasta de slides, só os slides
arqs = sorted(f for f in glob.glob(os.path.join(pasta, '*.*')) if f.lower().endswith(('.png', '.jpg', '.webp')) and not os.path.basename(f).startswith(fora))
W, H = 300, 370
linhas = (len(arqs) + colunas - 1) // colunas
fo = Image.new('RGB', (colunas * W, linhas * (H + 20)), (30, 30, 30))
d = ImageDraw.Draw(fo)
for i, f in enumerate(arqs):
    im = Image.open(f).convert('RGB').resize((W, H))
    x, y = (i % colunas) * W, (i // colunas) * (H + 20)
    fo.paste(im, (x, y + 20))
    d.text((x + 4, y + 4), os.path.basename(f), fill=(255, 255, 255))
fo.save(saida, quality=85)
print(saida, len(arqs))
