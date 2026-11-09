"""Tratamento pontual de imagem no computador: apagar um detalhe, ampliar, ajustar luz e cor.

Nada sai daqui: os modelos rodam na placa (NVIDIA), com a CPU de reserva.

Uso (o atalho acha o Python do ambiente):
  node scripts/tratar.mjs apagar <img> (--caixa x,y,w,h | --mascara m.png) [saida] [--ignorar x,y,w,h] [--redondo]
  node scripts/tratar.mjs ampliar <img> [--escala 2] [--modelo geral] [--ruido 0.2] [saida]
  node scripts/tratar.mjs ajustar <img> [--brilho N] [--contraste N] [--saturacao N] [--temperatura N] [--nitidez N] [saida]
  node scripts/tratar.mjs comparar <antes> <depois> [saida.jpg] [--caixa x,y,w,h] [--vezes 3]
  node scripts/tratar.mjs editor [img] [--clique]     (IOPaint no navegador: pincel, apagar, ampliar)
  node scripts/tratar.mjs --modelos                   (lista os modelos e as licenças)
Direto:
  _local/tratar/venv/Scripts/python.exe -I scripts/tratar.py <comando> ...

Regras para todos:
- A saída nunca sobrescreve a entrada, a não ser com --no-lugar.
- PNG com transparência continua com transparência: "apagar" mexe só no RGB e deixa o alfa como
  estava; "ampliar" amplia o alfa à parte; "ajustar" não toca no alfa.
- Sem restauração de rosto nem alisamento de pele: o dono reprovou (mudou o rosto dele).
- Pesos baixados uma vez das releases oficiais no GitHub, em _local/tratar/modelos (fora do Git).
- Instalar o ambiente: node scripts/tratar.mjs --instalar
"""
import argparse
import hashlib
import os
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / '_local' / 'tratar'
MODELOS_DIR = PASTA / 'modelos'
# O mesmo lugar que o editor (iopaint --model-dir) usa: os pesos baixam uma vez só para os dois.
os.environ.setdefault('XDG_CACHE_HOME', str(MODELOS_DIR))
os.environ.setdefault('HF_HOME', str(MODELOS_DIR / 'huggingface'))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
os.environ.setdefault('TRANSFORMERS_VERBOSITY', 'error')

EXTENSOES = {'.png', '.jpg', '.jpeg', '.webp'}

# Apagar (inpainting). Todos liberados para uso comercial.
APAGADORES = {
    'lama': 'Padrão. LaMa (big-lama, Samsung AI, Apache 2.0): pele, tecido e fundo naturais no lugar do que sai.',
    'migan': 'MI-GAN (Picsart, MIT): mais leve; bom em fundo, um pouco pior em pele.',
    'opencv': 'OpenCV Telea (Apache 2.0): sem rede neural, só para risco fino em área lisa.',
}

# Ampliar. Real-ESRGAN (Xintao Wang, BSD 3-Clause), pesos das releases oficiais.
_REL = 'https://github.com/xinntao/Real-ESRGAN/releases/download'
AMPLIADORES = {
    'geral': dict(
        rede='srvgg', escala=4,
        pesos=[(f'{_REL}/v0.2.5.0/realesr-general-x4v3.pth', '91a7644643c884ee00737db24e478156'),
               (f'{_REL}/v0.2.5.0/realesr-general-wdn-x4v3.pth', '4dc198a34475fa0df73fe82bcf6e5948')],
        desc='Padrão. realesr-general-x4v3 com o "--ruido" regulável (0 a 1). O padrão 0.2 guarda a mesma '
             'textura de pele do original (medido); 0.5 já alisa. Em rosto, não passe de 0.3. Leve (5 MB).'),
    'foto': dict(
        rede='rrdb', escala=4, blocos=23,
        pesos=[(f'{_REL}/v0.1.0/RealESRGAN_x4plus.pth', '99ec365d4afad750833258a1a24f44ca')],
        desc='RealESRGAN_x4plus: limpa muito (JPEG ruim, foto velha), mas alisa a pele. Não use em rosto.'),
    'x2': dict(
        rede='rrdb', escala=2, blocos=23,
        pesos=[(f'{_REL}/v0.2.1/RealESRGAN_x2plus.pth', 'f2a8176bb1c58ede774b27bdfebbf2c7')],
        desc='RealESRGAN_x2plus: o mesmo da "foto", feito para 2x.'),
}
PADRAO_AMPLIAR = 'geral'


# ---------------------------------------------------------------- arquivos

