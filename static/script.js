
const history = [];
const labels = [];
let latencyChart = null;
let qualityChart = null;

const qualityHistory = [];
const qualityLabels = [];

let requestInProgress = false;

function initializeChart() {
    const canvas = document.getElementById("latencyChart");

    if (!canvas || typeof Chart === "undefined") {
        document.getElementById("chartMessage").textContent =
            "Chart.js could not load. Check your internet connection.";
        return;
    }

    latencyChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Latency (ms)",
                data: history,
                borderColor: "#536dfe",
                backgroundColor: "rgba(83, 109, 254, 0.10)",
                fill: true,
                tension: 0.35,
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Milliseconds"
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function initializeQualityChart() {
    const canvas = document.getElementById("qualityChart");

    if (!canvas || typeof Chart === "undefined") {
        const message = document.getElementById("qualityChartMessage");
        if (message) {
            message.textContent = "Quality chart is unavailable.";
        }
        return;
    }

    qualityChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: qualityLabels,
            datasets: [{
                label: "Quality Score",
                data: qualityHistory,
                borderColor: "#25bd78",
                backgroundColor: "rgba(37, 189, 120, 0.12)",
                fill: true,
                tension: 0.35,
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Quality Score"
                    }
                }
            }
        }
    });
}

function updateQualityChart(score) {
    const message = document.getElementById("qualityChartMessage");

    // Skip unavailable scores rather than treating them as zero.
    if (score === null || score === undefined) {
        if (message) {
            message.textContent =
                "Quality score unavailable. Waiting for valid measurements.";
        }
        return;
    }

    qualityLabels.push(new Date().toLocaleTimeString());
    qualityHistory.push(score);

    // Keep the latest 12 readings.
    if (qualityLabels.length > 12) {
        qualityLabels.shift();
        qualityHistory.shift();
    }

    if (qualityChart) {
        qualityChart.update();
    }

    if (message) {
        message.textContent =
            "Showing up to 12 recent quality measurements.";
    }
}


function displayValue(id, value) {
    document.getElementById(id).textContent = value;
}

function updateChart(latency) {
    const now = new Date().toLocaleTimeString();

    labels.push(now);
    history.push(latency);

    if (labels.length > 12) {
        labels.shift();
        history.shift();
    }

    if (latencyChart) {
        latencyChart.update();
    }

    document.getElementById("chartMessage").textContent =
        "Showing up to 12 recent manual measurements.";
}

