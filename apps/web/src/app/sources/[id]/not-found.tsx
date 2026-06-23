import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="result-page">
      <div className="verify-result verify-result--error">
        <span className="verify-result__mark">!</span>
        <h1>자료를 찾을 수 없어요</h1>
        <p>삭제되었거나 잘못된 주소입니다.</p>
        <Link className="button button--primary" href="/sources">
          자료 목록으로
        </Link>
      </div>
    </div>
  );
}
