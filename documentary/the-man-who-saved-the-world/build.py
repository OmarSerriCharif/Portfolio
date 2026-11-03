#!/usr/bin/env python3
"""Build the 60-second Petrov montage. Run from the scratchpad dir."""
import os, re, subprocess, json, sys

W, H, FPS = 1280, 720, 30
TEMPO = 1.06          # narration speed-up
TOTAL = 60.0
M = "media"
OUT = "build"
os.makedirs(OUT, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(cmd)); print(r.stderr[-3000:]); sys.exit(1)

def dur(p):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p]))

# ---------- narration timing ----------
lines = [l.strip() for l in open("lines.txt") if l.strip()]
starts = [3.05, None, None, None, None, None, None, None]
GAP = 0.22
nar = []
t = starts[0]
for i, txt in enumerate(lines, 1):
    d = dur(f"tts/l{i}.mp3") / TEMPO
    nar.append((t, t + d, txt, i))
    t += d + GAP
print("narration ends at", round(nar[-1][1], 2))

def srt_words(i):
    """word cues from edge-tts srt -> list of (start,end,word) scaled by tempo"""
    s = open(f"tts/l{i}.srt").read()
    out = []
    for blk in s.strip().split("\n\n"):
        p = blk.splitlines()
        if len(p) < 3: continue
        a, b = p[1].split(" --> ")
        f = lambda x: (lambda h,m,s: int(h)*3600+int(m)*60+float(s.replace(",",".")))(*x.split(":"))
        out.append((f(a)/TEMPO, f(b)/TEMPO, " ".join(p[2:])))
    return out

# ---------- shot list (start/end on the output timeline) ----------
# kind: v = video (src file, src_in), p = photo (file, crop expr, zoom dir)
N = {k: (a, b) for (a, b, _, k) in nar}
shots = []
def V(t0, t1, src, sin, crop="adc", tag=None): shots.append(dict(k="v", t0=t0, t1=t1, src=src, sin=sin, crop=crop, tag=tag))
def P(t0, t1, src, crop, z="in"): shots.append(dict(k="p", t0=t0, t1=t1, src=src, crop=crop, z=z))

ADC = f"{M}/adc93.mp4"
V(0.0, 3.0, f"{M}/reagan.webm", 1778.05, crop="reagan")
b1 = N[1]; s = b1[0]; e = N[2][0]
V(3.0, 6.3, ADC, 38.2)            # Titan/Minuteman lift-off
V(6.3, 9.3, ADC, 44.0)            # silo launch fireball
V(9.3, e, ADC, 52.0)              # missile in flight
s2, e2 = N[2]
V(e - 0.0, s2 + 3.0, ADC, 244.6)   # bunker tunnel entrance
P(s2 + 3.0, N[3][0], f"{M}/petrov2016.jpg", "face", "in")
s3, e3 = N[3]
V(s3, s3 + 3.3, ADC, 540.0)        # radar scope sweep
V(s3 + 3.3, s3 + 5.9, ADC, 506.2)  # launch board
V(s3 + 5.9, N[4][0], ADC, 478.6)   # launch
s4, e4 = N[4]
V(s4, s4 + 2.9, ADC, 493.2)        # officer on the phone
V(s4 + 2.9, N[5][0], ADC, 476.2)   # fireball
s5, e5 = N[5]
P(s5, s5 + 3.9, f"{M}/petrov2016.jpg", "eyes", "in")
V(s5 + 3.9, s5 + 6.5, ADC, 568.3)  # radar array
V(s5 + 6.5, N[6][0], ADC, 577.0)   # radome
s6, e6 = N[6]
V(s6, N[7][0], ADC, 612.2)         # console operator
s7, e7 = N[7]
V(s7, N[8][0], ADC, 659.2)         # earth + satellite animation
s8, e8 = N[8]
mem = f"{M}/memorial.jpg"
have_mem = os.path.exists(mem) and open(mem, "rb").read(3) == b"\xff\xd8\xff"
if have_mem:
    P(s8, s8 + 4.6, mem, "memorial", "out")
    P(s8 + 4.6, TOTAL, f"{M}/petrov2016.jpg", "wide", "out")