def abrir(caminho):
    """Lê a foto: devolve (rgb uint8 HxWx3, alfa uint8 HxW ou None, info para salvar igual)."""
    import numpy as np
    from PIL import Image, ImageOps

    p = Path(caminho).resolve()
    if not p.is_file():
        sys.exit(f'Não achei: {p}')
    im = Image.open(p)
    info = {'icc_profile': im.info.get('icc_profile'), 'dpi': im.info.get('dpi')}
    im = ImageOps.exif_transpose(im)
    tem_alfa = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    if tem_alfa:
        im = im.convert('RGBA')
        a = np.asarray(im)
        return a[..., :3].copy(), a[..., 3].copy(), info
    return np.asarray(im.convert('RGB')).copy(), None, info


def destino_de(entrada, saida, sufixo, no_lugar, tem_alfa):
    entrada = Path(entrada).resolve()
    if saida:
        s = Path(saida).resolve()
        destino = s / f'{entrada.stem}-{sufixo}{entrada.suffix}' if (s.is_dir() or not s.suffix) else s
    elif no_lugar:
        destino = entrada
    else:
        destino = entrada.with_name(f'{entrada.stem}-{sufixo}{entrada.suffix}')
    if destino.suffix.lower() not in EXTENSOES:
        destino = destino.with_suffix('.png')
    if tem_alfa and destino.suffix.lower() in ('.jpg', '.jpeg'):
        destino = destino.with_suffix('.png')
        print(f'A foto tem transparência: a saída vai em PNG ({destino.name}).')
    if destino == entrada and not no_lugar:
        sys.exit('A saída seria a própria foto. Escolha outro nome ou use --no-lugar para sobrescrever.')
    return destino


def salvar(rgb, alfa, destino, info):
    import numpy as np
    from PIL import Image

    destino.parent.mkdir(parents=True, exist_ok=True)
    if alfa is not None:
        rgb = rgb.copy()
        rgb[alfa == 0] = 0  # o invisível volta a preto, como o recorte grava
        im = Image.fromarray(np.dstack([rgb, alfa]), 'RGBA')
    else:
        im = Image.fromarray(rgb, 'RGB')
    extra = {k: v for k, v in info.items() if v}
    ext = destino.suffix.lower()
    if ext in ('.jpg', '.jpeg'):
        im.save(destino, quality=95, subsampling=0, **extra)
    elif ext == '.webp':
        im.save(destino, quality=95, method=6, **extra)
    else:
        im.save(destino, compress_level=6, **extra)


