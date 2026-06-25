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
type GraphNodeTone = 'article' | 'docs' | 'paper' | 'github' | 'other';

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

function edgePath(edge: PositionedEdge, index: number) {
  const dx = edge.target.x - edge.source.x;
  const dy = edge.target.y - edge.source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const curve = Math.min(68, Math.max(24, distance * 0.16)) * (index % 2 === 0 ? 1 : -1);
  const midpointX = (edge.source.x + edge.target.x) / 2;
  const midpointY = (edge.source.y + edge.target.y) / 2;
  const controlX = midpointX + (-dy / distance) * curve;
  const controlY = midpointY + (dx / distance) * curve;
  return `M ${edge.source.x} ${edge.source.y} Q ${controlX} ${controlY} ${edge.target.x} ${edge.target.y}`;
}

function nodeTone(sourceType: GraphNodeTone) {
  return `graph-node--${sourceType}`;
}

export function SourceGraphSection({ graph }: { graph: GraphData | null }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const layout = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    const positions = new Map(
      nodes.map((node, index) => [
        node.id,
        { ...node, ...nodePosition(node.id, index, nodes.length, node.weight) },
      ]),
    );
    return {
      nodes: Array.from(positions.values()),
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
  const activeNeighborIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    return new Set(
      layout.edges.flatMap((edge) => {
        if (edge.sourceId === activeId) return [edge.targetId];
        if (edge.targetId === activeId) return [edge.sourceId];
        return [];
      }),
    );
  }, [activeId, layout.edges]);
  const selectedTagNodeCount = selectedTag
    ? layout.nodes.filter((node) => node.tags.includes(selectedTag)).length
    : 0;
  const inspectorTitle =
    activeNode?.title ?? (selectedTag ? `${selectedTag} 태그 자료` : '연결된 자료를 탐색해 보세요');
  const inspectorMeta = activeNode
    ? `${activeNode.sourceDomain} · ${activeNode.tags.slice(0, 3).join(', ')}`
    : selectedTag
      ? `${selectedTagNodeCount}개 자료 · 관련 연결 강조`
      : `${layout.nodes.length}개 자료 · ${layout.edges.length}개 연결`;

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
            <button
              key={tag.name}
              type="button"
              className={selectedTag === tag.name ? 'is-active' : undefined}
              aria-pressed={selectedTag === tag.name}
              onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
            >
              {tag.name} <small>{tag.count}</small>
            </button>
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
                {layout.edges.map((edge, index) => {
                  const mutedByActive =
                    activeId && edge.sourceId !== activeId && edge.targetId !== activeId;
                  const mutedByTag = selectedTag && !edge.sharedTags.includes(selectedTag);
                  const highlightedByTag = selectedTag && edge.sharedTags.includes(selectedTag);
                  return (
                    <path
                      key={`${edge.sourceId}-${edge.targetId}`}
                      d={edgePath(edge, index)}
                      className={
                        mutedByActive || mutedByTag
                          ? 'is-muted'
                          : highlightedByTag
                            ? 'is-tagged'
                            : undefined
                      }
                      strokeWidth={Math.min(3, 0.8 + edge.weight * 0.45)}
                    />
                  );
                })}
              </g>
              <g className="graph-nodes">
                {layout.nodes.map((node) => {
                  const active = activeId === node.id;
                  const connectedToActive = activeId ? activeNeighborIds.has(node.id) : false;
                  const tagged = selectedTag ? node.tags.includes(selectedTag) : false;
                  const muted =
                    (activeId && activeId !== node.id && !connectedToActive) ||
                    (selectedTag && !tagged);
                  const labelVisible =
                    active || connectedToActive || tagged || (!activeId && !selectedTag);
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
                        className={[
                          nodeTone(node.sourceType),
                          active ? 'is-active' : '',
                          tagged ? 'is-tagged' : '',
                          muted ? 'is-muted' : '',
                        ].join(' ')}
                      />
                      <text
                        x={node.x + radius + 8}
                        y={node.y + 4}
                        className={labelVisible ? 'is-visible' : undefined}
                      >
                        {node.title.length > 28 ? `${node.title.slice(0, 28)}...` : node.title}
                      </text>
                    </Link>
                  );
                })}
              </g>
            </svg>
            <div className="graph-inspector">
              <strong>{inspectorTitle}</strong>
              <span>{inspectorMeta}</span>
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
