# WiFi 기반 실내 위치 추적 시스템

## 개요
RSSI(Received Signal Strength Indicator)를 활용한 실내 위치 추적 시스템입니다.
주변 WiFi AP(Access Point)의 신호 세기를 측정하여 삼변 측량(Trilateration)으로 
디바이스/사람의 위치를 추정합니다.

## 기술 원리
```
1. WiFi AP 스캔 → RSSI 값 수집
2. RSSI → 거리 변환 (Log-Distance Path Loss Model)
3. 3개 이상 AP 기준 삼변 측량 → 좌표 추정
4. 칼만 필터로 노이즈 보정 → 부드러운 위치 추적
```

## 프로젝트 구조
```
wifi-tracker/
├── config.json          # AP 위치, 환경 설정
├── main.py              # 메인 진입점
├── scanner/
│   ├── __init__.py
│   └── wifi_scanner.py  # WiFi 스캔 (RSSI 수집)
├── engine/
│   ├── __init__.py
│   ├── distance.py      # RSSI → 거리 변환
│   ├── trilateration.py # 삼변 측량 위치 추정
│   └── kalman.py        # 칼만 필터 (노이즈 보정)
├── web/
│   ├── server.py        # 실시간 웹 서버
│   ├── index.html       # 시각화 대시보드
│   └── tracker.js       # 실시간 위치 표시
└── data/
    └── fingerprints.json # WiFi 핑거프린트 DB (선택)
```

## 설치 및 실행
```bash
pip install numpy scipy flask websockets
sudo python main.py  # WiFi 스캔은 root 권한 필요 (Linux)
```

## 접속
- 대시보드: http://localhost:5000
- 실시간 위치가 2D 맵에 표시됩니다

## 지원 OS
- Linux: iwlist / nmcli 기반 스캔
- macOS: airport 유틸리티 기반 스캔
- Windows: netsh wlan 기반 스캔

## 정확도 참고
- 일반 환경: ±2~5m
- 핑거프린트 DB 구축 시: ±1~3m
- AP 개수가 많을수록 정확도 향상
