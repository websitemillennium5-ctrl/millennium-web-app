#!/bin/sh
# Installs worker.mjs as a macOS launchd agent: starts at login, restarts if it stops, logs to ~/Library/Logs.
#   scripts/scrapers/install-worker.sh              → install (or reinstall after moving the repo / changing Node)
#   scripts/scrapers/install-worker.sh uninstall    → stop and remove it
set -e

LABEL="com.millennium.sync-worker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/millennium-sync-worker.log"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
NODE="$(command -v node)"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "$1" = "uninstall" ]; then
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

[ -n "$NODE" ] || { echo "node not found on PATH" >&2; exit 1; }
# macOS privacy protection stops background agents reading these folders; the worker would fail with "Operation not permitted".
case "$REPO" in
  "$HOME/Documents"*|"$HOME/Desktop"*|"$HOME/Downloads"*)
    echo "Warning: $REPO is inside Documents, Desktop or Downloads, which macOS blocks for background programs." >&2
    echo "Move the project to e.g. ~/millennium-worker and run this again (see docs/local-worker-setup.md)." >&2 ;;
esac
[ -f "$REPO/.env.local" ] || { echo "$REPO/.env.local is missing (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY)" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>--env-file=.env.local</string>
    <string>scripts/scrapers/worker.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL — logs: $LOG"
