'use client';

// 저장된 그라인더 — 이름 붙여 저장해 둔 규격을 명판 확인 화면에서 다시 고른다.
//
// 저장하지 않는 것: 사진, OCR 원본/신뢰도, 장비 상태 Gate 답, userConfirmed,
// 판정·시험운전 결과. 저장된 이름을 고르는 것은 "예전에 본 규격이 이거였다"는
// 기억일 뿐, "지금 이 기계를 확인했다"는 뜻이 아니다 — 그래서 고른 뒤에도
// 화면의 확인·Gate는 그대로 다시 받아야 한다(부모 컴포넌트가 초기화한다).
//
// 고른 값을 바로 입력칸에 덮지 않는다. 지금 읽은 값과 다르면 무엇이 적용되는지
// 보여주고 명시적으로 눌러야 적용된다 — 다르지 않아도 같은 절차를 거친다.
// 수정·삭제도 같은 이유로 한 번 더 확인한다.

import { useId, useState } from 'react';

import { SelectField } from './SelectField';

import { useLiveQuery } from 'dexie-react-hooks';
import { savedGrinderStore } from '@/lib/db/savedGrinderStore';
import {
  normalizeAlias,
  savedGrinderFieldsDiffer,
  type SavedGrinder,
  type SavedGrinderFields,
} from '@/lib/db/savedGrinderModel';
import { useLocale } from '@/lib/i18n';
import { GUARD_LABEL, SPINDLE_LABEL } from '@/lib/i18n/profileLabels';
import type { GuardType, SpindleThread } from '@/lib/rules/types';

const SPINDLES: readonly SpindleThread[] = [
  'unknown',
  'M14',
  'M10',
  '5/8-11',
  'other',
];
const GUARDS: readonly GuardType[] = [
  'unknown',
  'grinding',
  'cutting',
  'none',
  'other',
];

type EditDraft = SavedGrinderFields & { alias: string };

function toEditDraft(item: SavedGrinder): EditDraft {
  return {
    alias: item.alias,
    model: item.model,
    noLoadRPM: item.noLoadRPM,
    maxWheelDiameter: item.maxWheelDiameter,
    spindleThread: item.spindleThread,
    guardType: item.guardType,
    guardSize: item.guardSize,
  };
}