else:
    P(s8, TOTAL, f"{M}/petrov2016.jpg", "wide", "out")
# make contiguous
for a, b in zip(shots, shots[1:]): b["t0"] = a["t1"]
shots[-1]["t1"] = TOTAL

# ---------- render each shot ----------
GRADE = "eq=contrast=1.06:saturation=0.82,vignette=PI/5"
clips = []
for n, sh in enumerate(shots):
    d = round(sh["t1"] - sh["t0"], 3)
    o = f"{OUT}/s{n:02d}.mp4"
    if sh["k"] == "v":
        if sh["crop"] == "adc":   # 4:3 picture inside 640x360 pillarbox; drop burned-in timecode at bottom
            cf = "crop=480:270:80:22"
        else:                      # reagan 640x480 -> 16:9, trims library bug
            cf = "crop=640:360:0:28"
        vf = f"{cf},scale={W}:{H}:flags=lanczos,setsar=1,fps={FPS},{GRADE},format=yuv420p"
        run(["ffmpeg","-v","error","-y","-ss",str(sh["sin"]),"-i",sh["src"],"-t",str(d),"-an","-vf",vf,"-r",str(FPS),"-c:v","libx264","-crf","16","-preset","fast",o])
    else:
        frames = int(round(d * FPS))
        src = sh["src"]
        # pre-crop to a 16:9 region
        pc = {"face": "crop=581:327:0:120", "eyes": "crop=420:236:90:150", "wide": "crop=581:327:0:150",
              "memorial": "crop=960:540:0:350"}[sh["crop"]]
        zin = f"min(1+0.10*on/{frames},1.10)" if sh["z"] == "in" else f"max(1.10-0.10*on/{frames},1.0)"
        vf = (f"{pc},scale=2560:1440:flags=lanczos,setsar=1,"
              f"zoompan=z='{zin}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
              f"{GRADE},format=yuv420p")
        run(["ffmpeg","-v","error","-y","-loop","1","-i",src,"-vf",vf,"-frames:v",str(frames),"-r",str(FPS),"-c:v","libx264","-crf","16","-preset","fast",o])
    clips.append(o)
    print(f"shot {n:02d} {sh['t0']:6.2f}-{sh['t1']:6.2f} {os.path.basename(sh['src'])} {sh.get('sin','')}")

with open(f"{OUT}/list.txt", "w") as f:
    for c in clips: f.write(f"file '{os.path.abspath(c)}'\n")
run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{OUT}/list.txt","-c","copy",f"{OUT}/video_raw.mp4"])

# ---------- captions (ASS) ----------
def ts(x):
    x = max(0, x); h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"

