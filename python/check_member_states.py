# Read-only check: does the member_states table exist, and which US/Unknown names does it contain?
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
try:
    cur.execute("SELECT COUNT(*) FROM member_states;")
    print("member_states table exists, rows:", cur.fetchone()[0])
    cur.execute(
        "SELECT name FROM member_states WHERE name IN ('USA', 'United States', 'Unknown') ORDER BY name;"
    )
    for (name,) in cur.fetchall():
        print("  contains:", name)
except Exception as e:
    print("member_states table not found — site uses the list in the code")
    print("  details:", e)
conn.close()
