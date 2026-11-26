"""Generate fresh local-only credentials; never overwrite an existing .env."""
import os
import secrets
from pathlib import Path

KEYS = ["AHA_T09_JWT_SECRET","AHA_T09_JWT_REFRESH_SECRET","AHA_T09_INTERNAL_API_KEY","AHA_T09_PIN_PEPPER","AHA_T09_DB_AUTH_PASSWORD","AHA_T09_DB_REMINDER_PASSWORD","AHA_T09_DB_NOTIFICATION_PASSWORD"]
root = Path(__file__).resolve().parents[2]
path = root / '.env'
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w', encoding='utf-8') as handle:
    for key in KEYS:
        handle.write(key + '=' + secrets.token_hex(32) + '\n')
print('Created a new local .env without printing credentials.')
