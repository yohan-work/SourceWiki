import { SourceForm } from '@/features/sources/source-form';
export default async function EditSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="editor-page page-shell">
      <header>
        <p className="kicker">EDIT ARCHIVE</p>
        <h1>
          자료의 맥락을
          <br />더 선명하게.
        </h1>
        <p>요약, 핵심 포인트와 메모를 다듬어 다시 찾기 좋은 지식으로 만드세요.</p>
      </header>
      <SourceForm id={id} />
    </div>
  );
}
