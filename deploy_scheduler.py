"""Deploy scheduler changes to production."""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('54.38.54.237', username='ubuntu', password='7QmK9xP2vLr8TzW4aNfC')

cmds = [
    'cd /home/ubuntu/strony/katalog_firm && git pull origin main 2>&1',
    'pm2 restart katalog-backend 2>&1 | tail -3',
    'sleep 4 && pm2 logs katalog-backend --lines 15 --nostream 2>&1 | grep -E "scheduler|auto_publish" | tail -10',
    'curl -s -X POST http://127.0.0.1:8000/admin/run-auto-publish -H "Authorization: Bearer Nutella144."',
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode() + stderr.read().decode()
    print(f"$ {cmd}")
    if out.strip():
        print(out.strip().encode('ascii', 'replace').decode('ascii'))
    print()

ssh.close()
print("Done!")
