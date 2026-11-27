#!/usr/bin/env bash
# Rebuild the study from the original screenshots.
#   ./build.sh /path/to/originals [out_dir] [--locked]
# Needs: python3 with numpy, opencv-python-headless, scipy; ffmpeg with libx264.
set -euo pipefail
SRC=${1:?usage: build.sh /path/to/originals [out_dir] [--locked]}
OUT=${2:-out}
EXTRA=${3:-}
HERE=$(cd "$(dirname "$0")" && pwd)
NAME=EditaDesign_fire-wing-wave_study
mkdir -p "$OUT"

# 1. picture: 168 PNG frames, 1920x1080
python3 -I "$HERE/render.py" --src "$SRC" --out "$OUT/frames" $EXTRA
# 2. sound: three-note motif, 48 kHz stereo
python3 -I "$HERE/sound.py" "$OUT/motif.wav"

# 3. master with sound
ffmpeg -y -loglevel error -framerate 24 -i "$OUT/frames/f%04d.png" -i "$OUT/motif.wav" \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/${NAME}_1920x1080_24p.mp4"

# 4. silent version (must read the same without sound)
ffmpeg -y -loglevel error -framerate 24 -i "$OUT/frames/f%04d.png" \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart "$OUT/${NAME}_silent.mp4"

# 5. review: the middle second (3.0-4.0 s) at quarter speed, silent
ffmpeg -y -loglevel error -framerate 6 -start_number 72 -i "$OUT/frames/f%04d.png" -frames:v 24 \
  -vf "fps=24" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart \
  "$OUT/${NAME}_review_3-4s_quarter-speed.mp4"

echo "done -> $OUT"
