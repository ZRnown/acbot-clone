#!/usr/bin/env python3
"""
Update the deployed app on the server: git pull → npm install → build → restart.
Run this after pushing new code to GitHub.
"""
import paramiko
import sys
import time

HOST = "8.153.160.37"
USER = "root"
PASSWORD = "Qq1383766?"
APP_DIR = "/opt/acbot-clone"

def run_cmd(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            data = stdout.channel.recv(4096).decode('utf-8', errors='ignore')
            try:
                sys.stdout.write(data)
                sys.stdout.flush()
            except:
                pass
        time.sleep(0.05)
    remaining = stdout.read().decode('utf-8', errors='ignore')
    if remaining:
        try:
            sys.stdout.write(remaining)
        except:
            pass
    exit_code = stdout.channel.exit_status
    print(f"\n  [exit: {exit_code}]")
    return exit_code

def main():
    print(f"=== Updating {APP_DIR} on {HOST} ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected!")

    # Step 1: git pull
    print("\n=== git pull ===")
    run_cmd(ssh, f"cd {APP_DIR} && git pull origin main 2>&1", timeout=60)

    # Step 2: npm install (in case deps changed)
    print("\n=== npm install ===")
    run_cmd(ssh, f"cd {APP_DIR} && npm install 2>&1", timeout=300)

    # Step 3: rebuild
    print("\n=== npm run build ===")
    run_cmd(ssh, f"cd {APP_DIR} && npm run build 2>&1", timeout=300)

    # Step 4: restart PM2
    print("\n=== pm2 restart ===")
    run_cmd(ssh, "pm2 restart acbot-clone 2>&1", timeout=15)
    run_cmd(ssh, "pm2 save 2>&1", timeout=15)

    # Step 5: verify
    print("\n=== verify ===")
    run_cmd(ssh, "sleep 3 && curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000/ 2>&1", timeout=15)

    ssh.close()
    print(f"\n=== Update complete! App running at http://{HOST}:3000 ===")

if __name__ == "__main__":
    main()
