import { SystemStatus } from '@/features/system-status/system-status';

const principles = [
  {
    number: '01',
    title: '출처를 먼저',
    body: '링크에서 시작해 원본의 위치와 맥락을 잃지 않습니다.',
  },
  {
    number: '02',
    title: '요약은 초안으로',
    body: 'AI가 정리하고, 사람이 검토해 지식으로 남깁니다.',
  },
  {
    number: '03',
    title: '실패해도 기록',
    body: '추출과 AI가 멈춰도 직접 쓰고 계속 저장할 수 있습니다.',
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__eyebrow reveal reveal--one">
          <span>PUBLIC KNOWLEDGE ARCHIVE</span>
          <span>VOL. 01 / 2026</span>
        </div>

        <div className="hero__composition">
          <div className="hero__copy">
            <p className="hero__kicker reveal reveal--two">읽고, 연결하고, 다시 꺼내는</p>
            <h1 id="hero-title" className="hero__title reveal reveal--three">
              기술 자료를
              <span>기억으로 바꾸는 위키.</span>
            </h1>
            <p className="hero__description reveal reveal--four">
              SourceLink Wiki는 흩어진 AI 기술 링크에 출처, 요약, 메모를 더해 오래 사용할 수 있는
              공개 지식으로 엮습니다.
            </p>
            <div className="hero__actions reveal reveal--four">
              <a className="primary-link" href="#foundation">
                설계 원칙 읽기
                <span aria-hidden="true">↘</span>
              </a>
              <a className="text-link" href="#system-status">
                시스템 상태
              </a>
            </div>
          </div>

          <aside className="hero__folio reveal reveal--three" aria-label="프로젝트 단계">
            <span className="folio__label">CURRENT EDITION</span>
            <strong>Phase 01</strong>
            <p>Foundation</p>
            <div className="folio__rule" />
            <span>Web · API · Database</span>
          </aside>
        </div>

        <div className="hero__annotation" aria-hidden="true">
          SOURCE / CONTEXT / CONNECTION
        </div>
      </section>

      <section id="foundation" className="principles" aria-labelledby="principles-title">
        <div className="section-heading">
          <span className="section-heading__index">A—01</span>
          <div>
            <p>ARCHIVE PRINCIPLES</p>
            <h2 id="principles-title">북마크보다 오래 남는 구조</h2>
          </div>
        </div>

        <div className="principles__list">
          {principles.map((principle) => (
            <article className="principle" key={principle.number}>
              <span>{principle.number}</span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="system-status" className="status-section" aria-labelledby="status-title">
        <div className="section-heading section-heading--light">
          <span className="section-heading__index">S—01</span>
          <div>
            <p>SYSTEM FOUNDATION</p>
            <h2 id="status-title">모든 연결이 준비되었는지 확인합니다.</h2>
          </div>
        </div>
        <SystemStatus />
      </section>
    </>
  );
}
