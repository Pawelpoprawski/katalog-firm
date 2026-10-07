# POWIĄZANIA
# Cel: STARY skrypt wysyłki configu nginx dla dawnej domeny katalog-firm.ch.
# Przy zmianie: nieaktualny (deploy przez _recon/deploy_git_katalog.py); zawiera dane logowania - do usunięcia
#   (lista sprzątania A5).
# AUTO używany przez: nikt nie importuje (punkt wejścia: skrypt/cron/CLI - patrz Cel)
# /POWIĄZANIA
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('54.38.54.237', username='ubuntu', password='7QmK9xP2vLr8TzW4aNfC')

sftp = ssh.open_sftp()
sftp.put('C:/REPO/Katalog firm/nginx_katalog.conf', '/tmp/katalog-firm-nginx')
sftp.close()
print("Uploaded config to /tmp/katalog-firm-nginx")

cmds = [
    'sudo cp /tmp/katalog-firm-nginx /etc/nginx/sites-available/katalog-firm',
    'sudo nginx -t 2>&1',
    'sudo systemctl reload nginx',
    'grep -n client_max_body_size /etc/nginx/sites-available/katalog-firm',
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode() + stderr.read().decode()
    print(f"$ {cmd}")
    if out.strip():
        print(out.strip())
    print()

ssh.close()
print("Done!")
