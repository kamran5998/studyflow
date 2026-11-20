import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useStudyFlow } from "../../context/StudyFlowContext";

export const WeeklyStudyChart: React.FC = () => {
  const { setActivePage, theme, focusSessions } = useStudyFlow();

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayMinutesMap: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  focusSessions.forEach((session) => {
    try {
      const rawDate = session.timestamp || (session as unknown as { date?: string }).date;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;
      const sessionDayMidnight = new Date(d);
      sessionDayMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (todayMidnight.getTime() - sessionDayMidnight.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0 || diffDays > 6) return;

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[d.getDay()];
      if (dayMinutesMap[dayName] !== undefined) {
        dayMinutesMap[dayName] += Number(session.durationMinutes) || 0;
      }
    } catch {
      // ignore invalid date
    }
  });

  const data = daysOfWeek.map((day) => {
    const mins = dayMinutesMap[day] || 0;
    const hours = Number((mins / 60).toFixed(1));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return {
      day,
      hours,
      label: `${h}h ${m < 10 ? "0" + m : m}m`,
      rawMins: mins,
    };
  });

  const totalWeekMins = Object.values(dayMinutesMap).reduce((a, b) => a + b, 0);
  const avgFormatted = `${Math.floor(totalWeekMins / 7 / 60)}h ${Math.round(
    (totalWeekMins / 7) % 60
  )}m Avg`;

  const highestDay = [...data].sort((a, b) => b.rawMins - a.rawMins)[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#22211F] text-[#FAF9F6] text-[11px] px-2.5 py-1.5 rounded-lg shadow-md border border-[#32302B]">
          <div className="font-semibold">{payload[0].payload.day}</div>
          <div className="text-[#E0983B] font-mono tabular-nums">
            {payload[0].payload.label}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B]">
          <div>
            <h3 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
              Weekly Focus Velocity
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
              Study hours distribution
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
              {totalWeekMins > 0 ? avgFormatted : "0h 00m Avg"}
            </div>
            <div className="text-[10px] font-mono text-[#9A948A] tabular-nums">
              {totalWeekMins > 0 ? `${(totalWeekMins / 60).toFixed(1)}h total` : "0 sessions"}
            </div>
          </div>
        </div>

        <div className="h-40 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: theme === "dark" ? "#7A756C" : "#9A948A" }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill:
                    theme === "dark"
                      ? "rgba(213, 138, 42, 0.08)"
                      : "rgba(233, 229, 222, 0.45)",
                }}
              />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.rawMins > 0
                        ? "#D58A2A"
                        : theme === "dark"
                        ? "#2C2A25"
                        : "#EAE6DD"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-xs text-[#78736A] dark:text-[#A6A096]">
        <span className="truncate max-w-[180px]">
          {highestDay && highestDay.rawMins > 0
            ? `Peak: ${highestDay.hours}h on ${highestDay.day}`
            : "Complete focus blocks to track"}
        </span>
        <button
          onClick={() => setActivePage("analytics")}
          className="text-[#B46914] dark:text-[#E0983B] hover:underline font-medium cursor-pointer"
        >
          Analytics
        </button>
      </div>
    </div>
  );
};
