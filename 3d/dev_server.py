#!/usr/bin/env python3
# Dev server per il workflow editor: estende il SimpleHTTPRequestHandler con
# supporto PUT sotto /save/, così la web app può salvare i JSON dei segment
# direttamente su disco.
#
# Uso (dalla cartella `3d/`):
#   python3 dev_server.py [port]      # default 8000
#
# Sicurezza minima per uso locale:
#   - PUT consentito SOLO sotto /save/
#   - path normalizzato e verificato per non uscire dalla CWD (no traversal)
#   - listen su tutte le interfacce ma pensato per dev locale, non esporre

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import sys

SAVE_PREFIX = '/save/'

class DevHandler(SimpleHTTPRequestHandler):
    def do_PUT(self):
        if not self.path.startswith(SAVE_PREFIX):
            self.send_error(403, "PUT consentito solo sotto /save/")
            return

        rel_path = self.path[len(SAVE_PREFIX):]
        cwd = os.path.realpath('.')
        full_path = os.path.realpath(os.path.join(cwd, rel_path))

        # Anti path-traversal: il path risolto deve restare dentro CWD.
        if not (full_path == cwd or full_path.startswith(cwd + os.sep)):
            self.send_error(403, "Path traversal negato")
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(body)
            print(f"  PUT  {rel_path}  ({length} bytes)", flush=True)
            self.send_response(204)
            self.end_headers()
        except Exception as e:
            self.send_error(500, f"Errore scrittura: {e}")

    # No-cache su tutto, così le edit dell'editor si vedono al reload senza
    # browser cache che si mette in mezzo.
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Dev server (GET + PUT /save/*) su http://localhost:{port}")
    print(f"  CWD: {os.path.realpath('.')}")
    try:
        ThreadingHTTPServer(('', port), DevHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