ass = ["[Script Info]","ScriptType: v4.00+",f"PlayResX: {W}",f"PlayResY: {H}","WrapStyle: 0","",
"[V4+ Styles]",
"Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
"Style: Sub,Inter SemiBold,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,0,0,1,2.2,1.2,2,120,120,46,1",
"Style: Quote,Inter Medium,38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,1,0,0,100,100,0,0,1,2.2,1.2,2,120,120,62,1",
"Style: Lower,Inter SemiBold,26,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1.5,0,1,1.6,0.8,7,64,64,52,1",
"Style: Tag,Inter Medium,17,&H00D8D8D8,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1.2,0,1,1.2,0,9,40,40,30,1",
"Style: Title,Inter Display Black,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,4,0,1,0,3,5,80,80,0,1",
"Style: Kicker,Inter SemiBold,24,&H0041A4D9,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,6,0,1,0,2,5,80,80,0,1",
"Style: Small,Inter Medium,20,&H00C8C8C8,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,1,5,80,80,0,1",
"","[Events]","Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
def ev(a, b, style, text, layer=2): ass.append(f"Dialogue: {layer},{ts(a)},{ts(b)},{style},,0,0,0,,{text}")
FADE = r"{\fad(180,180)}"

# opening soundbite caption
ev(0.15, 2.95, "Quote", FADE + r"“…the aggressive impulses of an evil empire.”")
ev(0.15, 2.95, "Lower", FADE + r"{\an7\pos(64,48)}PRESIDENT RONALD REAGAN\N{\fs20\c&HD0D0D0&}Orlando, Florida · March 8, 1983")

# narration captions: original text (with punctuation) mapped onto word timings
for (a, b, txt, i) in nar:
    words = srt_words(i)
    toks = txt.split()
    if len(toks) != len(words):
        print("WARN word count mismatch", i, len(toks), len(words))
    toks = toks[:len(words)] if len(toks) >= len(words) else toks
    pairs = list(zip(toks, words))
    chunk = []
    def flush():
        if chunk and " ".join(t for t, _ in chunk) == "The man who saved the world.":
            chunk.clear()  # shown as the end title instead
        if chunk:
            ev(a + chunk[0][1][0], a + chunk[-1][1][1] + 0.3, "Sub", " ".join(t for t, _ in chunk))
            chunk.clear()
    for j, pw in enumerate(pairs):
        chunk.append(pw)
        end_sent = re.search(r"[.!?]$", pw[0])
        soft = re.search(r"[,:]$", pw[0]) and len(chunk) >= 3
        if end_sent and len(chunk) >= 2 or soft or len(chunk) >= 9:
            # avoid leaving a single orphan word
            if not (end_sent is None and j == len(pairs) - 2):
                flush()
    flush()
# fix overlaps: end each caption before next begins
evs = [x for x in ass if x.startswith("Dialogue: 2,") and ",Sub," in x]
def parse(t): h, m, s = t.split(":"); return int(h)*3600 + int(m)*60 + float(s)
for j in range(len(evs) - 1):
    p1 = evs[j].split(","); p2 = evs[j+1].split(",")
    if parse(p1[2]) > parse(p2[1]) - 0.02:
        p1[2] = ts(parse(p2[1]) - 0.02); new = ",".join(p1)
        ass[ass.index(evs[j])] = new; evs[j] = new

# title over the opening launch
ev(3.25, 8.9, "Kicker", r"{\fad(400,500)\pos(640,318)}A TRUE STORY · 1983")
ev(3.25, 8.9, "Title", r"{\fad(400,500)\pos(640,368)}THE MAN WHO SAVED THE WORLD")

# lower thirds / context tags
ev(N[2][0] + 0.2, N[2][0] + 3.0, "Lower", FADE + r"SERPUKHOV-15 EARLY-WARNING BUNKER\N{\fs20\c&HD0D0D0&}Near Moscow · 26 September 1983 · just after midnight")
ev(N[2][0] + 3.2, N[3][0] - 0.1, "Lower", FADE + r"LT. COL. STANISLAV PETROV\N{\fs20\c&HD0D0D0&}Soviet Air Defence Forces · duty officer")
# photo credits (required by CC BY-SA)
for sh in shots:
    if sh["k"] == "p" and "petrov2016" in sh["src"]:
        ev(sh["t0"] + 0.2, sh["t1"] - 0.1, "Tag", FADE + "PHOTO: PETROV IN 2016 · QUEERY-54 / CC BY-SA 4.0")
    if sh["k"] == "p" and "memorial" in sh["src"]:
        ev(sh["t0"] + 0.2, sh["t1"] - 0.1, "Tag", FADE + "MEMORIAL STONE, WARSAW · PUBLIC DOMAIN")
# illustrative footage disclosure on every USAF shot
for sh in shots:
    if sh["k"] == "v" and "adc93" in sh["src"]:
        ev(sh["t0"] + 0.1, sh["t1"] - 0.05, "Tag", "ARCHIVAL · U.S. AIR FORCE FILM, 1970s · ILLUSTRATIVE")
    if sh["k"] == "v" and "reagan" in sh["src"]:
        ev(sh["t0"] + 0.1, sh["t1"] - 0.05, "Tag", "ARCHIVAL · REAGAN PRESIDENTIAL LIBRARY")
# alarm flash: brief red wash at "the alarm"
al = N[3][0]
ass.append(f"Dialogue: 1,{ts(al)},{ts(al+1.1)},Sub,,0,0,0,,{{\\an7\\pos(0,0)\\bord0\\shad0\\1c&H1010C0&\\alpha&HFF&\\t(0,120,\\alpha&HA0&)\\t(120,1100,\\alpha&HFF&)\\p1}}m 0 0 l {W} 0 {W} {H} 0 {H}{{\\p0}}")
# end card
end_t = max(N[8][1] - 3.2, TOTAL - 4.6)
ev(end_t, TOTAL, "Kicker", r"{\fad(500,0)\pos(640,300)}STANISLAV PETROV · 1939–2017")
ev(end_t, TOTAL, "Title", r"{\fad(500,0)\pos(640,360)}THE MAN WHO SAVED THE WORLD")
ev(end_t, TOTAL, "Small", r"{\fad(500,0)\pos(640,424)}Footage: U.S. Air Force · Reagan Presidential Library   Photos: Queery-54 (CC BY-SA 4.0)" + (r" · Wikimedia Commons (PD)" if have_mem else ""))
ass.append(f"Dialogue: 0,{ts(end_t-0.6)},{ts(TOTAL)},Sub,,0,0,0,,{{\\an7\\pos(0,0)\\bord0\\shad0\\1c&H000000&\\alpha&HFF&\\t(0,900,\\alpha&H50&)\\p1}}m 0 0 l {W} 0 {W} {H} 0 {H}{{\\p0}}")
open(f"{OUT}/captions.ass", "w").write("\n".join(ass) + "\n")

# ---------- audio ----------
# Reagan soundbite, narration lines, low drone bed
inputs = ["-ss","1778.05","-t","3.0","-i",f"{M}/reagan.webm"]
fl = ["[0:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.15,afade=t=out:st=2.6:d=0.4,volume=1.15[reag]"]
mix = ["[reag]"]
for (a, b, txt, i) in nar:
    k = len(inputs) // 2  # not reliable; compute below
for idx, (a, b, txt, i) in enumerate(nar, start=1):
    inputs += ["-i", f"tts/l{i}.mp3"]
    ms = int(a * 1000)
    fl.append(f"[{idx}:a]atempo={TEMPO},aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms},volume=1.5[n{i}]")
    mix.append(f"[n{i}]")
# drone: two low sines + filtered brown noise, swelling at the alarm, dropping out at "false alarm"
dn = len(nar) + 1
inputs += ["-f","lavfi","-t",str(TOTAL),"-i","sine=f=55:sample_rate=48000",
           "-f","lavfi","-t",str(TOTAL),"-i","sine=f=82.4:sample_rate=48000",
           "-f","lavfi","-t",str(TOTAL),"-i","anoisesrc=c=brown:a=0.5:r=48000"]
fl.append(f"[{dn}:a][{dn+1}:a][{dn+2}:a]amix=inputs=3:weights=1 0.6 0.35,lowpass=f=300,aformat=channel_layouts=stereo,"
          f"volume='0.10+0.12*between(t,{N[3][0]:.2f},{N[6][0]:.2f})-0.07*between(t,{N[6][0]:.2f},{N[7][0]+1:.2f})':eval=frame,"
          f"afade=t=in:st=2.6:d=1.5,afade=t=out:st={TOTAL-2.5}:d=2.5[drone]")
mix.append("[drone]")
fl.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0,alimiter=limit=0.95,atrim=0:{TOTAL}[aout]")
run(["ffmpeg","-v","error","-y",*inputs,"-filter_complex",";".join(fl),"-map","[aout]","-c:a","pcm_s16le",f"{OUT}/audio.wav"])

# ---------- final mux ----------
final = "petrov_60s.mp4"
run(["ffmpeg","-v","error","-y","-i",f"{OUT}/video_raw.mp4","-i",f"{OUT}/audio.wav",
     "-vf",f"ass={OUT}/captions.ass,fade=t=in:st=0:d=0.4",
     "-t",str(TOTAL),"-c:v","libx264","-crf","21","-preset","slow","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",final])
json.dump({"shots": shots, "narration": nar}, open(f"{OUT}/timeline.json", "w"), indent=1)
print("done", final, dur(final))
