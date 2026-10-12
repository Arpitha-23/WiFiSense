
from flask import Flask, render_template, jsonify
import subprocess
import platform
import re
import time
import statistics
import sqlite3
import csv
import io
from datetime import datetime
from flask import make_response

app = Flask(__name__)
DB_NAME = "wifi_history.db"


def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                ssid TEXT,
                signal INTEGER,
                latency REAL,
                packet_loss REAL,
                status TEXT,
                score INTEGER
            )
        """)


def save_measurement(wifi, network, score):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute("""
            INSERT INTO measurements
            (timestamp, ssid, signal, latency,
             packet_loss, status, score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().astimezone().isoformat(
                timespec="seconds"
            ),
            wifi.get("ssid"),
            wifi.get("signal"),
            network.get("latency"),
            network.get("packet_loss"),
            network.get("status"),
            score
        ))


def calculate_quality_score(wifi, network):
    signal = wifi.get("signal")
    latency = network.get("latency")
    packet_loss = network.get("packet_loss")

    # Do not assign a score when measurements are missing.
    if signal is None or latency is None or packet_loss is None:
        return None

    # Signal component: 40% weight.
    signal_score = max(0, min(100, signal))

    # Latency component: 30% weight.
    if latency <= 20:
        latency_score = 100
    elif latency <= 100:
        latency_score = 100 - ((latency - 20) / 80 * 50)
    else:
        latency_score = max(0, 50 - (latency - 100) / 4)

    # Packet loss component: 30% weight.
    loss_score = max(0, 100 - packet_loss * 10)

    score = (
        signal_score * 0.40
        + latency_score * 0.30
        + loss_score * 0.30
    )

    return round(max(0, min(100, score)))



def get_wifi_info():
    """Get Wi-Fi connection details on Windows."""
    info = {
        "connected": False,
        "ssid": "Unavailable",
        "signal": None
    }

    if platform.system() != "Windows":
        info["message"] = "Wi-Fi detection currently supports Windows."
        return info

    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True,
            text=True,
            timeout=5,
            errors="replace"
        )

        output = result.stdout

        state = re.search(r"^\s*State\s*:\s*(.+)$", output, re.M | re.I)
        ssid = re.search(r"^\s*SSID\s*:\s*(.+)$", output, re.M | re.I)
        signal = re.search(r"^\s*Signal\s*:\s*(\d+)%", output, re.M | re.I)

        if state and state.group(1).strip().lower() == "connected":
            info["connected"] = True

            if ssid:
                info["ssid"] = ssid.group(1).strip()

            if signal:
                info["signal"] = int(signal.group(1))

    except (subprocess.SubprocessError, OSError):
        info["message"] = "Could not read Wi-Fi information."

    return info


def measure_latency():
    """Measure latency and packet loss using Windows ping."""
    host = "1.1.1.1"
    result_data = {
        "latency": None,
        "packet_loss": None,
        "status": "Unavailable"
    }

    try:
        result = subprocess.run(
            ["ping", "-n", "4", "-w", "1500", host],
            capture_output=True,
            text=True,
            timeout=10,
            errors="replace"
        )

        output = result.stdout

        times = re.findall(
            r"(?:time|time<)\s*[=<]\s*(\d+)\s*ms",
            output,
            re.I
        )

        # Also recognize Windows responses such as time=12ms.
        times += re.findall(r"time=(\d+)\s*ms", output, re.I)

        times = [int(value) for value in times]

        sent = re.search(r"Sent\s*=\s*(\d+)", output, re.I)
        received = re.search(r"Received\s*=\s*(\d+)", output, re.I)

        if sent and received:
            total = int(sent.group(1))
            replies = int(received.group(1))

            if total > 0:
                result_data["packet_loss"] = round(
                    (total - replies) / total * 100, 1
                )

        if times:
            result_data["latency"] = round(
                statistics.mean(times), 1
            )
            result_data["status"] = "Online"
        elif result_data["packet_loss"] == 100:
            result_data["status"] = "No ping replies"
        else:
            result_data["status"] = "Unknown"

    except (subprocess.SubprocessError, OSError):
        result_data["status"] = "Measurement failed"

    return result_data


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/quality")
def quality():
    wifi = get_wifi_info()
    network = measure_latency()

    # Start with a neutral score; only calculate a score when
    # all required measurements are available.
    score = calculate_quality_score(wifi, network)
    if score is None:
     rating = "Insufficient data"
    elif score >= 85:
     rating = "Excellent"
    elif score >= 70:
     rating = "Good"
    elif score >= 50:
     rating = "Fair"
    else:
     rating = "Poor"

    if (
        wifi["signal"] is not None
        and network["latency"] is not None
        and network["packet_loss"] is not None
    ):
        signal_score = min(100, max(0, wifi["signal"]))
        latency_score = max(
            0, 100 - network["latency"] / 3
        )
        loss_score = max(0, 100 - network["packet_loss"] * 2)

        score = round(
            0.4 * signal_score
            + 0.3 * latency_score
            + 0.3 * loss_score
        )

    recommendations = []

    if not wifi["connected"]:
        recommendations.append(
            "Connect to a Wi-Fi network to inspect its signal."
        )
    elif wifi["signal"] is not None and wifi["signal"] < 50:
        recommendations.append(
            "Your Wi-Fi signal is weak. Try moving closer to the router."
        )

    if network["packet_loss"] is not None:
        if network["packet_loss"] > 0:
            recommendations.append(
                "Packet loss detected. Check router placement and congestion."
            )

    if network["latency"] is not None and network["latency"] > 100:
        recommendations.append(
            "Latency is high. Check network congestion or your internet connection."
        )

    if not recommendations:
        recommendations.append(
            "No obvious issue detected by these basic measurements."
        )
        save_measurement(wifi, network, score)

    return jsonify({
        "wifi": wifi,
        "network": network,
        "score": score,
        "rating": rating,
        "recommendations": recommendations
    })
@app.route("/api/history")
def get_history():
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT * FROM measurements
            ORDER BY id DESC
            LIMIT 50
        """).fetchall()

    return jsonify([dict(row) for row in rows])


@app.route("/download-report")
def download_report():
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Timestamp", "Wi-Fi Network", "Signal (%)",
        "Latency (ms)", "Packet Loss (%)",
        "Status", "Quality Score"
    ])

    with sqlite3.connect(DB_NAME) as conn:
        rows = conn.execute("""
            SELECT timestamp, ssid, signal, latency,
                   packet_loss, status, score
            FROM measurements
            ORDER BY id DESC
        """).fetchall()

    writer.writerows(rows)

    response = make_response("\ufeff" + output.getvalue())
    response.headers["Content-Type"] = (
        "text/csv; charset=utf-8"
    )
    response.headers["Content-Disposition"] = (
        "attachment; filename=wifi_quality_report.csv"
    )
    return response


if __name__ == "__main__":
    init_db()
    app.run(debug=True)