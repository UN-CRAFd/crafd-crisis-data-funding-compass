# Read-only check: what the database has stored for SERVIR
def load_env(path=".env.local"):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


import psycopg2

conn = psycopg2.connect(load_env()["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT * FROM organizations WHERE full_name ILIKE '%servir%';")
cols = [d[0] for d in cur.description]
rows = cur.fetchall()
if not rows:
    print("No SERVIR organization in the database yet")
for row in rows:
    for c, v in zip(cols, row):
        print(f"{c:30} {v}")
conn.close()
