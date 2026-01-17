#!/bin/bash
set -e

HOST="${CB_HOST:-couchbase}"
CLUSTER_NAME="${CB_CLUSTER_NAME:-chat-cluster}"
USER="${CB_USERNAME:-Administrator}"
PASS="${CB_PASSWORD:-Password123!}"
BUCKET="${CB_BUCKET:-app}"
RAMSIZE="${CB_RAMSIZE:-512}"
SCOPE="${CB_SCOPE:-_default}"
USERS_COL="${CB_USERS_COLLECTION:-users}"
MESSAGES_COL="${CB_MESSAGES_COLLECTION:-messages}"

echo "Waiting Couchbase..."
until bash -lc "echo > /dev/tcp/${HOST}/8091" 2>/dev/null; do
  sleep 2
done

echo "Cluster status:"
curl -s "http://${HOST}:8091/pools" | head -c 200 || true
echo ""

echo "Init cluster..."
/opt/couchbase/bin/couchbase-cli cluster-init \
  -c "${HOST}" \
  --cluster-name "${CLUSTER_NAME}" \
  --cluster-username "${USER}" \
  --cluster-password "${PASS}" \
  --services data,index,query \
  --cluster-ramsize "${RAMSIZE}" \
  --cluster-index-ramsize 256

echo "Create bucket..."
/opt/couchbase/bin/couchbase-cli bucket-create \
  -c "${HOST}" \
  -u "${USER}" -p "${PASS}" \
  --bucket "${BUCKET}" \
  --bucket-type couchbase \
  --bucket-ramsize 256 \
  --storage-backend couchstore \
  --bucket-replica 0 \
  --enable-flush 1

echo "Create collections..."
/opt/couchbase/bin/couchbase-cli collection-manage \
  -c "${HOST}" \
  -u "${USER}" -p "${PASS}" \
  --bucket "${BUCKET}" \
  --create-collection "${SCOPE}.${USERS_COL}"

/opt/couchbase/bin/couchbase-cli collection-manage \
  -c "${HOST}" \
  -u "${USER}" -p "${PASS}" \
  --bucket "${BUCKET}" \
  --create-collection "${SCOPE}.${MESSAGES_COL}"

echo "Bucket list:"
/opt/couchbase/bin/couchbase-cli bucket-list \
  -c "${HOST}" -u "${USER}" -p "${PASS}"

echo "Done."
