"""
RSSI → 거리 변환 모듈
Log-Distance Path Loss Model 사용
"""

import math


def rssi_to_distance(rssi, tx_power=-30, path_loss_exponent=2.7):
    """
    RSSI 값을 거리(미터)로 변환

    Log-Distance Path Loss Model:
    RSSI = tx_power - 10 * n * log10(d)
    → d = 10^((tx_power - RSSI) / (10 * n))

    Parameters:
        rssi: 수신 신호 세기 (dBm, 음수값)
        tx_power: 1m 거리에서의 기준 RSSI (dBm)
        path_loss_exponent: 경로 손실 지수
            - 자유 공간: 2.0
            - 실내 (벽 적음): 2.5~3.0
            - 실내 (벽 많음): 3.0~4.0
            - 밀집 환경: 4.0~6.0

    Returns:
        추정 거리 (미터)
    """
    if rssi >= tx_power:
        return 0.1  # 매우 가까움

    exponent = (tx_power - rssi) / (10 * path_loss_exponent)
    distance = math.pow(10, exponent)

    return round(distance, 2)


def distance_to_rssi(distance, tx_power=-30, path_loss_exponent=2.7):
    """
    거리를 RSSI로 역변환 (시뮬레이션용)

    Parameters:
        distance: 거리 (미터)
        tx_power: 기준 RSSI (dBm)
        path_loss_exponent: 경로 손실 지수

    Returns:
        예상 RSSI (dBm)
    """
    if distance <= 0:
        return tx_power

    rssi = tx_power - 10 * path_loss_exponent * math.log10(distance)
    return round(rssi, 1)


def calibrate_path_loss(measurements):
    """
    실측 데이터로 경로 손실 지수를 보정

    Parameters:
        measurements: [{'rssi': -50, 'distance': 3.0}, ...] 형태의 실측 데이터

    Returns:
        보정된 path_loss_exponent
    """
    if len(measurements) < 2:
        return 2.7  # 기본값

    tx_power = measurements[0].get('tx_power', -30)
    n_sum = 0
    count = 0

    for m in measurements:
        if m['distance'] > 0:
            n = (tx_power - m['rssi']) / (10 * math.log10(m['distance']))
            n_sum += n
            count += 1

    return round(n_sum / count, 2) if count > 0 else 2.7
