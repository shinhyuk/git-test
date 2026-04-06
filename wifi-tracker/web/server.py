"""
실시간 위치 추적 웹 서버
Flask + WebSocket으로 실시간 위치 데이터를 브라우저에 전송
"""

import json
import time
import threading
import os
import sys

from flask import Flask, send_from_directory, jsonify

# 상위 디렉터리 import를 위한 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scanner.wifi_scanner import WiFiScanner
from engine.distance import rssi_to_distance
from engine.trilateration import trilaterate, weighted_centroid
from engine.kalman import KalmanFilter2D

app = Flask(__name__, static_folder='.')

# 글로벌 상태
tracker_state = {
    'position': None,
    'raw_position': None,
    'ap_signals': [],
    'history': [],
    'timestamp': None,
    'speed': 0
}

config = {}
scanner = None
kalman = None
tracking_active = False


def load_config():
    """설정 파일 로드"""
    global config
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'config.json'
    )
    with open(config_path, 'r') as f:
        config = json.load(f)


def init_tracker(demo_mode=True):
    """추적기 초기화"""
    global scanner, kalman
    scanner = WiFiScanner(demo_mode=demo_mode)
    kalman = KalmanFilter2D(
        process_noise=config['tracking']['kalman_process_noise'],
        measurement_noise=config['tracking']['kalman_measurement_noise']
    )


def tracking_loop():
    """주기적으로 WiFi 스캔 및 위치 추정"""
    global tracking_active

    ap_map = {ap['bssid']: ap for ap in config['access_points']}
    path_loss = config['path_loss']

    while tracking_active:
        scan_results = scanner.scan()

        ap_positions = []
        distances = []
        signals = []

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
                signals.append({
                    'bssid': bssid,
                    'ssid': result['ssid'],
                    'rssi': result['rssi'],
                    'distance': round(dist, 2),
                    'ap_x': ap['x'],
                    'ap_y': ap['y']
                })

        # 위치 추정
        raw_pos = None
        filtered_pos = None

        if len(ap_positions) >= 3:
            try:
                raw_pos = trilaterate(ap_positions, distances)
            except Exception:
                raw_pos = weighted_centroid(ap_positions, distances)

            if raw_pos is None:
                raw_pos = weighted_centroid(ap_positions, distances)

            # 경계 제한
            env = config['environment']
            raw_pos = (
                max(0, min(raw_pos[0], env['width'])),
                max(0, min(raw_pos[1], env['height']))
            )

            # 칼만 필터 적용
            filtered_pos = kalman.update(raw_pos)

        # 상태 업데이트
        tracker_state['raw_position'] = raw_pos
        tracker_state['position'] = filtered_pos
        tracker_state['ap_signals'] = signals
        tracker_state['timestamp'] = time.time()
        tracker_state['speed'] = kalman.get_speed()

        if filtered_pos:
            tracker_state['history'].append({
                'x': filtered_pos[0],
                'y': filtered_pos[1],
                't': time.time()
            })
            # 히스토리 최대 200개 유지
            if len(tracker_state['history']) > 200:
                tracker_state['history'] = tracker_state['history'][-200:]

        time.sleep(config['tracking']['scan_interval'])


# ============================================
# Routes
# ============================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/tracker.js')
def tracker_js():
    return send_from_directory('.', 'tracker.js')


@app.route('/api/status')
def api_status():
    return jsonify(tracker_state)


@app.route('/api/config')
def api_config():
    return jsonify({
        'environment': config['environment'],
        'access_points': config['access_points']
    })


@app.route('/api/history')
def api_history():
    return jsonify(tracker_state['history'])


@app.route('/api/reset')
def api_reset():
    kalman.reset()
    tracker_state['history'] = []
    return jsonify({'status': 'ok'})


# ============================================
# Start
# ============================================

def start_server(demo_mode=True, host='0.0.0.0', port=5000):
    """서버 시작"""
    global tracking_active

    load_config()
    init_tracker(demo_mode=demo_mode)

    tracking_active = True
    tracker_thread = threading.Thread(target=tracking_loop, daemon=True)
    tracker_thread.start()

    print(f"\n{'='*50}")
    print(f"  WiFi 위치 추적 서버 시작")
    print(f"  대시보드: http://localhost:{port}")
    print(f"  모드: {'데모' if demo_mode else '실제 스캔'}")
    print(f"{'='*50}\n")

    app.run(host=host, port=port, debug=False)


if __name__ == '__main__':
    start_server(demo_mode=True)
