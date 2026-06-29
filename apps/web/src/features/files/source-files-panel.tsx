'use client';

import type { SourceFile } from '@sourcewiki/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ApiError } from '@/lib/api/api-client';
import { sourceApi, sourceKeys } from '@/features/sources/source-api';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = '.pdf,.txt,.md,.png,.jpg,.jpeg,.webp';

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function FileRow({
  file,
  canManage,
  sourceId,
}: {
  file: SourceFile;
  canManage: boolean;
  sourceId: string;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => sourceApi.removeFile(file.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.files(sourceId) });
    },
  });

  return (
    <li className="source-file-row">
      <a href={sourceApi.fileDownloadUrl(file.id)}>
        <strong>{file.originalName}</strong>
        <span>
          {formatBytes(file.sizeBytes)} ·{' '}
          {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
            new Date(file.createdAt),
          )}
        </span>
      </a>
      {canManage ? (
        <button
          type="button"
          className="file-delete-button"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm('이 파일을 삭제할까요?')) remove.mutate();
          }}
        >
          삭제
        </button>
      ) : null}
    </li>
  );
}

export function SourceFilesPanel({
  sourceId,
  canManage,
}: {
  sourceId: string;
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { data } = useQuery({
    queryKey: sourceKeys.files(sourceId),
    queryFn: () => sourceApi.files(sourceId),
    staleTime: 30_000,
  });
  const upload = useMutation({
    mutationFn: (file: File) => sourceApi.uploadFile(sourceId, file),
    onSuccess: async () => {
      setError('');
      if (inputRef.current) inputRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: sourceKeys.files(sourceId) });
    },
    onError: (value) => {
      setError(value instanceof ApiError ? value.message : '파일을 업로드하지 못했습니다.');
    },
  });

  const files = data?.data ?? [];

  return (
    <section className="source-files-section" aria-labelledby="source-files-title">
      <div className="section-title">
        <p className="kicker">ATTACHMENTS</p>
        <h2 id="source-files-title">첨부 파일 {files.length}</h2>
      </div>
      {canManage ? (
        <form
          className="file-upload-form"
          onSubmit={(event) => {
            event.preventDefault();
            const file = inputRef.current?.files?.[0];
            if (!file) {
              setError('업로드할 파일을 선택해 주세요.');
              return;
            }
            if (file.size > MAX_FILE_BYTES) {
              setError('파일은 10MB 이하로 업로드해 주세요.');
              return;
            }
            upload.mutate(file);
          }}
        >
          <input ref={inputRef} type="file" name="file" accept={ALLOWED_EXTENSIONS} />
          <button className="button button--primary" disabled={upload.isPending}>
            {upload.isPending ? '업로드 중...' : '파일 업로드'}
          </button>
        </form>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {files.length ? (
        <ul className="source-file-list">
          {files.map((file) => (
            <FileRow key={file.id} file={file} sourceId={sourceId} canManage={canManage} />
          ))}
        </ul>
      ) : (
        <p className="signin-note">아직 첨부된 파일이 없습니다.</p>
      )}
    </section>
  );
}
