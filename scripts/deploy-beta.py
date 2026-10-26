"""Deploy iProctor to beta: python scripts/deploy-beta.py [--setup]
Requires: pip install paramiko. Defaults to uatenv@192.168.11.90 and prompts for the password\n(or reads SERVER_IP / SERVER_SSH_USER / SERVER_SSH_PASSWORD from the git-ignored .env).
--setup also runs migrate + load layouts (only needed when schema/seating files change)."""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import tempfile

import paramiko

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTE = "/opt/iproctor-beta"
COMPOSE = f"cd {REMOTE}/app && docker compose -f docker-compose.beta.yml"

env = {}
for line in open(os.path.join(ROOT, ".env"), encoding="utf-8-sig"):
    if "=" in line and not line.startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k] = v

tgz = os.path.join(tempfile.gettempdir(), "iproctor-src.tgz")
subprocess.run(
    ["tar", "-czf", tgz, "--exclude=node_modules", "--exclude=.next", "--exclude=.git", "--exclude=.env",
     "--exclude=.env.*", "--exclude=skills", "--exclude=.claude", "--exclude=tsconfig.tsbuildinfo", "."],
    cwd=ROOT, check=True,
)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
host = env.get("SERVER_IP", "192.168.11.90")
user = env.get("SERVER_SSH_USER", "uatenv")
prompt = f"SSH password for {user}@{host}: "
password = env.get("SERVER_SSH_PASSWORD") or os.environ.get("DEPLOY_PASSWORD")
if not password:
    try:
        password = getpass.getpass(prompt)
    except (Exception, KeyboardInterrupt, EOFError):
        # เทอร์มินัลบางแบบ (เช่นใน IDE) ใช้ getpass ไม่ได้ — พิมพ์จะมองเห็นรหัสผ่าน
        password = input(prompt)
ssh.connect(host, username=user, password=password, timeout=15)


def run(cmd):
    print(f"$ {cmd}")
    _, out, _ = ssh.exec_command(cmd + " 2>&1")
    for line in out:
        print(line, end="")
    code = out.channel.recv_exit_status()
    if code:
        sys.exit(f"failed ({code}): {cmd}")


sftp = ssh.open_sftp()
sftp.put(tgz, f"{REMOTE}/src.tgz")
sftp.close()
os.remove(tgz)

run(f"cd {REMOTE}/app && tar -xzf ../src.tgz && rm ../src.tgz")
run(f"{COMPOSE} build")
if "--setup" in sys.argv:
    run(f"{COMPOSE} up -d db && {COMPOSE} --profile setup run --rm setup")
run(f"{COMPOSE} up -d web")
run("sleep 6; curl -s -o /dev/null -w 'beta login: %{http_code}\\n' http://192.168.11.90:8098/login")
ssh.close()
