import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Badge,
  Btn,
  DunHeatTile,
  KPI,
  Panel,
  S,
  ScoreBar,
  SectionHead,
  T,
} from './s2dUiKit'

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

function todayToken() {
  return new Date().toISOString().slice(0, 10)
}

function weekAgoToken() {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - 6)
  return now.toISOString().slice(0, 10)
}

function num(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function fmtInt(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—'
}

function fmtPct(value) {
  if (!Number.isFinite(Number(value))) return '—'
  return `${Math.round(Number(value))}%`
}

function exportBlob(content, type, filename) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

const LABELS = {
  eyebrow: { en: 'Reporting · Pelaporan', bm: 'Pelaporan · Reporting' },
  title: { en: 'Constituency Intelligence', bm: 'Risikan Kawasan' },
  sub: {
    en: 'Aggregate public-signal picture per constituency · Gambaran isyarat awam mengikut kawasan',
    bm: 'Gambaran isyarat awam mengikut kawasan · Aggregate public-signal picture per constituency',
  },
  level: { en: 'Constituency level', bm: 'Tahap kawasan' },
  constituency: { en: 'Constituency', bm: 'Kawasan' },
  startDate: { en: 'Start date', bm: 'Tarikh mula' },
  endDate: { en: 'End date', bm: 'Tarikh akhir' },
  selectConstituency: { en: 'Select constituency', bm: 'Pilih kawasan' },
  generate: { en: 'Generate', bm: 'Jana' },
  refresh: { en: 'Refresh', bm: 'Muat semula' },
  exportJson: { en: 'Export JSON', bm: 'Eksport JSON' },
  exportMd: { en: 'Export Markdown', bm: 'Eksport Markdown' },
  exportReportCsv: { en: 'Export Report CSV', bm: 'Eksport CSV Laporan' },
  exportEvidenceCsv: { en: 'Export Evidence CSV', bm: 'Eksport CSV Bukti' },
  pipPanel: { en: 'PIP population context · Konteks populasi PIP', bm: 'Konteks populasi PIP · PIP population context' },
  pipTools: { en: 'PIP context tools', bm: 'Alat konteks PIP' },
  pipImportHint: { en: 'Paste aggregate PIP constituency JSON here.', bm: 'Tampal JSON agregat PIP kawasan di sini.' },
  importPip: { en: 'Import PIP context', bm: 'Import konteks PIP' },
  clearPip: { en: 'Clear context', bm: 'Kosongkan konteks' },
  pipNotConnected: { en: 'PIP population context: not connected', bm: 'Konteks populasi PIP: tidak disambung' },
  pipNotConnectedBody: {
    en: 'Import a valid aggregate PIP constituency JSON to display population context. S2D public-signal reporting remains available independently.',
    bm: 'Import JSON agregat PIP kawasan yang sah untuk paparan konteks populasi. Pelaporan isyarat awam S2D kekal tersedia secara berasingan.',
  },
  trendPanel: { en: 'Sentiment trend · Tren sentimen', bm: 'Tren sentimen · Sentiment trend' },
  insufficientTrend: { en: 'Insufficient trend history · Sejarah tren tidak mencukupi', bm: 'Sejarah tren tidak mencukupi · Insufficient trend history' },
  leadingIssues: { en: 'Leading issues', bm: 'Isu utama' },
  locality: { en: 'Locality concentration', bm: 'Kepekatan lokaliti' },
  noLocality: { en: 'No locality concentration rows', bm: 'Tiada baris kepekatan lokaliti' },
  narrativeClusters: { en: 'Narrative clusters', bm: 'Kelompok naratif' },
  sourceEcosystem: { en: 'Source ecosystem', bm: 'Ekosistem sumber' },
  evidenceConfidence: { en: 'Evidence confidence', bm: 'Keyakinan bukti' },
  emergingRisk: { en: 'Emerging-risk forecasts', bm: 'Jangkaan risiko muncul' },
  recommendedActions: { en: 'Recommended actions', bm: 'Tindakan disyorkan' },
  rawData: { en: 'Raw data', bm: 'Data mentah' },
  noAcceptedData: { en: 'No accepted data', bm: 'Tiada data diterima' },
  emptyLine: { en: 'Tiada data diterima · No accepted data', bm: 'Tiada data diterima · No accepted data' },
  govAggregate: { en: 'AGGREGATE CONSTITUENCY INTELLIGENCE ONLY', bm: 'AGREGAT RISIKAN KAWASAN SAHAJA' },
  govLayer: { en: 'PIP AND S2D LAYERS REMAIN SEPARATE', bm: 'LAPISAN PIP DAN S2D KEKAL BERASINGAN' },
  govHuman: { en: 'Human review required', bm: 'Semakan manusia diperlukan' },
}

export default function S2DConstituencyIntelligenceReportPage({ service, lang = 'EN' }) {
  const [level, setLevel] = React.useState('DUN')
  const [startDate, setStartDate] = React.useState(weekAgoToken())
  const [endDate, setEndDate] = React.useState(todayToken())
  const [constituencies, setConstituencies] = React.useState([])
  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState(null)
  const [pipContext, setPipContext] = React.useState(null)
  const [showRaw, setShowRaw] = React.useState(false)
  const [showPipTools, setShowPipTools] = React.useState(false)
  const [pipText, setPipText] = React.useState('')

  const isBm = String(lang).toUpperCase() === 'BM'
  const tx = React.useCallback((key) => {
    const pair = LABELS[key] || { en: key, bm: key }
    return isBm ? pair.bm : pair.en
  }, [isBm])

  const loadConstituencies = React.useCallback(async () => {
    if (!service) return
    try {
      const rows = await service.listAvailableConstituencies({ level, startDate, endDate })
      setConstituencies(rows)
      if (rows.length && !code) setCode(rows[0].code)
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load constituencies.')
    }
  }, [service, level, startDate, endDate, code])

  React.useEffect(() => {
    loadConstituencies()
  }, [loadConstituencies])

  const loadReport = React.useCallback(async (refresh = false) => {
    if (!service || !code) return
    setLoading(true)
    setError('')
    try {
      const payload = { level, code, startDate, endDate }
      const generated = refresh
        ? await service.refreshConstituencyReport(payload)
        : await service.generateConstituencyReport(payload)
      const currentPip = await service.getPipAggregateContext({ level, code })
      setResult(generated || null)
      setPipContext(currentPip || null)
    } catch (loadError) {
      setError(loadError?.message || 'Failed to generate constituency intelligence report.')
    } finally {
      setLoading(false)
    }
  }, [service, level, code, startDate, endDate])

  React.useEffect(() => {
    if (code) loadReport(false)
  }, [code, loadReport])

  const onImportPipContext = async () => {
    if (!service || !pipText.trim()) return
    setLoading(true)
    setError('')
    try {
      const imported = await service.importPipAggregateContext(pipText)
      if (!imported.validation.valid) {
        throw new Error(imported.validation.failures.join('; ') || imported.validation.status)
      }
      const importedCode = imported.context?.constituency?.code || code
      const currentPip = await service.getPipAggregateContext({ level, code: importedCode })
      setCode(importedCode)
      setPipContext(currentPip || null)
      setPipText('')
    } catch (importError) {
      setError(importError?.message || 'Failed to import PIP aggregate JSON.')
    } finally {
      setLoading(false)
    }
  }

  const onClearPip = async () => {
    if (!service || !code) return
    setLoading(true)
    setError('')
    try {
      const cleared = await service.clearPipAggregateContext({ level, code })
      setPipContext(cleared)
    } catch (clearError) {
      setError(clearError?.message || 'Failed to clear PIP context.')
    } finally {
      setLoading(false)
    }
  }

  async function onExport(loader, kind) {
    if (!service || !code) return
    setLoading(true)
    setError('')
    try {
      const payload = await loader({ level, code, startDate, endDate })
      if (kind === 'json') {
        exportBlob(pretty(payload), 'application/json', `s2d-constituency-${code}-${startDate}.json`)
      } else if (kind === 'md') {
        exportBlob(String(payload || ''), 'text/markdown', `s2d-constituency-${code}-${startDate}.md`)
      } else {
        exportBlob(String(payload || ''), 'text/csv', `s2d-constituency-${code}-${startDate}.csv`)
      }
    } catch (exportError) {
      setError(exportError?.message || 'Export failed.')
    } finally {
      setLoading(false)
    }
  }

  const report = result?.report || null
  const noAcceptedData = !report || report?.s2dPublicSignalContext?.status === 'NO_ACCEPTED_DATA'
  const trendRows = Array.isArray(report?.sentimentTrend) ? report.sentimentTrend : []
  const trendData = trendRows.map((row) => ({
    ...row,
    positivePct: num(row.positiveShare, 0) * 100,
    neutralPct: num(row.neutralShare, 0) * 100,
    negativePct: num(row.negativeShare, 0) * 100,
    netSentimentPct: Number.isFinite(Number(row.netSentiment)) ? num(row.netSentiment, 0) * 100 : null,
  }))
  const leadingIssues = Array.isArray(report?.leadingIssues) ? report.leadingIssues : []
  const maxIssueCount = Math.max(1, ...leadingIssues.map((row) => num(row.acceptedEvidenceCount, 0)))
  const localityRows = Array.isArray(report?.localityConcentration) ? report.localityConcentration : []
  const sourceRows = Array.isArray(report?.sourceEcosystem) ? report.sourceEcosystem : []
  const narratives = Array.isArray(report?.narrativeClusters) ? report.narrativeClusters : []
  const riskRows = Array.isArray(report?.emergingRiskForecasts) ? report.emergingRiskForecasts : []
  const actionRows = Array.isArray(report?.recommendedActions) ? report.recommendedActions : []

  const governanceChips = [
    { text: tx('govAggregate'), color: T.muted },
    { text: tx('govLayer'), color: T.blue },
    { text: tx('govHuman'), color: T.amber },
  ]

  const pipConnected = pipContext?.status === 'CONNECTED'
  const pipData = pipContext?.populationContext || null

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <SectionHead eyebrow={tx('eyebrow')} title={tx('title')} sub={tx('sub')} accent={T.blue} />

      <div style={{ ...S.card, padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, color: T.sub }}>{tx('level')}</span>
            <select value={level} onChange={(event) => { setLevel(event.target.value); setCode('') }} style={S.input}>
              <option value="PARLIAMENT">Parliament</option>
              <option value="DUN">DUN</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, color: T.sub }}>{tx('constituency')}</span>
            <select value={code} onChange={(event) => setCode(event.target.value)} style={S.input}>
              <option value="">{tx('selectConstituency')}</option>
              {constituencies.map((row) => (
                <option key={`${row.level}:${row.code}`} value={row.code}>{`${row.code} - ${row.name}`}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, color: T.sub }}>{tx('startDate')}</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={S.input} />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12, color: T.sub }}>{tx('endDate')}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={S.input} />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Btn onClick={() => loadReport(false)} disabled={loading || !code} accent={T.blue}>{tx('generate')}</Btn>
          <Btn onClick={() => loadReport(true)} disabled={loading || !code} ghost accent={T.blue}>{tx('refresh')}</Btn>
          <Btn onClick={() => onExport((args) => service.exportReportJson(args), 'json')} disabled={loading || !code} ghost>{tx('exportJson')}</Btn>
          <Btn onClick={() => onExport((args) => service.exportReportMarkdown(args), 'md')} disabled={loading || !code} ghost>{tx('exportMd')}</Btn>
          <Btn onClick={() => onExport((args) => service.exportReportCsv(args), 'csv')} disabled={loading || !code} ghost>{tx('exportReportCsv')}</Btn>
          <Btn onClick={() => onExport((args) => service.exportEvidenceCsv(args), 'csv')} disabled={loading || !code} ghost>{tx('exportEvidenceCsv')}</Btn>
        </div>
      </div>

      {error ? (
        <div style={{ border: `1px solid ${T.red}55`, borderRadius: 12, background: `${T.red}1a`, color: T.red, padding: 12 }}>
          {error}
        </div>
      ) : null}

      <Panel
        title={tx('pipPanel')}
        accent={T.purple}
        right={<Btn ghost accent={T.purple} onClick={() => setShowPipTools((v) => !v)}>{tx('pipTools')}</Btn>}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {governanceChips.map((chip) => <Badge key={chip.text} color={chip.color}>{chip.text}</Badge>)}
        </div>

        {pipConnected && pipData ? (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <KPI label="Population" value={fmtInt(pipData.populationTotal)} accent={T.purple} />
            <KPI label="Registered voters" value={fmtInt(pipData.registeredVoterCount)} accent={T.blue} />
            <KPI label="Households" value={fmtInt(pipData.householdCount)} accent={T.teal} />
            <KPI label="Median age" value={fmtInt(pipData.medianAge)} accent={T.amber} />
          </div>
        ) : (
          <div style={{ ...S.card, padding: 12, color: T.muted }}>
            <div style={{ color: T.sub, fontWeight: 600, marginBottom: 4 }}>{tx('pipNotConnected')}</div>
            <div>{tx('pipNotConnectedBody')}</div>
          </div>
        )}

        {showPipTools ? (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <textarea
              value={pipText}
              onChange={(event) => setPipText(event.target.value)}
              rows={6}
              placeholder={tx('pipImportHint')}
              style={{ ...S.input, resize: 'vertical', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={onImportPipContext} disabled={loading || !pipText.trim()} accent={T.purple}>{tx('importPip')}</Btn>
              <Btn onClick={onClearPip} disabled={loading || !code} ghost accent={T.purple}>{tx('clearPip')}</Btn>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title={tx('trendPanel')} accent={T.amber}>
        {trendData.length < 2 ? (
          <div style={{ color: T.muted }}>{tx('insufficientTrend')}</div>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: T.muted, fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text }}
                  labelStyle={{ color: T.sub }}
                />
                <Area type="monotone" dataKey="negativePct" stackId="shares" stroke={T.red} fill={T.red} fillOpacity={0.4} />
                <Area type="monotone" dataKey="neutralPct" stackId="shares" stroke={T.muted} fill={T.muted} fillOpacity={0.35} />
                <Area type="monotone" dataKey="positivePct" stackId="shares" stroke={T.green} fill={T.green} fillOpacity={0.35} />
                <Line type="monotone" dataKey="netSentimentPct" stroke={T.blue} strokeWidth={2} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title={`${tx('leadingIssues')} · ${leadingIssues.length}`} accent={T.teal}>
        {!leadingIssues.length ? (
          <div style={{ color: T.muted }}>{tx('emptyLine')}</div>
        ) : leadingIssues.map((row, index) => {
          const width = Math.max(8, Math.round((num(row.acceptedEvidenceCount, 0) / maxIssueCount) * 100))
          const barColor = index === 0 ? T.amber : T.teal
          return (
            <div key={`${row.issueLabel}-${index}`} style={{ borderTop: `1px solid ${T.borderSoft}`, padding: '9px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <div style={{ color: T.text }}>{row.issueLabel || '—'}</div>
                <div style={{ color: T.sub, fontSize: 12 }}>{fmtInt(row.acceptedEvidenceCount)} signals</div>
              </div>
              <div style={{ height: 5, background: T.borderSoft, borderRadius: 4 }}>
                <div style={{ width: `${width}%`, height: 5, background: barColor, borderRadius: 4 }} />
              </div>
            </div>
          )
        })}
      </Panel>

      <Panel title={tx('locality')} accent={T.blue}>
        {!localityRows.length ? (
          <div style={{ color: T.muted }}>{tx('noLocality')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {localityRows.map((row, index) => (
              <DunHeatTile
                key={`${row.localityCode || 'loc'}-${index}`}
                name={row.localityName || row.localityCode}
                count={`${fmtInt(row.acceptedEvidenceCount)} accepted signals`}
                subtitle={`Issue: ${row.leadingIssue || '—'}`}
                tier={Number.isFinite(Number(row.velocity)) ? row.velocity : row.acceptedEvidenceCount}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title={tx('narrativeClusters')} accent={T.purple}>
        {!narratives.length ? (
          <div style={{ color: T.muted }}>{tx('emptyLine')}</div>
        ) : narratives.map((row, index) => (
          <div key={`${row.narrativeId || 'n'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ color: T.text, fontWeight: 600 }}>{row.narrativeLabel || row.narrativeId || '—'}</div>
              <Badge color={row.lifecycleStatus === 'DECLINING' ? T.amber : row.lifecycleStatus === 'INACTIVE' ? T.muted : T.green}>{row.lifecycleStatus || 'UNKNOWN'}</Badge>
            </div>
            <div style={{ marginTop: 6, color: T.sub, fontSize: 12 }}>
              Echo stage: {row.currentEchoStage || '—'} · Evidence: {fmtInt(row.acceptedEvidenceCount)} · Locality spread: {fmtInt(row.localitySpread)}
            </div>
          </div>
        ))}
      </Panel>

      <Panel title={tx('sourceEcosystem')} accent={T.teal}>
        {!sourceRows.length ? (
          <div style={{ color: T.muted }}>{tx('emptyLine')}</div>
        ) : sourceRows.map((row) => {
          const width = Math.max(8, Math.round(num(row.sourceTypeShare, 0) * 100))
          return (
            <div key={row.sourceType} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.sub, marginBottom: 4 }}>
                <span>{row.sourceType}</span>
                <span>{fmtPct(num(row.sourceTypeShare, 0) * 100)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: T.borderSoft }}>
                <div style={{ width: `${width}%`, height: 6, borderRadius: 4, background: T.teal }} />
              </div>
            </div>
          )
        })}
      </Panel>

      <Panel title={tx('evidenceConfidence')} accent={T.gold}>
        <div style={{ marginBottom: 10 }}>
          <ScoreBar label="Overall confidence" value={Math.max(0, Math.min(100, num(report?.evidenceConfidence?.overallConfidence, 0) * 100))} color={T.gold} />
        </div>
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px', color: T.sub }}>Accepted evidence: {fmtInt(report?.evidenceConfidence?.acceptedEvidenceCount)}</div>
          <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px', color: T.sub }}>Unique sources: {fmtInt(report?.evidenceConfidence?.uniqueSourceCount)}</div>
          <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px', color: T.sub }}>Active days: {fmtInt(report?.evidenceConfidence?.activeDayCount)}</div>
          <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px', color: T.sub }}>Locality coverage: {fmtInt(report?.evidenceConfidence?.localityCoverageCount)}</div>
        </div>
      </Panel>

      <Panel title={tx('emergingRisk')} accent={T.red}>
        {!riskRows.length ? (
          <div style={{ color: T.muted }}>{tx('emptyLine')}</div>
        ) : riskRows.map((row, index) => (
          <div key={`${row.riskLabel || 'risk'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ color: T.text, fontWeight: 600 }}>{row.riskLabel || '—'}</div>
            <div style={{ color: T.sub, marginTop: 5, fontSize: 12 }}>Issue: {row.issue || '—'} · Locality: {row.locality || '—'} · Model: {row.modelVersion || '—'}</div>
            <div style={{ color: T.muted, marginTop: 5, fontSize: 12 }}>{row.prediction || '—'}</div>
          </div>
        ))}
      </Panel>

      <Panel title={tx('recommendedActions')} accent={T.green}>
        {!actionRows.length ? (
          <div style={{ color: T.muted }}>{tx('emptyLine')}</div>
        ) : actionRows.map((row, index) => (
          <div key={`${row.recommendedAction || 'action'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div style={{ color: T.text, fontWeight: 600 }}>{row.recommendedAction || '—'}</div>
              {row.approvalLevel ? <Badge color={T.blue}>{row.approvalLevel}</Badge> : null}
            </div>
            <div style={{ color: T.sub, marginTop: 5 }}>{row.reason || '—'}</div>
            <div style={{ color: T.muted, marginTop: 5, fontSize: 12 }}>{row.monitoringPeriod || '—'}</div>
          </div>
        ))}
      </Panel>

      {!code || noAcceptedData ? (
        <Panel title={tx('noAcceptedData')} accent={T.amber}>
          <div style={{ color: T.sub }}>{tx('emptyLine')}</div>
        </Panel>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn ghost onClick={() => setShowRaw((v) => !v)}>{tx('rawData')}</Btn>
      </div>

      {showRaw ? (
        <Panel title={tx('rawData')} accent={T.muted}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.sub }}>{pretty(pipContext)}</pre>
          <div style={{ height: 8 }} />
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.sub }}>{pretty(report)}</pre>
        </Panel>
      ) : null}
    </div>
  )
}