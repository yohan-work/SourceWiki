import { SystemStatus } from '@/features/system-status/system-status';

const principles = [
  {
    title: '링크 저장',
    body: '읽고 싶은 기술 자료의 URL과 출처를 한곳에 저장해요.',
  },
  {
    title: '내용 정리',
    body: '본문을 가져오고 AI 요약 초안을 직접 검토해 정리해요.',
  },
  {
    title: '지식 축적',
    body: '메모와 태그를 더해 다시 찾기 쉬운 지식으로 쌓아가요.',
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="hero__eyebrow">AI KNOWLEDGE ARCHIVE</p>
          <h1 id="hero-title">
            기술 링크를
            <br />내 지식으로 정리하세요.
          </h1>
          <p className="hero__description">
            흩어진 기술 자료를 링크부터 요약, 메모까지
            <br className="desktop-break" /> 한곳에서 간단하게 관리해요.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#how-it-works">
              서비스 살펴보기
            </a>
            <a className="button button--text" href="#system-status">
              개발 상태 보기
            </a>
          </div>
        </div>

        <div className="archive-visual" aria-label="자료 정리 화면 예시">
          <div className="archive-preview">
            <div className="archive-preview__toolbar">
              <span />
              <span>sourcewiki.dev</span>
            </div>
            <div className="archive-preview__content">
              <span className="archive-preview__label">NEW SOURCE</span>
              <h2>Building reliable AI agents</h2>
              <p>AI 에이전트의 구조와 안정적인 실행 흐름을 정리한 기술 자료</p>
              <div className="archive-preview__tags">
                <span>Agent</span>
                <span>LLM</span>
                <span>Architecture</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="features" aria-labelledby="features-title">
        <div className="section-heading">
          <p>SourceLink Wiki</p>
          <h2 id="features-title">링크 하나로 시작해요</h2>
          <span>자료를 저장하고 정리하는 데 필요한 기능만 담았습니다.</span>
        </div>

        <div className="feature-list">
          {principles.map((feature, index) => (
            <article className="feature" key={feature.title}>
              <span className="feature__number">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="system-status" className="status-section" aria-labelledby="status-title">
        <div className="status-section__heading">
          <p>DEVELOPMENT STATUS</p>
          <h2 id="status-title">서비스 기반을 만들고 있어요</h2>
          <span>현재 Web, API, Database 연결 상태를 확인할 수 있습니다.</span>
        </div>
        <SystemStatus />
      </section>
    </>
  );
}
