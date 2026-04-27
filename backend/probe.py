import sqlite3
import json

con = sqlite3.connect("urjotsav_v4.db")
cur = con.cursor()
cur.execute("SELECT username, role FROM users")
rows = cur.fetchall()

print("RAW SQLITE ROW DATA:")
for r in rows:
    print(r)
con.close()
