#!/usr/bin/env bash
# Thiết lập MỘT LẦN cho cụm VNPT K8s trước khi CI/CD chạy lần đầu.
# Điền các biến bên dưới (lấy từ portal VNPT Cloud) rồi chạy: bash k8s/bootstrap.sh
# Yêu cầu: kubectl đã trỏ đúng cụm (KUBECONFIG hoặc ~/.kube/config).
set -euo pipefail

# ==== ĐIỀN THÔNG TIN ====
ECR_ID="${ECR_ID:-ecr_xxxxxxxx}"                 # id repository VNPT ECR
ECR_USER="${ECR_USER:-}"                          # tài khoản ECR
ECR_PASSWORD="${ECR_PASSWORD:-}"                  # mật khẩu ECR

# --- Cơ sở dữ liệu ---
# Mặc định: PostgreSQL 16 + pgvector chạy TRONG cụm (xem k8s/postgres.yaml).
# Mật khẩu DB dùng chung cho pod postgres và chuỗi kết nối của API.
DB_PASSWORD="${DB_PASSWORD:-}"                     # bắt buộc đặt; đừng để trống trên prod
DB_CONNECTION="${DB_CONNECTION:-Host=postgres;Port=5432;Database=hackathon_ai;Username=postgres;Password=${DB_PASSWORD}}"
# Muốn dùng VNPT Managed PostgreSQL thay vì trong cụm: đặt DB_CONNECTION trỏ tới host
# managed (kèm SSL Mode=Require;Trust Server Certificate=true) và bỏ áp k8s/postgres.yaml.

LLM_APIKEY="${LLM_APIKEY:-}"                       # API key LLM (OpenRouter / Google AI Studio)
# ========================

if [ -z "$DB_PASSWORD" ]; then
  echo "LỖI: chưa đặt DB_PASSWORD. Ví dụ: DB_PASSWORD='mat-khau-manh' bash k8s/bootstrap.sh" >&2
  exit 1
fi

REGISTRY="ecr.vnptplatform.vn"

kubectl create namespace cbyts --dry-run=client -o yaml | kubectl apply -f -

# Secret để K8s kéo image private từ VNPT ECR (deployment tham chiếu tên "ecr-pull")
kubectl -n cbyts create secret docker-registry ecr-pull \
  --docker-server="$REGISTRY" \
  --docker-username="$ECR_USER" \
  --docker-password="$ECR_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# Secret cấu hình nhạy cảm: mật khẩu DB (pod postgres đọc), chuỗi kết nối + key LLM (API đọc)
kubectl -n cbyts create secret generic cbyts-secrets \
  --from-literal=db-password="$DB_PASSWORD" \
  --from-literal=db-connection="$DB_CONNECTION" \
  --from-literal=llm-apikey="$LLM_APIKEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Xong. Kiểm tra: kubectl -n cbyts get secret"
echo "Nhớ đặt GitHub secrets: ECR_ID=$ECR_ID, ECR_USER, ECR_PASSWORD, KUBE_CONFIG (base64)"
