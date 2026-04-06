"""
WiFi Scanner - 주변 AP의 RSSI 신호를 수집하는 모듈
지원 OS: Linux, macOS, Windows
"""

import subprocess
import platform
import re
import time
import json
import random


class WiFiScanner:
    """WiFi Access Point 스캐너"""

    def __init__(self, interface=None, demo_mode=False):
        self.system = platform.system()
        self.interface = interface or self._detect_interface()
        self.demo_mode = demo_mode

    def _detect_interface(self):
        """무선 네트워크 인터페이스 자동 감지"""
        if self.system == 'Linux':
            try:
                result = subprocess.run(
                    ['iw', 'dev'], capture_output=True, text=True
                )
                match = re.search(r'Interface\s+(\w+)', result.stdout)
                if match:
                    return match.group(1)
            except FileNotFoundError:
                pass
            return 'wlan0'
        elif self.system == 'Darwin':
            return 'en0'
        elif self.system == 'Windows':
            return 'Wi-Fi'
        return 'wlan0'

    def scan(self):
        """WiFi AP를 스캔하여 BSSID, SSID, RSSI 목록 반환"""
        if self.demo_mode:
            return self._demo_scan()

        if self.system == 'Linux':
            return self._scan_linux()
        elif self.system == 'Darwin':
            return self._scan_macos()
        elif self.system == 'Windows':
            return self._scan_windows()
        else:
            print(f"[경고] 지원하지 않는 OS: {self.system}, 데모 모드로 전환")
            self.demo_mode = True
            return self._demo_scan()

    def _scan_linux(self):
        """Linux: iwlist 또는 nmcli로 스캔"""
        results = []

        # nmcli 시도
        try:
            output = subprocess.run(
                ['nmcli', '-t', '-f', 'BSSID,SSID,SIGNAL,FREQ', 'dev', 'wifi', 'list', '--rescan', 'yes'],
                capture_output=True, text=True, timeout=15
            )
            if output.returncode == 0:
                for line in output.stdout.strip().split('\n'):
                    if not line:
                        continue
                    parts = line.split(':')
                    if len(parts) >= 4:
                        bssid = ':'.join(parts[:6])
                        ssid = parts[6] if len(parts) > 6 else ''
                        signal = int(parts[-2]) if parts[-2].lstrip('-').isdigit() else 0
                        freq = parts[-1]

                        # nmcli SIGNAL은 0-100%, RSSI로 변환
                        rssi = (signal / 2) - 100

                        results.append({
                            'bssid': bssid.upper(),
                            'ssid': ssid,
                            'rssi': rssi,
                            'frequency': freq
                        })
                if results:
                    return results
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # iwlist 시도 (root 필요)
        try:
            output = subprocess.run(
                ['sudo', 'iwlist', self.interface, 'scan'],
                capture_output=True, text=True, timeout=15
            )
            if output.returncode == 0:
                cells = output.stdout.split('Cell ')
                for cell in cells[1:]:
                    bssid_match = re.search(r'Address:\s*([0-9A-Fa-f:]+)', cell)
                    ssid_match = re.search(r'ESSID:"([^"]*)"', cell)
                    rssi_match = re.search(r'Signal level[=:](-?\d+)', cell)
                    freq_match = re.search(r'Frequency[=:](\d+\.?\d*)', cell)

                    if bssid_match and rssi_match:
                        results.append({
                            'bssid': bssid_match.group(1).upper(),
                            'ssid': ssid_match.group(1) if ssid_match else '',
                            'rssi': int(rssi_match.group(1)),
                            'frequency': freq_match.group(1) if freq_match else 'unknown'
                        })
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        return results

    def _scan_macos(self):
        """macOS: airport 유틸리티로 스캔"""
        results = []
        airport_path = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'

        try:
            output = subprocess.run(
                [airport_path, '-s'],
                capture_output=True, text=True, timeout=15
            )
            if output.returncode == 0:
                lines = output.stdout.strip().split('\n')[1:]  # 헤더 제외
                for line in lines:
                    match = re.match(
                        r'\s*(.+?)\s+([0-9a-fA-F:]{17})\s+(-?\d+)\s+(.+)',
                        line
                    )
                    if match:
                        results.append({
                            'bssid': match.group(2).upper(),
                            'ssid': match.group(1).strip(),
                            'rssi': int(match.group(3)),
                            'frequency': 'unknown'
                        })
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        return results

    def _scan_windows(self):
        """Windows: netsh wlan으로 스캔"""
        results = []
        try:
            output = subprocess.run(
                ['netsh', 'wlan', 'show', 'networks', 'mode=bssid'],
                capture_output=True, text=True, timeout=15
            )
            if output.returncode == 0:
                blocks = output.stdout.split('\n\n')
                for block in blocks:
                    ssid_match = re.search(r'SSID\s*\d*\s*:\s*(.+)', block)
                    bssid_match = re.search(r'BSSID\s*\d*\s*:\s*([0-9a-fA-F:]+)', block)
                    signal_match = re.search(r'Signal\s*:\s*(\d+)%', block)

                    if bssid_match and signal_match:
                        signal_pct = int(signal_match.group(1))
                        rssi = (signal_pct / 2) - 100

                        results.append({
                            'bssid': bssid_match.group(1).strip().upper(),
                            'ssid': ssid_match.group(1).strip() if ssid_match else '',
                            'rssi': rssi,
                            'frequency': 'unknown'
                        })
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        return results

    def _demo_scan(self):
        """데모 모드: 가상 AP 신호 생성 (테스트용)"""
        # 가상 디바이스 위치 (시간에 따라 이동)
        t = time.time()
        device_x = 15 + 8 * (0.5 + 0.5 * __import__('math').sin(t * 0.3))
        device_y = 10 + 6 * (0.5 + 0.5 * __import__('math').cos(t * 0.2))

        demo_aps = [
            {'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'Office_AP_1', 'x': 0, 'y': 0},
            {'bssid': 'AA:BB:CC:DD:EE:02', 'ssid': 'Office_AP_2', 'x': 30, 'y': 0},
            {'bssid': 'AA:BB:CC:DD:EE:03', 'ssid': 'Office_AP_3', 'x': 15, 'y': 20},
            {'bssid': 'AA:BB:CC:DD:EE:04', 'ssid': 'Office_AP_4', 'x': 0, 'y': 20},
        ]

        results = []
        for ap in demo_aps:
            dist = ((device_x - ap['x'])**2 + (device_y - ap['y'])**2)**0.5
            # Log-Distance Path Loss 모델 역산 + 노이즈
            rssi = -30 - 27 * __import__('math').log10(max(dist, 0.1))
            rssi += random.gauss(0, 3)  # 현실적 노이즈 추가

            results.append({
                'bssid': ap['bssid'],
                'ssid': ap['ssid'],
                'rssi': round(rssi, 1),
                'frequency': '2.4'
            })

        return results
