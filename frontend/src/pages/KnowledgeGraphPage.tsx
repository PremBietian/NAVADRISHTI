
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import {
  ArrowRight,
  Info,
  Maximize2,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { graphNodeTypes } from '../components/GraphNodes';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { cerberusApi } from '../services/api';

function KnowledgeGraphWorkspace() {
  const navigate = useNavigate();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'evidence' | 'entity' | 'claim'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadGraph() {
      try {
        setLoading(true);
        setError('');

        const response = await cerberusApi.getResults();

        const graphNodes: Node[] = [];
        const graphEdges: Edge[] = [];
        const entityMap = new Map<string, string>();
        const entityCounts = new Map<string, number>();
        const entityDetails = new Map<string, any>();

        const records = response.records || [];

        // Count matching entity records across evidence.
        records.forEach((record: any) => {
          (record.entities || []).forEach((entity: any) => {
            const key = entity.normalized_name || entity.name?.toLowerCase();
            if (!key) return;

            entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
            entityDetails.set(key, entity);
          });
        });

        // Create one evidence node per uploaded file.
        records.forEach((record: any, index: number) => {
          const evidenceId = `evidence-${record.evidence_id}`;
          const filename =
            record.metadata?.original_filename || record.source_name || 'Evidence file';

          const modality =
            record.modality === 'XLSX'
              ? 'Excel'
              : record.modality === 'IMAGE'
              ? 'Image'
              : 'PDF';

          graphNodes.push({
            id: evidenceId,
            type: 'evidenceNode',
            position: { x: 0, y: index * 190 },
            data: {
              nodeType: 'evidence',
              label: filename,
              sublabel: record.evidence_id,
              modality,
              source: filename,
              description: `SHA-256 integrity status: ${record.verification_status || 'Unknown'}`,
            },
          } as Node);

          // Connect evidence to its extracted entity.
          (record.entities || []).forEach((entity: any) => {
            const key = entity.normalized_name || entity.name?.toLowerCase();
            if (!key) return;

            const entityNodeId = `entity-${key.replace(/[^a-z0-9]/g, '-')}`;
            entityMap.set(entity.entity_id, entityNodeId);

            if (!graphNodes.some((node) => node.id === entityNodeId)) {
              const entityInfo = entityDetails.get(key);

              graphNodes.push({
                id: entityNodeId,
                type: 'entityNode',
                position: { x: 380, y: 0 },
                data: {
                  nodeType: 'entity',
                  label: entityInfo?.name || entity.name,
                  sublabel: entityInfo?.entity_type || 'Extracted entity',
                  sourceEntityRecords: entityCounts.get(key) || 1,
                  conflictsDetected: 0,
                  description:
                    'Matched using normalized entity information. Identity is not independently verified.',
                  claim: 'See connected extracted claims',
                },
              } as Node);
            }

            graphEdges.push({
              id: `edge-${evidenceId}-${entityNodeId}`,
              source: evidenceId,
              target: entityNodeId,
              label: 'MENTIONS',
              animated: true,
              style: { stroke: '#A6FF78' },
            } as Edge);
          });

          // Create separate claim nodes and connect them to entities.
          (record.claims || []).forEach((claim: any, claimIndex: number) => {
            const claimId = `claim-${claim.claim_id}`;
            const entityNodeId = entityMap.get(claim.subject_entity_id);

            graphNodes.push({
              id: claimId,
              type: 'claimNode',
              position: {
                x: 780,
                y: index * 190 + claimIndex * 100,
              },
              data: {
                nodeType: 'claim',
                label: `${claim.predicate}: ${claim.object}`,
                sublabel: `${claim.verification_status || 'UNVERIFIED'} · ${claim.claim_id}`,
                claim: `${claim.subject} — ${claim.predicate} = ${claim.object}`,
                source: filename,
                description: `Extracted from ${filename}. Polarity: ${claim.polarity || 'Unknown'}.`,
                conflictStatus: 'Claim not independently verified',
              },
            } as Node);

            if (entityNodeId) {
              graphEdges.push({
                id: `edge-${entityNodeId}-${claimId}`,
                source: entityNodeId,
                target: claimId,
                label: 'ASSERTS',
                animated: true,
                style: { stroke: '#F59E0B' },
              } as Edge);
            }
          });
        });

        // Arrange matching entity nodes in the centre column.
        const entityNodes = graphNodes.filter((node) => node.type === 'entityNode');
        entityNodes.forEach((node, index) => {
          node.position = { x: 380, y: index * 240 + 80 };
        });

        // Arrange evidence and claim nodes around their relationships.
        graphNodes
          .filter((node) => node.type === 'evidenceNode')
          .forEach((node, index) => {
            node.position = { x: 0, y: index * 190 };
          });

        graphNodes
          .filter((node) => node.type === 'claimNode')
          .forEach((node, index) => {
            node.position = { x: 780, y: index * 190 };
          });

        if (active) {
          setNodes(graphNodes);
          setEdges(graphEdges);

          const firstEntity = entityNodes[0]?.id;
          setSelectedNodeId(firstEntity || graphNodes[0]?.id || null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load graph data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [setNodes, setEdges]);

  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    const nSet = new Set<string>();
    const eSet = new Set<string>();

    if (selectedNodeId) {
      nSet.add(selectedNodeId);
      edges.forEach((edge) => {
        if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
          eSet.add(edge.id);
          nSet.add(edge.source);
          nSet.add(edge.target);
        }
      });
    }

    return { connectedNodeIds: nSet, connectedEdgeIds: eSet };
  }, [edges, selectedNodeId]);

  const trimmedSearch = searchTerm.trim().toLowerCase();

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => {
        const data = node.data as any;
        const matchesType = typeFilter === 'all' || data.nodeType === typeFilter;
        const matchesSearch =
          !trimmedSearch ||
          String(data.label).toLowerCase().includes(trimmedSearch) ||
          String(data.sublabel || '').toLowerCase().includes(trimmedSearch);

        return {
          ...node,
          data: {
            ...data,
            highlighted: node.id === selectedNodeId,
            dimmed:
              !(matchesType && matchesSearch) ||
              (!!selectedNodeId && !connectedNodeIds.has(node.id)),
          },
        };
      }),
    [nodes, typeFilter, trimmedSearch, selectedNodeId, connectedNodeIds]
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: !selectedNodeId || connectedEdgeIds.has(edge.id),
        style: {
          ...edge.style,
          opacity: !selectedNodeId || connectedEdgeIds.has(edge.id) ? 1 : 0.15,
          strokeWidth: connectedEdgeIds.has(edge.id) ? 2.4 : 1.5,
        },
      })),
    [edges, selectedNodeId, connectedEdgeIds]
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleReset = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setSelectedNodeId(null);
    fitView({ duration: 300, padding: 0.22 });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl">
            Knowledge Graph
          </h1>
          <p className="mt-1 text-sm text-[#9AA69E]">
            Live relationships between uploaded evidence, extracted entities and claims.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#60A5FA]">■ Evidence</span>
          <span className="text-[#A6FF78]">■ Entity</span>
          <span className="text-amber-400">■ Claims</span>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#26342C] bg-[#0D110F] px-4 py-3 text-xs text-[#9AA69E]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#A6FF78]" />
        <p>
          <strong className="text-[#F5F7F5]">Live backend graph:</strong>{' '}
          Nodes represent extracted records. Connections show source relationships,
          not proof that an identity or claim is true.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-[#A6FF78]">Loading live graph data...</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
          <button className="ml-3 underline" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#222E27] bg-[#121916] p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9AA69E]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search graph nodes..."
                  className="w-52 rounded-lg border border-[#222E27] bg-[#0D110F] py-1.5 pl-8 pr-3 text-xs text-[#F5F7F5]"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#222E27] bg-[#0D110F] p-1">
                {(['all', 'evidence', 'entity', 'claim'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                      typeFilter === key
                        ? 'bg-[#18211C] text-[#A6FF78]'
                        : 'text-[#9AA69E]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => zoomIn()}>
                <ZoomIn className="h-3.5 w-3.5" /> Zoom In
              </Button>
              <Button variant="secondary" size="sm" onClick={() => zoomOut()}>
                <ZoomOut className="h-3.5 w-3.5" /> Zoom Out
              </Button>
              <Button variant="secondary" size="sm" onClick={() => fitView({ padding: 0.2 })}>
                <Maximize2 className="h-3.5 w-3.5" /> Fit View
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8 xl:col-span-9 h-[560px] lg:h-[640px] rounded-xl border border-[#222E27] bg-[#0D110F] overflow-hidden">
              <ReactFlow
                nodes={styledNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={() => setSelectedNodeId(null)}
                nodeTypes={graphNodeTypes}
                fitView
                fitViewOptions={{ padding: 0.22 }}
                minZoom={0.4}
                maxZoom={1.8}
              >
                <Background color="#1D2822" gap={22} size={1} />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeStrokeWidth={2}
                  nodeColor={(node) =>
                    node.type === 'evidenceNode'
                      ? '#60A5FA'
                      : node.type === 'entityNode'
                      ? '#A6FF78'
                      : '#F59E0B'
                  }
                  maskColor="rgba(7, 9, 8, 0.72)"
                />
              </ReactFlow>
            </div>

            <Card className="lg:col-span-4 xl:col-span-3 p-5 flex flex-col justify-between gap-5">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase text-[#A6FF78]">
                        {(selectedNode.data as any).nodeType} Node
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-[#F5F7F5]">
                        {(selectedNode.data as any).label}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedNodeId(null)} aria-label="Clear selection">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-3.5 space-y-2 text-xs">
                    <p className="font-mono text-[#9AA69E]">
                      {(selectedNode.data as any).sublabel}
                    </p>
                    {(selectedNode.data as any).source && (
                      <p className="text-[#F5F7F5]">
                        Source: {(selectedNode.data as any).source}
                      </p>
                    )}
                    {(selectedNode.data as any).description && (
                      <p className="leading-relaxed text-[#9AA69E]">
                        {(selectedNode.data as any).description}
                      </p>
                    )}
                    {(selectedNode.data as any).conflictStatus && (
                      <p className="text-amber-300">
                        {(selectedNode.data as any).conflictStatus}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#9AA69E]">Connected Nodes</p>
                    {edges
                      .filter(
                        (edge) =>
                          edge.source === selectedNode.id || edge.target === selectedNode.id
                      )
                      .map((edge) => {
                        const otherId =
                          edge.source === selectedNode.id ? edge.target : edge.source;
                        const otherNode = nodes.find((node) => node.id === otherId);

                        return (
                          <button
                            key={edge.id}
                            onClick={() => setSelectedNodeId(otherId)}
                            className="w-full flex items-center justify-between rounded-lg border border-[#222E27] bg-[#0D110F] px-3 py-2 text-left text-xs text-[#F5F7F5]"
                          >
                            <span className="truncate">{(otherNode?.data as any)?.label}</span>
                            <span className="ml-2 text-[#9AA69E]">{String(edge.label)}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[#9AA69E]">
                  Select a node to inspect its relationships.
                </p>
              )}

              <div className="border-t border-[#222E27] pt-4 space-y-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/evidence')}
                >
                  Open Evidence & Conflicts
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/investigation')}
                >
                  Inspect in AI Investigation
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function KnowledgeGraphPage() {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphWorkspace />
    </ReactFlowProvider>
  );
}
