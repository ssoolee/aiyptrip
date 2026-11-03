"""평안이 MBTI 직업 도감(mbti-job-sheet.png) 한 장에서 유형별 그림 열여섯 장을 만든다.

실행 (Pillow 필요):
    python cut-mbti-art.py mbti-job-sheet.png ../../public/character/mbti

도감은 4x4 격자이고 칸마다 ① 파스텔 배경 ② 위쪽 MBTI 라벨 ③ 아래쪽 직업명 라벨이
함께 들어 있다. 셋을 모두 걷어내고 캐릭터만 투명 PNG로 남긴다 — 글자를 그림에 굽지
않아야 다크모드와 글꼴을 화면 쪽(src/app/course/mbti/page.tsx)에서 쥘 수 있다.

격자 좌표는 원본 1254x1254 기준이다. 행마다 높이가 302/296/277/243으로 달라
균등 분할이 되지 않으므로, 타일 사이의 흰 띠를 찾아 잡은 값을 적어 둔다.
도감을 다시 그리면 이 좌표부터 다시 재야 한다.
"""
import os
import sys
from collections import deque

from PIL import Image

# 내보낼 캔버스. 열여섯 장을 같은 배율·같은 바닥선으로 맞춰야 유형마다 크기가
# 달라 보이지 않고, next/image도 width/height를 하나로 쓸 수 있다.
OUT_W, OUT_H = 280, 210
PAD_X, PAD_TOP, PAD_BOTTOM = 10, 6, 8
COLORS = 128  # 팔레트 색 수 — 평면 그림이라 128색이면 눈으로 구분되지 않는다


COLS = [(16, 320), (324, 626), (629, 929), (932, 1238)]
ROWS = [(118, 420), (424, 720), (722, 999), (1002, 1245)]
TYPES = [
    ["INTJ", "INTP", "ENTJ", "ENTP"],
    ["INFJ", "INFP", "ENFJ", "ENFP"],
    ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
    ["ISTP", "ISFP", "ESTP", "ESFP"],
]

# 배경으로 넘어갈 수 있는 밝기 문턱. 배경 파스텔은 세 채널이 모두 190 언저리 이상이고
# 캐릭터 외곽선은 50 안팎이라, 이 아래로는 번지지 못하게 막는다. 이웃과의 차이로만
# 번지게 했더니 안티에일리어싱 경사를 타고 외곽선 안으로 들어가, 외곽선과 색이 비슷한
# 남색 정장(ENTJ 기업가)까지 통째로 지워졌다. 몸통 하늘색도 최소채널이 145라 막힌다.
GATE = 160


def light(px, p):
    i = p * 4
    return min(px[i], px[i + 1], px[i + 2]) >= GATE


def flood(px, w, h, seeds, seen):
    q = deque()
    for s in seeds:
        if 0 <= s < w * h and not seen[s] and light(px, s):
            seen[s] = 1
            q.append(s)
    while q:
        p = q.popleft()
        x, y = p % w, p // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                d = ny * w + nx
                if not seen[d] and light(px, d):
                    seen[d] = 1
                    q.append(d)


def components(seen, w, h):
    """지워지지 않고 남은 픽셀을 덩어리로 묶는다."""
    lab = [0] * (w * h)
    out = []
    for p in range(w * h):
        if seen[p] or lab[p]:
            continue
        n = len(out) + 1
        q = deque([p]); lab[p] = n
        x0 = x1 = p % w; y0 = y1 = p // w; cnt = 0
        while q:
            c = q.popleft(); cnt += 1
            x, y = c % w, c // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    d = ny * w + nx
                    if not seen[d] and not lab[d]:
                        lab[d] = n; q.append(d)
        out.append({"id": n, "count": cnt, "box": (x0, y0, x1, y1)})
    return lab, out


