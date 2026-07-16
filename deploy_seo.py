import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('54.38.54.237', username='ubuntu', password='7QmK9xP2vLr8TzW4aNfC')

cmds = [
    'cd /home/ubuntu/strony/katalog_firm && git pull origin main 2>&1 | tail -10',
    'cd /home/ubuntu/strony/katalog_firm/frontend && npm run build 2>&1 | tail -8',
    'pm2 restart katalog-frontend 2>&1 | tail -5',
    'sleep 4 && curl -sI https://katalog-firm.ch/sitemap.xml 2>&1 | grep -i "cache-control"',
    'curl -sI https://katalog-firm.ch/firma/floralkaleidoskop 2>&1 | grep -i "cache-control"',
]
for cmd in cmds:
    print(f"\n$ {cmd[:120]}", flush=True)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=240)
    out = stdout.read().decode('utf-8', errors='replace') + stderr.read().decode('utf-8', errors='replace')
    print(out.strip(), flush=True)

ssh.close()
print("\nDONE")