async function refreshData() {
    if (requestInProgress) return;

    requestInProgress = true;

    const button = document.getElementById("refreshBtn");
    button.disabled = true;
    button.textContent = "Analyzing...";

    try {
        const response = await fetch("/api/quality", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("The server returned " + response.status);
        }

        const data = await response.json();
        const wifi = data.wifi;
        const network = data.network;
        const liveStatus = document.getElementById("liveStatus");
const liveDot = document.getElementById("liveDot");

if (network.status === "Online") {
    liveStatus.textContent = "Monitoring Active";
    liveDot.style.background = "#25bd78";
} else {
    liveStatus.textContent = "Connection Issue";
    liveDot.style.background = "#e05252";
}

        displayValue(
            "ssid",
            wifi.connected ? wifi.ssid : "Not connected to Wi-Fi"
        );

        displayValue(
            "connectionStatus",
            wifi.connected ? "Wi-Fi connected" : "Wi-Fi connection unavailable"
        );

        displayValue(
            "signal",
            wifi.signal === null ? "--" : wifi.signal
        );

        document.getElementById("signalBar").style.width =
            wifi.signal === null ? "0%" : wifi.signal + "%";

        displayValue(
            "signalNote",
            wifi.signal === null
                ? "Signal measurement unavailable"
                : wifi.signal >= 70
                    ? "Strong signal"
                    : wifi.signal >= 40
                        ? "Moderate signal"
                        : "Weak signal"
        );

        displayValue(
            "latency",
            network.latency === null ? "--" : network.latency
        );

        displayValue(
            "latencyNote",
            network.latency === null
                ? "No successful ping measurement"
                : network.latency < 50
                    ? "Low response time"
                    : network.latency <= 100
                        ? "Moderate response time"
                        : "High response time"
        );

        displayValue(
            "packetLoss",
            network.packet_loss === null ? "--" : network.packet_loss
        );

        displayValue(
            "lossNote",
            network.packet_loss === null
                ? "Measurement unavailable"
                : network.packet_loss === 0
                    ? "No packet loss in this sample"
                    : "Packet loss observed"
        );

        displayValue("networkStatus", network.status);

        displayValue(
            "statusNote",
            network.status === "Online"
                ? "Ping replies received"
                : "Check network connectivity"
        );

        displayValue(
            "score",
            data.score === null ? "--" : data.score
        );
        displayValue(
    "qualityRating",
    data.rating || "Insufficient data"
);

const ratingElement = document.getElementById("qualityRating");

if (ratingElement) {
    ratingElement.classList.remove(
        "rating-excellent",
        "rating-good",
        "rating-fair",
        "rating-poor",
        "rating-unavailable"
    );

    const ratingClasses = {
        "Excellent": "rating-excellent",
        "Good": "rating-good",
        "Fair": "rating-fair",
        "Poor": "rating-poor"
    };

    ratingElement.classList.add(
        ratingClasses[data.rating] || "rating-unavailable"
    );
}

updateQualityChart(data.score);

        const list = document.getElementById("recommendations");
        list.replaceChildren();

        data.recommendations.forEach(message => {
            const item = document.createElement("li");
            item.textContent = message;
            list.appendChild(item);
        });

        if (network.latency !== null) {
            updateChart(network.latency);
        } else {
            updateChart(null);
        }

        displayValue(
            "lastUpdated",
            "Updated at " + new Date().toLocaleTimeString()
        );
        await loadHistory();

    } catch (error) {
        console.error(error);

        displayValue("networkStatus", "Error");
        displayValue("statusNote", "Could not retrieve network data");

        const item = document.createElement("li");
        item.textContent =
            "Unable to reach the WiFiSense API. Check whether Flask is running.";
        document.getElementById("recommendations").replaceChildren(item);

    } finally {
        requestInProgress = false;
        button.disabled = false;
        button.textContent = "↻ Refresh Analysis";
    }
}

async function loadHistory() {
    const body = document.getElementById("historyBody");

    try {
        const response = await fetch("/api/history", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("History request failed");
        }

        const rows = await response.json();
        
qualityLabels.length = 0;
qualityHistory.length = 0;

rows.slice(0, 12).reverse().forEach(row => {
    if (row.score !== null && row.score !== undefined) {
        qualityLabels.push(
            new Date(row.timestamp).toLocaleTimeString()
        );
        qualityHistory.push(row.score);
    }
});

if (qualityChart) {
    qualityChart.update();
}

const qualityMessage = document.getElementById(
    "qualityChartMessage"
);

if (qualityMessage) {
    qualityMessage.textContent = qualityHistory.length
        ? "Showing saved quality measurements from your database."
        : "No saved quality scores available yet.";
}

        body.replaceChildren();

        if (rows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 6;
            td.textContent = "No measurements recorded yet.";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        rows.slice(0, 20).forEach(row => {
            const tr = document.createElement("tr");

            const values = [
                new Date(row.timestamp).toLocaleString(),
                row.signal == null ? "--" : row.signal + "%",
                row.latency == null ? "--" : row.latency + " ms",
                row.packet_loss == null ? "--" : row.packet_loss + "%",
                row.status || "--",
                row.score == null ? "--" : row.score + "/100"
            ];

            values.forEach(value => {
                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        body.textContent = "Unable to load measurement history.";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    initializeChart();
    initializeQualityChart();
    refreshData();

    // Refresh measurements every 10 seconds.
    setInterval(() => {
        refreshData();
    }, 10000);
});
