import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MP4_PATH = path.join(__dirname, 'video/big-buck-bunny.mp4');
const HLS_PATH = path.join(__dirname, 'video/hls');

const server = http.createServer((req, res) => {
    switch (req.url) {
        case '/':
            // Serve index.html
            fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading index.html');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
            break;

        case '/video/simple':
            // Serve video without range support
            fs.readFile(MP4_PATH, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading video');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'video/mp4' });
                res.end(data);
            });
            break;

        case '/video/range':
            // Serve video with range support
            const stat = fs.statSync(MP4_PATH);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(MP4_PATH, { start, end });

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
                fs.createReadStream(MP4_PATH).pipe(res);
            }
            break;

        default:
            // Handle HLS files
            if (req.url?.startsWith('/hls/')) {
                const hlsFile = path.join(HLS_PATH, req.url.replace('/hls/', ''));
                
                // Security check: Ensure the requested file is within the HLS directory
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