import React from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
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
  Panel as UiPanel,
  S,
  ScoreBar,
  T,
} from './s2dUiKit'

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

function todayToken() {
  return new Date().toISOString().slice(0, 10)
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asPct(value) {
  const num = toNumber(value, NaN)
  if (!Number.isFinite(num)) return null
  const pct = num <= 1 ? num * 100 : num
  return Math.max(0, Math.min(100, pct))
}

function fmtInt(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—'
}

function fmtPct(value) {
  if (!Number.isFinite(Number(value))) return '—'
  return `${Math.round(Number(value))}%`
}

function tierOfVelocity(value) {
  const score = toNumber(value, 0)
  if (score >= 72) return { label: 'Critical', color: T.red }
  if (score >= 58) return { label: 'High', color: T.amber }
  if (score >= 42) return { label: 'Watch', color: T.blue }
  return { label: 'Low', color: T.muted }
}

function dominantIssueFromHotspot(hotspot) {
  const value = hotspot?.issueConcentration
  if (!value) return '—'
  if (typeof value === 'string') return value || '—'
  if (Array.isArray(value)) {
    if (!value.length) return '—'
    const first = value[0]
    if (typeof first === 'string') return first
    if (Array.isArray(first)) return String(first[0] || '—')
    if (typeof first === 'object') return String(first.issue || first.label || first.name || '—')
    return '—'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (!entries.length) return '—'
    entries.sort((a, b) => toNumber(b[1], 0) - toNumber(a[1], 0))
    return String(entries[0][0] || '—')
  }
  return '—'
}

function statusColor(status) {
  if (status === 'AVAILABLE') return T.green
  if (status === 'PARTIAL_DATA') return T.amber
  if (status === 'REVIEW_REQUIRED') return T.purple
  if (status === 'INSUFFICIENT_HISTORY') return T.blue
  return T.muted
}

const LABELS = {
  eyebrow: { en: 'Reporting', bm: 'Pelaporan' },
  pageTitle: { en: 'Daily intelligence brief', bm: 'Ringkasan risikan harian' },
  pageSub: { en: 'Evidence-based judgement, outlook, and actions', bm: 'Penilaian berasaskan bukti, jangkaan dan tindakan' },
  reportDate: { en: 'Report date', bm: 'Tarikh laporan' },
  generate: { en: 'Generate brief', bm: 'Jana ringkasan' },
  refresh: { en: 'Refresh', bm: 'Muat semula' },
  exportJson: { en: 'Export JSON', bm: 'Eksport JSON' },
  exportMd: { en: 'Export Markdown', bm: 'Eksport Markdown' },
  exportCsv: { en: 'Export Evidence CSV', bm: 'Eksport CSV Bukti' },
  takeawayTitle: { en: 'Today in one line', bm: 'Hari ini dalam satu baris' },
  insufficientExec: { en: 'Insufficient accepted evidence for an executive judgement.', bm: 'Bukti diterima tidak mencukupi untuk penilaian eksekutif.' },
  aggregateOnly: { en: 'AGGREGATE PUBLIC-SIGNAL INTELLIGENCE ONLY', bm: 'Agregat isyarat awam sahaja' },
  humanReview: { en: 'Human review required', bm: 'Semakan manusia diperlukan' },
  voterInference: { en: 'Voter inference: disabled', bm: 'Inferens pengundi: dinyahaktif' },
  microtargeting: { en: 'Microtargeting: disabled', bm: 'Mikrosasaran: dinyahaktif' },
  autoExecution: { en: 'Auto execution: disabled', bm: 'Pelaksanaan auto: dinyahaktif' },
  pipDisconnected: { en: 'PIP: not connected', bm: 'PIP: tidak disambung' },
  acceptedEvidence: { en: 'Accepted evidence', bm: 'Bukti diterima' },
  uniqueSources: { en: 'Unique sources', bm: 'Sumber unik' },
  localityHotspots: { en: 'Locality hotspots', bm: 'Lokaliti hangat' },
  recommendedActions: { en: 'Recommended actions', bm: 'Tindakan disyor' },
  confidence: { en: 'Confidence', bm: 'Keyakinan' },
  chartLeft: { en: 'Signal volume and tone · 7 days', bm: 'Volum isyarat dan tona · 7 hari' },
  chartRight: { en: 'Tone mix', bm: 'Campuran tona' },
  historyInsufficient: { en: 'Insufficient snapshot history', bm: 'Sejarah tidak mencukupi' },
  localityHeat: { en: 'Locality heat', bm: 'Haba mengikut DUN' },
  noHotspots: { en: 'No locality hotspots', bm: 'Tiada lokaliti hangat' },
  rawData: { en: 'Raw data', bm: 'Data mentah' },
  emptyTitle: { en: 'NO ACCEPTED DATA FOR SELECTED DATE', bm: 'TIADA DATA DITERIMA UNTUK TARIKH DIPILIH' },
  emptyBody: { en: 'The Daily Intelligence Brief capability is operational. Accepted human-reviewed public evidence is required before substantive judgements can be generated.', bm: 'Keupayaan Ringkasan Risikan Harian beroperasi. Bukti awam yang disemak manusia diperlukan sebelum penilaian substantif dapat dijana.' },
  emptyBmLine: { en: 'Tiada data diterima untuk tarikh dipilih.', bm: 'Tiada data diterima untuk tarikh dipilih.' },
  section2: { en: '2. Most important change', bm: '2. Perubahan paling penting' },
  section3: { en: '3. Highest-risk narrative', bm: '3. Naratif risiko tertinggi' },
  section4: { en: '4. Main opportunity', bm: '4. Peluang utama' },
  section5: { en: '5. BN / PH / PN sentiment movement', bm: '5. Pergerakan sentimen BN / PH / PN' },
  section6: { en: '6. Top economic issues', bm: '6. Isu ekonomi utama' },
  section7: { en: '7. Youth-related public themes', bm: '7. Tema awam berkaitan belia' },
  section9: { en: '9. 24–72-hour outlook', bm: '9. Jangkaan 24–72 jam' },
  section10: { en: '10. Recommended actions', bm: '10. Tindakan disyorkan' },
  section11: { en: '11. Evidence links', bm: '11. Pautan bukti' },
  section12: { en: '12. Confidence and limitations', bm: '12. Keyakinan dan keterbatasan' },
  kpiSignals: { en: 'Signals', bm: 'Isyarat' },
  kpiCritical: { en: 'Critical', bm: 'Kritikal' },
  kpiVelocity: { en: 'Velocity', bm: 'Halaju' },
  kpiNegTone: { en: 'Neg. tone', bm: 'Tona negatif' },
  kpiSignOff: { en: 'Sign-off', bm: 'Menunggu' },
  topMovers: { en: 'Top movers', bm: 'Peningkatan terpantas' },
  governanceFooter: { en: 'Human approval required before any response', bm: 'Kelulusan manusia diperlukan sebelum sebarang tindakan' },
}

function DualText({ pair, lang, size = 12 }) {
  const primary = String(lang).toUpperCase() === 'BM' ? pair.bm : pair.en
  const secondary = String(lang).toUpperCase() === 'BM' ? pair.en : pair.bm
  return (
    <>
      <div>{primary}</div>
      <div style={{ fontSize: size, color: T.muted }}>{secondary}</div>
    </>
  )
}

function LabelValueRow({ label, value, compact = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '220px 1fr', gap: compact ? 4 : 10, padding: '9px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ color: T.muted, fontSize: 12 }}>{label}</div>
      <div style={{ color: T.text }}>{value || '—'}</div>
    </div>
  )
}

function downloadBlob(content, contentType, fileName) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function KpiTile({ label, value, accent, sub }) {
  return (
    <div style={{ ...S.card, padding: 10 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: T.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: accent, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Panel(props) {
  return <UiPanel {...props} titleWeight={500} />
}

export default function S2DDailyIntelligenceBriefPage({ service, lang = 'EN', snapshotService }) {
  const [reportDate, setReportDate] = React.useState(todayToken())
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState(null)
  const [summary, setSummary] = React.useState(null)
  const [showRawData, setShowRawData] = React.useState(false)
  const [snapshotRows, setSnapshotRows] = React.useState([])
  const [toneMix, setToneMix] = React.useState(null)
  const [viewportWidth, setViewportWidth] = React.useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isBm = String(lang).toUpperCase() === 'BM'
  const tx = React.useCallback((key) => {
    const pair = LABELS[key] || { en: key, bm: key }
    return {
      primary: isBm ? pair.bm : pair.en,
      secondary: isBm ? pair.en : pair.bm,
    }
  }, [isBm])

  const loadSnapshotWindow = React.useCallback(async (date) => {
    if (!snapshotService?.getDailySnapshots) {
      setSnapshotRows([])
      setToneMix(null)
      return
    }
    try {
      const end = new Date(`${date}T00:00:00.000Z`)
      const start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 6)
      const startDate = start.toISOString().slice(0, 10)
      const endDate = end.toISOString().slice(0, 10)

      const snapshotResult = await snapshotService.getDailySnapshots({
        startDate,
        endDate,
        dimensions: ['STATE'],
        dimensionFilter: null,
      })

      const rows = Array.isArray(snapshotResult?.snapshots) ? snapshotResult.snapshots : []
      const byDate = new Map()

      for (const row of rows) {
        const token = String(row.snapshotDate || '').slice(0, 10)
        if (!token) continue
        if (!byDate.has(token)) {
          byDate.set(token, {
            snapshotDate: token,
            volume: 0,
            negativeTonePctTotal: 0,
            negativeTonePctCount: 0,
            positivePctTotal: 0,
            positivePctCount: 0,
            neutralPctTotal: 0,
            neutralPctCount: 0,
            negativePctTotal: 0,
            negativePctCount: 0,
          })
        }
        const entry = byDate.get(token)
        entry.volume += toNumber(row.acceptedEvidenceCount, toNumber(row.totalRecords, 0))
        const neg = asPct(row.negativeShare)
        if (neg !== null) {
          entry.negativeTonePctTotal += neg
          entry.negativeTonePctCount += 1
          entry.negativePctTotal += neg
          entry.negativePctCount += 1
        }
        const neu = asPct(row.neutralShare)
        if (neu !== null) {
          entry.neutralPctTotal += neu
          entry.neutralPctCount += 1
        }
        const pos = asPct(row.positiveShare)
        if (pos !== null) {
          entry.positivePctTotal += pos
          entry.positivePctCount += 1
        }
      }

      const chartData = [...byDate.values()]
        .sort((a, b) => String(a.snapshotDate).localeCompare(String(b.snapshotDate)))
        .map((entry) => ({
          snapshotDate: entry.snapshotDate,
          volume: entry.volume,
          negativeTonePct: entry.negativeTonePctCount ? entry.negativeTonePctTotal / entry.negativeTonePctCount : 0,
          positivePct: entry.positivePctCount ? entry.positivePctTotal / entry.positivePctCount : 0,
          neutralPct: entry.neutralPctCount ? entry.neutralPctTotal / entry.neutralPctCount : 0,
          negativePct: entry.negativePctCount ? entry.negativePctTotal / entry.negativePctCount : 0,
        }))

      setSnapshotRows(chartData)
      const latest = chartData[chartData.length - 1] || null
      setToneMix(latest ? {
        negative: latest.negativePct,
        neutral: latest.neutralPct,
        positive: latest.positivePct,
      } : null)
    } catch {
      setSnapshotRows([])
      setToneMix(null)
    }
  }, [snapshotService])

  const load = React.useCallback(async (date, refresh = false) => {
    if (!service) return
    setLoading(true)
    setError('')
    try {
      const generated = refresh
        ? await service.refreshDailyBrief(date)
        : await service.generateDailyBrief(date)
      const dailySummary = await service.getDailyBriefSummary(date)
      setResult(generated || null)
      setSummary(dailySummary || null)
      await loadSnapshotWindow(date)
    } catch (loadError) {
      setError(loadError?.message || 'Failed to generate daily intelligence brief.')
    } finally {
      setLoading(false)
    }
  }, [service, loadSnapshotWindow])

  React.useEffect(() => {
    load(reportDate, false)
  }, [load, reportDate])

  const onGenerate = async () => load(reportDate, false)
  const onRefresh = async () => load(reportDate, true)

  const onExportJson = async () => {
    if (!service) return
    setLoading(true)
    setError('')
    try {
      const payload = await service.exportDailyBriefJson(reportDate)
      downloadBlob(pretty(payload), 'application/json', `s2d-daily-brief-${reportDate}.json`)
    } catch (exportError) {
      setError(exportError?.message || 'Failed to export JSON.')
    } finally {
      setLoading(false)
    }
  }

  const onExportMarkdown = async () => {
    if (!service) return
    setLoading(true)
    setError('')
    try {
      const payload = await service.exportDailyBriefMarkdown(reportDate)
      downloadBlob(String(payload || ''), 'text/markdown', `s2d-daily-brief-${reportDate}.md`)
    } catch (exportError) {
      setError(exportError?.message || 'Failed to export Markdown.')
    } finally {
      setLoading(false)
    }
  }

  const onExportEvidenceCsv = async () => {
    if (!service) return
    setLoading(true)
    setError('')
    try {
      const payload = await service.exportDailyBriefEvidenceCsv(reportDate)
      downloadBlob(String(payload || ''), 'text/csv', `s2d-daily-brief-${reportDate}.csv`)
    } catch (exportError) {
      setError(exportError?.message || 'Failed to export evidence CSV.')
    } finally {
      setLoading(false)
    }
  }

  const brief = result?.brief || null
  const noData = !brief || brief.status === 'NO_ACCEPTED_DATA'
  const summaryText = String(brief?.executiveJudgement?.summary || '').trim()
  const firstParagraph = summaryText.split('\n\n').filter(Boolean)[0] || tx('insufficientExec').primary
  const historyReady = snapshotRows.length >= 2
  const hotspots = Array.isArray(brief?.localityHotspots) ? brief.localityHotspots.slice(0, 10) : []

  const chips = [
    { key: 'aggregateOnly', color: T.muted },
    { key: 'humanReview', color: T.muted },
    { key: 'voterInference', color: T.red },
    { key: 'microtargeting', color: T.red },
    { key: 'autoExecution', color: T.red },
    { key: 'pipDisconnected', color: T.muted },
  ]

  const avgVelocity = hotspots.length
    ? Math.round(hotspots.reduce((sum, row) => sum + toNumber(row.velocity, 0), 0) / hotspots.length)
    : 0
  const criticalHotspots = hotspots.filter((row) => toNumber(row.velocity, 0) >= 72).length
  const signOffCount = toNumber(summary?.recommendedActionCount, 0)
  const tone = toneMix || { negative: 0, neutral: 0, positive: 0 }

  const kpiItems = [
    { key: 'kpiSignals', value: toNumber(summary?.acceptedEvidenceCount, 0), accent: T.green, sub: tx('kpiSignals').secondary },
    { key: 'kpiCritical', value: criticalHotspots, accent: T.red, sub: tx('kpiCritical').secondary },
    { key: 'kpiVelocity', value: avgVelocity, accent: T.blue, sub: tx('kpiVelocity').secondary },
    { key: 'kpiNegTone', value: fmtPct(tone.negative), accent: T.amber, isText: true, sub: tx('kpiNegTone').secondary },
    {
      key: 'kpiSignOff',
      value: signOffCount,
      accent: T.gold,
      sub: tx('kpiSignOff').secondary,
    },
  ]

  const topMovers = hotspots
    .map((row) => {
      const score = Math.round(toNumber(row.velocity, 0))
      const tier = tierOfVelocity(score)
      const issue = dominantIssueFromHotspot(row)
      return {
        locality: row.locality || 'Unknown locality',
        issue,
        score,
        tier,
        acceptedSignalCount: toNumber(row.acceptedSignalCount, 0),
        barWidth: Math.max(10, Math.min(100, score)),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const totalTone = Math.max(1, toNumber(tone.negative, 0) + toNumber(tone.neutral, 0) + toNumber(tone.positive, 0))
  const toneWidths = {
    negative: (toNumber(tone.negative, 0) / totalTone) * 100,
    neutral: (toNumber(tone.neutral, 0) / totalTone) * 100,
    positive: (toNumber(tone.positive, 0) / totalTone) * 100,
  }
  const isTablet = viewportWidth < 1200
  const isMobile = viewportWidth < 900
  const sectionGap = isMobile ? 12 : 16
  const headerColumns = isTablet ? '1fr' : 'minmax(0, 1fr) minmax(320px, 440px)'
  const kpiMinWidth = isMobile ? 140 : 150
  const chartGridColumns = viewportWidth < 1100 ? '1fr' : '1.7fr 1fr'

  return (
    <div style={{ display: 'grid', gap: sectionGap }}>
      <div style={{ display: 'grid', gridTemplateColumns: headerColumns, gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.teal, fontWeight: 500 }}>
            {tx('eyebrow').primary} · {tx('eyebrow').secondary}
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 500, color: T.text }}>
            {tx('pageTitle').primary}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted }}>
            {tx('pageSub').primary} · {tx('pageSub').secondary}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <label htmlFor="daily-brief-date" style={{ fontSize: 12, color: T.sub }}>
            <DualText pair={LABELS.reportDate} lang={lang} size={11} />
          </label>
          <input
            id="daily-brief-date"
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            style={{ ...S.input }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn onClick={onGenerate} disabled={loading} accent={T.teal}>{tx('generate').primary}</Btn>
            <Btn onClick={onRefresh} disabled={loading} ghost accent={T.teal}>{tx('refresh').primary}</Btn>
            <Btn onClick={onExportJson} disabled={loading} ghost>{tx('exportJson').primary}</Btn>
            <Btn onClick={onExportMarkdown} disabled={loading} ghost>{tx('exportMd').primary}</Btn>
            <Btn onClick={onExportEvidenceCsv} disabled={loading} ghost>{tx('exportCsv').primary}</Btn>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ border: `1px solid ${T.red}55`, borderRadius: 12, background: `${T.red}1a`, color: T.red, padding: 12 }}>
          {error}
        </div>
      ) : null}

      <Panel
        title={`${tx('takeawayTitle').primary} · ${tx('takeawayTitle').secondary}`}
        accent={T.amber}
        style={{ borderLeft: `3px solid ${T.amber}` }}
      >
        <div style={{ color: T.text, lineHeight: 1.55 }}>
          {brief?.status === 'AVAILABLE' ? firstParagraph : tx('insufficientExec').primary}
        </div>
      </Panel>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((chip) => (
          <Badge key={chip.key} color={chip.color}>{tx(chip.key).primary}</Badge>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${kpiMinWidth}px, 1fr))`, gap: 12 }}>
        {kpiItems.map((kpi) => (
          <KpiTile
            key={kpi.key}
            label={tx(kpi.key).primary}
            value={kpi.isText ? kpi.value : fmtInt(kpi.value)}
            accent={kpi.accent}
            sub={kpi.sub || tx(kpi.key).secondary}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: chartGridColumns, gap: 16 }}>
        <Panel title={tx('chartLeft').primary} accent={T.teal}>
          {!historyReady ? (
            <div style={{ color: T.muted }}>{tx('historyInsufficient').primary} · {tx('historyInsufficient').secondary}</div>
          ) : (
            <div style={{ height: 250, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={snapshotRows}>
                  <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" />
                  <XAxis dataKey="snapshotDate" tick={{ fill: T.muted, fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: T.muted, fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: T.muted, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text }}
                    labelStyle={{ color: T.sub }}
                  />
                  <Bar yAxisId="left" dataKey="volume" name="Volume" fill={T.teal} fillOpacity={0.35} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="negativeTonePct" name="Negative tone %" stroke={T.amber} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title={`${tx('chartRight').primary} · ${tx('chartRight').secondary}`} accent={T.amber}>
          {!historyReady ? (
            <div style={{ color: T.muted }}>{tx('historyInsufficient').primary} · {tx('historyInsufficient').secondary}</div>
          ) : (
            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <div style={{ width: `${toneWidths.negative}%`, background: T.red }} />
                <div style={{ width: `${toneWidths.neutral}%`, background: T.muted }} />
                <div style={{ width: `${toneWidths.positive}%`, background: T.green }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px' }}>
                  <span style={{ color: T.red }}>Negative</span>
                  <span style={{ color: T.text }}>{fmtPct(tone.negative)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px' }}>
                  <span style={{ color: T.muted }}>Neutral</span>
                  <span style={{ color: T.text }}>{fmtPct(tone.neutral)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px' }}>
                  <span style={{ color: T.green }}>Positive</span>
                  <span style={{ color: T.text }}>{fmtPct(tone.positive)}</span>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title={`${tx('localityHeat').primary} · ${tx('localityHeat').secondary}`} accent={T.red}>
        {!hotspots.length ? (
          <div style={{ color: T.muted }}>{tx('noHotspots').primary} · {tx('noHotspots').secondary}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {hotspots.map((hotspot, index) => {
              return (
                <DunHeatTile
                  key={`${hotspot?.locality || 'locality'}-${index}`}
                  name={hotspot?.locality || '—'}
                  count={`${fmtInt(hotspot?.acceptedSignalCount)} accepted signals`}
                  subtitle={`Dominant issue: ${dominantIssueFromHotspot(hotspot)}`}
                  tier={hotspot?.velocity}
                />
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title={`${tx('topMovers').primary} · ${tx('topMovers').secondary}`} accent={T.blue}>
        {!topMovers.length ? (
          <div style={{ color: T.muted, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10 }}>
            No fast movers for selected date.
          </div>
        ) : topMovers.map((row, index) => (
          <div key={`${row.locality}-${index}`} style={{ display: 'grid', gridTemplateColumns: '42px 1fr auto auto', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${T.borderSoft}` }}>
            <div style={{ color: row.tier.color, fontSize: 19, fontWeight: 700, textAlign: 'center' }}>{row.score}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: T.text, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.issue === '—' ? row.locality : `${row.issue} in ${row.locality}`}
              </div>
              <div style={{ height: 4, background: T.borderSoft, borderRadius: 3, marginTop: 4 }}>
                <div style={{ width: `${row.barWidth}%`, height: 4, background: row.tier.color, borderRadius: 3 }} />
              </div>
            </div>
            <Badge color={row.tier.color}>{row.tier.label}</Badge>
            <div style={{ color: row.tier.color, fontSize: 12, minWidth: 52, textAlign: 'right' }}>
              v{row.score}
            </div>
          </div>
        ))}
      </Panel>

      {noData ? (
        <Panel title={tx('emptyTitle').primary} accent={T.amber}>
          <div style={{ color: T.text, lineHeight: 1.55 }}>{tx('emptyBody').primary}</div>
          <div style={{ color: T.muted, marginTop: 6 }}>{LABELS.emptyBmLine.bm}</div>
        </Panel>
      ) : null}

      {brief ? (
        <>
          <Panel title={tx('section2').primary} accent={T.teal} right={<Badge color={statusColor(brief?.mostImportantChange?.status)}>{brief?.mostImportantChange?.status || 'UNKNOWN'}</Badge>}>
            <LabelValueRow label="Observation" value={brief?.mostImportantChange?.observation} compact={isMobile} />
            <LabelValueRow label="Change type" value={brief?.mostImportantChange?.changeType} compact={isMobile} />
            <LabelValueRow label="Movement" value={brief?.mostImportantChange?.movement} compact={isMobile} />
            <LabelValueRow label="Historical baseline" value={brief?.mostImportantChange?.historicalBaseline} compact={isMobile} />
          </Panel>

          <Panel title={tx('section3').primary} accent={T.red} right={<Badge color={statusColor(brief?.highestRiskNarrative?.status)}>{brief?.highestRiskNarrative?.status || 'UNKNOWN'}</Badge>}>
            <LabelValueRow label="Narrative" value={brief?.highestRiskNarrative?.narrativeLabel} compact={isMobile} />
            <LabelValueRow label="Issue" value={brief?.highestRiskNarrative?.issue} compact={isMobile} />
            <LabelValueRow label="Risk" value={brief?.highestRiskNarrative?.riskLevel} compact={isMobile} />
            <LabelValueRow label="Echo stage" value={brief?.highestRiskNarrative?.echoStage} compact={isMobile} />
            <LabelValueRow label="Reason" value={brief?.highestRiskNarrative?.reason} compact={isMobile} />
          </Panel>

          <Panel title={tx('section4').primary} accent={T.green} right={<Badge color={statusColor(brief?.mainOpportunity?.status)}>{brief?.mainOpportunity?.status || 'UNKNOWN'}</Badge>}>
            <LabelValueRow label="Type" value={brief?.mainOpportunity?.opportunityType} compact={isMobile} />
            <LabelValueRow label="Summary" value={brief?.mainOpportunity?.summary} compact={isMobile} />
            <LabelValueRow label="Reason" value={brief?.mainOpportunity?.reason} compact={isMobile} />
          </Panel>

          <Panel title={tx('section5').primary} accent={T.blue}>
            {(Array.isArray(brief?.politicalEntitySentimentMovement) ? brief.politicalEntitySentimentMovement : []).map((row) => (
              <div key={row.entityCode} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ color: T.text, fontWeight: 600 }}>{row.entityCode}</div>
                  <Badge color={statusColor(row.status)}>{row.status || 'UNKNOWN'}</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(110px, 1fr))', gap: 8, color: T.sub, fontSize: 12 }}>
                  <div>Current: {row.currentNetSentiment ?? '—'}</div>
                  <div>Previous: {row.previousNetSentiment ?? '—'}</div>
                  <div>Movement: {row.movement ?? '—'}</div>
                </div>
              </div>
            ))}
          </Panel>

          <Panel title={tx('section6').primary} accent={T.amber}>
            {(Array.isArray(brief?.topEconomicIssues) ? brief.topEconomicIssues : []).length === 0 ? (
              <div style={{ color: T.muted, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10 }}>
                No economic issue rows for selected date.
              </div>
            ) : (Array.isArray(brief?.topEconomicIssues) ? brief.topEconomicIssues : []).map((row, index) => (
              <div key={`${row.issueLabel || 'issue'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ color: T.text, fontWeight: 600, marginBottom: 8 }}>{row.issueLabel || '—'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, color: T.sub, fontSize: 12 }}>
                  <div>Evidence: {fmtInt(row.acceptedEvidenceCount)}</div>
                  <div>Engagement: {fmtInt(row.engagement)}</div>
                  <div>Negative movement: {fmtInt(row.negativeShareMovement)}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ScoreBar label="Velocity" value={Math.max(0, Math.min(100, toNumber(row.velocity, 0)))} color={T.amber} />
                </div>
              </div>
            ))}
          </Panel>

          <Panel title={tx('section7').primary} accent={T.purple}>
            {(Array.isArray(brief?.youthRelatedPublicThemes) ? brief.youthRelatedPublicThemes : []).length === 0 ? (
              <div style={{ color: T.muted, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10 }}>
                No youth-theme rows for selected date.
              </div>
            ) : (Array.isArray(brief?.youthRelatedPublicThemes) ? brief.youthRelatedPublicThemes : []).map((row, index) => (
              <div key={`${row.theme || 'theme'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ color: T.text, fontWeight: 600 }}>{row.theme || '—'}</div>
                <div style={{ color: T.sub, fontSize: 12, marginTop: 5 }}>
                  Evidence: {fmtInt(row.acceptedEvidenceCount)} · Engagement: {fmtInt(row.engagement)}
                </div>
                <Badge color={statusColor(row.status)}>{row.status || 'AVAILABLE'}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title={tx('section9').primary} accent={T.teal} right={<Badge color={statusColor(brief?.outlook24To72Hours?.status)}>{brief?.outlook24To72Hours?.status || 'UNKNOWN'}</Badge>}>
            <LabelValueRow label="Outlook" value={brief?.outlook24To72Hours?.outlook} compact={isMobile} />
            <LabelValueRow label="Window" value={brief?.outlook24To72Hours?.forecastWindow} compact={isMobile} />
            <LabelValueRow label="Model" value={brief?.outlook24To72Hours?.modelVersion} compact={isMobile} />
            <LabelValueRow label="Main factors" value={Array.isArray(brief?.outlook24To72Hours?.mainFactors) ? brief.outlook24To72Hours.mainFactors.join(' | ') : '—'} compact={isMobile} />
          </Panel>

          <Panel title={tx('section10').primary} accent={T.green}>
            {(Array.isArray(brief?.recommendedActions) ? brief.recommendedActions : []).length === 0 ? (
              <div style={{ color: T.muted, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10 }}>
                No recommended actions for selected date.
              </div>
            ) : (Array.isArray(brief?.recommendedActions) ? brief.recommendedActions : []).map((row, index) => (
              <div key={`${row.actionCode || 'action'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ color: T.text, fontWeight: 600 }}>{row.actionCode || '—'}</div>
                  {row.approvalLevel ? <Badge color={T.blue}>{row.approvalLevel}</Badge> : null}
                </div>
                <div style={{ color: T.sub, marginTop: 6, lineHeight: 1.4 }}>{row.reason || '—'}</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
                  {row.monitoringPeriod || '—'}
                </div>
              </div>
            ))}
          </Panel>

          <Panel title={tx('section11').primary} accent={T.blue}>
            {(Array.isArray(brief?.evidenceLinks) ? brief.evidenceLinks : []).length === 0 ? (
              <div style={{ color: T.muted, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10 }}>
                No evidence links for selected date.
              </div>
            ) : (Array.isArray(brief?.evidenceLinks) ? brief.evidenceLinks : []).slice(0, 20).map((row, index) => (
              <div key={`${row.evidenceId || 'evidence'}-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ color: T.text, fontWeight: 600 }}>{row.evidenceId || '—'}</div>
                <div style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>
                  {row.platform || '—'} · {row.sourceType || '—'} · {row.collectionDate || '—'}
                </div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 4, wordBreak: 'break-all' }}>{row.publicUrl || '—'}</div>
              </div>
            ))}
          </Panel>

          <Panel title={tx('section12').primary} accent={T.gold}>
            <div style={{ marginBottom: 10 }}>
              <ScoreBar
                label={tx('confidence').primary}
                value={Math.max(0, Math.min(100, toNumber(asPct(brief?.confidenceAndLimitations?.overallConfidence), 0)))}
                color={T.gold}
              />
            </div>
            <LabelValueRow label={tx('acceptedEvidence').primary} value={fmtInt(brief?.confidenceAndLimitations?.acceptedEvidenceCount)} />
            <LabelValueRow label={tx('uniqueSources').primary} value={fmtInt(brief?.confidenceAndLimitations?.uniqueSourceCount)} compact={isMobile} />
            <LabelValueRow label="Geographic coverage" value={fmtInt(brief?.confidenceAndLimitations?.geographicCoverageCount)} compact={isMobile} />
            <div style={{ marginTop: 10 }}>
              {(Array.isArray(brief?.confidenceAndLimitations?.limitations) ? brief.confidenceAndLimitations.limitations : []).map((row, index) => (
                <div key={`limitation-${index}`} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6, color: T.sub }}>
                  {row}
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn ghost onClick={() => setShowRawData((v) => !v)}>{tx('rawData').primary}</Btn>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${T.borderSoft}`, paddingTop: 10, color: T.muted, fontSize: 11.5 }}>
        <span>{tx('governanceFooter').primary} · {tx('governanceFooter').secondary}</span>
        <span style={{ color: T.sub }}>PDF · CSV</span>
      </div>

      {showRawData ? (
        <Panel title={`${tx('rawData').primary} · ${tx('rawData').secondary}`} accent={T.muted}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.sub }}>{pretty(summary)}</pre>
          <div style={{ height: 10 }} />
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.sub }}>{pretty(brief)}</pre>
        </Panel>
      ) : null}
    </div>
  )
}
