'use client';

import type { SourceGraphResponse } from '@sourcewiki/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type GraphData = SourceGraphResponse['data'];
type PositionedNode = GraphData['nodes'][number] & { x: number; y: number };
type PositionedEdge = GraphData['edges'][number] & {
  source: PositionedNode;
  target: PositionedNode;
};

const WIDTH = 960;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

function nodePosition(id: string, index: number, total: number, weight: number) {
  const ring = index % 3;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + (hash(id) % 100) / 100;
  const radius = 80 + ring * 74 + Math.min(weight, 8) * 5;
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius * 0.72,
  };
}

function isPositionedEdge(edge: PositionedEdge | null): edge is PositionedEdge {
  return edge !== null;
}

export function SourceGraphSection({ graph }: { graph: GraphData | null }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const layout = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    const positions = new Map(
      nodes.map((node, index) => [
        node.id,
        { ...node, ...nodePosition(node.id, index, nodes.length, node.weight) },
      ]),
    );
    return {
      nodes: [...positions.values()],
      edges: (graph?.edges ?? [])
        .map((edge) => {
          const source = positions.get(edge.sourceId);
          const target = positions.get(edge.targetId);
          return source && target ? { ...edge, source, target } : null;
        })
        .filter(isPositionedEdge),
    };
  }, [graph]);

  const activeNode = layout.nodes.find((node) => node.id === activeId);
  const hasGraph = layout.nodes.length >= 2 && layout.edges.length > 0;

  return (
    <section className="knowledge-graph-section" aria-labelledby="knowledge-graph-title">
      <div className="knowledge-graph-copy">
        <p className="kicker">KNOWLEDGE GRAPH</p>
        <h2 id="knowledge-graph-title">
          태그가 겹치면
          <br />
          자료가 연결됩니다
        </h2>
        <p>
          저장된 자료의 태그를 바탕으로 서로 가까운 글을 자동으로 묶어 보여줍니다. 자료가 쌓일수록
          아카이브는 탐색 가능한 지도에 가까워집니다.
        </p>
        <div className="graph-tags" aria-label="연결이 많은 태그">
          {(graph?.tags ?? []).slice(0, 6).map((tag) => (
            <span key={tag.name}>
              {tag.name} <small>{tag.count}</small>
            </span>
          ))}
        </div>
        <Link className="button button--primary" href="/sources">
          전체 자료 보기
        </Link>
      </div>
      <div className="knowledge-graph-visual">
        {hasGraph ? (
          <>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label="자료 연결 그래프 미리보기"
            >
              <defs>
                <radialGradient id="graphNodeGlow">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#b8c1cc" />
                </radialGradient>
              </defs>
              <g className="graph-edges">
                {layout.edges.map((edge) => (
                  <line
                    key={`${edge.sourceId}-${edge.targetId}`}
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    className={
                      activeId && edge.sourceId !== activeId && edge.targetId !== activeId
                        ? 'is-muted'
                        : undefined
                    }
                    strokeWidth={Math.min(3, 0.8 + edge.weight * 0.45)}
                  />
                ))}
              </g>
              <g className="graph-nodes">
                {layout.nodes.map((node) => {
                  const active = activeId === node.id;
                  const muted =
                    activeId &&
                    activeId !== node.id &&
                    !layout.edges.some(
                      (edge) =>
                        (edge.sourceId === activeId && edge.targetId === node.id) ||
                        (edge.targetId === activeId && edge.sourceId === node.id),
                    );
                  const radius = Math.min(28, 8 + node.weight * 2.2);
                  return (
                    <Link
                      key={node.id}
                      href={`/sources/${node.id}`}
                      onMouseEnter={() => setActiveId(node.id)}
                      onFocus={() => setActiveId(node.id)}
                      onMouseLeave={() => setActiveId(null)}
                      onBlur={() => setActiveId(null)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        className={`${active ? 'is-active' : ''} ${muted ? 'is-muted' : ''}`}
                      />
                      <text x={node.x + radius + 8} y={node.y + 4}>
                        {node.title.length > 28 ? `${node.title.slice(0, 28)}...` : node.title}
                      </text>
                    </Link>
                  );
                })}
              </g>
            </svg>
            <div className="graph-inspector">
              <strong>{activeNode?.title ?? '연결된 자료를 탐색해 보세요'}</strong>
              <span>
                {activeNode
                  ? `${activeNode.sourceDomain} · ${activeNode.tags.slice(0, 3).join(', ')}`
                  : `${layout.nodes.length}개 자료 · ${layout.edges.length}개 연결`}
              </span>
            </div>
          </>
        ) : (
          <div className="graph-empty">
            <strong>연결할 자료가 더 필요합니다.</strong>
            <p>같은 태그를 가진 자료가 2개 이상 쌓이면 그래프가 만들어집니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
