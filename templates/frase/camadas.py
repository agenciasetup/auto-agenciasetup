# Camadas do café (ou de outro objeto visto de cima) para o post de frase, a partir da foto sobre fundo preto puro e do
# recorte dela (scripts/recortar.mjs). Pedido do dono em 29/10/2026: o fundo e o café separados, sem recorte redondo.
#   <nome>-luz.jpg     a foto com os pretos fechados e só a região da xícara e do vapor (borda bem suave): entra no
#                      modo tela, então o preto some e fica a fumaça, sem disco nem borda
#   <nome>-xicara.png  o recorte, por cima
#   caixas.json        onde a xícara está na foto (frações: esquerda, topo, direita, baixo), para alinhar no post
# Uso (com o Python do recorte): _local/recorte/venv/Scripts/python.exe -I templates/frase/camadas.py <pasta>
#   <pasta>/<nome>.png (a foto) e <pasta>/recorte/<nome>.png (o recorte). Saída na mesma pasta.
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

LADO = 1200        # tamanho de saída (o post usa até uns 900 px da foto)
PRETO = 0.06       # abaixo disso vira preto de verdade (tira o cinza do fundo que não é 100% preto)

pasta = Path(sys.argv[1])
caixas = {}
for foto in sorted(pasta.glob('*.png')):
    nome = foto.stem
    if nome.endswith('-xicara'):
        continue  # saída deste script, não é foto
    rec = pasta / 'recorte' / f'{nome}.png'
    if not rec.exists():
        print(f'{nome}: sem recorte, pulei')
        continue
    img = Image.open(foto).convert('RGB')
    xic = Image.open(rec).convert('RGBA').resize(img.size)
    a = np.asarray(xic)[:, :, 3]
    ys, xs = np.where(a > 128)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    x0, x1, y0, y1 = int(x0), int(x1), int(y0), int(y1)
    W, H = img.size
    w, h = x1 - x0, y1 - y0
    caixas[nome] = [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)]

    # Região do vapor (sobe do meio da xícara e vai um pouco para a direita), com a borda bem desfocada. Começa depois
    # da borda esquerda da xícara: luz de canto que a foto às vezes traz (fundo que não é 100% preto) não vaza.
    m = Image.new('L', img.size, 0)
    caixa = (int(x0 + 0.18 * w), max(0, int(y0 - 1.1 * h)), min(W, int(x1 + 0.3 * w)), int(y0 + 0.5 * h))
    m.paste(255, caixa)
    m = m.filter(ImageFilter.GaussianBlur(0.16 * w))
    v = np.asarray(img).astype(np.float32) / 255
    v = np.clip((v - PRETO) / (1 - PRETO), 0, 1) * (np.asarray(m).astype(np.float32)[:, :, None] / 255)
    Image.fromarray((v * 255).astype(np.uint8)).resize((LADO, LADO), Image.LANCZOS).save(pasta / f'{nome}-luz.jpg', quality=92)
    xic.resize((LADO, LADO), Image.LANCZOS).save(pasta / f'{nome}-xicara.png', optimize=True)
    print(f'{nome}: caixa {caixas[nome]}')

(pasta / 'caixas.json').write_text(json.dumps(caixas, indent=1))
