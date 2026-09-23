# CalTrack / QuickTIMS — Local Development & Environment Setup

## 1. Prerequisites

Ensure your system has the following tools installed:
- **Python**: Version 3.13+ (or 3.11+)
- **Node.js**: Version 18+ & npm
- **Docker & Docker Compose**: (For PostgreSQL & Redis)
- **Git**

---

## 2. Infrastructure Setup (Docker: PostgreSQL & Redis)

From the project root:
```bash
docker compose up -d
```
This starts:
- **PostgreSQL**: Port `5432` (User: `postgres`, Pass: `postgres`, DB: `caltrack`)
- **Redis**: Port `6379`

---

## 3. Backend Setup (Django + DRF)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Verify `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=1`, and database connection strings in `.env`.*

5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

6. Seed initial catalog & demo tenant data:
   ```bash
   python seed_catalog.py
   python seed_all_home_services.py
   python setup_tenants.py
   ```

7. Start the backend development server:
   ```bash
   # Standard HTTP server:
   python manage.py runserver 0.0.0.0:8000

   # Or with ASGI WebSockets (Daphne):
   daphne -b 0.0.0.0 -p 8000 quicktims.asgi:application
   ```

---

## 4. Asynchronous Queue Services (Celery)

In separate terminal tabs (with the virtualenv activated):

- **Celery Worker (Background tasks & PDFs)**:
  ```bash
  cd backend
  celery -A quicktims worker -l info
  ```

- **Celery Beat (Scheduled crons & reminders)**:
  ```bash
  cd backend
  celery -A quicktims beat -l info
  ```

---

## 5. Frontend Setup (React 19 + Vite)

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Create frontend environment file `.env`:
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_BASE_URL=ws://localhost:8000/ws
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   **`http://localhost:5173`**

---

## 6. Common Troubleshooting & Tips

- **WebSocket Connection Refused**: Ensure Daphne is running instead of standard `manage.py runserver`, and verify Redis is accessible on port 6379.
- **Tenant Permission Denied**: Ensure you log in with a user mapped to an active `Company` organization.
- **Pillow / Image Upload Errors on Windows**: Ensure `python-magic-bin` or appropriate binary packages are installed in your virtual environment.
