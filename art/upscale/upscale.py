"""Upscale an image 4x with Real-ESRGAN's anime model (realesrgan-x4plus-anime), on the CPU.

Used by maplab/map_v3_layout.py (through its cache) to make the 2x map: the 1x map is upscaled 4x here, then brought
down to 2x and cel-shaded, so its lines and edges stay crisp when the player zooms in.

    venv-upscale/bin/python -I art/upscale/upscale.py in.png out.png

Setup (once per machine): `realesrgan-ncnn-py` (it ships the models) in a Python 3.11 venv at `venv-upscale/`, plus
OpenMP and a Vulkan loader: on Ubuntu `apt-get install libomp5 mesa-vulkan-drivers`, then
`python3.11 -m venv venv-upscale && venv-upscale/bin/pip install realesrgan-ncnn-py pillow`.
A 1672 x 941 image takes about 12 minutes on 4 cores.
"""
import sys, time
from PIL import Image
from realesrgan_ncnn_py import Realesrgan

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
t = time.time()
up = Realesrgan(gpuid=-1, model=3, tilesize=256).process_pil(im)   # model 3: realesrgan-x4plus-anime; gpuid -1: the CPU
up.save(out)
print(f'upscaled {im.size} -> {up.size} in {time.time() - t:.0f} s')
