"""Builds src/timing.js from the pointed lyrics source, the vocal-stem analysis and the beat grid.
Usage: python3 make_timing.py <lyrics.txt> <vocals.wav> <beats.json> <out.js>
Line times below were estimated from vocal phrases in the stem (not speech recognition) and are
meant to be refined in the timeline editor while listening."""
import sys, json, re, numpy as np, librosa
lyr, voc, beats, out = sys.argv[1:5]
lines = [l.strip() for l in open(lyr, encoding='utf-8') if l.strip() and not l.strip().startswith('[')]
ids = ['v1a','v1b','v1c','v1d','v1e','s1a','s1b','s1c','s1d','s1e','v2a','v2b','v2c','v2d','v2e',
       's2a','s2b','s2c','s2d','v3a','v3b','v3c','v3d','v3e','o1','o2','o3','o4','o5','o6','o7']
assert len(lines) == len(ids), (len(lines), len(ids))
T = {  # start, end (seconds) from the vocal stem phrase analysis
 'v1a':(9.55,13.20),'v1b':(13.79,17.90),'v1c':(17.95,19.44),'v1d':(20.00,21.42),'v1e':(22.19,25.54),
 's1a':(26.70,27.68),'s1b':(28.47,29.53),'s1c':(30.01,31.63),'s1d':(32.18,33.73),'s1e':(34.58,37.00),
 'v2a':(37.96,41.57),'v2b':(42.17,46.26),'v2c':(46.30,47.89),'v2d':(47.92,50.00),'v2e':(50.58,55.65),
 's2a':(56.01,58.62),'s2b':(59.11,61.54),'s2c':(62.55,64.03),'s2d':(64.55,66.40),
 'v3a':(66.60,69.70),'v3b':(70.56,74.70),'v3c':(74.75,76.24),'v3d':(76.57,78.40),'v3e':(78.94,85.03),
 'o1':(86.08,89.43),'o2':(90.00,91.34),'o3':(91.85,93.33),'o4':(93.85,95.63),'o5':(96.00,98.23),'o6':(99.65,101.23),'o7':(101.86,103.50)}
WHO = {'v1a':'both','v1b':'T','v1c':'S','v1d':'T','v1e':'both','v2a':'both','v2b':'both','v2c':'S','v2d':'T','v2e':'T',
       'v3a':'T','v3b':'both','v3c':'S','v3d':'T','v3e':'both',
       's1a':'T','s1b':'S','s1c':'T','s1d':'S','s1e':'T','s2a':'T','s2b':'S','s2c':'T','s2d':'T',
       'o1':'T','o2':'S','o3':'T','o4':'S','o5':'T','o6':'S','o7':'T'}
VOWELS = re.compile('[ִ-ׇֻ]|וּ|וֹ')
def ends_on_o(text):
    # last vowel sign of the line: holam (U+05B9), kubutz (U+05BB) or shuruk (vav + dagesh)
    for i in range(len(text) - 1, -1, -1):
        ch = text[i]
        if ch in '\u05b9\u05bb': return True
        if ch == '\u05bc' and i > 0 and text[i - 1] == '\u05d5': return True
        if '\u05b0' <= ch <= '\u05bb' or ch == '\u05c7': return False
    return False

cues = []
for i, (cid, text) in enumerate(zip(ids, lines)):
    s, e = T[cid]
    cues.append({'id': cid, 'who': WHO[cid], 'kind': 'sing' if cid[0] == 'v' else 'speak',
                 'start': s, 'end': e, 'text': text, 'syll': len(VOWELS.findall(text)),
                 'oEnd': ends_on_o(text)})
