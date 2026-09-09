"""Build a printable sheet of example sentences, each shown as a strip of labelled signs.

Reads the sentences from example-sentences.md and resolves every word through the same
rules the app uses, so a sentence that would fall back to plain text can never appear here.

    python3 tools/build_sentence_sheet.py        # writes build/sentence-sheet/sheet.html
"""

import json
import os
import re
import shutil
import unicodedata

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'sentence-sheet')

SUFFIXES = sorted(["গুলো", "গুলি", "ছিল", "দের", "ের", "তে", "ছি", "ছে", "বো", "বে",
                   "কে", "তা", "টা", "টি", "র", "এ", "য়"], key=len, reverse=True)


def nfc(s):
    return unicodedata.normalize('NFC', s)


def load_index():
    signs = json.load(open(os.path.join(ROOT, 'data', 'signs.json'), encoding='utf-8'))['signs']
    index = {}
    for sign in signs:
        index[nfc(sign['bn'])] = sign
        for variant in sign['variants']:
            index[nfc(variant)] = sign
    return index


def lookup(word, index):
    word = nfc(word)
    if word in index:
        return index[word]
    for suffix in SUFFIXES:
        if len(word) > len(suffix) and word.endswith(suffix):
            root = word[:-len(suffix)]
            if len(root) >= 2 and root in index:
                return index[root]
    return None


def process(text, index):
    words = [re.sub(r'^[^ঀ-৿0-9_a-zA-Z]+|[^ঀ-৿0-9_a-zA-Z]+$', '', w)
             for w in nfc(text).split()]
    words = [w for w in words if w]
    out, i = [], 0
    while i < len(words):
        matched = False
        for length in range(min(3, len(words) - i), 1, -1):
            phrase = ' '.join(words[i:i + length])
            sign = lookup(phrase, index)
            if sign:
                out.append((phrase, sign))
                i += length
                matched = True
                break
        if not matched:
            out.append((words[i], lookup(words[i], index)))
            i += 1
    return out


def read_sentences():
    """Parse the '| Bengali | English | Signs |' tables out of example-sentences.md."""
    groups, current = [], None
    for line in open(os.path.join(ROOT, 'example-sentences.md'), encoding='utf-8'):
        line = line.rstrip()
        if line.startswith('## '):
            current = (line[3:].strip(), [])
            groups.append(current)
        elif line.startswith('|') and current is not None:
            cells = [c.strip() for c in line.strip('|').split('|')]
            if len(cells) == 3 and cells[0] not in ('Bengali', '---') and not set(cells[0]) <= {'-'}:
                current[1].append((cells[0], cells[1]))
    return [g for g in groups if g[1]]


