"""Generate data/signs.json from class_labels.json plus the word maps currently inlined in
js/speech-to-sign.js. Run once during the migration; after that signs.json is edited directly.
"""

import json
import os
import re
import struct
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from migrate_assets import EXTRA_AVATARS, ROOT, slugify  # noqa: E402

SRC_JS = os.path.join(ROOT, 'js', 'speech-to-sign.js')
OUT = os.path.join(ROOT, 'data', 'signs.json')

# Same physical sign in BdSL, so these borrow the better artwork rather than their own.
AVATAR_OVERRIDES = {
    'i-me': 'my.webp',   # আমি shares আমার's rendered avatar
    'you': 'your.webp',  # তুমি(আপনি) shares তোমার(আপনার)'s
}

# Words that had inflections pointing at them but no avatar and no model class.
PHANTOMS = {'গাধা', 'ঘোড়া', 'ছাগল', 'দেশ', 'ধর্ম', 'নাচ', 'নাটক',
            'নারী', 'নিচে', 'নির্বাচন', 'নেতা', 'পরিবার'}


def nfc(s):
    return unicodedata.normalize('NFC', s)


def webp_dimensions(path):
    with open(path, 'rb') as f:
        d = f.read(40)
    fourcc = d[12:16]
    if fourcc == b'VP8X':
        w = int.from_bytes(d[24:27], 'little') + 1
        h = int.from_bytes(d[27:30], 'little') + 1
    elif fourcc == b'VP8L':
        bits = struct.unpack('<I', d[21:25])[0]
        w = (bits & 0x3FFF) + 1
        h = ((bits >> 14) & 0x3FFF) + 1
    elif fourcc == b'VP8 ':
        w = struct.unpack('<H', d[26:28])[0] & 0x3FFF
        h = struct.unpack('<H', d[28:30])[0] & 0x3FFF
    else:
        raise SystemExit(f'{path}: unrecognised webp chunk {fourcc!r}')
    return w, h


def parse_js_object(src, name):
    m = re.search(r'const ' + name + r'\s*=\s*\{(.*?)\n\};', src, re.S)
    if not m:
        raise SystemExit(f'could not find {name} in {SRC_JS}')
    return dict(re.findall(r'"([^"]+)"\s*:\s*"([^"]+)"', m.group(1)))


def main():
    with open(os.path.join(ROOT, 'data', 'class_labels.json'), encoding='utf-8') as f:
        labels = json.load(f)
    src = open(SRC_JS, encoding='utf-8').read()
    word_image_map = parse_js_object(src, 'wordImageMap')
    word_variations = parse_js_object(src, 'wordVariations')

    # Photos are the 500x500 dataset stills; renders are the produced avatars.
    kind_by_file = {}
    for f in os.listdir(os.path.join(ROOT, 'avatars')):
        w, h = webp_dimensions(os.path.join(ROOT, 'avatars', f))
        kind_by_file[f] = 'photo' if (w, h) == (500, 500) else 'render'
    photos = sorted(f for f, k in kind_by_file.items() if k == 'photo')
    if len(photos) != 16:
        raise SystemExit(f'expected 16 dataset photos, found {len(photos)}: {photos}')

    entries, by_bn = [], {}
    for idx in range(60):
        bn, en = labels[str(idx)].rsplit('_', 1)
        bn = nfc(bn)
        slug = slugify(en)
        entry = {'slug': slug, 'bn': bn, 'en': en, 'classIndex': idx,
                 'avatar': AVATAR_OVERRIDES.get(slug, slug + '.webp'),
                 'hasAudio': True, 'variants': []}
        entries.append(entry)
        by_bn[bn] = entry

    for bn, en in EXTRA_AVATARS.items():
        bn = nfc(bn)
        slug = slugify(en)
        entry = {'slug': slug, 'bn': bn, 'en': en.title(), 'classIndex': None,
                 'avatar': slug + '.webp', 'hasAudio': False, 'variants': []}
        entries.append(entry)
        by_bn[bn] = entry

    # Alias keys in the old wordImageMap ("ওটা" -> the "ওটা(সেটা)" entry) become variants.
    aliases = {}
    file_to_bn = {}
    for bn, filename in word_image_map.items():
        canonical_bn = nfc(filename[: filename.rindex('_')])
        file_to_bn.setdefault(canonical_bn, canonical_bn)
        if nfc(bn) != canonical_bn:
            aliases[nfc(bn)] = canonical_bn

    # Correct the two copy-paste mappings: teeth and brush-teeth both pointed at the stand avatar.
    aliases.pop('দাঁত', None)
    aliases.pop('দাঁত মাজা', None)

    dropped = 0
    for variant, base in word_variations.items():
        base = nfc(base)
        if base in PHANTOMS:
            dropped += 1
            continue
        base = aliases.get(base, base)
        target = by_bn.get(base)
        if target is None:
            raise SystemExit(f'variation {variant!r} -> {base!r} matches no sign')
        target['variants'].append(nfc(variant))

    for alias, canonical in aliases.items():
        target = by_bn.get(canonical)
        if target and alias not in target['variants'] and alias not in by_bn:
            target['variants'].append(alias)

    for e in entries:
        e['avatarKind'] = kind_by_file[e['avatar']]
        e['variants'] = sorted(set(e['variants']))

    collisions = {v for e in entries for v in e['variants']} & set(by_bn)
    if collisions:
        raise SystemExit(f'variants collide with canonical words: {sorted(collisions)}')
    missing = [e['avatar'] for e in entries if e['avatar'] not in kind_by_file]
    if missing:
        raise SystemExit(f'entries reference missing avatars: {missing}')

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'signs': entries}, f, ensure_ascii=False, indent=2)
        f.write('\n')

    print(f'wrote {OUT}')
    print(f'  {len(entries)} signs ({sum(1 for e in entries if e["classIndex"] is not None)} with a model class)')
    print(f'  {sum(len(e["variants"]) for e in entries)} variants kept, {dropped} phantom variants dropped')
    print(f'  {sum(1 for e in entries if e["avatarKind"] == "photo")} entries show a dataset photo')
    shared = len(entries) - len({e['avatar'] for e in entries})
    print(f'  {shared} entries share another entry\'s avatar')


if __name__ == '__main__':
    main()
