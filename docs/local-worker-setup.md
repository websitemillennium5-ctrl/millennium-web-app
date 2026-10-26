# Local sync worker: setup guide

The website's airline listings refresh themselves every day. Most airlines are synced in the cloud by GitHub Actions,
but **IndiGo and Fly91 block cloud servers**, so those are synced by a small background program, the **local worker**,
running on an office computer in India.

Once it's installed, the worker:

- syncs IndiGo hiring events and Fly91 jobs **once a day by itself**,
- runs a sync whenever staff press **Sync now** on the admin panel (**Admin → Sync**),
- starts automatically when the computer is switched on and the user logs in, and restarts itself if it ever stops.

It saves directly to the website's database (Supabase). Nothing needs to stay open on screen.

> This guide is for **macOS**. For Windows or Linux, see [Not on a Mac?](#not-on-a-mac) at the end.

---

## What you need

| | |
|---|---|
| **Computer** | A Mac that is usually on during the day (an office desktop or a laptop that isn't taken home every night). |
| **Internet** | An ordinary office or home connection **in India**. IndiGo blocks cloud servers and many VPNs, so leave any VPN off. |
| **Node.js** | Version **22 or newer**. |
| **Two keys** | `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` for the website's Supabase project, from your developer or from Supabase → Project Settings → API Keys. |

Allow about 15 minutes.

---

## 1. Install Node.js

Open **Terminal** (Applications → Utilities → Terminal) and check whether Node.js is already installed:

```bash
node -v
```

If it prints `v22` or higher, skip to step 2. Otherwise, download and install the **LTS** version from
[nodejs.org](https://nodejs.org), then close Terminal, open it again and re-run `node -v`.

## 2. Get the project

Put the project in a folder **directly in your home folder**, not inside Documents, Desktop or Downloads. macOS privacy
protection stops background programs from reading those three folders, and the worker would fail silently.

```bash
cd ~
git clone https://github.com/websitemillennium5-ctrl/millennium-web-app.git millennium-worker
cd ~/millennium-worker
npm ci --ignore-scripts
```

If macOS asks to install the "command line developer tools" when you run `git`, click **Install**, wait for it to
finish, then run the commands again.

## 3. Add the database keys

Create the settings file:

```bash
cd ~/millennium-worker
nano .env.local
```

Paste these two lines with the real values, then press **Ctrl+O**, **Enter**, **Ctrl+X** to save and close:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxx
```

> **Keep this file private.** The secret key gives full access to the website's database. Don't email it, share it or
> copy it to other computers, and make sure this Mac's user account has a password.

## 4. Test it once

Check the airline sites can be reached from this computer (this only reads; it saves nothing):

```bash
cd ~/millennium-worker
node scripts/scrapers/sync-all.mjs --dry-run fly91 events/indigo_cabin_crew events/indigo_ground_staff
```

You should see `Synced 3/3 sources`. If IndiGo shows `The operation was aborted due to timeout` or `403`, the connection
is being blocked: turn off any VPN or try a different network, then run it again.

Now do a real sync, which saves to the database:

```bash
npm run sync:india
```

Again you should see `Synced 3/3 sources`.

## 5. Install the worker

```bash
cd ~/millennium-worker
scripts/scrapers/install-worker.sh
```

It prints `Installed com.millennium.sync-worker`. The worker is now running and will start by itself from now on.

## 6. Check it's working

1. Open the website's admin panel → **Sync**. The **Local worker** card should say **Online · <this computer's name>**
   within about 15 seconds.
2. Press **Sync now**. The three rows should each show *Syncing…* and then a ✓, within a minute.

You can also check from Terminal:

```bash
launchctl list | grep millennium          # a line with a number means it's running
tail -n 20 ~/Library/Logs/millennium-sync-worker.log
```

The log should say `watching for syncs`.

## 7. Keep the Mac available

The worker only works while the Mac is awake. Missed syncs aren't lost: a request waits until the worker is back, and
the daily sync runs as soon as the Mac wakes up. But to keep listings fresh:

- **Desktop Macs:** System Settings → **Energy** → turn on **Prevent automatic sleeping when the display is off**.
- **Laptops:** System Settings → **Battery** → **Options** → turn on **Prevent automatic sleeping on power adapter when
  the display is off**, and keep it plugged in.
- Turn on **Start up automatically after a power failure** if the option is there.
- The worker starts when the user **logs in**. If the Mac restarts to a login screen, someone needs to log in, or turn on
  automatic login (System Settings → **Users & Groups**).

---

## Everyday use

Nothing. Staff use **Sync now** on the admin panel when they want a fresh copy of IndiGo events; the rest is automatic.

The panel shows **Offline** when the Mac is off, asleep or logged out. Sync requests made meanwhile wait in the queue and
run when it's back.

## Updating

When the developer ships changes to the scrapers:

```bash
cd ~/millennium-worker
git pull
npm ci --ignore-scripts
scripts/scrapers/install-worker.sh      # restarts the worker on the new version
```

## Troubleshooting

| Problem | What to do |
|---|---|
| Panel says **Offline** | Check the Mac is on, awake and logged in. Then run `launchctl list \| grep millennium`. No line? Run `scripts/scrapers/install-worker.sh` again. |
| Log shows `Operation not permitted` | The project is inside Documents, Desktop or Downloads. Move it to `~/millennium-worker` (step 2) and run the install script again. |
| Log shows `must be set` | `.env.local` is missing or has a typo. Redo step 3, then run the install script again. |
| Log shows `node: command not found`, or it stopped after updating Node.js | Run `scripts/scrapers/install-worker.sh` again; it records where Node.js is. |
| IndiGo shows **timeout** or **403** | The network is being blocked. Turn off any VPN or try another connection (step 4). |
| A sync is stuck on **Waiting for worker…** | The worker is offline: see the first row. You can also press **Cancel** on the panel. |

The full log is at `~/Library/Logs/millennium-sync-worker.log`. Send it to the developer if something isn't covered
here.

## Removing the worker

```bash
cd ~/millennium-worker
scripts/scrapers/install-worker.sh uninstall
```

Then delete the `~/millennium-worker` folder. IndiGo and Fly91 stop updating until a worker is installed on another
computer.

---

## Not on a Mac?

`install-worker.sh` is for macOS. On **Windows** or **Linux**, follow steps 1–4 above, then keep the worker running with
[PM2](https://pm2.keymetrics.io), a free process manager:

```bash
npm install -g pm2
cd <project folder>
pm2 start "node --env-file=.env.local scripts/scrapers/worker.mjs" --name millennium-sync-worker
pm2 save
pm2 startup        # Linux: follow the command it prints. Windows: use the pm2-windows-startup package instead.
```

Check it with `pm2 status` and `pm2 logs millennium-sync-worker`, and confirm the panel shows **Online** (step 6).
