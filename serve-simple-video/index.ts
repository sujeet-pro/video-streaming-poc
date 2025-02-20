import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const VIDEO_PATH = path.join(__dirname, '../video/big-buck-bunny.mp4');
const HLS_PATH = path.join(__dirname, '../video/hls');

const server = http.createServer((req, res) => {
    switch (req.url) {
        case '/':
            // Serve index.html
            const indexStream = fs.createReadStream(path.join(__dirname, 'index.html'));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            indexStream.on('error', () => {
                res.writeHead(500);
                res.end('Error loading index.html');
            });
            indexStream.pipe(res);
            break;

        case '/v1.mp4':
            // Serve video without range support
            const videoStream = fs.createReadStream(VIDEO_PATH);
            res.writeHead(200, { 'Content-Type': 'video/mp4' });
            videoStream.on('error', () => {
                res.writeHead(500);
                res.end('Error loading video');
            });
            videoStream.pipe(res);
            break;

        case '/v2.mp4':
            // Serve video with range support
            const stat = fs.statSync(VIDEO_PATH);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(VIDEO_PATH, { start, end });

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4'
                });
                file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                    'Accept-Ranges': 'bytes'
                });
                fs.createReadStream(VIDEO_PATH).pipe(res);
            }
            break;

        case '/adaptive-streaming':
            // Serve adaptive-streaming.html
            const adaptiveStream = fs.createReadStream(path.join(__dirname, 'adaptive-streaming.html'));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            adaptiveStream.on('error', () => {
                res.writeHead(500);
                res.end('Error loading adaptive-streaming.html');
            });
            adaptiveStream.pipe(res);
            break;

        default:
            // Handle HLS files
            if (req.url?.startsWith('/hls/')) {
                const hlsFile = path.join(HLS_PATH, req.url.replace('/hls/', ''));
                
                // Ensure the requested file is within the HLS directory
                if (!hlsFile.startsWith(HLS_PATH)) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }

                fs.access(hlsFile, fs.constants.F_OK, (err) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('Not found');
                        return;
                    }

                    const extension = path.extname(hlsFile);
                    const contentType = {
                        '.m3u8': 'application/vnd.apple.mpegurl',
                        '.ts': 'video/MP2T'
                    }[extension] || 'application/octet-stream';

                    res.writeHead(200, {
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*'
                    });

                    const fileStream = fs.createReadStream(hlsFile);
                    fileStream.pipe(res);
                });
                return;
            }

            res.writeHead(404);
            res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 