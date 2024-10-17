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
    const urlParts = req.url.split('/');
    const statusCode = urlParts[urlParts.length - 1];
    const filePath = path.join(cache, `${statusCode}.jpg`);

    try {
        if (req.method === 'GET') {
            try {
                const fileData = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(fileData);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    const response = await superagent.get(`https://http.cat/${statusCode}`).responseType('arraybuffer');
                    await fs.writeFile(filePath, Buffer.from(response.body));
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(Buffer.from(response.body));
                } else {
                    throw error;
                }
            }
        } else if (req.method === 'PUT') {
            const body = [];
            req.on('data', chunk => body.push(chunk));
            req.on('end', async () => {
                await fs.writeFile(filePath, Buffer.concat(body));
                res.writeHead(201, { 'Content-Type': 'text/plain' });
                res.end('201 Created');
            });
        } else if (req.method === 'DELETE') {
            await fs.unlink(filePath);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('200 OK');
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

const server = http.createServer(handleRequest);


server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});

server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
});
