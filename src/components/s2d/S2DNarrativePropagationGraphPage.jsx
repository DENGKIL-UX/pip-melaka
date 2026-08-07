import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Btn,
  KPI,
  Panel,
  S,
  SectionHead,
  T,
} from './s2dUiKit'
import {
  S2D_PROPAGATION_NODE_TYPES,
  explainNarrativePropagationGraph,
} from '../intelligence/diagnostics/s2d-narrative-propagation-graph.js'

function todayToken() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

function downloadText(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function edgeStyle(edge = {}) {
  return edge.directEvidence === true
    ? { stroke: T.blue, strokeWidth: 2, strokeDasharray: '0' }
    : { stroke: T.teal, strokeWidth: 2, strokeDasharray: '6 4' }
}

function roleColor(role = '') {
  const token = String(role || '').toUpperCase()
  if (token === 'EARLIEST_KNOWN_SOURCE') return T.gold
  if (token === 'INFLUENCER_PICKUP') return T.purple
  if (token === 'POLITICAL_PICKUP') return T.red
  if (token === 'MEDIA_PICKUP') return T.blue
  if (token === 'COMMUNITY_PICKUP') return T.green
  return T.muted
}

function stageIndex(role = '') {
  const token = String(role || '').toUpperCase()
  if (token === 'EARLIEST_KNOWN_SOURCE') return 1
  if (token === 'EARLY_REPOST') return 2
  if (token === 'COMMUNITY_PICKUP') return 3
  if (token === 'INFLUENCER_PICKUP') return 4
  if (token === 'POLITICAL_PICKUP') return 5
  if (token === 'MEDIA_PICKUP') return 6
  return 7
}

function computeNodeLayout(nodes = [], width = 1040, height = 420) {
  const stageBuckets = new Map()
  for (const node of nodes) {
    const stage = stageIndex(node.role)
    if (!stageBuckets.has(stage)) stageBuckets.set(stage, [])
    stageBuckets.get(stage).push(node)
  }

  const positions = new Map()
  const stages = [1, 2, 3, 4, 5, 6, 7]
  const xGap = width / (stages.length + 1)

  for (const stage of stages) {
    const bucket = stageBuckets.get(stage) || []
    const yGap = height / (bucket.length + 1)
    bucket.forEach((node, index) => {
      positions.set(node.nodeId, {
        x: Math.round(xGap * stage),
        y: Math.round(yGap * (index + 1)),
      })
    })
  }

  return positions
}

function audienceNodeType(node = {}) {
  const role = String(node.role || '').toUpperCase()
  const sourceType = String(node.sourceType || '').toUpperCase()

  if (role === 'EARLIEST_KNOWN_SOURCE') return 'origin'
  if (role === 'MEDIA_PICKUP') return 'media bridge'
  if (role === 'INFLUENCER_PICKUP' || role === 'POLITICAL_PICKUP' || role === 'COMMUNITY_PICKUP' || role === 'EARLY_REPOST') return 'amplifier'
  if (sourceType.includes('ECHO') || role.includes('ECHO')) return 'echo'
  return 'unverified'
}

function GraphSvg({ graph, selectedNodeId, onSelectNode }) {
  const width = 1040
  const height = 420
  const nodes = graph?.nodes || []
  const edges = graph?.edges || []
  const positions = useMemo(() => computeNodeLayout(nodes, width, height), [nodes])

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Narrative propagation graph"
      style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.bg }}
    >
      <g>
        {edges.map((edge) => {
          const from = positions.get(edge.fromNodeId)
          const to = positions.get(edge.toNodeId)
          if (!from || !to) return null
          const style = edgeStyle(edge)
          return (
            <line
              key={edge.edgeId}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              opacity="0.9"
            />
          )
        })}
      </g>
      <g>
        {nodes.map((node) => {
          const pos = positions.get(node.nodeId)
          if (!pos) return null
          const fill = roleColor(node.role)
          const selected = selectedNodeId === node.nodeId
          return (
            <g key={node.nodeId} onClick={() => onSelectNode(node.nodeId)} style={{ cursor: 'pointer' }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={selected ? 14 : 11}
                fill={fill}
                stroke={selected ? T.text : T.borderSoft}
                strokeWidth={selected ? 2 : 1}
              />
              <text x={pos.x + 16} y={pos.y - 2} fontSize="11" fill={T.text}>{node.sourceLabel || node.evidenceId}</text>
              <text x={pos.x + 16} y={pos.y + 11} fontSize="10" fill={T.sub}>{node.role} · {node.platform} · {node.localityCode}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

const LABELS = {
  eyebrow: { en: 'Analysis', bm: 'Analisis' },
  title: { en: 'Narrative Family Tree', bm: 'Pokok Keluarga Naratif' },
  subtitle: { en: 'Narrative Propagation Graph', bm: 'Graf Penyebaran Naratif' },
  description: {
    en: 'Observed narrative relationships and propagation paths across accepted evidence.',
    bm: 'Hubungan naratif yang diperhatikan dan laluan penyebaran merentas bukti diterima.',
  },
  controls: { en: 'Controls', bm: 'Kawalan' },
  date: { en: 'Date', bm: 'Tarikh' },
  narrative: { en: 'Narrative cluster', bm: 'Kluster naratif' },
  platform: { en: 'Platform filter', bm: 'Penapis platform' },
  sourceType: { en: 'Source-type filter', bm: 'Penapis jenis sumber' },
  noNarrative: { en: 'No accepted narrative', bm: 'Tiada naratif diterima' },
  build: { en: 'Build graph', bm: 'Jana graf' },
  exportJson: { en: 'Export JSON', bm: 'Eksport JSON' },
  exportCsv: { en: 'Export CSV', bm: 'Eksport CSV' },
  boundaryTitle: { en: 'Boundary notice', bm: 'Notis sempadan' },
  boundary: {
    en: 'Relationships indicate observed content similarity, reposting, amplification or evidence links. They do not prove account ownership, coordination or personal identity.',
    bm: 'Hubungan menunjukkan persamaan kandungan, perkongsian semula, penguatan atau pautan bukti yang diperhatikan. Ia tidak membuktikan pemilikan akaun, koordinasi atau identiti peribadi.',
  },
  legend: { en: 'Node legend', bm: 'Legenda nod' },
  graph: { en: 'Graph', bm: 'Graf' },
  selectedEvidence: { en: 'Selected node evidence', bm: 'Bukti nod dipilih' },
  advanced: { en: 'Advanced details', bm: 'Butiran lanjutan' },
  rawData: { en: 'Raw data', bm: 'Data mentah' },
  emptyTitle: { en: 'No accepted graph data', bm: 'Tiada data graf diterima' },
  emptyBody: {
    en: 'Propagation graph capability is available. Accepted human-reviewed narrative evidence is required for rendering.',
    bm: 'Keupayaan graf penyebaran tersedia. Bukti naratif diterima yang disemak manusia diperlukan untuk paparan.',
  },
  edgeLegendSolid: { en: 'Solid line: direct evidence', bm: 'Garis penuh: bukti langsung' },
  edgeLegendDash: { en: 'Dashed line: inferred sequence', bm: 'Garis putus: urutan inferens' },
}

export default function S2DNarrativePropagationGraphPage({ propagationService, lang = 'EN' }) {
  const [date, setDate] = useState(todayToken())
  const [narrativeClusterId, setNarrativeClusterId] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('')
  const [availableNarratives, setAvailableNarratives] = useState([])
  const [graph, setGraph] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const isBm = String(lang).toUpperCase() === 'BM'
  const tx = (key) => {
    const pair = LABELS[key] || { en: key, bm: key }
    return {
      primary: isBm ? pair.bm : pair.en,
      secondary: isBm ? pair.en : pair.bm,
    }
  }

  async function loadNarratives() {
    if (!propagationService) return []
    const rows = await propagationService.listAvailableNarratives({ date, platformFilter, sourceTypeFilter })
    setAvailableNarratives(rows || [])
    if (!narrativeClusterId && rows.length > 0) setNarrativeClusterId(rows[0])
    return rows || []
  }

  async function buildGraph() {
    if (!propagationService) return
    setLoading(true)
    setError('')
    try {
      const narratives = await loadNarratives()
      const selected = narrativeClusterId || narratives[0] || ''
      const result = await propagationService.buildGraphForNarrative({
        date,
        narrativeClusterId: selected,
        platformFilter,
        sourceTypeFilter,
      })
      setGraph(result || null)

      const timelineResult = await propagationService.getPropagationTimeline({
        date,
        narrativeClusterId: selected,
        platformFilter,
        sourceTypeFilter,
      })
      setTimeline(timelineResult?.timeline || [])
    } catch (nextError) {
      setError(nextError?.message || 'Propagation graph build failed.')
      setGraph(null)
      setTimeline([])
      setSelectedNodeId('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buildGraph()
  }, [])

  useEffect(() => {
    const firstNodeId = graph?.nodes?.[0]?.nodeId || ''
    setSelectedNodeId((previous) => (previous && graph?.nodes?.some((node) => node.nodeId === previous) ? previous : firstNodeId))
  }, [graph])

  const noNarrative = !graph || graph.status === 'NO_ACCEPTED_NARRATIVE' || (graph.nodes || []).length === 0

  const nodeCount = graph?.nodes?.length || 0
  const edgeCount = graph?.edges?.length || 0
  const platformCount = graph?.metrics?.sourceDiversity?.platforms || 0
  const localityCount = graph?.metrics?.sourceDiversity?.localities || 0
  const selectedNode = (graph?.nodes || []).find((node) => node.nodeId === selectedNodeId) || null

  const legendTypes = useMemo(() => {
    const present = new Set((graph?.nodes || []).map((node) => audienceNodeType(node)))
    const ordered = ['origin', 'amplifier', 'media bridge', 'echo', 'unverified']
    return ordered.filter((item) => present.has(item))
  }, [graph])

  const supportedNodeTypeTokens = useMemo(() => {
    const supported = new Set(S2D_PROPAGATION_NODE_TYPES.map((value) => String(value).toUpperCase()))
    return Array.from(new Set((graph?.nodes || [])
      .map((node) => String(node.role || '').toUpperCase())
      .filter((token) => supported.has(token))))
  }, [graph])

  async function exportJson() {
    if (!propagationService) return
    const payload = await propagationService.exportGraphJson({ date, narrativeClusterId, platformFilter, sourceTypeFilter })
    downloadText(`s2d-propagation-graph-${date}.json`, payload, 'application/json;charset=utf-8')
  }

  async function exportCsv() {
    if (!propagationService) return
    const payload = await propagationService.exportGraphCsv({ date, narrativeClusterId, platformFilter, sourceTypeFilter })
    downloadText(`s2d-propagation-graph-${date}.csv`, payload, 'text/csv;charset=utf-8')
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <SectionHead
        eyebrow={`${tx('eyebrow').primary} · ${tx('eyebrow').secondary}`}
        title={`${tx('title').primary} / ${tx('subtitle').primary}`}
        sub={`${tx('description').primary} · ${tx('description').secondary}`}
        accent={T.teal}
      />

      <Panel title={`${tx('controls').primary} · ${tx('controls').secondary}`} accent={T.blue}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: T.sub, fontSize: 12 }}>{tx('date').primary}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={S.input} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: T.sub, fontSize: 12 }}>{tx('narrative').primary}</span>
            <select value={narrativeClusterId} onChange={(event) => setNarrativeClusterId(event.target.value)} style={S.input}>
              {availableNarratives.length === 0 && <option value="">{tx('noNarrative').primary}</option>}
              {availableNarratives.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: T.sub, fontSize: 12 }}>{tx('platform').primary}</span>
            <input type="text" placeholder="Optional platform" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} style={S.input} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: T.sub, fontSize: 12 }}>{tx('sourceType').primary}</span>
            <input type="text" placeholder="Optional source type" value={sourceTypeFilter} onChange={(event) => setSourceTypeFilter(event.target.value)} style={S.input} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Btn onClick={buildGraph} disabled={loading} accent={T.blue}>{loading ? 'Building...' : tx('build').primary}</Btn>
          <button type="button" onClick={exportJson}>{tx('exportJson').primary}</button>
          <button type="button" onClick={exportCsv}>{tx('exportCsv').primary}</button>
        </div>
      </Panel>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <KPI label="Nodes" value={nodeCount} accent={T.teal} />
        <KPI label="Edges" value={edgeCount} accent={T.blue} />
        <KPI label="Platforms" value={platformCount} accent={T.purple} />
        <KPI label="Localities" value={localityCount} accent={T.amber} />
      </div>

      <Panel title={`${tx('boundaryTitle').primary} · ${tx('boundaryTitle').secondary}`} accent={T.amber}>
        <div style={{ color: T.sub, lineHeight: 1.6 }}>
          The earliest known source is the earliest accepted record available to S2D, not proof of the true originator. Similarity and coordinated-posting results are descriptive indicators only.
          <br />
          <br />
          {tx('boundary').primary}
        </div>
      </Panel>

      {error ? (
        <div style={{ border: `1px solid ${T.red}55`, background: `${T.red}1a`, color: T.red, borderRadius: 12, padding: 12 }}>
          {error}
        </div>
      ) : null}

      {noNarrative ? (
        <Panel title="NO ACCEPTED NARRATIVE EVIDENCE" accent={T.amber}>
          <div style={{ color: T.sub, lineHeight: 1.55 }}>
            {tx('emptyBody').primary} · {tx('emptyBody').secondary}
          </div>
        </Panel>
      ) : (
        <>
          <Panel title={`${tx('graph').primary} · ${tx('subtitle').primary}`} accent={T.teal}>
            <GraphSvg graph={graph} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
            <div style={{ color: T.muted, fontSize: 12, marginTop: 10 }}>
              {explainNarrativePropagationGraph(graph)}
            </div>
          </Panel>

          <Panel title={`${tx('legend').primary} · ${tx('legend').secondary}`} accent={T.purple}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {legendTypes.map((type) => (
                <Badge key={type} color={T.blue}>{type}</Badge>
              ))}
              {!legendTypes.length ? <Badge color={T.muted}>unverified</Badge> : null}
            </div>
            <div style={{ display: 'grid', gap: 4, marginTop: 10, color: T.muted, fontSize: 12 }}>
              <div>{tx('edgeLegendSolid').primary}</div>
              <div>{tx('edgeLegendDash').primary}</div>
            </div>
            {supportedNodeTypeTokens.length ? (
              <div style={{ marginTop: 10, color: T.sub, fontSize: 12 }}>
                Supported node roles in current graph: {supportedNodeTypeTokens.join(', ')}
              </div>
            ) : null}
          </Panel>

          <Panel title={`${tx('selectedEvidence').primary} · ${tx('selectedEvidence').secondary}`} accent={T.green}>
            {selectedNode ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <div><strong>Evidence:</strong> {fmt(selectedNode.evidenceId)}</div>
                <div><strong>Source:</strong> {fmt(selectedNode.sourceLabel)}</div>
                <div><strong>Role:</strong> {fmt(selectedNode.role)}</div>
                <div><strong>Platform:</strong> {fmt(selectedNode.platform)}</div>
                <div><strong>Source type:</strong> {fmt(selectedNode.sourceType)}</div>
                <div><strong>Locality:</strong> {fmt(selectedNode.localityCode)}</div>
                <div><strong>Published:</strong> {fmt(selectedNode.publishedAt)}</div>
                <div><strong>Confidence:</strong> {fmt(selectedNode.evidenceConfidence)}</div>
              </div>
            ) : (
              <div style={{ color: T.muted }}>Select a node to inspect evidence details.</div>
            )}
          </Panel>

          <Panel
            title={`${tx('advanced').primary} · ${tx('advanced').secondary}`}
            accent={T.blue}
            right={
              <Btn ghost accent={T.blue} onClick={() => setShowAdvanced((value) => !value)}>
                {showAdvanced ? 'Hide' : 'Show'}
              </Btn>
            }
          >
            {showAdvanced ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ color: T.sub, fontSize: 12, fontWeight: 600 }}>Propagation timeline</div>
                <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead>
                      <tr style={{ background: `${T.blue}11` }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>#</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Source</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Role</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Platform</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Locality</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((row) => (
                        <tr key={row.nodeId}>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.sequence)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.sourceLabel)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.role)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.platform)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.localityCode)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.publishedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ color: T.sub, fontSize: 12, fontWeight: 600 }}>Platform transition times</div>
                <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                    <thead>
                      <tr style={{ background: `${T.teal}11` }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>From</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>To</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Gap minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(graph?.metrics?.timeBetweenPlatforms || []).map((row) => (
                        <tr key={`${row.fromPlatform}-${row.toPlatform}-${row.gapMinutes}`}>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.fromPlatform)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.toPlatform)}</td>
                          <td style={{ padding: 8, borderTop: `1px solid ${T.borderSoft}` }}>{fmt(row.gapMinutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </Panel>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn ghost onClick={() => setShowRaw((value) => !value)}>{tx('rawData').primary}</Btn>
      </div>

      {showRaw ? (
        <Panel title={tx('rawData').primary} accent={T.muted}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.sub }}>{JSON.stringify(graph, null, 2)}</pre>
        </Panel>
      ) : null}
    </div>
  )
}
