"""Analyze unmodified PNG masters and author runtime SVG clip paths and face assets.

PNG pixels are never edited. Flat backgrounds, faces and clipping paths are code-native
extensions of the app's existing SVG character system.
"""
from collections import defaultdict, deque
from pathlib import Path
import base64
import hashlib
import json
import math

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/skins'


def simplify(points, epsilon=4):
    if len(points) < 4:
        return points
    a, b = np.array(points[0], dtype=float), np.array(points[-1], dtype=float)
    values = np.array(points, dtype=float)
    vector = b - a
    length = float(vector @ vector)
    projection = np.clip(((values - a) @ vector) / max(1, length), 0, 1)
    distances = np.linalg.norm(values - (a + projection[:, None] * vector), axis=1)
    index = int(distances.argmax())
    if distances[index] <= epsilon:
        return [points[0], points[-1]]
    return simplify(points[:index + 1], epsilon)[:-1] + simplify(points[index:], epsilon)


def geometry(path, cat=False):
    image = Image.open(path).convert('RGB')
    pixels = np.asarray(image).astype(np.int16)
    step = 4
    grid = pixels[::step, ::step]
    matte = np.median(np.concatenate((grid[0], grid[-1], grid[:, 0], grid[:, -1])), axis=0)
    mask = np.max(np.abs(grid - matte), axis=2) > 10
    # Keep the connected character, excluding any background specks.
    ys, xs = np.where(mask)
    target = (len(mask) // 2, len(mask[0]) // 2)
    closest = int(np.argmin((ys-target[0])**2 + (xs-target[1])**2))
    queue = deque([(int(ys[closest]), int(xs[closest]))])
    kept = np.zeros_like(mask)
    while queue:
        y, x = queue.popleft()
        if y < 0 or x < 0 or y >= mask.shape[0] or x >= mask.shape[1] or kept[y, x] or not mask[y, x]:
            continue
        kept[y, x] = True
        queue.extend(((y-1, x), (y+1, x), (y, x-1), (y, x+1)))
    edges = defaultdict(list)
    for y, x in zip(*np.where(kept)):
        for neighbor, a, b in (
            ((y-1,x),(x,y),(x+1,y)), ((y,x+1),(x+1,y),(x+1,y+1)),
            ((y+1,x),(x+1,y+1),(x,y+1)), ((y,x-1),(x,y+1),(x,y))):
            ny, nx = neighbor
            if ny < 0 or nx < 0 or ny >= kept.shape[0] or nx >= kept.shape[1] or not kept[ny,nx]:
                edges[a].append(b)
    loops = []
    while edges:
        first = next(iter(edges)); current = first; points = [first]
        while current in edges:
            following = edges[current].pop()
            if not edges[current]:
                del edges[current]
            points.append(following); current = following
            if current == first:
                break
        area = abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]))) / 2
        if area > 12:
            scaled = [(int(x*step), int(y*step)) for x,y in points]
            loops.append(simplify(scaled))
    outline = ' '.join('M'+' L'.join(f'{x},{y}' for x,y in points)+' Z' for points in loops)
    ys, xs = np.where(kept)
    left, top, right, bottom = int(xs.min()*step), int(ys.min()*step), int((xs.max()+1)*step), int((ys.max()+1)*step)
    center = image.width // 2
    if cat:
        scale = min(220/(right-left), 260/(bottom-top))
        x = 140 - (left+right)/2*scale; y = 334-bottom*scale
        face = [round(x+center*scale,3), round(y+(top+(bottom-top)*.36)*scale,3)]
        face_color = '#FCE8C7'
    else:
        center_y = int(np.where(mask[:,center//step])[0][0]*step)
        scale = min(242/(right-left), 193/(bottom-center_y))
        x, y = 140-center*scale, 139-center_y*scale
        sample = pixels[min(center_y+45,image.height-1),center]
        face_color = '#'+''.join(f'{int(value):02x}' for value in sample)
        face = [140,96]
    return dict(width=image.width,height=image.height,outline=outline,
        rect=[round(x,4),round(y,4),round(image.width*scale,4),round(image.height*scale,4)],
        scale=round(scale,7),face=face,faceColor=face_color,
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest())


EXPRESSIONS = {
 'calm': dict(mouth='M129 122 Q140 129 151 122', catMouth='M-10 12 Q0 20 10 12'),
 'welcome': dict(mouth='M127 121 Q140 134 153 121', catMouth='M-11 11 Q0 23 11 11'),
 'listen': dict(mouth='M130 123 Q140 128 150 123', catMouth='M-9 13 Q0 18 9 13'),
 'encourage': dict(mouth='M127 121 Q140 133 153 121', catMouth='M-10 12 Q0 22 10 12'),
 'joy': dict(mouth='M127 121 Q140 134 153 121', catMouth='M-11 11 Q0 24 11 11'),
 'concern': dict(mouth='M130 124 Q140 127 150 124', catMouth='M-9 14 Q0 18 9 14'),
 'serious': dict(mouth='M130 124 Q140 125 150 124', catMouth='M-9 14 L9 14'),
}


def face_markup(kind, expression, blink=False, skin='#F2C6AC'):
    spec = EXPRESSIONS[expression]
    if kind == 'cat':
        eyes = '<path d="M-23 0 Q-17 -6 -11 0 M11 0 Q17 -6 23 0" stroke="#514B42" stroke-width="2.8" fill="none"/>' if blink or expression=='joy' else '<circle cx="-17" cy="0" r="3.5" fill="#514B42"/><circle cx="17" cy="0" r="3.5" fill="#514B42"/>'
        brow = '<path d="M-24 -12 L-11 -16 M11 -16 L24 -12" stroke="#88775F" stroke-width="2"/>' if expression=='concern' else ''
        return f'{brow}{eyes}<path d="M-4 9 Q0 6 4 9 L0 12 Z" fill="#D8A28E"/><path d="{spec["catMouth"]}" stroke="#514B42" stroke-width="2.2" stroke-linecap="round" fill="none"/>'
    head='M104 62 C104 42 176 42 176 62 L176 96 C176 119 162 139 140 142 C118 139 104 119 104 96 Z'
    hair='M103 91 C95 80 96 65 100 55 C104 39 116 29 132 29 C142 21 158 24 166 30 C184 33 191 47 190 62 C191 76 185 88 177 96 L172 76 C158 75 147 68 140 56 C135 72 122 79 108 80 Z'
    brows='M116 88 Q123 81 131 84 M149 84 Q157 81 164 88' if expression=='concern' else 'M117 86 Q124 83 131 85 M149 85 Q156 83 163 86'
    eyes='<path d="M120 97 Q124 93 128 97 M152 97 Q156 93 160 97" stroke="#303F3A" stroke-width="2.4" fill="none"/>' if blink or expression=='joy' else '<circle cx="124" cy="96" r="2.8" fill="#303F3A"/><circle cx="156" cy="96" r="2.8" fill="#303F3A"/>'
    return f'<ellipse cx="103" cy="96" rx="6" ry="11" fill="{skin}"/><ellipse cx="177" cy="96" rx="6" ry="11" fill="{skin}"/><path d="{head}" fill="{skin}"/><path d="{hair}" fill="#645246"/><path d="{brows}" stroke="#645246" stroke-width="2.8" stroke-linecap="round" fill="none"/>{eyes}<path d="M140 103 L137 112 Q139 114 142 113" stroke="#DFA580" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="{spec["mouth"]}" stroke="#645246" stroke-width="2.5" stroke-linecap="round" fill="none"/>'


catalog = {}
for skin in ('cafe','clinic','playroom'):
    catalog[skin] = {'kind':'cat' if skin=='playroom' else 'human','poses':{}}
    for pose in ('rest','greeting','explain'):
        path=OUT/skin/(pose+'.png')
        info=geometry(path,skin=='playroom');catalog[skin]['poses'][pose]=info
        x,y,w,h=info['rect'];transform=f'translate({x} {y}) scale({info["scale"]})'
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 350"><defs><clipPath id="body"><path d="{info["outline"]}" fill-rule="evenodd" transform="{transform}"/></clipPath></defs><image href="{pose}.png" x="{x}" y="{y}" width="{w}" height="{h}" clip-path="url(#body)"/></svg>'
        (OUT/skin/(pose+'-cutout.svg')).write_text(svg,encoding='utf-8')
    faces=OUT/skin/'faces';faces.mkdir(exist_ok=True)
    for expression in EXPRESSIONS:
        for blink in (False,True):
            viewbox='-50 -35 100 80' if skin=='playroom' else '0 0 280 160'
            markup=face_markup(catalog[skin]['kind'],expression,blink,catalog[skin]['poses']['rest']['faceColor'])
            if skin=='clinic':
                markup=markup.replace('M103 91 C95 80 96 65 100 55 C104 39 116 29 132 29 C142 21 158 24 166 30 C184 33 191 47 190 62 C191 76 185 88 177 96 L172 76 C158 75 147 68 140 56 C135 72 122 79 108 80 Z','M101 91 L100 70 C99 47 113 31 136 30 C162 26 181 40 183 61 L180 94 L173 80 L170 60 C156 65 139 65 125 57 C121 72 114 79 106 80 Z').replace('#645246','#57554D')
            (faces/(expression+('-blink' if blink else '')+'.svg')).write_text(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">{markup}</svg>',encoding='utf-8')
    print(skin,[(pose,info['rect'],len(info['outline'])) for pose,info in catalog[skin]['poses'].items()])
(OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'expressions.json').write_text(json.dumps(EXPRESSIONS,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

