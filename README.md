# forecast.ai — MLOps Air Quality Index (AQI) Forecasting Console

`forecast.ai` is an end-to-end MLOps platform for managing, versioning, and monitoring real-time Air Quality Index (AQI) forecasts in target South Indian cities (Rajahmundry, Tada, and Chennai). The platform integrates live weather data ingestion, automated model training pipelines, strict performance validation gating, MLflow model registries, dataset version control (DVC), and production serving observability.

---

## 🛠️ Tech Stack

*   **Frontend Web UI**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, TanStack React Query, Axios.
*   **Backend API**: FastAPI (Python 3.12), Uvicorn, Pydantic, Pandas, Scikit-learn, Scipy.
*   **Data & Orchestration Pipelines**: Apache Airflow 2.7 (custom containerized environment with `uv` and `dvc`), DVC (Data Version Control) with DagsHub remote storage.
*   **Model Registry & Experiment Tracking**: MLflow (DagsHub hosted).
*   **Observability & Monitoring**: Prometheus (metrics scraping), Grafana (operational metrics visualization).
*   **Infrastructure & Deployment**: Docker, Docker Compose, AWS EC2.

---

## 🚀 Key Features

*   **Automated Ingestion Pipeline**: Containerized Airflow scheduler runs hourly tasks to query live weather and pollution parameters via the OpenWeatherMap API and appends logs to the dataset.
*   **Model Registry Gating**: Evaluates candidate models (Random Forest) against active baseline models and registers promotions in MLflow only if they exceed strict accuracy improvement thresholds ($\ge 15\%$).
*   **Dataset Versioning (DVC)**: Tracks dataset mutations through lightweight `.dvc` files pushed to DagsHub remote stores, enabling absolute reproducibility of experiment runs.
*   **Observability & Operations**: Exposes request throughput, latency quantiles (p50/p95/p99), and error rates via Prometheus metrics, visualized directly on a pre-provisioned Grafana dashboard.
*   **Nginx Reverse Proxy**: Frontend container acts as a reverse proxy on port 80, serving static SPA assets and forwarding API queries to the FastAPI container.

---

## 🌐 Deployed URLs & Login Credentials

The application is deployed on a single-instance AWS EC2 host under the following endpoints:

*   **Main MLOps Console UI**: `https://ec2-18-233-148-37.compute-1.amazonaws.com/` (or [http://ec2-18-233-148-37.compute-1.amazonaws.com/](http://ec2-18-233-148-37.compute-1.amazonaws.com/))
*   **Apache Airflow Web UI**: [http://ec2-18-233-148-37.compute-1.amazonaws.com:8080](http://ec2-18-233-148-37.compute-1.amazonaws.com:8080)
    *   **Username**: `admin`
    *   **Password**: `admin`
*   **Grafana Dashboard**: [http://ec2-18-233-148-37.compute-1.amazonaws.com:3000](http://ec2-18-233-148-37.compute-1.amazonaws.com:3000)
    *   **Username**: `admin`
    *   **Password**: `admin` *(first login prompts for update)*

---

## 📈 Core MLOps Achievements (Resume-Worthy Points)

### 1. Model Performance Optimization & MLOps Lifecycle Integration
*   **Point**: Designed and integrated a production-grade machine learning model pipeline that reduced AQI prediction error (**RMSE**) by **17.5%** over the baseline Linear Regression model using an optimized Random Forest Regressor. Configured DVC version management (via DagsHub) to lock dataset states and registered experiments dynamically inside MLflow for auditing.
*   **Proof**: Baseline Linear Regression RMSE: **~15.67** vs. Optimized Random Forest Regressor RMSE: **~12.92** (exceeding the target of $\ge 15\%$).
*   **Verification / Reproduction**: Run `uv run python scripts/reproduce_comparison.py` inside the `backend/` directory.


---

## ⚡ Quick Setup & Local Run

### Prerequisites
*   Docker & Docker Compose installed
*   Python 3.12 & `uv` package manager (for running local scripts)

### Step 1: Clone and Configure Environment
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/forecast_ai.git
    cd forecast_ai
    ```
2.  Create a `.env` file in the root directory:
    ```env
    OPENWEATHER_API_KEY=your_openweathermap_api_key
    DAGSHUB_USERNAME=your_dagshub_username
    DAGSHUB_TOKEN=your_dagshub_token
    FORECAST_AI_MLFLOW_TRACKING_URI=https://dagshub.com/your_dagshub_username/forecast_ai.mlflow
    ```

### Step 2: Configure Host Directories
Create the host-side directory for application logs:
```bash
sudo mkdir -p /var/log/forecast_ai
sudo chmod 777 /var/log/forecast_ai
```

### Step 3: Run the Multi-Container Cluster
Launch the stack locally. This will build the custom Node/Nginx frontend, custom Python/Airflow backend, and database dependencies:
```bash
docker compose up --build -d
```

### Step 4: Verify and Test
1.  Verify container health:
    ```bash
    docker compose ps
    ```
2.  Test API proxying:
    ```bash
    curl -s http://localhost/api/health
    # Expected: {"status":"ok"}
    ```
3.  Access services:
    *   **Frontend Console**: `http://localhost/`
    *   **Airflow Webserver**: `http://localhost:8080` (admin/admin)
    *   **Grafana Dashboards**: `http://localhost:3000` (admin/admin)
4.  Run reproduction scripts:
    ```bash
    cd backend
    uv run python scripts/reproduce_comparison.py
    ```
