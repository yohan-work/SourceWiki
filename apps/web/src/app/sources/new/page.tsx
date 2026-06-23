import { SourceForm } from '@/features/sources/source-form';
export default function NewSourcePage() {
  return (
    <div className="editor-page page-shell">
      <header>
        <p className="kicker">NEW SOURCE</p>
        <h1>
          읽은 것을
          <br />
          기록으로 바꾸세요.
        </h1>
        <p>URL과 제목만으로 시작하고, 필요한 맥락은 천천히 더할 수 있습니다.</p>
      </header>
      <SourceForm />
    </div>
  );
}
