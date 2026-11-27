#!/usr/bin/env python3
"""Draft Academic-only fixture runner. Fresh Compose project per seed; no real data."""
import argparse
import json
import os
import re
import secrets
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIX = json.loads((HERE / "fixtures.json").read_text(encoding="utf-8"))
PREFIX = "aha-t09-fixture-"
KEYS = ("JWT_SECRET", "JWT_REFRESH_SECRET", "INTERNAL_API_KEY", "PIN_PEPPER",
        "DB_AUTH_PASSWORD", "DB_REMINDER_PASSWORD", "DB_NOTIFICATION_PASSWORD")
DBS = ("auth", "reminder", "notification")
# Explicit environment allowlist for Compose interpolation and Docker selection.
ENV = {k: v for k, v in os.environ.items()
       if not k.upper().startswith(("COMPOSE_", "AHA_T09_", "DOCKER_HOST", "DOCKER_CONTEXT",
                                     "DOCKER_TLS", "DOCKER_CERT", "PG", "DATABASE_URL"))
       and k.upper() != "AHA_FIXTURE_PASSWORD"}

def run(args, data=None, capture=False, env=None):
    try:
        result = subprocess.run(args, cwd=ROOT, env=env or ENV, input=data,
                                text=True, encoding="utf-8", errors="replace",
                                stdout=subprocess.PIPE if capture else None,
                                stderr=subprocess.PIPE if capture else None,
                                timeout=900, check=True)
        return result.stdout if capture else ""
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as exc:
        # Do not dump SQL, credentials, HTTP bodies, or subprocess stderr.
        raise RuntimeError("Command failed: " + str(args[0]) + " (inspect local sanitized logs)") from None

def docker():
    context = run(["docker", "context", "show"], capture=True).strip()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", context):
        raise RuntimeError("Unexpected Docker context")
    endpoint = json.loads(run(["docker", "context", "inspect", context], capture=True))[0]["Endpoints"]["docker"]["Host"]
    if not (endpoint.startswith("unix://") or endpoint.startswith("npipe://")):
        raise RuntimeError("Only local Docker Unix socket or named pipe is allowed")
    return ["docker", "--context", context]

def project_file(project):
    if not re.fullmatch(PREFIX + r"[0-9a-f]{16}", project):
        raise RuntimeError("Not a generated fixture project name")
    return ROOT / (".env." + project)

def load_env(project):
    path = project_file(project)
    if not path.is_file() or path.is_symlink():
        raise RuntimeError("Missing generated fixture marker")
    values = dict(line.split("=", 1) for line in path.read_text(encoding="utf-8").splitlines())
    if set(values) != {"AHA_T09_" + k for k in KEYS} | {"AHA_FIXTURE_PASSWORD", "AHA_FIXTURE_PROJECT"}:
        raise RuntimeError("Unexpected fixture env keys")
    if values["AHA_FIXTURE_PROJECT"] != project:
        raise RuntimeError("Fixture marker mismatch")
    if any(not re.fullmatch(r"[0-9a-f]{64}", values["AHA_T09_" + k]) for k in KEYS):
        raise RuntimeError("Invalid fixture credential format")
    if not re.fullmatch(r"FixtureAa1[0-9a-f]{32}", values["AHA_FIXTURE_PASSWORD"]):
        raise RuntimeError("Invalid synthetic password format")
    return values

def compose(project):
    load_env(project)
    return docker() + ["compose", "--project-name", project,
                       "--env-file", str(project_file(project)), "-f", str(ROOT / "docker-compose.yml")]

def sqlval(value):
    if value is None: return "NULL"
    if isinstance(value, bool): return "TRUE" if value else "FALSE"
    if isinstance(value, int): return str(value)
    if isinstance(value, list): return "ARRAY[" + ",".join(sqlval(v) for v in value) + "]"
    if not isinstance(value, str): raise ValueError("Unexpected fixture type")
    return "'" + value.replace("'", "''") + "'"

def insert(table, cols, rows):
    return "INSERT INTO " + table + " (" + ",".join(cols) + ") VALUES\n" + \
        ",\n".join("(" + ",".join(sqlval(row[k]) for k in cols) + ")" for row in rows) + ";\n"

