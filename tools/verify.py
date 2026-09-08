"""Read-only integrity check. Run after any vocabulary or asset change.

Compares references against os.listdir rather than os.path.exists, because macOS resolves
paths case- and normalization-insensitively and would hide exactly the bugs this catches.
"""

import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

errors = []
checks = 0


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)


def main():
    avatars = set(os.listdir(os.path.join(ROOT, 'avatars')))
    audio = set(os.listdir(os.path.join(ROOT, 'audio')))

    # 1. Asset filenames are safe on a case-sensitive, byte-exact host.
    for folder, names in (('avatars', avatars), ('audio', audio)):
        for name in names:
            check(name == unicodedata.normalize('NFC', name),
                  f'{folder}/{name} is not NFC-normalised')
            check(not re.search(r'[^a-z0-9._-]', name),
                  f'{folder}/{name} contains characters unsafe for a URL or a case-sensitive host')

    # 2. signs.json is internally consistent and agrees with the frozen model contract.
    with open(os.path.join(ROOT, 'data', 'signs.json'), encoding='utf-8') as f:
        signs = json.load(f)['signs']
    with open(os.path.join(ROOT, 'data', 'class_labels.json'), encoding='utf-8') as f:
        labels = json.load(f)
    with open(os.path.join(ROOT, 'models', 'model_weights.json'), encoding='utf-8') as f:
        model = json.load(f)

    check(model['output_size'] == len(labels),
          f"model output_size {model['output_size']} != {len(labels)} class labels")

    slugs = [s['slug'] for s in signs]
    check(len(slugs) == len(set(slugs)), 'duplicate slugs in signs.json')

    indexed = [s for s in signs if s['classIndex'] is not None]
    check(sorted(s['classIndex'] for s in indexed) == list(range(len(labels))),
          'classIndex values do not form a complete 0..N-1 set')

    for sign in indexed:
        label = labels[str(sign['classIndex'])]
        bn, en = label.rsplit('_', 1)
        check(unicodedata.normalize('NFC', bn) == sign['bn'],
              f"class {sign['classIndex']}: signs.json has {sign['bn']!r}, class_labels.json has {bn!r}")
        check(en == sign['en'],
              f"class {sign['classIndex']}: signs.json has {sign['en']!r}, class_labels.json has {en!r}")

    for sign in signs:
        check(sign['avatar'] in avatars,
              f"sign {sign['slug']!r} references missing avatar {sign['avatar']!r}")
        check(sign['avatarKind'] in ('render', 'photo'),
              f"sign {sign['slug']!r} has unknown avatarKind {sign['avatarKind']!r}")
        if sign['hasAudio']:
            for lang in ('bn', 'en'):
                name = f"{sign['slug']}_{lang}.mp3"
                check(name in audio, f"sign {sign['slug']!r} references missing audio {name!r}")

    words = {}
    for sign in signs:
        for word in [sign['bn']] + sign['variants']:
            check(word == unicodedata.normalize('NFC', word),
                  f"word {word!r} in sign {sign['slug']!r} is not NFC-normalised")
            check(word not in words,
                  f"word {word!r} is claimed by both {words.get(word)!r} and {sign['slug']!r}")
            words[word] = sign['slug']

    # 3. Literal asset references in the source resolve exactly.
    for folder in ('js', '.'):
        base = os.path.join(ROOT, folder)
        for filename in sorted(os.listdir(base)):
            if not filename.endswith(('.js', '.html')):
                continue
            text = open(os.path.join(base, filename), encoding='utf-8').read()
            for ref in re.findall(r'[\'"`]([A-Za-z0-9 ()._-]+\.(?:webp|mp3))[\'"`]', text):
                pool = avatars if ref.endswith('.webp') else audio
                check(ref in pool, f'{folder}/{filename} references {ref!r}, which does not exist')

    # 4. Service worker precache list is real; a single 404 aborts the whole install.
    sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    block = re.search(r'ASSETS_TO_CACHE\s*=\s*\[(.*?)\]', sw, re.S).group(1)
    for path in re.findall(r"'\./([^']*)'", block):
        if path:
            check(os.path.isfile(os.path.join(ROOT, path)),
                  f'sw.js precaches ./{path}, which does not exist')

    unreferenced = avatars - {s['avatar'] for s in signs} - {'neutral.webp'}
    orphan_audio = audio - {f"{s['slug']}_{lang}.mp3" for s in signs if s['hasAudio'] for lang in ('bn', 'en')}

    print(f'{checks} checks run')
    print(f'{len(signs)} signs, {len(indexed)} with a model class, '
          f'{sum(len(s["variants"]) for s in signs)} variants')
    print(f'{len(avatars)} avatars, {len(audio)} audio files')
    if unreferenced:
        print(f'note: {len(unreferenced)} avatars kept but unreferenced: {sorted(unreferenced)}')
    if orphan_audio:
        print(f'note: {len(orphan_audio)} audio files unreferenced: {sorted(orphan_audio)}')

    if errors:
        print(f'\nFAILED — {len(errors)} problem(s):', file=sys.stderr)
        for e in errors:
            print(f'  - {e}', file=sys.stderr)
        sys.exit(1)
    print('\nOK — everything resolves.')


if __name__ == '__main__':
    main()
