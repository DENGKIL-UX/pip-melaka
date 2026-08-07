import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const T = {
  bg: '#0a0e14', bg2: '#0f1620', card: '#131c28', card2: '#18222f', card3: '#1f2d40',
  border: '#243043', borderSoft: '#1b2433', text: '#e6edf5', sub: '#9fb0c3', muted: '#67788c',
  blue: '#38bdf8', cyan: '#22d3ee', teal: '#2dd4bf', amber: '#fbbf24', purple: '#a78bfa',
  green: '#4ade80', red: '#f87171', magenta: '#f0398b', gold: '#eab308', pink: '#ec4899',
}
const FONT_HEAD = "'Space Grotesk', 'Inter', sans-serif"
const FONT_BODY = "'Inter', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

const notificationItems = [
  { id: 'noti-001', title: 'High-risk signal requires review', notificationGroup: 'Live Monitoring', severity: 'High', priority: 'N1', notificationStatus: 'Unread', confidence: 94, urgencyScore: 92, sensitivity: 'High', notificationOwner: 'Monitoring Desk', assignedRole: 'Analyst', triggerModule: 'Live Monitoring', targetModule: 'Decision Console', actionType: 'Review Signal', executiveSummary: 'A high-risk live signal was detected and requires analyst review before it can move into Decision Console.', notificationReason: 'Live signals with high severity and strong evidence linkage should be reviewed quickly to prevent delayed response.', recommendedResponse: 'Review the signal, verify its evidence chain, and decide whether it should be escalated, monitored or held.', timeline: [{ time: '08:05', event: 'Live signal detected', signal: 'High severity' }, { time: '08:12', event: 'Alert rule matched', signal: 'Velocity threshold' }, { time: '08:20', event: 'Analyst review requested', signal: 'Unread' }], notificationLog: [{ time: '08:05', decision: 'Detected', owner: 'Live Monitoring', note: 'High-risk signal entered monitoring queue.' }, { time: '08:12', decision: 'Triggered', owner: 'Alert Rules', note: 'Velocity and similarity rule matched.' }, { time: '08:20', decision: 'Assigned', owner: 'Monitoring Desk', note: 'Notification assigned to analyst role.' }] },
  { id: 'noti-002', title: 'Evidence item needs verification', notificationGroup: 'Evidence Review', severity: 'High', priority: 'N1', notificationStatus: 'Unread', confidence: 91, urgencyScore: 88, sensitivity: 'High', notificationOwner: 'Evidence Desk', assignedRole: 'Analyst', triggerModule: 'Evidence Vault', targetModule: 'Evidence Timeline', actionType: 'Verify Evidence', executiveSummary: 'A pending evidence item needs review before it can be used in timeline, decision or export reporting.', notificationReason: 'Evidence with Pending Review status should not be used for final decision or reporting until verification is completed.', recommendedResponse: 'Check source URL, timestamp, actor linkage and evidence chain before changing its status.', timeline: [{ time: '09:10', event: 'Evidence archived', signal: 'Pending Review' }, { time: '09:25', event: 'Source chain incomplete', signal: 'Review required' }, { time: '09:40', event: 'Notification assigned', signal: 'Analyst review' }], notificationLog: [{ time: '09:10', decision: 'Stored', owner: 'Evidence Vault', note: 'Evidence entered vault as pending review.' }, { time: '09:25', decision: 'Flagged', owner: 'Evidence Desk', note: 'Source chain needs verification.' }, { time: '09:40', decision: 'Assigned', owner: 'Evidence Desk', note: 'Notification assigned to analyst.' }] },
  { id: 'noti-003', title: 'Workflow simulation requires follow-up', notificationGroup: 'Workflow Automation', severity: 'Medium', priority: 'N2', notificationStatus: 'In Progress', confidence: 86, urgencyScore: 78, sensitivity: 'Medium', notificationOwner: 'Workflow Desk', assignedRole: 'Admin', triggerModule: 'Workflow Automation', targetModule: 'System Health', actionType: 'Review Workflow', executiveSummary: 'A workflow simulation was drafted but requires admin follow-up before the automation route is marked ready.', notificationReason: 'Workflow automation should not be enabled until route logic, approval gates and failure handling are reviewed.', recommendedResponse: 'Inspect the workflow path, check module linkage and decide whether the workflow should remain planned or move to ready status.', timeline: [{ time: '10:15', event: 'Workflow simulation run', signal: 'Drafted' }, { time: '10:30', event: 'Approval gate required', signal: 'Admin follow-up' }, { time: '10:45', event: 'Notification created', signal: 'In Progress' }], notificationLog: [{ time: '10:15', decision: 'Simulated', owner: 'Workflow Desk', note: 'Workflow simulation returned drafted status.' }, { time: '10:30', decision: 'Review', owner: 'S2D Admin', note: 'Approval gate must be confirmed.' }] },
  { id: 'noti-004', title: 'Admin setting change pending approval', notificationGroup: 'Admin Settings', severity: 'High', priority: 'N1', notificationStatus: 'Unread', confidence: 88, urgencyScore: 90, sensitivity: 'High', notificationOwner: 'S2D Admin', assignedRole: 'Admin', triggerModule: 'Admin Settings', targetModule: 'Eval Runner', actionType: 'Approve Setting', executiveSummary: 'A similarity threshold change is pending approval and should be tested before it affects detection behaviour.', notificationReason: 'Detection threshold changes can affect alert volume, false positives and decision escalation.', recommendedResponse: 'Run Eval Runner, confirm expected behaviour and approve or reject the admin setting change.', timeline: [{ time: '11:05', event: 'Threshold change drafted', signal: '88% to 90%' }, { time: '11:20', event: 'Eval test requested', signal: 'QA required' }, { time: '11:35', event: 'Admin approval notification sent', signal: 'Unread' }], notificationLog: [{ time: '11:05', decision: 'Drafted', owner: 'S2D Admin', note: 'Similarity threshold update drafted.' }, { time: '11:20', decision: 'Eval Required', owner: 'QA Desk', note: 'Eval Runner test needed before approval.' }, { time: '11:35', decision: 'Assigned', owner: 'S2D Admin', note: 'Admin approval notification created.' }] },
  { id: 'noti-005', title: 'Report export completed', notificationGroup: 'Report Export', severity: 'Low', priority: 'N3', notificationStatus: 'Resolved', confidence: 89, urgencyScore: 62, sensitivity: 'Medium', notificationOwner: 'Report Desk', assignedRole: 'Analyst', triggerModule: 'Case Export Report', targetModule: 'Audit Log', actionType: 'Export Notice', executiveSummary: 'A case report was exported and the related audit record has been created.', notificationReason: 'Export completion should be visible to analysts and logged for accountability.', recommendedResponse: 'Confirm export file, review included evidence status and ensure the audit record is complete.', timeline: [{ time: '12:10', event: 'Report generated', signal: 'Markdown' }, { time: '12:18', event: 'Export completed', signal: 'Downloaded' }, { time: '12:25', event: 'Audit log updated', signal: 'Resolved' }], notificationLog: [{ time: '12:10', decision: 'Generated', owner: 'Case Export Report', note: 'Report generated successfully.' }, { time: '12:18', decision: 'Downloaded', owner: 'Analyst User', note: 'Markdown report exported.' }, { time: '12:25', decision: 'Resolved', owner: 'Report Desk', note: 'Audit record confirmed.' }] },
  { id: 'noti-006', title: 'User role review flagged', notificationGroup: 'Access Control', severity: 'Medium', priority: 'N2', notificationStatus: 'Flagged', confidence: 83, urgencyScore: 80, sensitivity: 'High', notificationOwner: 'Security Desk', assignedRole: 'Admin', triggerModule: 'User Access Control', targetModule: 'Backend Integration', actionType: 'Role Review', executiveSummary: 'Viewer role separation is flagged because read-only access must be confirmed before external observers use the dashboard.', notificationReason: 'User roles affect evidence visibility, report exports and admin control access.', recommendedResponse: 'Review allowed and restricted modules, then align role permissions with backend authentication design.', timeline: [{ time: '13:05', event: 'Viewer role reviewed', signal: 'Read-only required' }, { time: '13:20', event: 'Access risk flagged', signal: 'Role separation' }, { time: '13:45', event: 'Security notification created', signal: 'Flagged' }], notificationLog: [{ time: '13:05', decision: 'Reviewed', owner: 'Security Desk', note: 'Viewer access should be separated.' }, { time: '13:20', decision: 'Flagged', owner: 'S2D Admin', note: 'Read-only access needs enforcement.' }, { time: '13:45', decision: 'Assigned', owner: 'Security Desk', note: 'Admin review notification created.' }] },
]

