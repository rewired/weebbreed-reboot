import json
import requests

def stream_events():
    url = "http://localhost:7331/events"
    with requests.get(url, stream=True, timeout=30) as resp:
        resp.raise_for_status()
        event_name = None

        for raw_line in resp.iter_lines(decode_unicode=True):
            if not raw_line:
                continue  # Abschnitt abgeschlossen
            if raw_line.startswith(":"):
                continue  # Keep-alive-Kommentar
            if raw_line.startswith("event:"):
                event_name = raw_line.split(":", 1)[1].strip()
            elif raw_line.startswith("data:") and event_name:
                payload = raw_line.split(":", 1)[1].strip()
                data = json.loads(payload)
                print(f"{event_name}: {json.dumps(data, indent=2)}")

if __name__ == "__main__":
    stream_events()