def extract(tile):
    img = tile.convert("RGBA")
    w, h = img.size
    px = bytearray(img.tobytes())
    seen = bytearray(w * h)

    # ① 네 모서리에서 배경을 번지게 한다
    border = [y * w for y in range(h)] + [y * w + w - 1 for y in range(h)]
    border += list(range(w)) + [(h - 1) * w + x for x in range(w)]
    flood(px, w, h, border, seen)

    # ② 라벨 글자 지우기. 알약의 흰 바탕은 ①에서 배경과 함께 이미 사라져,
    #    남는 것은 글자 조각들이다. 글자는 같은 높이로 가로 한 줄을 이루므로
    #    '비슷한 y에 2개 이상'을 줄로 보고 그 줄을 네모로 지운다 — 글자 하나가
    #    캐릭터 외곽선에 닿아 한 덩어리가 돼도(ESFP의 'S') 같이 지워진다.
    #    소품(ENTP의 전구 등)은 혼자라 줄을 이루지 않아 살아남는다.
    lab, comps = components(seen, w, h)
    if comps:
        biggest = max(c["count"] for c in comps)
        # 위쪽(MBTI 라벨)에만 쓴다. 아래쪽에 쓰면 캐릭터의 두 발이 '같은 높이 2개'라
        # 글자 줄로 오인돼 발이 잘린다 — 아래 직업명은 ③의 낱개 규칙으로 충분히 지워진다.
        for lo, hi in ((0.0, 0.22),):
            band = [c for c in comps
                    if c["count"] < biggest * 0.25
                    and lo <= (c["box"][1] + c["box"][3]) / 2 / h <= hi]
            for anchor in band:
                ay0, ay1 = anchor["box"][1], anchor["box"][3]
                line = [c for c in band
                        if abs(c["box"][1] - ay0) <= 6 and abs(c["box"][3] - ay1) <= 6]
                if len(line) < 2:
                    continue
                x0 = max(0, min(c["box"][0] for c in line) - 3)
                x1 = min(w - 1, max(c["box"][2] for c in line) + 3)
                y0 = max(0, min(c["box"][1] for c in line) - 3)
                y1 = min(h - 1, max(c["box"][3] for c in line) + 3)
                for y in range(y0, y1 + 1):
                    for x in range(x0, x1 + 1):
                        seen[y * w + x] = 1
                break

    # ③ 남은 글자 조각 털어내기 — 가장 큰 덩어리(캐릭터)에 견줘 아주 작고
    #    위/아래 끝에 있는 것은 라벨 글자다. 소품은 가운데에 있어 살아남는다.
    lab, comps = components(seen, w, h)
    if comps:
        biggest = max(c["count"] for c in comps)
        drop = set()
        for c in comps:
            x0, y0, x1, y1 = c["box"]
            mid = (y0 + y1) / 2 / h
            if c["count"] < biggest * 0.25 and (mid < 0.20 or mid > 0.82):
                drop.add(c["id"])
        if drop:
            for p in range(w * h):
                if lab[p] in drop:
                    seen[p] = 1

    # ④ 지운 곳은 투명으로, 경계의 밝은 띠는 깎아 테두리를 없앤다
    for p in range(w * h):
        if seen[p]:
            px[p * 4 + 3] = 0
    for p in range(w * h):
        if seen[p]:
            continue
        x, y = p % w, p // w
        touch = ((x > 0 and seen[p - 1]) or (x < w - 1 and seen[p + 1])
                 or (y > 0 and seen[p - w]) or (y < h - 1 and seen[p + w]))
        if touch:
            i = p * 4
            lum = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) // 1000
            if lum > 205:
                px[i + 3] = max(0, 255 - (lum - 205) * 255 // 50)

    out = Image.frombytes("RGBA", (w, h), bytes(px))
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out

def main(sheet_path, out_dir):
    sheet = Image.open(sheet_path).convert("RGB")
    cut = {}
    for r, (y0, y1) in enumerate(ROWS):
        for c, (x0, x1) in enumerate(COLS):
            cut[TYPES[r][c]] = extract(sheet.crop((x0, y0, x1, y1)))

    scale = min(
        min((OUT_W - PAD_X * 2) / im.width, (OUT_H - PAD_TOP - PAD_BOTTOM) / im.height)
        for im in cut.values()
    )
    print(f"공통 배율 {scale:.3f}, 캔버스 {OUT_W}x{OUT_H}")

    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for name in [t for row in TYPES for t in row]:
        im = cut[name]
        im = im.resize(
            (max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS
        )
        canvas = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((OUT_W - im.width) // 2, OUT_H - PAD_BOTTOM - im.height))
        path = os.path.join(out_dir, f"{name}.png")
        canvas.quantize(colors=COLORS, method=Image.FASTOCTREE).save(path, "PNG", optimize=True)
        kb = os.path.getsize(path) / 1024
        total += kb
        print(f"  {name}  {kb:5.1f}KB")
    print(f"합계 {total:.0f}KB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
