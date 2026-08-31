'use client';

// 후면 카메라 프리뷰와 촬영을 담당하는 훅.
// 언마운트 시 스트림을 반드시 정리한다. 정리하지 않으면 모바일에서
// 카메라 표시등이 계속 켜져 있고 다음 화면에서 카메라가 안 잡힌다.

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error';

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: CameraStatus;
  error: string | null;
  /** 셔터 효과 표시 여부. 화면을 0.1초 동안 흰색으로 덮는다. */
  flashing: boolean;
  capturePhoto: () => Promise<Blob | null>;
  restart: () => void;
}

function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라를 허용한 뒤 다시 시도하세요.';
      case 'NotFoundError':
      case 'OverconstrainedError':
        return '사용할 수 있는 카메라를 찾지 못했습니다.';
      case 'NotReadableError':
        return '다른 앱이 카메라를 사용 중입니다. 해당 앱을 닫고 다시 시도하세요.';
      default:
        return `카메라를 열지 못했습니다. (${error.name})`;
    }
  }
  return '카메라를 열지 못했습니다.';
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const restart = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError(
          '이 브라우저는 카메라를 지원하지 않습니다. HTTPS 환경인지 확인하세요.',
        );
        return;
      }

      setStatus('starting');
      try {
        // 후면 카메라를 우선 요청하고, 없으면 아무 카메라나 받는다.
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: 'environment' } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus('ready');
      } catch (caught) {
        if (cancelled) return;
        setStatus('error');
        setError(describeError(caught));
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 100);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    error,
    flashing,
    capturePhoto,
    restart,
  };
}
