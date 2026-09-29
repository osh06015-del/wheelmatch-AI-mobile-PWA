'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import { useLocale, type MessageKey } from '@/lib/i18n';

// Preview의 주소나 점검 데이터가 공유되지 않도록 운영 주소만 사용한다.
// 주소를 변경하면 PNG도 다시 생성하고 디코딩 결과가 같은지 확인해야 한다.
export const APP_SHARE_URL = 'https://wheelmatch-nu.vercel.app/';
export const APP_QR_PATH = '/share/wheelmatch-production-qr-v1.png';
const FILE_NAME = 'WheelMatch_AI_QR.png';
const ACTION =
  'flex min-h-12 items-center justify-center rounded-lg border border-slate-500 px-4 py-3 font-semibold active:bg-slate-700 disabled:opacity-50';

function QrDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sharingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();

    // 공유 클릭의 사용자 활성화를 유지하려고 파일은 대화상자를 열 때 준비한다.
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      void (async () => {
        try {
          const response = await fetch(APP_QR_PATH, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('QR download failed');
          const blob = await response.blob();
          if (blob.type !== 'image/png') throw new Error('Invalid QR image');
          const prepared = new File([blob], FILE_NAME, { type: 'image/png' });
          if (
            !controller.signal.aborted &&
            navigator.canShare({ files: [prepared] })
          ) {
            setFile(prepared);
          }
        } catch {
          // 파일 공유가 불가능해도 PNG 저장과 링크 복사는 계속 제공한다.
          if (!controller.signal.aborted) setNotice('share.prepareFailed');
        }
      })();
    }
    return () => {
      controller.abort();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function shareImage() {
    if (!file || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setNotice(null);
    try {
      await navigator.share({ title: 'WheelMatch AI', files: [file] });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setNotice('share.shareFailed');
      }
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(APP_SHARE_URL);
      setNotice('share.copied');
    } catch {
      setNotice('share.copyFailed');
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-5 text-slate-100 backdrop:bg-slate-950/80"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-xl font-bold">
            {t('share.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={ACTION}
          >
            {t('share.close')}
          </button>
        </div>
        <p className="text-sm text-slate-300">{t('share.hint')}</p>
        <Image
          src={APP_QR_PATH}
          alt={t('share.qrAlt')}
          width={1032}
          height={1032}
          unoptimized
          className="mx-auto h-auto w-full max-w-72 rounded-lg bg-white"
        />
        <a
          href={APP_SHARE_URL}
          className="break-all text-center text-sm text-sky-300 underline"
        >
          {APP_SHARE_URL}
        </a>
        <p className="text-sm text-slate-400">{t('share.privacy')}</p>
        {file ? (
          <button
            type="button"
            onClick={() => void shareImage()}
            disabled={sharing}
            className={`${ACTION} bg-sky-800`}
          >
            {t('share.image')}
          </button>
        ) : (
          <p className="text-sm text-slate-300">{t('share.fallback')}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <a href={APP_QR_PATH} download={FILE_NAME} className={ACTION}>
            {t('share.download')}
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className={ACTION}
          >
            {t('share.copy')}
          </button>
        </div>
        <p role="status" className="text-sm text-slate-200">
          {notice ? t(notice) : ''}
        </p>
      </div>
    </dialog>
  );
}

export function AppQrShare() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) openerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`${ACTION} text-slate-200`}
      >
        {t('share.open')}
      </button>
      {open && <QrDialog onClose={() => setOpen(false)} />}
    </>
  );
}