def estender_cor(rgb, peso):
    """Puxa a cor da borda para dentro da área transparente (push-pull em pirâmide).

    No PNG recortado o RGB do invisível é preto; a rede veria uma moldura preta em volta da pessoa e
    escureceria a borda. Aqui o invisível ganha a cor dos vizinhos visíveis. Onde peso = 1 nada muda.
    rgb: float32 HxWx3 (0 a 1); peso: float32 HxW (0 a 1)."""
    import cv2
    import numpy as np

    if peso.min() >= 1:
        return rgb
    peso = peso.astype(np.float32)
    niveis = []
    n, d = rgb.astype(np.float32) * peso[..., None], peso
    while min(d.shape) > 1:  # desce: média ponderada pela parte visível
        niveis.append((n, d))
        w, h = max(1, d.shape[1] // 2), max(1, d.shape[0] // 2)
        n = cv2.resize(n, (w, h), interpolation=cv2.INTER_AREA).reshape(h, w, 3)
        d = cv2.resize(d, (w, h), interpolation=cv2.INTER_AREA).reshape(h, w)
    media = (rgb * peso[..., None]).reshape(-1, 3).sum(0) / max(float(peso.sum()), 1e-6)
    cor = np.where(d[..., None] > 1e-6, n / np.maximum(d, 1e-6)[..., None], media).astype(np.float32)
    for ni, di in reversed(niveis):  # sobe: o que falta em cada nível vem do nível de cima
        h, w = di.shape
        cima = cv2.resize(cor, (w, h), interpolation=cv2.INTER_LINEAR).reshape(h, w, 3)
        cor = ni + (1 - np.clip(di, 0, 1))[..., None] * cima
    return cor.astype(np.float32)


# ---------------------------------------------------------------- pesos

def baixar(url, md5=None):
    """Baixa o peso uma vez para _local/tratar/modelos/torch/hub/checkpoints (o mesmo do editor)."""
    from torch.hub import download_url_to_file, get_dir

    pasta = Path(get_dir()) / 'checkpoints'
    pasta.mkdir(parents=True, exist_ok=True)
    arquivo = pasta / url.rsplit('/', 1)[-1]
    if not arquivo.exists():
        print(f'Baixando {url}')
        download_url_to_file(url, str(arquivo), progress=True)
        if md5 and _md5(arquivo) != md5:
            arquivo.unlink(missing_ok=True)
            sys.exit(f'O arquivo {arquivo.name} veio diferente do esperado (md5). Apaguei; rode de novo.')
    return str(arquivo)


def _md5(arquivo):
    h = hashlib.md5()
    with open(arquivo, 'rb') as f:
        for bloco in iter(lambda: f.read(1 << 20), b''):
            h.update(bloco)
    return h.hexdigest()


def silenciar():
    """Só avisos de verdade no terminal (o IOPaint fala muito)."""
    import warnings
    warnings.filterwarnings('ignore', category=FutureWarning)
    warnings.filterwarnings('ignore', category=UserWarning)
    try:
        from loguru import logger
        logger.remove()
        logger.add(sys.stderr, level='WARNING')
    except ImportError:
        pass


def dispositivo_de(cpu):
    import torch
    return 'cuda' if torch.cuda.is_available() and not cpu else 'cpu'


def nome_da_placa(dispositivo):
    import torch
    return torch.cuda.get_device_name(0) if dispositivo == 'cuda' else 'CPU'


# ---------------------------------------------------------------- apagar

def ler_caixa(texto):
    try:
        x, y, w, h = (int(round(float(v))) for v in texto.split(','))
    except ValueError:
        sys.exit(f'Caixa inválida: "{texto}". Use x,y,largura,altura (em pixels da foto), ex.: 655,857,12,11')
    if w <= 0 or h <= 0:
        sys.exit(f'Caixa sem tamanho: "{texto}".')
    return x, y, w, h


def desenhar_caixas(textos, H, W, redondo):
    import cv2
    import numpy as np

    m = np.zeros((H, W), np.uint8)
    for texto in textos or []:
        x, y, w, h = ler_caixa(texto)
        if x >= W or y >= H or x + w <= 0 or y + h <= 0:
            sys.exit(f'A caixa {texto} está fora da foto ({W}x{H}).')
        if redondo:
            # elipse dentro da caixa, com precisão de 1/16 de pixel
            c = (int(round((x + w / 2) * 16)), int(round((y + h / 2) * 16)))
            r = (int(round(w / 2 * 16)), int(round(h / 2 * 16)))
            cv2.ellipse(m, c, r, 0, 0, 360, 255, -1, cv2.LINE_8, 4)
        else:
            m[max(y, 0):y + h, max(x, 0):x + w] = 255
    return m


def montar_mascara(args, H, W):
    import numpy as np
    from PIL import Image

    m = desenhar_caixas(args.caixa, H, W, args.redondo)
    if args.mascara:
        mi = Image.open(args.mascara)
        if mi.size != (W, H):
            sys.exit(f'A máscara tem {mi.size[0]}x{mi.size[1]}; a foto tem {W}x{H}. Precisam ter o mesmo tamanho.')
        if mi.mode in ('RGBA', 'LA', 'PA') or (mi.mode == 'P' and 'transparency' in mi.info):
            a = np.asarray(mi.convert('RGBA')).astype(np.float32)
            valor = (a[..., :3].mean(-1) * a[..., 3] / 255)  # branco opaco = apagar; transparente = manter
        else:
            valor = np.asarray(mi.convert('L')).astype(np.float32)
        m = np.maximum(m, np.where(valor > 127, 255, 0).astype(np.uint8))
    if not m.any():
        sys.exit('A máscara está vazia: nada para apagar.')
    return m


def carregar_apagador(nome, dispositivo):
    import torch
    if nome == 'opencv':
        return None
    from iopaint.model import models
    return models[nome](torch.device(dispositivo))


def inpaint(modelo, nome, rgb, mascara):
    """rgb uint8 HxWx3 e máscara uint8 HxW (255 = apagar) -> rgb uint8 com a área refeita."""
    import cv2
    if nome == 'opencv':
        return cv2.inpaint(rgb, mascara, 3, cv2.INPAINT_TELEA)
    from iopaint.schema import HDStrategy, InpaintRequest
    req = InpaintRequest(hd_strategy=HDStrategy.ORIGINAL, sd_keep_unmasked_area=True)
    bgr = modelo(rgb, mascara, req)
    return cv2.cvtColor(bgr.round().clip(0, 255).astype('uint8'), cv2.COLOR_BGR2RGB)


def apagar(args):
    import cv2
    import numpy as np

    rgb, alfa, info = abrir(args.img)
    H, W = rgb.shape[:2]
    destino = destino_de(args.img, args.saida, 'limpo', args.no_lugar, alfa is not None)
    marcada = montar_mascara(args, H, W)
    # --ignorar: o que fica igual (o outro piercing, a outra pinta). O modelo não vê essa área
    # (assim não copia o objeto para o buraco) e ela volta exatamente como era.
    protegida = desenhar_caixas(args.ignorar, H, W, args.redondo)
    if args.folga > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * args.folga + 1, 2 * args.folga + 1))
        area, escondida = cv2.dilate(marcada, k), cv2.dilate(protegida, k)
    else:
        area, escondida = marcada.copy(), protegida.copy()
    area[protegida > 0] = 0
    marcada[protegida > 0] = 0
    if not area.any():
        sys.exit('A área de --ignorar cobre tudo o que foi marcado: nada para apagar.')
    if args.salvar_mascara:  # branco = apagar; cinza = escondida do modelo e mantida
        vista = np.where(escondida > 0, 110, 0).astype(np.uint8)
        vista[area > 0] = 255
        cv2.imwrite(str(Path(args.salvar_mascara).resolve()), vista)

    dispositivo = dispositivo_de(args.cpu)
    t0 = time.perf_counter()
    try:
        modelo = carregar_apagador(args.modelo, dispositivo)
    except Exception as e:  # sem a placa ou sem o peso: tenta na CPU
        if dispositivo == 'cpu':
            raise
        print(f'Não carregou na placa ({e}); vai pela CPU.')
        dispositivo = 'cpu'
        modelo = carregar_apagador(args.modelo, dispositivo)
    print(f'Modelo {args.modelo} na {nome_da_placa(dispositivo)} ({time.perf_counter() - t0:.1f} s para carregar)')

    t = time.perf_counter()
    saida = rgb.copy()
    n, rotulos, caixas, _ = cv2.connectedComponentsWithStats(area, connectivity=8)
    for i in range(1, n):
        x, y, w, h = caixas[i][:4]
        margem = max(args.margem, int(1.5 * max(w, h)))
        x0, y0 = max(x - margem, 0), max(y - margem, 0)
        x1, y1 = min(x + w + margem, W), min(y + h + margem, H)
        contexto = saida[y0:y1, x0:x1].astype(np.float32) / 255
        visivel = np.ones(contexto.shape[:2], bool) if alfa is None else alfa[y0:y1, x0:x1] > 0
        if alfa is not None:  # contexto sem a moldura preta do invisível
            contexto = estender_cor(contexto, visivel.astype(np.float32))
        pedaco = (contexto * 255).round().clip(0, 255).astype(np.uint8)
        m = np.where(rotulos[y0:y1, x0:x1] == i, 255, 0).astype(np.uint8)
        esc = escondida[y0:y1, x0:x1] > 0
        para_o_modelo = np.maximum(m, escondida[y0:y1, x0:x1])

        # Detalhe pequeno some melhor com o pedaço ampliado: o modelo vê a pele com mais pixels.
        lado = max(w, h)
        z = args.zoom or (3 if lado <= 40 else 2 if lado <= 100 else 1)
        while z > 1 and max(x1 - x0, y1 - y0) * z > 1600:
            z -= 1
        if z > 1:
            tam = ((x1 - x0) * z, (y1 - y0) * z)
            entrada = cv2.resize(pedaco, tam, interpolation=cv2.INTER_CUBIC)
            mz = cv2.resize(para_o_modelo, tam, interpolation=cv2.INTER_NEAREST)
        else:
            entrada, mz = pedaco, para_o_modelo
        try:
            refeito = inpaint(modelo, args.modelo, entrada, mz)
        except Exception as e:
            import torch
            if dispositivo != 'cuda' or not isinstance(e, torch.cuda.OutOfMemoryError):
                raise
            print('A placa ficou sem memória; esta área vai pela CPU.')
            torch.cuda.empty_cache()
            dispositivo = 'cpu'
            modelo = carregar_apagador(args.modelo, dispositivo)
            refeito = inpaint(modelo, args.modelo, entrada, mz)
        if z > 1:
            refeito = cv2.resize(refeito, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)

        # Mancha pequena (até 64 px): fica a textura do modelo, mas o tom vem da pele em volta
        # (como o pincel corretivo). Tira o cinza ou o roxo que o modelo às vezes deixa.
        # Em área grande não: lá o modelo precisa continuar linhas e formas do fundo.
        if args.modelo != 'opencv' and not args.sem_tom and lado <= 64:
            sigma = max(1.5, lado / 5)
            buraco = (m > 0)[..., None]
            novo = refeito.astype(np.float32) / 255
            peso = ((m == 0) & ~esc & visivel).astype(np.float32)
            membrana = estender_cor(contexto, peso)
            base = np.where(buraco | esc[..., None], membrana, contexto)
            detalhe = novo - cv2.GaussianBlur(novo, (0, 0), sigma)
            curado = np.clip(cv2.GaussianBlur(base, (0, 0), sigma) + detalhe, 0, 1)
            refeito = (np.where(buraco, curado, novo) * 255).round().clip(0, 255).astype(np.uint8)

        # Costura: dentro do que foi marcado entra 100% o novo; na folga, uma transição de ~1 px.
        dentro = ((marcada[y0:y1, x0:x1] > 0) & (m > 0)).astype(np.float32)
        suave = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.8)
        mistura = np.maximum(np.minimum(suave * 1.5, 1) * (m > 0), dentro)[..., None]
        base = saida[y0:y1, x0:x1].astype(np.float32)
        saida[y0:y1, x0:x1] = (base * (1 - mistura) + refeito.astype(np.float32) * mistura).round().clip(0, 255).astype(np.uint8)

    salvar(saida, alfa, destino, info)
    print(f'{Path(args.img).name} -> {destino} ({W}x{H}, {n - 1} área(s), {time.perf_counter() - t:.1f} s)')


