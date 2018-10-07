#!/usr/bin/node
const process = require('process');
const fs = require('fs');
const url = require('url');
const http = require('http');
const WebSocket = require('ws');
const server = new http.createServer();
const wss = new WebSocket.Server({server});

const vncServers = [];


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
            try {
                res.write(`<!DOCTYPE HTML>`);
                res.write(`
<html>
        <head>
        </head>
        <body>`);

                for (let vncServer of vncServers) {
                    res.write(`
            <iframe src="/vnc.html?host=${vncServer.domain}&port=${vncServer.wsPort}&password=${vncServer.password}&autoconnect=1&forward_to=/"></iframe>`);
                }

                res.write(`
        </body>
</html>`);
            } catch (e) {
                logEvent({type: 'error', error: e});
            }
            res.end("\n");
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
