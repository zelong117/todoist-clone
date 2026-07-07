#!/bin/bash
# Todoist Clone 数据库备份脚本
# 用法: ./backup.sh
# 建议加到 crontab: 0 3 * * * /path/to/backup.sh

BACKUP_DIR="./server/data/backups"
DB_FILE="./server/data/todoist.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/todoist_${TIMESTAMP}.db"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查数据库文件
if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file not found: $DB_FILE"
  exit 1
fi

# 复制数据库
cp "$DB_FILE" "$BACKUP_FILE"

# 压缩
gzip -f "$BACKUP_FILE"

echo "Backup created: ${BACKUP_FILE}.gz"

# 保留最近 30 天的备份
find "$BACKUP_DIR" -name "todoist_*.db.gz" -mtime +30 -delete

echo "Old backups cleaned (kept last 30 days)."
echo "Done."
