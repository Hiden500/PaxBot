#!/bin/bash
# Combine videos from tempMedia/ with a black screen transition in the middle.
# The transition displays "20 rounds later" text.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_MEDIA_DIR="$SCRIPT_DIR/../tempMedia"
OUTPUT_PATH="$TEMP_MEDIA_DIR/merged_output.mp4"

VIDEO1="$TEMP_MEDIA_DIR/PaxAutomata1 copy.mp4"
VIDEO2="$TEMP_MEDIA_DIR/PaxAutomata2 copy.mp4"

# Check if videos exist
if [ ! -f "$VIDEO1" ]; then
    echo "Error: $VIDEO1 not found"
    exit 1
fi

if [ ! -f "$VIDEO2" ]; then
    echo "Error: $VIDEO2 not found"
    exit 1
fi

# Get video properties from first video
RESOLUTION=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$VIDEO1")
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=s=x:p=0 "$VIDEO1" | awk -F'/' '{print $1/$2}')
AUDIO_RATE=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=s=x:p=0 "$VIDEO1" 2>/dev/null || echo "44100")

echo "Video resolution: $RESOLUTION"
echo "Video FPS: $FPS"
echo "Audio sample rate: $AUDIO_RATE"
echo "Creating filler video with text..."

# Create a 3-second black video with text overlay, matching source video properties
# Limit CPU usage: use 2 threads and lower priority
FILLER="$TEMP_MEDIA_DIR/filler.mp4"
nice -n 10 ffmpeg -f lavfi -i "color=c=black:s=${RESOLUTION}:d=3:r=${FPS}" \
    -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=${AUDIO_RATE}" \
    -vf "drawtext=text='20 rounds later':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2" \
    -c:v libx264 -preset fast -crf 23 -r ${FPS} -threads 2 \
    -c:a aac -b:a 192k \
    -shortest "$FILLER" -y

echo "Merging all videos together..."
# Use filter_complex for more reliable concatenation
# Limit CPU usage: use 2 threads and lower priority
cd "$TEMP_MEDIA_DIR"
nice -n 10 ffmpeg -i "$VIDEO1" -i "$FILLER" -i "$VIDEO2" \
    -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" \
    -map "[outv]" -map "[outa]" \
    -c:v libx264 -preset fast -crf 23 -threads 2 \
    -c:a aac -b:a 192k \
    "$OUTPUT_PATH" -y

echo "Cleaning up temporary files..."
rm -f "$FILLER"

echo "Done! Output saved to: $OUTPUT_PATH"
