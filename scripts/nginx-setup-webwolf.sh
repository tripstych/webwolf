#!/usr/bin/env bash
set -euo pipefail

SITE_NAME="webwolf"
SERVER_NAME="_"
ADMIN_ROOT="/var/www/webwolf/admin/dist"
UPSTREAM="http://127.0.0.1:3000"
MAX_BODY_SIZE="50m"

usage() {
  cat <<'USAGE'
Usage:
  sudo ./scripts/nginx-setup-webwolf.sh [options]

Options:
  --site-name <name>        Nginx site filename (default: webwolf)
  --server-name <name>      Nginx server_name (default: _)
  --admin-root <path>       Path to admin build directory (default: /var/www/webwolf/admin/dist)
  --upstream <url>          Node upstream (default: http://127.0.0.1:3000)
  --max-body-size <size>    client_max_body_size (default: 50m)
  -h, --help                Show help

Notes:
  - This script writes /etc/nginx/sites-available/<site-name> and enables it.
  - It serves /admin/ as a static SPA and proxies everything else to the upstream.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site-name)
      SITE_NAME="${2:-}"; shift 2 ;;
    --server-name)
      SERVER_NAME="${2:-}"; shift 2 ;;
    --admin-root)
      ADMIN_ROOT="${2:-}"; shift 2 ;;
    --upstream)
      UPSTREAM="${2:-}"; shift 2 ;;
    --max-body-size)
      MAX_BODY_SIZE="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

if [[ -z "${SITE_NAME}" || -z "${SERVER_NAME}" || -z "${ADMIN_ROOT}" || -z "${UPSTREAM}" ]]; then
  echo "Missing required values." >&2
  usage
  exit 2
fi

AVAILABLE_DIR="/etc/nginx/sites-available"
ENABLED_DIR="/etc/nginx/sites-enabled"
CONF_PATH="${AVAILABLE_DIR}/${SITE_NAME}"
LINK_PATH="${ENABLED_DIR}/${SITE_NAME}"

mkdir -p "${AVAILABLE_DIR}" "${ENABLED_DIR}"

if [[ ! -d "${ADMIN_ROOT}" ]]; then
  echo "Warning: ADMIN_ROOT does not exist yet: ${ADMIN_ROOT}" >&2
  echo "         You should copy your built admin (admin/dist) to that directory." >&2
fi

cat > "${CONF_PATH}" <<EOF
server {
  listen 80;
  server_name ${SERVER_NAME};

  client_max_body_size ${MAX_BODY_SIZE};

  # Admin (static SPA)
  location ^~ /admin/ {
    alias ${ADMIN_ROOT}/;
    try_files \$uri \$uri/ /admin/index.html;
  }

  # Uploads (proxied to Node)
  location ^~ /uploads/ {
    proxy_pass ${UPSTREAM};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  # API (proxied to Node)
  location ^~ /api/ {
    proxy_pass ${UPSTREAM};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  # Everything else to Node (site pages, etc.)
  location / {
    proxy_pass ${UPSTREAM};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF

if [[ -L "${LINK_PATH}" || -e "${LINK_PATH}" ]]; then
  rm -f "${LINK_PATH}"
fi
ln -s "${CONF_PATH}" "${LINK_PATH}"

nginx -t

if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx
else
  service nginx reload
fi

echo ""
echo "Nginx site enabled: ${SITE_NAME}"
echo "- Config: ${CONF_PATH}"
echo "- Enabled: ${LINK_PATH}"
echo ""
echo "Next steps:"
echo "1) Build admin locally:   npm run build --prefix admin"
echo "2) Copy admin/dist to:    ${ADMIN_ROOT}"
echo "3) Run Node server on:    ${UPSTREAM}"
