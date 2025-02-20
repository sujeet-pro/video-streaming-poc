# Create output directory for HLS files
mkdir -p video/hls

# HLS Transcoding for multiple resolutions and fps
ffmpeg -i ./video/big-buck-bunny.mp4 \
  -filter_complex \
  "[0:v]split=7[v1][v2][v3][v4][v5][v6][v7]; \
   [v1]scale=640:360[v1out]; \
   [v2]scale=854:480[v2out]; \
   [v3]scale=1280:720[v3out]; \
   [v4]scale=1920:1080[v4out]; \
   [v5]scale=1920:1080[v5out]; \
   [v6]scale=3840:2160[v6out]; \
   [v7]scale=3840:2160[v7out]" \
  -map "[v1out]" -c:v:0 h264 -r 30 -b:v:0 800k \
  -map "[v2out]" -c:v:1 h264 -r 30 -b:v:1 1400k \
  -map "[v3out]" -c:v:2 h264 -r 30 -b:v:2 2800k \
  -map "[v4out]" -c:v:3 h264 -r 30 -b:v:3 5000k \
  -map "[v5out]" -c:v:4 h264 -r 30 -b:v:4 8000k \
  -map "[v6out]" -c:v:5 h264 -r 15 -b:v:5 16000k \
  -map "[v7out]" -c:v:6 h264 -r 20 -b:v:6 20000k \
  -map a:0 -map a:0 -map a:0 -map a:0 -map a:0 -map a:0 -map a:0 \
  -c:a aac -b:a 128k \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3 v:4,a:4 v:5,a:5 v:6,a:6" \
  -master_pl_name master.m3u8 \
  -f hls \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_segment_filename "video/hls/v%v/segment%d.ts" \
  video/hls/v%v/playlist.m3u8
