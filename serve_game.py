import http.server
import json
import urllib.request
import webbrowser
import threading

OLLAMA_HOST = "http://localhost:11434"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy('POST')
        else:
            self.send_error(404)

    def _proxy(self, method):
        # Strip query string for clean URL
        path = self.path
        url = OLLAMA_HOST + path
        body = None
        if method == 'POST':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)

        req = urllib.request.Request(url, data=body, method=method)
        if method == 'POST':
            req.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
                self.send_response(resp.status)
                for key in ['Content-Type']:
                    val = resp.getheader(key)
                    if val:
                        self.send_header(key, val)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

PORT = 8080
print(f"=" * 50)
print(f"  Manor of Mystery - Game Server")
print(f"=" * 50)
print(f"  Game:   http://localhost:{PORT}/fps01.html")
print(f"  Ollama: proxied through same origin")
print(f"  Press Ctrl+C to stop")
print(f"=" * 50)

server = http.server.HTTPServer(('', PORT), ProxyHandler)
threading.Timer(1.5, lambda: webbrowser.open(f'http://localhost:{PORT}/fps01.html')).start()
server.serve_forever()
