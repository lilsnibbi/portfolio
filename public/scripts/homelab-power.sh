#!/usr/bin/env bash
# Ubuntu Server laptop power settings. Run as root: sudo bash homelab-power.sh
# Requires systemd, udev and iw (install the Ubuntu iw package for Wi-Fi).
#
# Undo as root:
#   systemctl disable homelab-cpu-power.service homelab-wifi-power.service
#   rm -f /etc/systemd/logind.conf.d/99-homelab-power.conf \
#     /etc/udev/rules.d/99-homelab-wifi-power.rules \
#     /etc/systemd/system/homelab-{cpu,wifi}-power.service \
#     /usr/local/sbin/homelab-power-apply
#   systemctl daemon-reload
#   udevadm control --reload-rules
#   systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target
#   reboot
# Only unmask targets that were not already masked before running this script.
# This script does not record prior state.
# Other power managers can override these settings; undoing does not restore a
# previously selected CPU governor or Wi-Fi power-saving state.
set -euo pipefail

if (( EUID != 0 )); then
    echo 'Run this script as root, for example: sudo bash homelab-power.sh' >&2
    exit 1
fi
if ! command -v systemctl >/dev/null || ! command -v udevadm >/dev/null || [[ ! -d /run/systemd/system ]]; then
    echo 'This script requires a running systemd system and udevadm.' >&2
    exit 1
fi

install -d -m 755 /etc/systemd/logind.conf.d /etc/systemd/system /etc/udev/rules.d /usr/local/sbin
cat > /etc/systemd/logind.conf.d/99-homelab-power.conf <<'CONFIG'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
CONFIG

cat > /usr/local/sbin/homelab-power-apply <<'HELPER'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
    cpu)
        shopt -s nullglob
        policies=(/sys/devices/system/cpu/cpufreq/policy*)
        if ((${#policies[@]} == 0)); then
            echo 'No CPU frequency policies found; governor was not changed.' >&2
        fi
        failed=0
        for policy in "${policies[@]}"; do
            if [[ ! -r "$policy/scaling_available_governors" ]] || ! grep -qw performance "$policy/scaling_available_governors"; then
                echo "$policy: performance governor unavailable; skipped." >&2
                continue
            fi
            if ! echo performance > "$policy/scaling_governor" || [[ $(<"$policy/scaling_governor") != performance ]]; then
                echo "$policy: failed to set or verify performance governor." >&2
                failed=1
            else
                echo "$policy: performance governor set."
            fi
        done
        exit "$failed"
        ;;
    wifi)
        iface=wlp0s20f3
        if [[ ! -d "/sys/class/net/$iface" ]]; then
            echo "$iface not present; Wi-Fi power saving was not changed." >&2
            exit 0
        fi
        if ! command -v iw >/dev/null; then
            echo 'iw is missing; install the Ubuntu iw package, then restart homelab-wifi-power.service.' >&2
            exit 1
        fi
        if ! iw dev "$iface" set power_save off; then
            echo "$iface: failed to disable Wi-Fi power saving." >&2
            exit 1
        fi
        state=$(iw dev "$iface" get power_save) || { echo "$iface: could not verify power saving." >&2; exit 1; }
        echo "$iface: $state"
        if [[ "$state" != *'Power save: off'* ]]; then
            echo "$iface: Wi-Fi power saving is not confirmed off." >&2
            exit 1
        fi
        ;;
    *) echo 'Usage: homelab-power-apply {cpu|wifi}' >&2; exit 2 ;;
esac
HELPER
chmod 755 /usr/local/sbin/homelab-power-apply

cat > /etc/systemd/system/homelab-cpu-power.service <<'UNIT'
[Unit]
Description=Set available CPU policies to performance

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/homelab-power-apply cpu

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/homelab-wifi-power.service <<'UNIT'
[Unit]
Description=Disable Wi-Fi power saving on wlp0s20f3
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/homelab-power-apply wifi

[Install]
WantedBy=multi-user.target
UNIT

# Retry when the interface appears after boot, without waiting for network-online.
cat > /etc/udev/rules.d/99-homelab-wifi-power.rules <<'RULE'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlp0s20f3", TAG+="systemd", ENV{SYSTEMD_WANTS}+="homelab-wifi-power.service"
RULE

systemctl daemon-reload
udevadm control --reload-rules
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
systemctl enable homelab-cpu-power.service homelab-wifi-power.service
# Restart applies updated helper contents on repeat runs as well.
failed=0
systemctl restart homelab-cpu-power.service || failed=1
systemctl restart homelab-wifi-power.service || failed=1

cat <<'NOTICE'
Lid and idle settings take effect after a reboot (avoids restarting logind over SSH).
Other power managers or later logind drop-ins may override these settings. CPU
policies without a performance governor are skipped. Wi-Fi is retried when the
interface appears, but another network manager may change it afterward. Check:
  systemctl status homelab-cpu-power.service homelab-wifi-power.service
  iw dev wlp0s20f3 get power_save
See the comments at the top of this script for reversal instructions.
NOTICE
if (( failed )); then
    echo 'A power service failed; inspect its status and journal for details.' >&2
    exit 1
fi