def sql(project, service, statement):
    return run(compose(project) + ["exec", "-T", service+"-db", "psql", "-X", "-qAt",
               "-v", "ON_ERROR_STOP=1", "-U", "aha_t09", "-d", service+"_db"],
               data=statement, capture=True).strip()

def validate_fixture():
    users = FIX["users"]; links = FIX["links"]; rem = FIX["reminders"]; notes = FIX["notifications"]
    expected = [5,4,6,3]
    if list(map(len, (users,links,rem,notes))) != expected:
        raise RuntimeError("Fixture count differs from plan")
    ids = [x["id"] for group in (users,links,rem,notes) for x in group]
    if len(set(ids)) != sum(expected):
        raise RuntimeError("Duplicate fixture IDs")
    um = {x["id"]: x for x in users}; rm = {x["id"]: x for x in rem}
    if not all(x["email"].endswith("@example.invalid") and x["phone"].startswith("TEST-") and x["name"].startswith("Synthetic ") for x in users):
        raise RuntimeError("Non-synthetic identity")
    if not all(um[x["requester_id"]]["role"] == "caregiver" and um[x["requested_id"]]["role"] == "elderly" for x in links):
        raise RuntimeError("Invalid family references")
    if not all(um[x["user_id"]]["role"] == "elderly" and x["medicine_name"].startswith("FIXTURE-") for x in rem):
        raise RuntimeError("Invalid reminder references")
    if not all(x["user_id"] in um and x["related_id"] in rm for x in notes):
        raise RuntimeError("Invalid notification references")

def verify(project):
    validate_fixture()
    # Exact identity/relationship sets; not merely counts. Cross-DB links checked
    # in Python because PostgreSQL does not provide cross-database foreign keys.
    checks = [
        ("auth", "SELECT id::text,role,username,email,phone FROM users ORDER BY id",
         [[x[k] for k in ("id","role","username","email","phone")] for x in FIX["users"]]),
        ("auth", "SELECT id::text,requester_id::text,requested_id::text,status FROM family_connections ORDER BY id",
         [[x[k] for k in ("id","requester_id","requested_id","status")] for x in FIX["links"]]),
        ("reminder", "SELECT id::text,user_id::text,medicine_name,to_char(reminder_time,'HH24:MI'),frequency,days_of_week,start_date::text,end_date::text,is_active FROM reminders ORDER BY id",
         [[x[k] for k in ("id","user_id","medicine_name","reminder_time","frequency","days_of_week","start_date","end_date","is_active")] for x in FIX["reminders"]]),
        ("notification", "SELECT id::text,user_id::text,related_id::text,is_read,dedupe_key FROM notifications ORDER BY id",
         [[x[k] for k in ("id","user_id","related_id","is_read","dedupe_key")] for x in FIX["notifications"]]),
    ]
    # row_to_json on a named record keeps fields and array/boolean/null types.
    for service, query, expected in checks:
        if service == "reminder":
            cols = "id,owner,medicine,tm,frequency,days,start_date,end_date,active"
        elif "family_connections" in query:
            cols = "id,requester,requested,status"
        elif service == "auth":
            cols = "id,role,username,email,phone"
        else:
            cols = "id,owner,related,is_read,dedupe"
        query = "SELECT COALESCE(json_agg(row_to_json(q) ORDER BY q.id),'[]'::json)::text FROM (" + query + ") AS q(" + cols + ");"
        actual = [list(x.values()) for x in json.loads(sql(project,service,query))]
        if actual != sorted(expected, key=lambda x:x[0]):
            raise RuntimeError("Fixture verification mismatch: " + service)
    # The manifest itself has validated all reference IDs, and exact DB sets
    # above prove actual cross-service owner/related IDs match that manifest.
    print("Verified fixture rows: users=5, family=4, reminders=6, notifications=3; references match.")