# ---------------------------------------------------------------- ampliar

def carregar_ampliador(nome, ruido, dispositivo):
    import torch
    from iopaint.plugins.basicsr import RRDBNet
    from iopaint.plugins.realesrgan import RealESRGANer, SRVGGNetCompact

    m = AMPLIADORES[nome]
    caminhos = [baixar(url, md5) for url, md5 in m['pesos']]
    if m['rede'] == 'srvgg':
        rede = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4, act_type='prelu')
    else:
        rede = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=m['blocos'], num_grow_ch=32, scale=m['escala'])
    if len(caminhos) == 2:  # mistura de redes: ruido 1 = limpa tudo, ruido 0 = guarda a textura
        caminho, dni = caminhos, [ruido, 1 - ruido]
    else:
        caminho, dni = caminhos[0], None
    return RealESRGANer(scale=m['escala'], model_path=caminho, dni_weight=dni, model=rede, tile=512, tile_pad=16,
                        pre_pad=10, half=dispositivo == 'cuda', device=torch.device(dispositivo))


def ampliar(args):
    import cv2
    import numpy as np
    import torch

    if not 1 < args.escala <= 4:
        sys.exit('A escala vai de 1,1 a 4.')
    rgb, alfa, info = abrir(args.img)
    H, W = rgb.shape[:2]
    rotulo = f'{args.escala:g}x'
    destino = destino_de(args.img, args.saida, rotulo, args.no_lugar, alfa is not None)
    dispositivo = dispositivo_de(args.cpu)
    t0 = time.perf_counter()
    modelo = carregar_ampliador(args.modelo, args.ruido, dispositivo)
    print(f'Modelo {args.modelo} na {nome_da_placa(dispositivo)} ({time.perf_counter() - t0:.1f} s para carregar)')

    entrada = rgb
    if alfa is not None:
        f = estender_cor(rgb.astype(np.float32) / 255, (alfa > 0).astype(np.float32))
        entrada = (f * 255).round().clip(0, 255).astype(np.uint8)
    bgr = cv2.cvtColor(entrada, cv2.COLOR_RGB2BGR)

    def rodar(m):
        import contextlib
        import io
        with torch.inference_mode(), contextlib.redirect_stdout(io.StringIO()):  # sem o "Tile 1/20..."
            return m.enhance(bgr, outscale=args.escala)[0]

    t = time.perf_counter()
    try:
        saida = rodar(modelo)
    except torch.cuda.OutOfMemoryError:
        print('A placa ficou sem memória; vai pela CPU (bem mais lento).')
        torch.cuda.empty_cache()
        saida = rodar(carregar_ampliador(args.modelo, args.ruido, 'cpu'))
    saida = cv2.cvtColor(saida, cv2.COLOR_BGR2RGB)
    H2, W2 = saida.shape[:2]
    alfa2 = None
    if alfa is not None:  # o alfa amplia à parte, sem rede: borda limpa, sem halo
        alfa2 = cv2.resize(alfa.astype(np.float32), (W2, H2), interpolation=cv2.INTER_CUBIC)
        alfa2 = alfa2.round().clip(0, 255).astype(np.uint8)
    salvar(saida, alfa2, destino, info)
    print(f'{Path(args.img).name} -> {destino} ({W}x{H} -> {W2}x{H2}, {time.perf_counter() - t:.1f} s)')


