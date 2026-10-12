# WiFiSense — Smart Wi-Fi Quality Analyzer

WiFiSense is a Python-based web application that analyzes Wi-Fi connection quality and monitors network performance in real time. It measures Wi-Fi signal strength, network latency, and packet loss, then calculates a quality score and provides recommendations to help users understand their connection.

## Features

- **Wi-Fi Monitoring:** Displays the connected Wi-Fi network and signal strength.
- **Latency Measurement:** Measures network response time using ping.
- **Packet Loss Detection:** Estimates packet loss from ping responses.
- **Quality Score:** Calculates a score out of 100 and assigns a quality rating.
- **Live Dashboard:** Displays network information and refreshes periodically.
- **Performance Charts:** Visualizes latency and Wi-Fi quality trends.
- **Measurement History:** Stores network measurements in an SQLite database.
- **CSV Export:** Downloads saved measurements for further analysis.
- **Recommendations:** Provides basic suggestions when potential network issues are detected.

## Technologies Used

- **Programming Language:** Python
- **Backend:** Flask
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite
- **Charts:** Chart.js
- **Networking Utility:** Windows `netsh` and `ping`
- **Version Control:** Git and GitHub

## Project Structure

```text
WiFiSense/
├── app.py
├── requirements.txt
├── .gitignore
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md
```

The SQLite database is created locally when the application initializes and is excluded from version control.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/WiFiSense.git
cd WiFiSense
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the environment

For Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Run the application

```bash
python app.py
```

Open the following address in your browser:

http://127.0.0.1:5000/

## API Endpoints

| Endpoint | Description |
|---|---|
| `/` | Displays the WiFiSense dashboard |
| `/api/quality` | Returns current Wi-Fi and network measurements |
| `/api/history` | Returns saved measurement history |
| `/download-report` | Downloads measurements as a CSV file |

## How It Works

1. The Flask backend retrieves Wi-Fi information using Windows networking commands.
2. The application sends ping requests to a public IP address to estimate latency and packet loss.
3. A weighted scoring formula calculates the network quality score when sufficient data is available.
4. The dashboard displays measurements, charts, and recommendations.
5. Measurements are stored in SQLite and can be exported as a CSV report.

## Computer Networks Concepts

This project demonstrates practical applications of:

- Wireless network signal strength
- Network latency and round-trip time
- Packet loss and connectivity testing
- Client-server architecture
- Network performance monitoring
- Data collection and historical analysis

## Limitations

- Wi-Fi signal detection currently supports Windows.
- Ping measurements depend on network connectivity and whether the target responds to ICMP requests.
- A high quality score does not guarantee high bandwidth or performance for every application.
- The quality score is an application-defined estimate, not an official Wi-Fi certification.

## Future Enhancements

- Add bandwidth and throughput testing.
- Support Linux and macOS.
- Introduce longer-term trend analysis and anomaly detection.
- Add configurable monitoring intervals and alert notifications.
- Compare performance across multiple networks.

## Author

Arpitha M