import subprocess
import re
import json
import os
import sys
import time
import socket

CLOUDFLARED_PATH = r"d:\File_K7\INTERNET OF THINGS\Food_Blockchain_Project\tools\cloudflared.exe"
TARGET_PORT = 5173
PUBLIC_JSON_PATH = r"d:\File_K7\INTERNET OF THINGS\Food_Blockchain_Project\frontend\public\active_tunnel.json"
DIST_JSON_PATH = r"d:\File_K7\INTERNET OF THINGS\Food_Blockchain_Project\frontend\dist\active_tunnel.json"

BATCHES_PAGE = r"d:\File_K7\INTERNET OF THINGS\Food_Blockchain_Project\frontend\src\pages\BatchesPage.jsx"
CONSUMER_PAGE = r"d:\File_K7\INTERNET OF THINGS\Food_Blockchain_Project\frontend\src\pages\ConsumerPortalPage.jsx"

def get_real_local_wifi_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def save_tunnel_info(tunnel_url, local_wifi_url):
    data = {
        "tunnelUrl": tunnel_url,
        "localWifiUrl": local_wifi_url,
        "active": True,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    for path in [PUBLIC_JSON_PATH, DIST_JSON_PATH]:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"[TUNNEL] Saved active tunnel URL to {path}")
        except Exception as e:
            print(f"[TUNNEL WARN] Could not write to {path}: {e}")

    # Đồng bộ DEFAULT_PUBLIC_TUNNEL_URL và CURRENT_WIFI_LAN_IP trong mã nguồn frontend
    local_ip = get_real_local_wifi_ip()
    for src_file in [BATCHES_PAGE, CONSUMER_PAGE]:
        try:
            if os.path.exists(src_file):
                with open(src_file, "r", encoding="utf-8") as f:
                    content = f.read()
                
                updated = re.sub(
                    r"const DEFAULT_PUBLIC_TUNNEL_URL = '[^']+';",
                    f"const DEFAULT_PUBLIC_TUNNEL_URL = '{tunnel_url}';",
                    content
                )
                updated = re.sub(
                    r"const CURRENT_WIFI_LAN_IP = '[^']+';",
                    f"const CURRENT_WIFI_LAN_IP = '{local_ip}';",
                    updated
                )
                if updated != content:
                    with open(src_file, "w", encoding="utf-8") as f:
                        f.write(updated)
                    print(f"[TUNNEL] Synced tunnel and Wi-Fi IP ({local_ip}) in {os.path.basename(src_file)}")
        except Exception as e:
            print(f"[TUNNEL WARN] Could not update {src_file}: {e}")

def run_tunnel():
    if not os.path.exists(CLOUDFLARED_PATH):
        print(f"[TUNNEL ERROR] cloudflared.exe not found at {CLOUDFLARED_PATH}")
        sys.exit(1)

    local_ip = get_real_local_wifi_ip()
    local_wifi_url = f"http://{local_ip}:{TARGET_PORT}"

    print("=" * 70)
    print(f" [SMARTCHAIN CLOUDFLARE TUNNEL WATCHDOG]")
    print(f" Detected Local Wi-Fi IP: {local_ip}")
    print(f" Target Web Port: {TARGET_PORT}")
    print("=" * 70)

    url_regex = re.compile(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com")

    while True:
        cmd = [CLOUDFLARED_PATH, "tunnel", "--url", f"http://localhost:{TARGET_PORT}"]
        print(f"\n[TUNNEL LAUNCH] Starting cloudflared tunnel to http://localhost:{TARGET_PORT}...")
        
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )

        live_url = None

        try:
            for line in iter(proc.stdout.readline, ''):
                sys.stdout.write(line)
                sys.stdout.flush()

                if not live_url:
                    match = url_regex.search(line)
                    if match:
                        live_url = match.group(0)
                        print("\n" + "=" * 70)
                        print(f" [CLOUDFLARE TUNNEL IS LIVE!]")
                        print(f" Public Global Mobile URL: {live_url}")
                        print(f" Local Wi-Fi Intranet URL: {local_wifi_url}")
                        print("=" * 70 + "\n")
                        save_tunnel_info(live_url, local_wifi_url)

                if "Unauthorized: Tunnel not found" in line or "error register tunnel" in line.lower():
                    print("\n[TUNNEL WARN] Tunnel expired or dropped from Cloudflare. Restarting in 3 seconds...")
                    break
        except Exception as ex:
            print(f"[TUNNEL ERROR] {ex}")

        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

        print("[TUNNEL] Re-establishing new active tunnel in 3s...")
        time.sleep(3)

if __name__ == "__main__":
    run_tunnel()
