"""
삼변 측량(Trilateration) 위치 추정 모듈
3개 이상의 AP 거리 데이터를 기반으로 좌표를 계산
"""

import numpy as np
from scipy.optimize import least_squares


def trilaterate(ap_positions, distances):
    """
    삼변 측량으로 위치 추정

    Parameters:
        ap_positions: AP 좌표 리스트 [(x1,y1), (x2,y2), (x3,y3), ...]
        distances: 각 AP까지의 추정 거리 [d1, d2, d3, ...]

    Returns:
        (x, y) 추정 좌표, 또는 None (실패 시)
    """
    if len(ap_positions) < 3 or len(distances) < 3:
        return None

    ap_positions = np.array(ap_positions, dtype=float)
    distances = np.array(distances, dtype=float)

    # 초기 추정값: AP들의 가중 평균 (가까운 AP에 더 큰 가중치)
    weights = 1.0 / (distances + 0.1)
    weights /= weights.sum()
    initial_guess = np.average(ap_positions, axis=0, weights=weights)

    # 비선형 최소자승법으로 최적 위치 탐색
    def residuals(point):
        """각 AP까지의 실제 거리와 추정 거리의 차이"""
        diffs = ap_positions - point
        calculated_distances = np.sqrt(np.sum(diffs**2, axis=1))
        return calculated_distances - distances

    result = least_squares(
        residuals,
        initial_guess,
        method='lm',
        ftol=1e-10,
        xtol=1e-10
    )

    if result.success:
        return tuple(np.round(result.x, 2))

    return None


def trilaterate_linear(ap_positions, distances):
    """
    선형 삼변 측량 (scipy 없이 사용 가능한 간단한 버전)

    첫 번째 AP를 기준으로 연립방정식을 세워 최소자승 해를 구함

    Parameters:
        ap_positions: AP 좌표 [(x1,y1), (x2,y2), (x3,y3), ...]
        distances: 각 AP까지의 거리 [d1, d2, d3, ...]

    Returns:
        (x, y) 추정 좌표
    """
    if len(ap_positions) < 3:
        return None

    n = len(ap_positions)
    aps = np.array(ap_positions, dtype=float)
    dists = np.array(distances, dtype=float)

    # 첫 번째 AP를 기준으로 선형화
    # (xi-x)^2 + (yi-y)^2 = di^2
    # (x1-x)^2 + (y1-y)^2 = d1^2
    # 빼면: 2*(xi-x1)*x + 2*(yi-y1)*y = di^2 - d1^2 - xi^2 + x1^2 - yi^2 + y1^2

    A = np.zeros((n - 1, 2))
    b = np.zeros(n - 1)

    x1, y1 = aps[0]
    d1_sq = dists[0] ** 2

    for i in range(1, n):
        xi, yi = aps[i]
        di_sq = dists[i] ** 2

        A[i - 1, 0] = 2 * (xi - x1)
        A[i - 1, 1] = 2 * (yi - y1)
        b[i - 1] = di_sq - d1_sq - xi**2 + x1**2 - yi**2 + y1**2

    # 최소자승 해
    try:
        result, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
        return tuple(np.round(result, 2))
    except np.linalg.LinAlgError:
        return None


def weighted_centroid(ap_positions, distances):
    """
    가중 중심법 (가장 단순한 방법, 빠르지만 덜 정확)

    Parameters:
        ap_positions: AP 좌표
        distances: 각 AP까지의 거리

    Returns:
        (x, y) 추정 좌표
    """
    aps = np.array(ap_positions, dtype=float)
    dists = np.array(distances, dtype=float)

    # 거리의 역수를 가중치로 사용
    weights = 1.0 / (dists + 0.01)
    weights /= weights.sum()

    x = np.sum(aps[:, 0] * weights)
    y = np.sum(aps[:, 1] * weights)

    return (round(x, 2), round(y, 2))
