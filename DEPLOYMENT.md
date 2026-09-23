# sevo Deployment & Operations Guide

## Infrastructure Stack

- **Web Server / Reverse Proxy**: Nginx (`sevo-nginx.conf`)
- **Frontend App**: React + Vite (Static build served via Nginx)
- **Backend Application**: Django + Gunicorn / Daphne (`quicktims.asgi:application`)
- **Database**: PostgreSQL (Single-schema with company-level scoping)
- **Caching & Broker**: Redis
- **Task Worker**: Celery (`celery -A quicktims worker -l info`)
- **Scheduled Tasks**: Celery Beat (`celery -A quicktims beat -l info`)

---

## Production Deployment Workflow

### 1. Environment Configuration
Ensure `.env` contains production variables:
```env
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=your_production_secret
DJANGO_ALLOWED_HOSTS=sevo.co.in,www.sevo.co.in,vendor.sevo.co.in
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
```

### 2. Frontend Production Build
```bash
cd frontend
npm install
npm run build
```

### 3. Backend Setup & Database Migrations
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

### 4. Running Services (Docker / Systemd)
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