# ---------------------------------------------------------------- ajustar

def ajustar(args):
    import cv2
    import numpy as np

    for nome in ('brilho', 'contraste', 'saturacao', 'temperatura'):
        if not -100 <= getattr(args, nome) <= 100:
            sys.exit(f'--{nome} vai de -100 a 100.')
    if not 0 <= args.nitidez <= 100:
        sys.exit('--nitidez vai de 0 a 100.')
    if not any(getattr(args, n) for n in ('brilho', 'contraste', 'saturacao', 'temperatura', 'nitidez')):
        sys.exit('Nada para ajustar: passe --brilho, --contraste, --saturacao, --temperatura ou --nitidez.')
    rgb, alfa, info = abrir(args.img)
    H, W = rgb.shape[:2]
    destino = destino_de(args.img, args.saida, 'ajustado', args.no_lugar, alfa is not None)
    t = time.perf_counter()
    x = rgb.astype(np.float32) / 255
    if alfa is not None:
        x = estender_cor(x, (alfa > 0).astype(np.float32))
    LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)

    if args.temperatura:  # quente (+) ou frio (-), em luz linear, mantendo a luminosidade
        lin = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
        k = args.temperatura / 100 * 0.12
        antes = lin @ LUM
        lin = lin * np.array([1 + k, 1, 1 - k], np.float32)
        lin *= (antes / np.maximum(lin @ LUM, 1e-6))[..., None]
        lin = np.clip(lin, 0, 1)
        x = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    if args.brilho:  # meios-tons (curva gama): preto e branco ficam onde estão
        x = np.clip(x, 0, 1) ** (2 ** (-args.brilho / 100))
    if args.contraste:  # em torno do cinza médio
        x = 0.5 + (x - 0.5) * (1 + args.contraste / 100)
    if args.saturacao:
        lum = (np.clip(x, 0, 1) @ LUM)[..., None]
        x = lum + (x - lum) * (1 + args.saturacao / 100)
    x = np.clip(x, 0, 1).astype(np.float32)
    if args.nitidez:  # máscara de nitidez só na luminância (sem franja de cor)
        lum = x @ LUM
        borrado = cv2.GaussianBlur(lum, (0, 0), 1.2)
        detalhe = lum - borrado
        detalhe = np.where(np.abs(detalhe) < 0.004, 0, detalhe)  # não realça o ruído liso
        x = np.clip(x + (args.nitidez / 100 * 1.5 * detalhe)[..., None], 0, 1)

    saida = (x * 255).round().clip(0, 255).astype(np.uint8)
    salvar(saida, alfa, destino, info)
    print(f'{Path(args.img).name} -> {destino} ({W}x{H}, {time.perf_counter() - t:.1f} s)')


