#!/usr/bin/node
const process = require('process');
const fs = require('fs');
const url = require('url');
const http = require('http');
const WebSocket = require('ws');
const server = new http.createServer();
const wss = new WebSocket.Server({server});

function logEvent(event) {
    console.log(JSON.stringify(event));
    //console.log(event)
}

wss.on('connection', (ws, req) => {
    logEvent({type: 'connection', address: req.connection.remoteAddress, url: req.url});
    ws.url = req.url;
    ws.on('message', (message) => {
        logEvent({type: 'message', message: message, url: req.url});
        wss.clients.forEach((client) => {
            if (client === ws) return;
            if (client.url !== req.url) return;
            if (client.readyState !== WebSocket.OPEN) return;

            //logEvent({type: 'dispatch', message: message, url: client.url})
            client.send(message);
        });
    });
});

server.on('request', (req, res) => {
    logEvent({type: 'request', url: req.url});

    switch (req.url) {
        case "/":
            fs.readFile('server-setup/done.tsv', 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.end("Server error");
                    return;
                }

                res.write(`<!DOCTYPE HTML>`);
                res.write(`
<html>
    <head>
        <style>
            iframe {
                width: 300px;
                height: 150px;
                border-width: 2px;
            }
            
            .iframeCover {
                width: 300px;
                height: 150px;
                border: 2px transparent;
                display: inline-block;
                position: absolute;
            }
        </style>
    </head>
    <body>`);
                data.split('\n').filter(row => row !== '')
                    .map(row => row.split('\t'))
                    .filter(([ip, pw, ...details]) => pw !== 'FAIL')
                    .map(([ip, pw, ...details]) => ({
                        host: ip,
                        password: pw,
                        port: details[0],
                        domain: details[1],
                        wsPort: 443
                    }))
                    .forEach((vncServer) => {
                        const link = `/vnc.html?host=${vncServer.domain}&port=${vncServer.wsPort}&password=${vncServer.password}&autoconnect=1&forward_to=/`;
                        res.write(`
            <a class="iframeCover" href="${link}" target="_blank"></a>
            <iframe src="${link}&view_only=1"></iframe>`);
                    });
                res.write(`
    </body>
</html>`);
                res.end("\n");
            });
            break;

        default:
            fs.readFile('.' + url.parse(req.url).pathname, (err, data) => {
                if (err) {
                    logEvent({type: 'error', error: err});
                    res.statusCode = 500;
                }
                res.end(data);
            });
    }
});

server.listen(process.env.PORT || 3000);
