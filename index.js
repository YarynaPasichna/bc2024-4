const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const superagent = require('superagent');
const { program } = require('commander');

program
    .requiredOption('-h, --host <host>', 'server host')
    .requiredOption('-p, --port <port>', 'server port')
    .requiredOption('-c, --cache <path>', 'cache directory path')
    .parse(process.argv);

const { host, port, cache } = program.opts();

const handleRequest = async (req, res) => {
    const statusCode = req.url.slice(1);
    const filePath = path.join(cache, `${statusCode}.jpg`);

    try {
        if (req.method === 'GET') {
            let fileData;
            try {
                fileData = await fs.readFile(filePath);
            } catch {
                const response = await superagent.get(`https://http.cat/${statusCode}`).responseType('arraybuffer');
                fileData = Buffer.from(response.body);
                await fs.writeFile(filePath, fileData);
            }
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(fileData);
        } else if (req.method === 'PUT') {
            const body = [];
            req.on('data', chunk => body.push(chunk));
            req.on('end', async () => {
                await fs.writeFile(filePath, Buffer.concat(body));
                res.writeHead(201, { 'Content-Type': 'text/plain' });
                res.end('201 Created');
            });
        } else if (req.method === 'DELETE') {
            try {
                await fs.unlink(filePath);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('200 OK');
            } catch {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('405 Method Not Allowed');
        }
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
    }
};

http.createServer(handleRequest).listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