# ---------------------------------------------------------------- comparar

def comparar(args):
    """Antes e depois de um pedaço, ampliado, lado a lado (para conferir de perto antes de usar)."""
    from PIL import Image, ImageDraw, ImageFont

    antes, depois = Image.open(args.antes), Image.open(args.depois)
    razao = depois.width / antes.width  # o "depois" pode ter sido ampliado
    x, y, w, h = ler_caixa(args.caixa) if args.caixa else (0, 0, antes.width, antes.height)
    paineis = []
    for im, r in ((antes, 1), (depois, razao)):
        pedaco = im.convert('RGBA').crop((round(x * r), round(y * r), round((x + w) * r), round((y + h) * r)))
        fundo = Image.new('RGBA', pedaco.size, (128, 128, 128, 255))  # cinza neutro onde é transparente
        pedaco = Image.alpha_composite(fundo, pedaco).convert('RGB')
        paineis.append(pedaco.resize((round(w * args.vezes), round(h * args.vezes)), Image.LANCZOS))
    topo, vao = 40, 12
    pw, ph = paineis[0].size
    tela = Image.new('RGB', (pw * 2 + vao, ph + topo), (20, 20, 20))
    d = ImageDraw.Draw(tela)
    try:
        fonte = ImageFont.load_default(size=22)
    except TypeError:
        fonte = ImageFont.load_default()
    for i, (painel, rotulo) in enumerate(zip(paineis, ('Antes', 'Depois'))):
        tela.paste(painel, (i * (pw + vao), topo))
        d.text((i * (pw + vao) + 8, 8), f'{rotulo} ({args.vezes:g}x)', fill=(235, 235, 235), font=fonte)
    destino = Path(args.saida).resolve() if args.saida else PASTA / f'{Path(args.depois).stem}-antes-depois.jpg'
    if destino in (Path(args.antes).resolve(), Path(args.depois).resolve()):
        sys.exit('A comparação não pode ter o nome de uma das fotos.')
    destino.parent.mkdir(parents=True, exist_ok=True)
    tela.save(destino, quality=92, subsampling=0)
    print(f'Comparação -> {destino} ({tela.width}x{tela.height})')


