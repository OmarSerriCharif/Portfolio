# The Man Who Saved the World — 60-second documentary montage

How Soviet officer Stanislav Petrov stopped a possible nuclear war on 26 September 1983.

- **Video:** `the-man-who-saved-the-world.mp4` (1280×720, 30 fps, 60.0 s, H.264/AAC)
- **Captions:** burned in, plus a sidecar file, `the-man-who-saved-the-world.en.srt`
- **Narration script:** `narration.txt`
- **Poster frame:** `poster.jpg`

## Structure

| Time | Narration | Picture |
|---|---|---|
| 0:00 | *Reagan soundbite:* "…the aggressive impulses of an evil empire." | Reagan, 8 March 1983 |
| 0:03 | September, 1983. The Cold War is at its most dangerous… | ICBM launches, title |
| 0:12 | Just after midnight, in a secret bunker outside Moscow… | Bunker entrance, Petrov photo |
| 0:19 | Then, the alarm. Satellites report an American missile launch… | Warning scope, launch board, launch |
| 0:28 | Protocol says: report it… | Duty officer on phone, launch fireball |
| 0:34 | But Petrov doubts it… Ground radar confirms nothing. | Petrov close-up, radar arrays |
| 0:43 | He calls it a false alarm. | Console operator |
| 0:45 | He was right. Sunlight on high clouds had fooled the satellites. | Satellite/Earth animation |
| 0:50 | Petrov received no medal… The man who saved the world. | Warsaw memorial stone, end card |

## Sources and licences

All picture and the opening soundbite are real archival material. No footage is generated or recreated.

| Material | Source | Licence |
|---|---|---|
| Missile launches, NORAD / missile-warning centre, radar, satellite animation | U.S. Air Force, *Aerospace Defense Command News Digest No. 93* (1970s), via [Internet Archive](https://archive.org/details/54384AerospaceDefenseNewsDigestNo93) | Public domain (U.S. federal government work) |
| Reagan, "Evil Empire" speech, 8 March 1983 | Ronald Reagan Presidential Library, via [Internet Archive](https://archive.org/details/evil-empire-speech-by-president-reagan-address-to-the-national-association-of-evangelicals) / [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%22Evil_Empire%22_Speech_by_President_Reagan_-_Address_to_the_National_Association_of_Evangelicals.webm) | Public domain (U.S. federal government work) |
| Stanislav Petrov, 2016 | Queery-54, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Stanislaw-jewgrafowitsch-petrow-2016.jpg) | CC BY-SA 4.0 (credited on screen) |
| Petrov memorial stone, Warsaw | Togrul Safarov (Brandmeister), [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Stanislav_Petrov_memorial_stone.jpg) | Public domain |

**About the footage:** no moving images from inside Serpukhov-15 have been released. The bunker, console, and radar shots are from a U.S. Air Force film and stand in for the Soviet side. Each of those shots is labelled on screen with *"ARCHIVAL · U.S. AIR FORCE FILM, 1970s · ILLUSTRATIVE"*.

The narration is a synthetic voice (Microsoft Edge neural TTS, en-US-ChristopherNeural). The background drone is a synthesised sine and noise bed.

## Facts used

- Date: 26 September 1983, shortly after midnight Moscow time, at the Serpukhov-15 early-warning command centre near Moscow.
- The Oko satellite system first reported one U.S. Minuteman launch and then more, five in total.
- Petrov reasoned that a real U.S. first strike would involve hundreds of missiles, and ground-based radar showed no corroboration. He reported a system malfunction instead of an attack.
- Cause: sunlight reflecting off high-altitude clouds, which the satellites misread as launches.
- He received no reward. The incident became public in 1998, about fifteen years later. Petrov died in 2017.

## Rebuild

`build.py` holds the full edit: the shot list, the caption timing, and the audio mix. It expects the source media in `media/` and the per-line TTS files in `tts/`. It needs ffmpeg with libass, and the Inter font.