def main():
    index = load_index()
    groups = read_sentences()
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(os.path.join(OUT, 'av'), exist_ok=True)

    exported = set()
    blocks, total = [], 0

    for title, sentences in groups:
        rows = []
        for bengali, english in sentences:
            items = process(bengali, index)
            missing = [w for w, s in items if not s]
            if missing:
                raise SystemExit(f'{bengali!r} has no sign for: {" ".join(missing)}')
            total += 1

            cards = []
            for word, sign in items:
                if sign['avatar'] not in exported:
                    im = Image.open(os.path.join(ROOT, 'avatars', sign['avatar'])).convert('RGB')
                    im.thumbnail((700, 700))
                    im.save(os.path.join(OUT, 'av', sign['avatar'] + '.jpg'), quality=90)
                    exported.add(sign['avatar'])
                badge = '<b>photo</b>' if sign['avatarKind'] == 'photo' else ''
                cards.append(
                    f'<figure><div class="pic">{badge}'
                    f'<img src="av/{sign["avatar"]}.jpg" alt=""></div>'
                    f'<figcaption><span class="bn">{word}</span>'
                    f'<em>{sign["en"]}</em></figcaption></figure>')

            rows.append(
                f'<div class="sentence">'
                f'<div class="signs">{"".join(cards)}</div>'
                f'<div class="result"><span class="bn">{bengali}</span>'
                f'<em>&ldquo;{english}&rdquo;</em>'
                f'<span class="count">{len(items)} sign{"s" if len(items) != 1 else ""}</span></div>'
                f'</div>')

        blocks.append(f'<section><h2>{title}</h2>{"".join(rows)}</section>')

    html = TEMPLATE.replace('{{BLOCKS}}', '\n'.join(blocks)).replace('{{TOTAL}}', str(total))
    with open(os.path.join(OUT, 'sheet.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'{total} sentences, {len(exported)} distinct signs -> {OUT}/sheet.html')


TEMPLATE = """<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8"><title>Example sentences</title>
<style>
  @page { size: A4 portrait; margin: 15mm 14mm 13mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #2b3a34; font-size: 9.5pt; }
  .bn { font-family: "Kohinoor Bangla", "Bangla MN", "Noto Sans Bengali", sans-serif; }

  header { border-bottom: 2.5pt solid #0f7a52; padding-bottom: 9pt; margin-bottom: 14pt; }
  h1 { font-size: 19pt; color: #14231d; letter-spacing: -0.01em; }
  header p { color: #6b7d75; font-size: 9pt; margin-top: 4pt; max-width: 150mm; line-height: 1.4; }

  h2 { font-size: 12.5pt; color: #14231d; margin: 11pt 0 6pt;
       border-bottom: 1pt solid #d3ddd8; padding-bottom: 4pt; }
  section { break-inside: auto; }

  .sentence { break-inside: avoid; page-break-inside: avoid; margin-bottom: 7pt;
              border: 0.8pt solid #dfe7e3; border-radius: 4pt; padding: 6pt 7pt; background: #fcfdfc; }

  .signs { display: flex; flex-wrap: wrap; gap: 5pt; margin-bottom: 5pt; }
  .signs figure { width: 70pt; border: 0.8pt solid #e2eae6; border-radius: 3pt;
                  overflow: hidden; background: #fff; }
  .signs .pic { position: relative; }
  .signs .pic b { position: absolute; top: 2.5pt; right: 2.5pt; font-size: 5pt; font-weight: 600;
                  text-transform: uppercase; letter-spacing: .04em; padding: 1pt 3pt;
                  border-radius: 6pt; background: rgba(20,35,29,.7); color: #fff; }
  .signs img { width: 100%; display: block; aspect-ratio: 4/3; object-fit: cover; object-position: 50% 28%; }
  .signs figcaption { padding: 3pt 2pt 4pt; text-align: center; line-height: 1.2; }
  .signs figcaption .bn { display: block; font-size: 9pt; font-weight: 700; color: #14231d; }
  .signs figcaption em { display: block; font-style: normal; font-size: 7pt; color: #8d9c96; margin-top: 1pt; }

  .result { border-top: 0.8pt dashed #d3ddd8; padding-top: 4.5pt;
            display: flex; align-items: baseline; gap: 8pt; }
  .result .bn { font-size: 12pt; font-weight: 700; color: #0f7a52; }
  .result em { font-style: normal; color: #52635c; font-size: 9pt; }
  .result .count { margin-left: auto; font-size: 7.5pt; color: #9aa8a2; white-space: nowrap; }

  footer { margin-top: 12pt; border-top: 0.8pt solid #d3ddd8; padding-top: 6pt;
           font-size: 7.5pt; color: #9aa8a2; }
</style></head><body>
<header>
  <h1>Bangla Sign Language &mdash; example sentences</h1>
  <p>Each sentence is shown as the sequence of signs the app plays, left to right, with the
     Bengali word under every sign. All {{TOTAL}} sentences were checked against
     <code>data/signs.json</code>: every word resolves to an avatar that exists, so none of them
     falls back to plain text. Bangla Sign Language has no grammatical inflection, so these read
     as sign sequences rather than grammatical Bengali.</p>
</header>
{{BLOCKS}}
<footer>Generated by tools/build_sentence_sheet.py &middot; regenerate after any vocabulary change.</footer>
</body></html>
"""


if __name__ == '__main__':
    main()