function tone(c) { return { background: `${c}1c`, border: `1px solid ${c}55`, color: c } }
function severityColor(s) { return s === 'High' ? T.red : s === 'Medium' ? T.amber : T.green }
function statusColor(s) { return s === 'Unread' ? T.red : s === 'In Progress' ? T.amber : s === 'Flagged' ? T.purple : s === 'Resolved' ? T.green : T.sub }
function priorityColor(p) { return p === 'N1' ? T.red : p === 'N2' ? T.amber : T.green }
function urgencyColor(score) { return score >= 90 ? T.red : score >= 80 ? T.amber : score >= 65 ? T.blue : T.green }

const cardStyle = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 18 }
const eyebrow = { fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, fontWeight: 600 }
function Chip({ color, children }) { return <span style={{ ...tone(color), display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span> }
function StatCard({ label, value, note }) { return <div style={{ ...cardStyle, background: T.bg2, padding: 16 }}><div style={eyebrow}>{label}</div><div style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, color: T.text, marginTop: 6 }}>{value}</div><div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>{note}</div></div> }
function FilterGroup({ title, sub, options, value, onChange, accent }) { return <div><h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h3><p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>{sub}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>{options.map((opt) => { const on = value === opt; return <button key={opt} onClick={() => onChange(opt)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? accent : T.border}`, background: on ? `${accent}24` : T.bg2, color: on ? accent : T.sub, transition: 'all .15s' }}>{opt}</button> })}</div></div> }
function NotificationChip({ label, color }) { return <Chip color={color}>{label}</Chip> }
function Panel({ title, accent, children }) {
  return (
    <div style={{ ...cardStyle, background: T.bg2, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
      </div>
      {children}
    </div>
  )
}
function Badge({ color, children }) {
  return <Chip color={color}>{children}</Chip>
}
function LinkCard({ label, value }) {
  return (
    <div style={{ ...cardStyle, background: T.bg2, padding: 14 }}>
      <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function MiniTimeline({ rows = [] }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.slice(0, 4).map((row) => (
        <div key={`${row.time}-${row.event}`} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 10, alignItems: 'start' }}>
          <div style={{ color: T.muted, fontFamily: FONT_MONO, fontSize: 11.5 }}>{row.time}</div>
          <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.55 }}><strong style={{ color: T.text }}>{row.event}</strong> · {row.signal}</div>
        </div>
      ))}
    </div>
  )
}

export default function S2DNotificationCenterPage() {
  const [selectedGroup, setSelectedGroup] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedNotificationId, setSelectedNotificationId] = useState('noti-001')
  const [notificationDraft, setNotificationDraft] = useState('Unread')
  const [notificationNote, setNotificationNote] = useState('')

  const groupOptions = useMemo(() => ['All', ...new Set(notificationItems.map((i) => i.notificationGroup))], [])
  const statusOptions = useMemo(() => ['All', ...new Set(notificationItems.map((i) => i.notificationStatus))], [])
  const filteredNotifications = useMemo(() => notificationItems.filter((i) =>
    (selectedGroup === 'All' || i.notificationGroup === selectedGroup) &&
    (selectedStatus === 'All' || i.notificationStatus === selectedStatus)
  ), [selectedGroup, selectedStatus])

  const selectedNotification = filteredNotifications.find((i) => i.id === selectedNotificationId) || filteredNotifications[0] || notificationItems[0]

  useEffect(() => {
    setNotificationDraft(selectedNotification.notificationStatus)
    setNotificationNote(`Draft note: ${selectedNotification.recommendedResponse}`)
  }, [selectedNotification.id])

  const n1Count = filteredNotifications.filter((i) => i.priority === 'N1').length
  const unreadCount = filteredNotifications.filter((i) => i.notificationStatus === 'Unread').length
  const averageUrgency = filteredNotifications.length ? Math.round(filteredNotifications.reduce((s, i) => s + i.urgencyScore, 0) / filteredNotifications.length) : 0

  const queueStatusData = useMemo(() => [
    { name: 'Unread', value: filteredNotifications.filter((i) => i.notificationStatus === 'Unread').length, fill: T.red },
    { name: 'In Progress', value: filteredNotifications.filter((i) => i.notificationStatus === 'In Progress').length, fill: T.amber },
    { name: 'Flagged', value: filteredNotifications.filter((i) => i.notificationStatus === 'Flagged').length, fill: T.purple },
    { name: 'Resolved', value: filteredNotifications.filter((i) => i.notificationStatus === 'Resolved').length, fill: T.green },
  ].filter((item) => item.value > 0), [filteredNotifications])

  const urgencyData = useMemo(() => filteredNotifications.slice(0, 5).map((item) => ({
    name: item.title.slice(0, 18),
    urgency: item.urgencyScore,
    confidence: item.confidence,
  })), [filteredNotifications])

  const selectedLogs = selectedNotification.notificationLog || []

  return (
    <div style={{ fontFamily: FONT_BODY, color: T.text, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section style={{ ...cardStyle, padding: 22, background: 'linear-gradient(135deg, #161232 0%, #0e1224 55%, #0a0e1c 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 660 }}>
            <span style={{ ...tone(T.purple), display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>S2D 360 · Notification Center</span>
            <h1 style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, margin: '14px 0 0' }}>Notification Center</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: '8px 0 0' }}>One operational queue for alerts, review requests, workflow follow-ups, export notices, admin approvals and access-control actions.</p>
          </div>
          <div style={{ ...cardStyle, background: 'rgba(0,0,0,0.25)', padding: 16, minWidth: 210 }}>
            <div style={eyebrow}>Notification mode</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 600, color: T.purple, marginTop: 8 }}>Alert · Assign · Resolve</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>Signal · Evidence · Workflow · Access</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 18 }}>
          <StatCard label="Notifications" value={filteredNotifications.length} note="Items in selected view" />
          <StatCard label="N1 priority" value={n1Count} note="Critical action items" />
          <StatCard label="Unread" value={unreadCount} note="Needs immediate attention" />
          <StatCard label="Avg urgency" value={`${averageUrgency}%`} note="Average urgency score" />
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <Panel title="Queue distribution" accent={T.purple}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={queueStatusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke={T.card}>
                  {queueStatusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
              {queueStatusData.map((entry) => <Badge key={entry.name} color={entry.fill}>{entry.name} · {entry.value}</Badge>)}
            </div>
          </Panel>

          <Panel title="Urgency trend" accent={T.teal}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={urgencyData} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
                <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: T.sub, fontSize: 11 }} tickLine={false} axisLine={{ stroke: T.border }} />
                <YAxis tick={{ fill: T.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 12 }} />
                <Bar dataKey="urgency" fill={T.red} radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>
          <FilterGroup title="Notification group" sub="Filter notifications by operational category." options={groupOptions} value={selectedGroup} onChange={setSelectedGroup} accent={T.purple} />
          <FilterGroup title="Notification status" sub="Filter by current notification status." options={statusOptions} value={selectedStatus} onChange={setSelectedStatus} accent={T.cyan} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, alignItems: 'start' }}>
        <section style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 600, margin: 0 }}>Notification queue</h2>
              <p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>Select an item to inspect trigger, role, action path and evidence.</p>
            </div>
            <span style={{ ...cardStyle, background: T.bg2, padding: '5px 11px', fontSize: 11, color: T.sub }}>{selectedGroup} · {selectedStatus}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredNotifications.map((item) => {
              const on = selectedNotification.id === item.id
              return (
                <button key={item.id} onClick={() => setSelectedNotificationId(item.id)} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 16, padding: 16, border: `1px solid ${on ? T.purple : T.border}`, background: on ? `${T.purple}12` : T.bg2, transition: 'all .15s', color: T.text }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                        <Chip color={priorityColor(item.priority)}>{item.priority}</Chip>
                        <Chip color={severityColor(item.severity)}>{item.severity}</Chip>
                        <Chip color={statusColor(item.notificationStatus)}>{item.notificationStatus}</Chip>
                      </div>
                      <h3 style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, margin: '12px 0 0' }}>{item.title}</h3>
                      <p style={{ fontSize: 11.5, color: T.purple, margin: '5px 0 0' }}>{item.notificationGroup} · Assigned to: {item.assignedRole}</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: '11px 0 0' }}>{item.executiveSummary}</p>
                    </div>
                    <div style={{ minWidth: 130 }}>
                      <div style={{ fontSize: 11, color: T.muted }}>Urgency score</div>
                      <div style={{ fontFamily: FONT_HEAD, fontSize: 27, fontWeight: 700, color: urgencyColor(item.urgencyScore), marginTop: 4 }}>{item.urgencyScore}%</div>
                      <div style={{ height: 7, borderRadius: 999, background: T.bg2, marginTop: 9, overflow: 'hidden' }}>
                        <div style={{ width: `${item.urgencyScore}%`, height: '100%', background: urgencyColor(item.urgencyScore) }} />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 600, margin: 0 }}>Notification brief</h2>
              <p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>Selected summary and response guidance.</p>
            </div>
            <Badge color={statusColor(selectedNotification.notificationStatus)}>{selectedNotification.notificationStatus}</Badge>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...cardStyle, background: T.bg2, padding: 14 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>{selectedNotification.title}</div>
              <div style={{ fontSize: 12, color: T.purple, marginTop: 6 }}>{selectedNotification.notificationGroup} · {selectedNotification.assignedRole}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: T.sub, marginTop: 10 }}>{selectedNotification.executiveSummary}</div>
              <div style={{ marginTop: 14, ...cardStyle, background: 'rgba(167,139,250,0.10)', padding: 12 }}>
                <div style={{ fontSize: 10.5, color: T.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Recommended response</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: T.text }}>{selectedNotification.recommendedResponse}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <LinkCard label="Notification owner" value={selectedNotification.notificationOwner} />
              <LinkCard label="Trigger module" value={selectedNotification.triggerModule} />
              <LinkCard label="Target module" value={selectedNotification.targetModule} />
              <LinkCard label="Confidence" value={`${selectedNotification.confidence}%`} />
            </div>

            <MiniTimeline rows={selectedLogs} />
          </div>
        </section>
      </div>
    </div>
  )
}
