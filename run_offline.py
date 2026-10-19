"""
Huffman Coding Visualizer - Offline Python Launcher
ICE 245 Project

Starts a lightweight local HTTP server and automatically opens
the interactive Huffman Visualizer in your default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        # Keep console clean during presentation
        pass

def main():
    os.chdir(DIRECTORY)
    print("=" * 60)
    print("  Huffman Coding Visualizer - ICE 245 University Project")
    print("  100% Offline Standalone Web Application")
    print("=" * 60)
    
    url = f"http://localhost:{PORT}/index.html"
    print(f"\n[+] Local Server running at: {url}")
    print("[+] Opening default browser automatically...")
    print("[+] Press Ctrl+C in this terminal to stop the server.\n")

    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[!] Note: Please open {url} manually in your browser.")

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Server stopped successfully. Goodbye!")
    except OSError as e:
        # If port 8000 is occupied, try 8080 or launch file directly
        print(f"[!] Port {PORT} busy ({e}). Opening index.html directly...")
        webbrowser.open(f"file://{os.path.join(DIRECTORY, 'index.html')}")

if __name__ == "__main__":
    main()