# ---------------------------------------------------------------- editor

def editor(args):
    import torch
    from PIL import Image

    if not hasattr(Image, 'ANTIALIAS'):  # o IOPaint 1.6 ainda usa o nome antigo nas miniaturas
        Image.ANTIALIAS = Image.LANCZOS
    dispositivo = dispositivo_de(args.cpu)
    pasta_saida = Path(args.saida or (PASTA / 'editor')).resolve()
    pasta_saida.mkdir(parents=True, exist_ok=True)
    cmd = ['iopaint', 'start', '--model', 'lama', '--device', dispositivo, '--port', str(args.porta),
           '--model-dir', str(MODELOS_DIR), '--output-dir', str(pasta_saida),
           '--enable-realesrgan', '--realesrgan-device', dispositivo, '--realesrgan-model', 'realesr-general-x4v3']
    if args.clique:  # clicar no objeto e a máscara sai sozinha (SAM 2.1 da Meta, Apache 2.0, ~150 MB)
        cmd += ['--enable-interactive-seg', '--interactive-seg-model', 'sam2_1_tiny',
                '--interactive-seg-device', dispositivo]
        # A cópia do SAM 2 no IOPaint só liga o Flash Attention em placa Ampere (a 3070 é), e o PyTorch
        # do Windows vem sem ele: sobra "No available kernel". Religa os outros dois caminhos de atenção.
        from iopaint.plugins.segment_anything2.modeling.sam import transformer as sam2
        sam2.USE_FLASH_ATTN, sam2.OLD_GPU, sam2.MATH_KERNEL_ON = False, True, True
        # E a cópia devolve a máscara em 256x256 (o navegador estica e a borda sai em degraus).
        # Volta o passo do SAM 2 original: amplia a máscara para o tamanho da foto antes do corte.
        import torch.nn.functional as Fn
        from iopaint.plugins.segment_anything2.utils.transforms import SAM2Transforms
        SAM2Transforms.postprocess_masks = lambda self, masks, orig_hw: Fn.interpolate(
            masks.float(), orig_hw, mode='bilinear', align_corners=False)
    if args.img:
        cmd += ['--input', str(Path(args.img).resolve())]
    if not args.sem_navegador:
        cmd += ['--inbrowser']
    print(f'Editor em http://127.0.0.1:{args.porta} (na {nome_da_placa(dispositivo)}). '
          f'"Save" grava em {pasta_saida}; a foto original não muda. Ctrl+C fecha.')
    sys.argv = cmd
    from iopaint import entry_point
    entry_point()


# ---------------------------------------------------------------- linha de comando

