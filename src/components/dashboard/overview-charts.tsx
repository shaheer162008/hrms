"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const statusColors = ["#d28b51", "#bd6956", "#205c49", "#839783"];

type ChartDatum = { label: string; value: number };

export function OverviewCharts({
  peopleData,
  leaveData,
  peopleLabel,
}: {
  peopleData: ChartDatum[];
  leaveData: ChartDatum[];
  peopleLabel: string;
}) {
  const hasPeople = peopleData.some((entry) => entry.value > 0);
  const hasLeave = leaveData.some((entry) => entry.value > 0);

  return (
    <div className="content-grid equal">
      <section className="panel">
        <div className="panel-heading">
          <div><h2>{peopleLabel}</h2><p>Active employee distribution</p></div>
        </div>
        <div className="panel-body">
          {hasPeople ? (
            <div className="chart-wrap" role="img" aria-label={peopleLabel}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peopleData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#edf0eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7c8a80", fontSize: 9 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8a958d", fontSize: 9 }} />
                  <Tooltip cursor={{ fill: "#f4f6f0" }} />
                  <Bar dataKey="value" name="Employees" fill="#205c49" radius={[4, 4, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="chart-empty">No employee records in this scope yet.</div>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>Time-off requests</h2><p>Current request status in your scope</p></div>
        </div>
        <div className="panel-body">
          {hasLeave ? (
            <>
              <div className="chart-wrap" role="img" aria-label="Leave requests by status">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leaveData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={83} paddingAngle={3}>
                      {leaveData.map((entry, index) => <Cell key={entry.label} fill={statusColors[index % statusColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {leaveData.map((entry, index) => (
                  <span key={entry.label}><i style={{ background: statusColors[index % statusColors.length] }} />{entry.label}: {entry.value}</span>
                ))}
              </div>
            </>
          ) : <div className="chart-empty">No leave requests have been submitted.</div>}
        </div>
      </section>
    </div>
  );
}