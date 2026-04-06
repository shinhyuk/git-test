#!/usr/bin/env python3
"""
WiFi 기반 실내 위치 추적 시스템
메인 진입점

사용법:
  python main.py              # 데모 모드 (가상 AP 시뮬레이션)
  python main.py --live       # 실제 WiFi 스캔 모드
  python main.py --port 8080  # 포트 변경
"""

import argparse
import json
import os
import sys
import time

# 프로젝트 루트를 sys.path에 추가
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)


def print_banner():
    """시작 배너 출력"""
    print("""
╔══════════════════════════════════════════════╗
║       WiFi 실내 위치 추적 시스템             ║
║       Indoor Position Tracking System        ║
╠══════════════════════════════════════════════╣
║                                              ║
║  RSSI 기반 삼변 측량 + 칼만 필터             ║
║  실시간 웹 대시보드 제공                     ║
║                                              ║
╚══════════════════════════════════════════════╝
    """)


def run_cli(args):
    """CLI 모드: 터미널에서 위치 추적 결과 출력"""
    from scanner.wifi_scanner import WiFiScanner
    from engine.distance import rssi_to_distance
    from engine.trilateration import trilaterate, weighted_centroid
    from engine.kalman import KalmanFilter2D

    # 설정 로드
    config_path = os.path.join(PROJECT_DIR, 'config.json')
    with open(config_path, 'r') as f:
        config = json.load(f)

    scanner = WiFiScanner(demo_mode=not args.live)
    kalman = KalmanFilter2D(
        process_noise=config['tracking']['kalman_process_noise'],
        measurement_noise=config['tracking']['kalman_measurement_noise']
    )

    ap_map = {ap['bssid']: ap for ap in config['access_points']}
    path_loss = config['path_loss']

    print(f"\n모드: {'실제 스캔' if args.live else '데모 (시뮬레이션)'}")
    print(f"등록 AP: {len(config['access_points'])}개")
    print(f"스캔 간격: {config['tracking']['scan_interval']}초")
    print("-" * 50)

    try:
        while True:
            scan_results = scanner.scan()

            ap_positions = []
            distances = []

            print(f"\n[{time.strftime('%H:%M:%S')}] 스캔 결과:")
            for result in scan_results:
                bssid = result['bssid']
                if bssid in ap_map:
                    ap = ap_map[bssid]
                    dist = rssi_to_distance(
                        result['rssi'],
                        tx_power=path_loss['reference_rssi'],
                        path_loss_exponent=path_loss['path_loss_exponent']
                    )
                    ap_positions.append((ap['x'], ap['y']))
                    distances.append(dist)
                    print(f"  {result['ssid']:20s} RSSI: {result['rssi']:6.1f} dBm → {dist:5.1f}m")

            if len(ap_positions) >= 3:
                try:
                    raw_pos = trilaterate(ap_positions, distances)
                except Exception:
                    raw_pos = weighted_centroid(ap_positions, distances)

                if raw_pos:
                    filtered = kalman.update(raw_pos)
                    speed = kalman.get_speed()
                    print(f"\n  원시 위치:   ({raw_pos[0]:6.2f}, {raw_pos[1]:6.2f})")
                    print(f"  필터 위치:  ({filtered[0]:6.2f}, {filtered[1]:6.2f})")
                    print(f"  속도:       {speed:.2f} m/s")
            else:
                print(f"\n  ⚠ AP 부족 ({len(ap_positions)}개), 최소 3개 필요")

            time.sleep(config['tracking']['scan_interval'])

    except KeyboardInterrupt:
        print("\n\n추적 종료.")


def run_web(args):
    """웹 대시보드 모드"""
    os.chdir(os.path.join(PROJECT_DIR, 'web'))
    from web.server import start_server
    start_server(
        demo_mode=not args.live,
        host=args.host,
        port=args.port
    )


def main():
    print_banner()

    parser = argparse.ArgumentParser(description='WiFi 실내 위치 추적 시스템')
    parser.add_argument('--live', action='store_true',
                        help='실제 WiFi 스캔 모드 (기본: 데모 모드)')
    parser.add_argument('--cli', action='store_true',
                        help='CLI 모드 (웹 대시보드 없이 터미널 출력)')
    parser.add_argument('--host', default='0.0.0.0',
                        help='서버 호스트 (기본: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=5000,
                        help='서버 포트 (기본: 5000)')
    args = parser.parse_args()

    if args.cli:
        run_cli(args)
    else:
        run_web(args)


if __name__ == '__main__':
    main()