def seed():
    validate_fixture()
    project = PREFIX + secrets.token_hex(8)
    d = docker()
    if any(run(d + args, capture=True).strip() for args in (
        ["ps","-aq","--filter","label=com.docker.compose.project="+project],
        ["volume","ls","-q","--filter","label=com.docker.compose.project="+project],
        ["network","ls","-q","--filter","label=com.docker.compose.project="+project])):
        raise RuntimeError("Fixture project collision")
    path = project_file(project)
    values = {"AHA_T09_"+k:secrets.token_hex(32) for k in KEYS}
    values.update(AHA_FIXTURE_PASSWORD="FixtureAa1"+secrets.token_hex(16), AHA_FIXTURE_PROJECT=project)
    fd = os.open(path, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        f.write("".join(k+"="+v+"\n" for k,v in values.items()))
    print("New isolated fixture project: "+project, flush=True)
    cmd = compose(project)
    config = json.loads(run(cmd+["config","--format","json"],capture=True))
    if not config["networks"]["academic-local"].get("internal") or any(v.get("external") for v in config.get("volumes",{}).values()):
        raise RuntimeError("Compose isolation changed; review before running")
    run(cmd+["up","-d","--wait","--wait-timeout","120",*(s+"-db" for s in DBS)])
    # Use repository migrations. Runtime images deliberately lack npm.
    for s in DBS:
        run(cmd+["run","--build","--rm","--no-deps",s+"-service","node","src/config/migrate.js"])
    # Fresh project only: INSERT, never TRUNCATE/DELETE existing user data.
    stamp=FIX["anchor"]
    user_rows=[dict(x,created_at=stamp) for x in FIX["users"]]
    auth="BEGIN;\n"+insert("users",["id","phone","name","age","role","username","email","created_at"],user_rows)
    # pgcrypto bcrypt hashes have random salts; no plaintext password in DB.
    auth+="UPDATE users SET password_hash=crypt("+sqlval(values["AHA_FIXTURE_PASSWORD"])+",gen_salt('bf',10));\n"
    auth+=insert("family_connections",["id","requester_id","requested_id","status","created_at","updated_at"],
                 [dict(x,created_at=stamp,updated_at=stamp) for x in FIX["links"]])+"COMMIT;\n"
    sql(project,"auth",auth)
    cols=["id","user_id","medicine_name","dosage","reminder_time","frequency","days_of_week","start_date","end_date","is_active","created_at","updated_at"]
    sql(project,"reminder","BEGIN;\n"+insert("reminders",cols,[dict(x,created_at=stamp,updated_at=stamp) for x in FIX["reminders"]])+"COMMIT;\n")
    cols=["id","user_id","type","title","message","related_id","is_read","dedupe_key","created_at","read_at","scheduled_at","delivered_at"]
    notes=[dict(x,created_at=stamp,read_at=stamp if x["is_read"] else None,scheduled_at=stamp,delivered_at=stamp) for x in FIX["notifications"]]
    sql(project,"notification","BEGIN;\n"+insert("notifications",cols,notes)+"COMMIT;\n")
    verify(project)
    print("Seed complete. Use the displayed project name for verify/api/cleanup; credentials stay in ignored local env.")

def api(project):
    verify(project)
    values=load_env(project)
    cmd=compose(project)
    # Start only the generated isolated project; fixed loopback ports can conflict.
    run(cmd+["up","-d","--wait","--wait-timeout","120","api-gateway"])
    env=dict(ENV,AHA_FIXTURE_PASSWORD=values["AHA_FIXTURE_PASSWORD"])
    run(cmd+["run","--rm","--no-deps","-e","AHA_FIXTURE_PASSWORD",
             "-v",str(HERE)+":/fixture-tests:ro","auth-service","node","/fixture-tests/api-smoke.cjs"],env=env)

def cleanup(project):
    # Explicit user-selected generated project only. Never global prune.
    run(compose(project)+["down","--volumes","--remove-orphans"])
    project_file(project).unlink()
    print("Removed selected fixture project and its local env marker.")

if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action",nargs="?",default="seed",choices=["seed","verify","api","cleanup","check"])
    parser.add_argument("project",nargs="?")
    a=parser.parse_args()
    try:
        if a.action in ("seed","check") and a.project: parser.error("Unexpected project")
        if a.action == "check":
            validate_fixture(); print("Fixture manifest check passed (no database execution).")
        elif a.action == "seed": seed()
        else:
            if not a.project: parser.error("Generated fixture project name required")
            {"verify":verify,"api":api,"cleanup":cleanup}[a.action](a.project)
    except (RuntimeError, ValueError, KeyError, OSError) as exc:
        print("Fixture operation failed: "+str(exc),file=sys.stderr); sys.exit(1)