def main():
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding='utf-8', errors='replace')  # acentos certos no PowerShell
    if '--modelos' in sys.argv:
        print('Apagar (--modelo):')
        for k, v in APAGADORES.items():
            print(f'  {k:7} {v}')
        print('Ampliar (--modelo):')
        for k, v in AMPLIADORES.items():
            print(f'  {k:7} {v["desc"]}')
        print('Ajustar: só conta (numpy/OpenCV), sem modelo.')
        print('Editor: IOPaint (Apache 2.0) com LaMa e Real-ESRGAN; --clique liga o SAM 2.1 (Apache 2.0).')
        print('Não instalado de propósito: restauração de rosto (GFPGAN; CodeFormer é não comercial).')
        return

    ap = argparse.ArgumentParser(description='Tratamento pontual de imagem no computador.')
    sub = ap.add_subparsers(dest='comando', required=True)

    def comum(p, saida=True):
        p.add_argument('img', help='a foto (.png, .jpg, .jpeg, .webp)')
        if saida:
            p.add_argument('saida', nargs='?', help='arquivo ou pasta de saída (padrão: ao lado, com sufixo)')
        p.add_argument('--no-lugar', action='store_true', help='sobrescrever a própria foto (cuidado)')
        p.add_argument('--cpu', action='store_true', help='forçar a CPU (mais lento)')

    p = sub.add_parser('apagar', help='apaga um detalhe e refaz o fundo no lugar (LaMa)')
    comum(p)
    p.add_argument('--caixa', action='append', help='x,y,largura,altura em pixels da foto (pode repetir)')
    p.add_argument('--mascara', help='PNG do mesmo tamanho: branco (ou opaco) = apagar')
    p.add_argument('--ignorar', action='append',
                   help='x,y,w,h do que fica (o outro piercing, a outra pinta): o modelo não copia e não muda')
    p.add_argument('--redondo', action='store_true', help='as caixas viram elipses dentro delas (pinta, piercing)')
    p.add_argument('--folga', type=int, default=2, help='pixels a mais em volta, para pegar sombra e brilho (padrão 2)')
    p.add_argument('--margem', type=int, default=96, help='contexto em volta que o modelo vê (padrão 96 px)')
    p.add_argument('--zoom', type=int, default=0, choices=[0, 1, 2, 3, 4],
                   help='amplia o pedaço antes de refazer (padrão 0 = automático: 3x em detalhe pequeno)')
    p.add_argument('--sem-tom', action='store_true',
                   help='não puxar o tom da pele em volta (o padrão puxa em manchas de até 64 px)')
    p.add_argument('--modelo', default='lama', choices=list(APAGADORES), help='padrão: lama (--modelos lista)')
    p.add_argument('--salvar-mascara', help='grava a máscara usada (para conferir)')

    p = sub.add_parser('ampliar', help='amplia e dá nitidez (Real-ESRGAN)')
    comum(p)
    p.add_argument('--escala', type=float, default=2, help='quantas vezes (padrão 2, até 4)')
    p.add_argument('--modelo', default=PADRAO_AMPLIAR, choices=list(AMPLIADORES), help=f'padrão: {PADRAO_AMPLIAR}')
    p.add_argument('--ruido', type=float, default=0.2,
                   help='só no "geral": 0 guarda a textura, 1 limpa e alisa (padrão 0.2; em rosto, até 0.3)')

    p = sub.add_parser('ajustar', help='brilho, contraste, saturação, temperatura e nitidez')
    comum(p)
    p.add_argument('--brilho', type=float, default=0, help='-100 a 100 (meios-tons)')
    p.add_argument('--contraste', type=float, default=0, help='-100 a 100')
    p.add_argument('--saturacao', type=float, default=0, help='-100 a 100')
    p.add_argument('--temperatura', type=float, default=0, help='-100 (frio) a 100 (quente)')
    p.add_argument('--nitidez', type=float, default=0, help='0 a 100')

    p = sub.add_parser('comparar', help='antes e depois de um pedaço, ampliado, lado a lado')
    p.add_argument('antes')
    p.add_argument('depois')
    p.add_argument('saida', nargs='?', help='JPEG (padrão: _local/tratar/<depois>-antes-depois.jpg)')
    p.add_argument('--caixa', help='x,y,w,h do pedaço, em pixels do "antes" (padrão: a foto inteira)')
    p.add_argument('--vezes', type=float, default=3, help='ampliação (padrão 3)')

    p = sub.add_parser('editor', help='abre o IOPaint no navegador (pincel para apagar, ampliar)')
    p.add_argument('img', nargs='?', help='foto para abrir já no editor')
    p.add_argument('--porta', type=int, default=8080)
    p.add_argument('--saida', help=f'pasta onde o "Save" grava (padrão: {PASTA / "editor"})')
    p.add_argument('--clique', action='store_true', help='liga a seleção por clique (SAM 2.1)')
    p.add_argument('--sem-navegador', action='store_true', help='não abrir o navegador sozinho')
    p.add_argument('--cpu', action='store_true', help='forçar a CPU')

    a = ap.parse_args()
    if a.comando == 'apagar' and not (a.caixa or a.mascara):
        ap.error('apagar precisa de --caixa x,y,w,h ou --mascara m.png')
    if a.comando != 'editor':
        silenciar()
    {'apagar': apagar, 'ampliar': ampliar, 'ajustar': ajustar, 'comparar': comparar, 'editor': editor}[a.comando](a)


if __name__ == '__main__':
    main()
