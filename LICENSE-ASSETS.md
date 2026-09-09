# Licence for media and vocabulary content

The [Apache License 2.0](LICENSE) covers this project's source code, trained model weights and
tooling. It does not fit creative content well, so the media is licensed separately.

## What this covers

| Path | Contents |
|---|---|
| `avatars/` | 67 sign images — 50 rendered avatars, 16 reference photographs, 1 neutral pose |
| `audio/` | 120 spoken-word recordings (60 words, Bengali and English) |
| `data/signs.json` | The sign vocabulary: words, inflections and their mappings |
| `data/class_labels.json` | The 60 model class labels |
| `assets/` | Banner, screenshots and figures used in documentation |

## Licence

These files are released under the
**[Creative Commons Attribution 4.0 International licence (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.

You are free to share and adapt them, including commercially, provided you give appropriate
credit, link to the licence, and indicate if changes were made.

Suggested attribution:

> Sign avatars and recordings from the Bidirectional Bangla Sign Language Translator by
> Md. Nazmul Haque, Ahsun Ahmed Sun, Md Shakhawat Hossen, Md Fahad Al Noman and
> M Al Shahriar Hameem (ULAB), licensed under CC BY 4.0.

## Why CC BY 4.0 specifically

The rendered avatars were produced by posing the **"Snow" character rig from Blender Studio**,
which is itself published under CC BY 4.0. Every rendered avatar is a derivative work of that rig,
so Blender Studio must be credited wherever these images are used — see [NOTICE](NOTICE).

CC BY has no share-alike clause, so we could in principle have chosen different terms for the
derivatives. Matching the upstream licence keeps the whole chain consistent and means anyone
reusing an avatar has exactly one set of conditions to satisfy rather than two.

## A note on the reference photographs

Sixteen of the images in `avatars/` are photographs of a person demonstrating a sign, taken from
the project's own training data, and are marked **Reference photo** in the app. They show an
identifiable individual. If you redistribute or adapt those specific images, the licence covers
copyright only — it does not grant personality or likeness rights, which remain with the person
photographed.
