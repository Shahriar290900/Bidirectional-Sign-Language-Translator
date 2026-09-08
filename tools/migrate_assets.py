"""Rename avatars/ and audio/ to ASCII slugs. Dry-run unless --apply is passed.

Matching keys on the Bengali half of each avatar filename: it is unique across the set and
was not touched by the lowercasing that the Netlify re-download applied. The English half is
used only as a cross-check.
"""

import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATARS = os.path.join(ROOT, 'avatars')
AUDIO = os.path.join(ROOT, 'audio')
MANIFEST = os.path.join(ROOT, 'tools', 'rename-manifest.json')

# Avatars with no model class, so no entry in class_labels.json to take the English half from.
EXTRA_AVATARS = {
    'দাঁত': 'teeth',
    'দাঁত মাজা': 'brush teeth',
    'দুঃখিত': 'sorry',
    'দৃষ্টি': 'sight',
    'নয়': 'nine',
    'নাক': 'nose',
}
NEUTRAL_SRC = 'neutralpose.webp'
NEUTRAL_DST = 'neutral.webp'


class Abort(Exception):
    pass


def nfc(s):
    return unicodedata.normalize('NFC', s)


def slugify(english):
    s = english.lower().replace('(', ' ').replace(')', ' ')
    s = re.sub(r'[\s/_]+', '-', s)
    s = re.sub(r'[^a-z0-9-]', '', s)
    s = re.sub(r'-+', '-', s).strip('-')
    if not s:
        raise Abort(f'English {english!r} produced an empty slug')
    return s


def load_labels():
    with open(os.path.join(ROOT, 'data', 'class_labels.json'), encoding='utf-8') as f:
        labels = json.load(f)
    by_bn = {}
    for idx, label in labels.items():
        bn, en = label.rsplit('_', 1)
        key = nfc(bn)
        if key in by_bn:
            raise Abort(f'Bengali word {bn!r} appears twice in class_labels.json')
        by_bn[key] = (en, int(idx))
    if len(by_bn) != 60:
        raise Abort(f'expected 60 labels, found {len(by_bn)}')
    return by_bn


def plan_avatars(by_bn):
    mapping = {}
    seen_bn = {}
    for name in sorted(os.listdir(AVATARS)):
        if not name.endswith('.webp'):
            raise Abort(f'unexpected non-webp file in avatars/: {name!r}')
        if name == NEUTRAL_SRC:
            mapping[name] = NEUTRAL_DST
            continue
        stem = name[: -len('.webp')]
        if '_' not in stem:
            raise Abort(f'avatar {name!r} has no underscore separating Bengali from English')
        bn_raw, en_disk = stem.rsplit('_', 1)
        bn = nfc(bn_raw)

        if bn in seen_bn:
            raise Abort(f'Bengali {bn!r} matches two avatars: {seen_bn[bn]!r} and {name!r}')
        seen_bn[bn] = name

        if bn in by_bn:
            en_canonical = by_bn[bn][0]
            if en_disk.lower() != en_canonical.lower():
                raise Abort(
                    f'English mismatch for {bn!r}: disk has {en_disk!r}, '
                    f'class_labels.json has {en_canonical!r}'
                )
        elif bn in EXTRA_AVATARS:
            en_canonical = EXTRA_AVATARS[bn]
            if en_disk.lower() != en_canonical.lower():
                raise Abort(
                    f'English mismatch for extra avatar {bn!r}: disk has {en_disk!r}, '
                    f'expected {en_canonical!r}'
                )
        else:
            raise Abort(f'avatar {name!r} (Bengali {bn!r}) is in neither class_labels.json nor EXTRA_AVATARS')

        mapping[name] = slugify(en_canonical) + '.webp'
    return mapping


def plan_audio(by_bn):
    en_to_slug = {en.lower(): slugify(en) for en, _ in by_bn.values()}
    mapping = {}
    for name in sorted(os.listdir(AUDIO)):
        if not name.endswith('.mp3'):
            raise Abort(f'unexpected non-mp3 file in audio/: {name!r}')
        stem = name[: -len('.mp3')]
        if '_' not in stem:
            raise Abort(f'audio {name!r} has no underscore separating word from language')
        en_disk, lang = stem.rsplit('_', 1)
        if lang not in ('bn', 'en'):
            raise Abort(f'audio {name!r} has unknown language suffix {lang!r}')
        slug = en_to_slug.get(en_disk.lower())
        if slug is None:
            raise Abort(f'audio {name!r} does not correspond to any word in class_labels.json')
        mapping[name] = f'{slug}_{lang}.mp3'

    expected = {f'{s}_{lang}.mp3' for s in en_to_slug.values() for lang in ('bn', 'en')}
    missing = expected - set(mapping.values())
    if missing:
        raise Abort(f'{len(missing)} expected audio files are missing: {sorted(missing)[:10]}')
    return mapping


def check(mapping, directory, label):
    if len(set(mapping.values())) != len(mapping):
        seen, dupes = set(), set()
        for v in mapping.values():
            if v in seen:
                dupes.add(v)
            seen.add(v)
        raise Abort(f'{label}: two source files map to the same target: {sorted(dupes)}')
    for new in mapping.values():
        if new != nfc(new) or new.lower() != new or re.search(r'[^a-z0-9._-]', new):
            raise Abort(f'{label}: generated name {new!r} is not safe lowercase ASCII')
    existing = set(os.listdir(directory))
    unchanged = set(mapping)
    collisions = (set(mapping.values()) & existing) - unchanged
    if collisions:
        raise Abort(f'{label}: target names already exist as unrelated files: {sorted(collisions)}')


def two_phase_rename(mapping, directory):
    """Rename via a temp name so case-only or reordered renames can never overwrite."""
    staged = {}
    for i, old in enumerate(mapping):
        tmp = f'.migrate-tmp-{i}'
        os.rename(os.path.join(directory, old), os.path.join(directory, tmp))
        staged[tmp] = mapping[old]
    for tmp, new in staged.items():
        os.rename(os.path.join(directory, tmp), os.path.join(directory, new))


def main():
    apply = '--apply' in sys.argv
    by_bn = load_labels()

    avatars = plan_avatars(by_bn)
    audio = plan_audio(by_bn)
    check(avatars, AVATARS, 'avatars')
    check(audio, AUDIO, 'audio')

    total = len(avatars) + len(audio)
    print(f'avatars: {len(avatars)} files -> {len(set(avatars.values()))} unique names')
    print(f'audio:   {len(audio)} files -> {len(set(audio.values()))} unique names')
    print(f'total:   {total}')
    if total != 187:
        raise Abort(f'expected 187 files, planned {total}')

    changed = {k: v for k, v in {**avatars, **audio}.items() if k != v}
    print(f'renames that change a name: {len(changed)}')
    for old, new in list(sorted(avatars.items()))[:5]:
        print(f'   {old}  ->  {new}')

    if not apply:
        print('\nDRY RUN — nothing written. Re-run with --apply.')
        return

    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump({'avatars': avatars, 'audio': audio}, f, ensure_ascii=False, indent=2)
    two_phase_rename(avatars, AVATARS)
    two_phase_rename(audio, AUDIO)
    print(f'\nRenamed {total} files. Manifest: tools/rename-manifest.json')


if __name__ == '__main__':
    try:
        main()
    except Abort as e:
        print(f'ABORTED (nothing was renamed): {e}', file=sys.stderr)
        sys.exit(1)
