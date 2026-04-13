import os
import sqlite3

os.environ['ENCRYPTION_KEY'] = 'dev-encryption-key-change-in-production-32bytes'

from app.encryption import decrypt_password

conn = sqlite3.connect('instance/pos_auth.sqlite3')
conn.row_factory = sqlite3.Row
users = conn.execute('SELECT id, username, password_encrypted FROM users').fetchall()

print('Database users:')
for u in users:
    enc = u['password_encrypted']
    if enc:
        try:
            pw = decrypt_password(enc)
            print(f'  {u["username"]}: {pw}')
        except Exception as e:
            print(f'  {u["username"]}: DECRYPTION FAILED - {e}')
    else:
        print(f'  {u["username"]}: NULL')
conn.close()
