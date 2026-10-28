# Read-only check: which agencies in the database are linked to "USA" vs "United States"
import os


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


env = load_env()
url = env.get("DATABASE_URL")

try:
    import psycopg

    conn = psycopg.connect(url)
except ImportError:
    import psycopg2

    conn = psycopg2.connect(url)

query = """
SELECT c.name AS country,
       a.name AS agency,
       COUNT(aof.organization_id) AS org_links
FROM countries c
LEFT JOIN agencies a ON a.country_id = c.id
LEFT JOIN agency_organization_funding aof ON aof.agency_id = a.id
WHERE c.name IN ('USA', 'United States')
GROUP BY c.name, a.name
ORDER BY c.name, a.name;
"""

cur = conn.cursor()
cur.execute(query)
rows = cur.fetchall()
for country, agency, links in rows:
    print(f"{country:15} | {agency or '(no agency)':60} | {links} org links")
conn.close()
