"""
2D 칼만 필터 - 위치 추적 노이즈 보정
WiFi RSSI의 변동성을 줄이고 부드러운 위치 추적을 제공
"""

import numpy as np


class KalmanFilter2D:
    """
    2D 위치 추적용 칼만 필터

    상태 벡터: [x, y, vx, vy] (위치 + 속도)
    측정 벡터: [x, y] (위치만 측정)
    """

    def __init__(self, process_noise=0.1, measurement_noise=2.0):
        """
        Parameters:
            process_noise: 프로세스 노이즈 (작을수록 부드럽게, 반응 느림)
            measurement_noise: 측정 노이즈 (클수록 측정값 덜 신뢰)
        """
        # 상태 벡터 [x, y, vx, vy]
        self.state = np.zeros(4)

        # 상태 전이 행렬 (등속 운동 모델)
        self.F = np.array([
            [1, 0, 1, 0],  # x = x + vx*dt
            [0, 1, 0, 1],  # y = y + vy*dt
            [0, 0, 1, 0],  # vx = vx
            [0, 0, 0, 1],  # vy = vy
        ], dtype=float)

        # 측정 행렬 (위치만 관측)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ], dtype=float)

        # 프로세스 노이즈 공분산
        q = process_noise
        self.Q = np.array([
            [q, 0, 0, 0],
            [0, q, 0, 0],
            [0, 0, q * 2, 0],
            [0, 0, 0, q * 2],
        ], dtype=float)

        # 측정 노이즈 공분산
        r = measurement_noise
        self.R = np.array([
            [r, 0],
            [0, r],
        ], dtype=float)

        # 오차 공분산 (초기: 큰 불확실성)
        self.P = np.eye(4) * 100

        self.initialized = False

    def update(self, measurement):
        """
        새 측정값으로 상태 업데이트

        Parameters:
            measurement: (x, y) 측정된 위치

        Returns:
            (x, y) 필터링된 위치
        """
        z = np.array(measurement, dtype=float)

        # 최초 측정 시 상태 초기화
        if not self.initialized:
            self.state[0] = z[0]
            self.state[1] = z[1]
            self.state[2] = 0  # 초기 속도 0
            self.state[3] = 0
            self.initialized = True
            return (round(z[0], 2), round(z[1], 2))

        # === 예측 단계 (Predict) ===
        state_pred = self.F @ self.state
        P_pred = self.F @ self.P @ self.F.T + self.Q

        # === 업데이트 단계 (Update) ===
        # 칼만 이득 계산
        S = self.H @ P_pred @ self.H.T + self.R
        K = P_pred @ self.H.T @ np.linalg.inv(S)

        # 혁신 (측정값 - 예측값)
        innovation = z - self.H @ state_pred

        # 상태 업데이트
        self.state = state_pred + K @ innovation

        # 공분산 업데이트
        I = np.eye(4)
        self.P = (I - K @ self.H) @ P_pred

        return (round(self.state[0], 2), round(self.state[1], 2))

    def predict(self):
        """
        측정 없이 예측만 수행 (측정 누락 시)

        Returns:
            (x, y) 예측된 위치
        """
        self.state = self.F @ self.state
        self.P = self.F @ self.P @ self.F.T + self.Q
        return (round(self.state[0], 2), round(self.state[1], 2))

    def get_velocity(self):
        """현재 추정 속도 반환"""
        return (round(self.state[2], 2), round(self.state[3], 2))

    def get_speed(self):
        """현재 추정 속력 반환 (m/s)"""
        return round(np.sqrt(self.state[2]**2 + self.state[3]**2), 2)

    def reset(self):
        """필터 초기화"""
        self.state = np.zeros(4)
        self.P = np.eye(4) * 100
        self.initialized = False