b = np.array(json.load(open(beats))['beats'])
k = np.round((b - b[0]) / np.median(np.diff(b)))
slope, icpt = np.polyfit(k, b, 1)
data = {'bpm': round(60 / slope, 3), 'beat0': round(float(icpt), 3), 'musicEnd': 158.45, 'duration': 166.0,
  'markers': {'open': 3.4, 'inhale': 8.55, 'instr': [[107.2, 157.6]]}, 'cues': cues,
  'shots': [{'t': 0, 'k': 'curtain'},
            {'t': 3.3, 'k': 'curtain', 'to': 'wide', 'd': 2.4, 'e': 'io'},
            {'t': 5.75, 'k': 'wide'},
            {'t': 8.4, 'k': 'wide', 'to': 'two', 'd': 1.1, 'e': 'io'},
            {'t': 9.55, 'k': 'wide', 'pulse': 1},
            {'t': 11.2, 'k': 'wide', 'to': 'two', 'd': 0.6, 'e': 'out'},
            {'t': 13.75, 'k': 'faceT'},
            {'t': 14.7, 'k': 'two'},
            {'t': 17.9, 'k': 'faceS'},
            {'t': 19.95, 'k': 'faceT', 'to': 'two', 'd': 1.4, 'e': 'io'},
            {'t': 22.15, 'k': 'two', 'to': 'wide', 'd': 3.2, 'e': 'io'},
            {'t': 26.3, 'k': 'dlg'},
            {'t': 26.62, 'k': 'dlg', 'to': 'two', 'd': 0.35, 'e': 'out'},
            {'t': 28.3, 'k': 'dlg', 'to': 'xfaceS', 'd': 0.25, 'e': 'out'},
            {'t': 29.9, 'k': 'faceT'},
            {'t': 31.66, 'k': 'faceS'},
            {'t': 32.1, 'k': 'faceS'},
            {'t': 33.55, 'k': 'faceT', 'to': 'xfaceT', 'd': 0.9, 'e': 'io'},
            {'t': 35.6, 'k': 'dlg'},
            {'t': 37.5, 'k': 'wide', 'pulse': 1},
            {'t': 41.9, 'k': 'wide', 'to': 'two', 'd': 2.0, 'e': 'io'},
            {'t': 43.7, 'k': 'cuBass'},
            {'t': 45.85, 'k': 'faceS'},
            {'t': 47.9, 'k': 'faceT'},
            {'t': 50.4, 'k': 'two', 'to': 'xwide', 'd': 2.2, 'e': 'io'},
            {'t': 52.6, 'k': 'faceS'},
            {'t': 54.15, 'k': 'two'},
            {'t': 55.75, 'k': 'dlg'},
            {'t': 55.98, 'k': 'dlg', 'to': 'xfaceT', 'd': 0.22, 'e': 'out'},
            {'t': 56.35, 'k': 'two'},
            {'t': 56.75, 'k': 'audience'},
            {'t': 57.42, 'k': 'dlg'},
            {'t': 59.05, 'k': 'faceS'},
            {'t': 62.5, 'k': 'faceT'},
            {'t': 64.5, 'k': 'dlg'},
            {'t': 66.2, 'k': 'cuS'},
            {'t': 67.85, 'k': 'wide', 'pulse': 1},
            {'t': 68.6, 'k': 'feet'},
            {'t': 70.4, 'k': 'xwide'},
            {'t': 72.25, 'k': 'faceT'},
            {'t': 72.6, 'k': 'faceS'},
            {'t': 72.95, 'k': 'xwide'},
            {'t': 74.7, 'k': 'two'},
            {'t': 76.5, 'k': 'faceT', 'to': 'two', 'd': 1.6, 'e': 'io'},
            {'t': 78.9, 'k': 'wide', 'pulse': 1},
            {'t': 85.7, 'k': 'dlg'},
            {'t': 86.05, 'k': 'dlg', 'to': 'two', 'd': 0.3, 'e': 'out'},
            {'t': 89.9, 'k': 'faceS'},
            {'t': 91.8, 'k': 'faceT'},
            {'t': 93.8, 'k': 'faceS'},
            {'t': 95.95, 'k': 'faceT'},
            {'t': 97.85, 'k': 'faceT', 'to': 'xfaceT', 'd': 0.25, 'e': 'out'},
            {'t': 98.3, 'k': 'cuDrum'},
            {'t': 99.6, 'k': 'faceS'},
            {'t': 101.8, 'k': 'faceT'},
            {'t': 102.6, 'k': 'faceT', 'to': 'two', 'd': 0.4, 'e': 'out'},
            {'t': 103.7, 'k': 'xwide'},
            {'t': 104.2, 'k': 'two'},
            {'t': 104.95, 'k': 'audience'},
            {'t': 105.85, 'k': 'faceT'},
            {'t': 106.45, 'k': 'band'},
            {'t': 107.0, 'k': 'wide', 'pulse': 1},
            {'t': 111.3, 'k': 'two', 'pulse': 1},
            {'t': 112.2, 'k': 'dlg'},
            {'t': 113.7, 'k': 'two'},
            {'t': 115.5, 'k': 'two', 'pulse': 1},
            {'t': 117.55, 'k': 'wide'},
            {'t': 119.25, 'k': 'faceT'},
            {'t': 119.85, 'k': 'two', 'pulse': 1},
            {'t': 122.4, 'k': 'wide'},
            {'t': 123.2, 'k': 'faceS'},
            {'t': 124.05, 'k': 'wide', 'pulse': 1},
            {'t': 128.3, 'k': 'two', 'pulse': 1},
            {'t': 130.0, 'k': 'cuDrum'},
            {'t': 131.7, 'k': 'two'},
            {'t': 132.6, 'k': 'two', 'to': 'guitFace', 'd': 0.5, 'e': 'out'},
            {'t': 134.8, 'k': 'guit'},
            {'t': 139.0, 'k': 'faceT'},
            {'t': 141.2, 'k': 'guit'},
            {'t': 143.3, 'k': 'guitFace'},
            {'t': 145.4, 'k': 'fret'},
            {'t': 147.0, 'k': 'xwide'},
            {'t': 148.4, 'k': 'wide'},
            {'t': 149.35, 'k': 'rip'},
            {'t': 150.0, 'k': 'guitFace'},
            {'t': 150.55, 'k': 'turtle'},
            {'t': 151.2, 'k': 'wide'},
            {'t': 158.6, 'k': 'turtle'},
            {'t': 159.35, 'k': 'wide'},
            {'t': 161.25, 'k': 'audience'},
            {'t': 162.25, 'k': 'curtain'}]}
# vocal envelope at 60 fps (drives jaw openness)
y, sr = librosa.load(voc, sr=16000, mono=True)
hop = sr // 60
rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]
dbv = 20 * np.log10(rms + 1e-6)
hi = np.percentile(dbv, 97); lo = hi - 28
env = np.clip((dbv - lo) / (hi - lo), 0, 1)
env = np.convolve(env, [0.25, 0.5, 0.25], mode='same')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* generated by tools/make_timing.py */\nwindow.DS = window.DS || {};\n')
    f.write('DS.DEFAULT_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    f.write('DS.VOCAL_ENV = { fps: 60, data: "' + ''.join(chr(48 + int(round(v * 63))) for v in env).replace('\\', '\\\\').replace('"', '\\"') + '" };\n')
print('ok', len(cues), 'cues; bpm', data['bpm'], 'beat0', data['beat0'], 'env frames', len(env))