export function SavedGrinderPanel({
  currentFields,
  onApply,
}: {
  currentFields: SavedGrinderFields;
  onApply: (fields: SavedGrinderFields) => void;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const newAliasId = useId();

  const items = useLiveQuery(() => savedGrinderStore.list(), []);

  const [pendingApplyId, setPendingApplyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [confirmingEditId, setConfirmingEditId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [newAlias, setNewAlias] = useState('');
  const [aliasError, setAliasError] = useState(false);

  function closeRowActions() {
    setPendingApplyId(null);
    setEditingId(null);
    setEditDraft(null);
    setConfirmingEditId(null);
    setConfirmingDeleteId(null);
  }

  async function handleSaveCurrent() {
    const alias = normalizeAlias(newAlias);
    if (!alias) {
      setAliasError(true);
      return;
    }
    setAliasError(false);
    await savedGrinderStore.add({
      schemaVersion: 1,
      alias,
      savedAt: new Date().toISOString(),
      ...currentFields,
    });
    setNewAlias('');
  }

  function startEdit(item: SavedGrinder) {
    closeRowActions();
    setEditingId(item.id);
    setEditDraft(toEditDraft(item));
  }

  function requestEditConfirm(id: number) {
    setConfirmingEditId(id);
  }

  async function confirmEdit(item: SavedGrinder) {
    if (!editDraft) return;
    const alias = normalizeAlias(editDraft.alias);
    if (!alias) return;
    await savedGrinderStore.update({
      ...item,
      alias,
      model: editDraft.model,
      noLoadRPM: editDraft.noLoadRPM,
      maxWheelDiameter: editDraft.maxWheelDiameter,
      spindleThread: editDraft.spindleThread,
      guardType: editDraft.guardType,
      guardSize: editDraft.guardSize,
    });
    closeRowActions();
  }

  async function confirmDelete(id: number) {
    await savedGrinderStore.remove(id);
    closeRowActions();
  }

  function summarize(item: SavedGrinderFields): string {
    return t('savedGrinder.summary', {
      model: item.model || '—',
      rpm: item.noLoadRPM || '—',
      diameter: item.maxWheelDiameter || '—',
    });
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-xl bg-slate-800 px-4 py-4"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-100">
        {t('savedGrinder.title')}
      </h2>

      {items === undefined ? (
        <p className="text-base text-slate-400">{t('savedGrinder.loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-base text-slate-400">{t('savedGrinder.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const isApplying = pendingApplyId === item.id;
            const isEditing = editingId === item.id;
            const isConfirmingEdit = confirmingEditId === item.id;
            const isConfirmingDelete = confirmingDeleteId === item.id;
            const differs =
              isApplying && savedGrinderFieldsDiffer(currentFields, item);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-700 px-3 py-3"
              >
                {isEditing && editDraft ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {t('savedGrinder.aliasLabel')}
                      </span>
                      <input
                        type="text"
                        value={editDraft.alias}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            alias: event.target.value,
                          })
                        }
                        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {t('field.model')}
                      </span>
                      <input
                        type="text"
                        value={editDraft.model}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            model: event.target.value,
                          })
                        }
                        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {t('field.noLoadRPM')}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editDraft.noLoadRPM}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            noLoadRPM: event.target.value,
                          })
                        }
                        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {t('field.maxWheelDiameter')}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editDraft.maxWheelDiameter}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            maxWheelDiameter: event.target.value,
                          })
                        }
                        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
                      />
                    </label>
                    <SelectField
                      label={t('grinderMount.spindle.label')}
                      value={editDraft.spindleThread}
                      options={SPINDLES.map((spindle) => ({
                        value: spindle,
                        label: t(SPINDLE_LABEL[spindle]),
                      }))}
                      onChange={(spindleThread) =>
                        setEditDraft({ ...editDraft, spindleThread })
                      }
                    />
                    <SelectField
                      label={t('grinderMount.guardType.label')}
                      value={editDraft.guardType}
                      options={GUARDS.map((guard) => ({
                        value: guard,
                        label: t(GUARD_LABEL[guard]),
                      }))}
                      onChange={(guardType) =>
                        setEditDraft({ ...editDraft, guardType })
                      }
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-slate-200">
                        {t('grinderMount.guardSize.label')}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editDraft.guardSize}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            guardSize: event.target.value,
                          })
                        }
                        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
                      />
                    </label>

                    {isConfirmingEdit ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-3">
                        <p className="text-base leading-relaxed text-yellow-100">
                          {t('savedGrinder.editConfirm')}
                        </p>
                        <button
                          type="button"
                          onClick={() => void confirmEdit(item)}
                          className="min-h-12 rounded-lg bg-yellow-500 text-base font-bold text-slate-950 active:bg-yellow-400"
                        >
                          {t('savedGrinder.editConfirmButton')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingEditId(null)}
                          className="min-h-12 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
                        >
                          {t('savedGrinder.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => requestEditConfirm(item.id)}
                          className="min-h-12 flex-1 rounded-lg bg-slate-700 text-base font-semibold text-white active:bg-slate-600"
                        >
                          {t('savedGrinder.save')}
                        </button>
                        <button
                          type="button"
                          onClick={closeRowActions}
                          className="min-h-12 flex-1 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
                        >
                          {t('savedGrinder.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-slate-100">
                        {item.alias}
                      </span>
                      <span className="text-sm text-slate-400">
                        {summarize(item)}
                      </span>
                    </div>

                    {isApplying ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-3">
                        <p className="text-base leading-relaxed text-yellow-100">
                          {differs
                            ? t('savedGrinder.applyConfirmDiffers')
                            : t('savedGrinder.applyConfirm')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onApply({
                              model: item.model,
                              noLoadRPM: item.noLoadRPM,
                              maxWheelDiameter: item.maxWheelDiameter,
                              spindleThread: item.spindleThread,
                              guardType: item.guardType,
                              guardSize: item.guardSize,
                            });
                            closeRowActions();
                          }}
                          className="min-h-12 rounded-lg bg-yellow-500 text-base font-bold text-slate-950 active:bg-yellow-400"
                        >
                          {t('savedGrinder.applyConfirmButton')}
                        </button>
                        <button
                          type="button"
                          onClick={closeRowActions}
                          className="min-h-12 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
                        >
                          {t('savedGrinder.cancel')}
                        </button>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-3">
                        <p className="text-base leading-relaxed text-red-100">
                          {t('savedGrinder.deleteConfirm')}
                        </p>
                        <button
                          type="button"
                          onClick={() => void confirmDelete(item.id)}
                          className="min-h-12 rounded-lg bg-red-500 text-base font-bold text-white active:bg-red-400"
                        >
                          {t('savedGrinder.deleteConfirmButton')}
                        </button>
                        <button
                          type="button"
                          onClick={closeRowActions}
                          className="min-h-12 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
                        >
                          {t('savedGrinder.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            closeRowActions();
                            setPendingApplyId(item.id);
                          }}
                          className="min-h-12 flex-1 rounded-lg bg-slate-700 text-base font-semibold text-white active:bg-slate-600"
                        >
                          {t('savedGrinder.select')}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="min-h-12 flex-1 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
                        >
                          {t('savedGrinder.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeRowActions();
                            setConfirmingDeleteId(item.id);
                          }}
                          className="min-h-12 flex-1 rounded-lg border border-slate-600 text-base font-semibold text-slate-300 active:bg-slate-700"
                        >
                          {t('savedGrinder.delete')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-slate-700 pt-3">
        <label htmlFor={newAliasId} className="flex flex-col gap-1">
          <span className="text-base font-semibold text-slate-200">
            {t('savedGrinder.aliasLabel')}
          </span>
          <input
            id={newAliasId}
            type="text"
            value={newAlias}
            placeholder={t('savedGrinder.aliasPlaceholder')}
            onChange={(event) => {
              setNewAlias(event.target.value);
              setAliasError(false);
            }}
            className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
          />
        </label>
        {aliasError && (
          <p role="alert" className="text-sm text-red-300">
            {t('savedGrinder.aliasRequired')}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSaveCurrent()}
          className="min-h-12 rounded-lg border border-slate-600 text-base font-semibold text-slate-200 active:bg-slate-700"
        >
          {t('savedGrinder.saveCurrent')}
        </button>
      </div>
    </section>
  );
}
