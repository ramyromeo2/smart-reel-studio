#!/usr/bin/env bash
# Restore Trasol.bak into a local SQL Server (Docker) instance.
#
# What it does:
#   1. Makes sure Docker is running and a SQL Server container is up.
#   2. Copies Trasol.bak into the container.
#   3. Reads the logical file names from the backup header (RESTORE FILELISTONLY).
#   4. Checks if a database named "Trasol" already exists.
#        - If yes: asks whether to drop & re-restore, or exit.
#   5. Restores the .bak as database "Trasol", remapping the Windows paths
#      (E:\DB\...mdf, C:\Program Files\...) to the container's Linux data dir.
#
# Connect after restore:
#   docker exec -it mssql-trasol /opt/mssql-tools18/bin/sqlcmd \
#       -S localhost -U sa -P "$SA_PASSWORD" -C -d Trasol -Q "SELECT TOP 5 name FROM sys.tables"

set -euo pipefail

# ---------- config ----------
BAK_FILE="$(cd "$(dirname "$0")/.." && pwd)/Trasol.bak"
DB_NAME="Trasol"
CONTAINER="mssql-trasol"
IMAGE="mcr.microsoft.com/mssql/server:2022-latest"
SA_PASSWORD="${SA_PASSWORD:-Trasol_Strong!Pass1}"   # override via env if you want
HOST_PORT="${HOST_PORT:-1433}"
# ----------------------------

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

if [[ ! -f "$BAK_FILE" ]]; then
  red "Backup file not found: $BAK_FILE"
  exit 1
fi

# 1. Docker daemon
if ! docker info >/dev/null 2>&1; then
  blue "Docker daemon is not running. Starting Docker Desktop..."
  open -a Docker || { red "Could not launch Docker Desktop"; exit 1; }
  printf "Waiting for Docker"
  for _ in {1..60}; do
    if docker info >/dev/null 2>&1; then echo; break; fi
    printf "."; sleep 2
  done
  docker info >/dev/null 2>&1 || { red "Docker did not start in time"; exit 1; }
fi
green "Docker is running."

# 2. SQL Server container
if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  blue "Creating SQL Server container '$CONTAINER'..."
  docker run -d --name "$CONTAINER" \
    -e "ACCEPT_EULA=Y" \
    -e "MSSQL_SA_PASSWORD=$SA_PASSWORD" \
    -p "${HOST_PORT}:1433" \
    "$IMAGE" >/dev/null
elif ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  blue "Starting existing container '$CONTAINER'..."
  docker start "$CONTAINER" >/dev/null
fi

# Wait for SQL Server to accept connections
SQLCMD="/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -C -No"
printf "Waiting for SQL Server"
for _ in {1..60}; do
  if docker exec "$CONTAINER" bash -c "$SQLCMD -Q 'SELECT 1' >/dev/null 2>&1"; then echo; break; fi
  printf "."; sleep 2
done
docker exec "$CONTAINER" bash -c "$SQLCMD -Q 'SELECT 1' >/dev/null 2>&1" \
  || { red "SQL Server did not become ready. Check: docker logs $CONTAINER"; exit 1; }
green "SQL Server is ready."

# 3. Copy backup into container
blue "Copying Trasol.bak into container..."
docker exec "$CONTAINER" mkdir -p /var/opt/mssql/backup
docker cp "$BAK_FILE" "$CONTAINER:/var/opt/mssql/backup/Trasol.bak"

# 4. Read logical file names from the backup
blue "Reading backup header..."
FILELIST=$(docker exec "$CONTAINER" bash -c \
  "$SQLCMD -h -1 -W -s '|' -Q \"SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/Trasol.bak'\"")

# Pull (LogicalName, Type) pairs. Columns 1 and 3 of FILELISTONLY.
MOVE_CLAUSES=""
while IFS='|' read -r logical physical ftype rest; do
  [[ -z "${logical// }" ]] && continue
  logical_trim="${logical%"${logical##*[![:space:]]}"}"
  ftype_trim="${ftype%"${ftype##*[![:space:]]}"}"
  case "$ftype_trim" in
    D) ext=mdf ;;
    L) ext=ldf ;;
    *) ext=ndf ;;
  esac
  new_path="/var/opt/mssql/data/${logical_trim}.${ext}"
  MOVE_CLAUSES+=" MOVE N'${logical_trim}' TO N'${new_path}',"
done <<< "$FILELIST"

if [[ -z "$MOVE_CLAUSES" ]]; then
  red "Could not parse logical file names from backup."
  echo "$FILELIST"
  exit 1
fi

echo "Files to be remapped:"
echo "$MOVE_CLAUSES" | tr ',' '\n' | sed 's/^/  /'

# 5. Does the DB already exist?
EXISTS=$(docker exec "$CONTAINER" bash -c \
  "$SQLCMD -h -1 -W -Q \"SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$DB_NAME'\"" \
  | tr -d ' \r\n')

if [[ "$EXISTS" == "1" ]]; then
  red "Database '$DB_NAME' already exists on this server."
  read -r -p "Drop it and re-restore from Trasol.bak? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    blue "Leaving existing database alone. Exiting."
    exit 0
  fi
  blue "Dropping existing '$DB_NAME'..."
  docker exec "$CONTAINER" bash -c "$SQLCMD -Q \"
    ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$DB_NAME];\""
fi

# 6. Restore
blue "Restoring '$DB_NAME'..."
RESTORE_SQL="RESTORE DATABASE [$DB_NAME] FROM DISK = N'/var/opt/mssql/backup/Trasol.bak' WITH ${MOVE_CLAUSES% ,} REPLACE, STATS = 10;"
docker exec "$CONTAINER" bash -c "$SQLCMD -Q \"$RESTORE_SQL\""

green "Done. '$DB_NAME' is restored."
echo
echo "Connect from host:"
echo "  Server:   localhost,${HOST_PORT}"
echo "  User:     sa"
echo "  Password: $SA_PASSWORD"
echo "  Database: $DB_NAME"
echo
echo "Quick check:"
echo "  docker exec -it $CONTAINER /opt/mssql-tools18/bin/sqlcmd \\"
echo "    -S localhost -U sa -P '$SA_PASSWORD' -C -d $DB_NAME \\"
echo "    -Q \"SELECT TOP 20 name FROM sys.tables ORDER BY name\""
