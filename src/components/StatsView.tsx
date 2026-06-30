import { useMemo } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Flame,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../store';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bgColor: string;
}

function StatCard({ icon, label, value, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatsView() {
  const { tasks } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Week boundaries (Monday to Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.toISOString().split('T')[0];

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const completedThisWeek = tasks.filter(
      (t) => t.isCompleted && t.completedAt && t.completedAt.split('T')[0] >= weekStart
    ).length;

    const completedThisMonth = tasks.filter(
      (t) => t.isCompleted && t.completedAt && t.completedAt.split('T')[0] >= monthStart
    ).length;

    const totalCompleted = tasks.filter((t) => t.isCompleted).length;
    const totalTasks = tasks.length;

    // Streak
    let streak = 0;
    const completedDates = new Set(
      tasks
        .filter((t) => t.isCompleted && t.completedAt)
        .map((t) => t.completedAt!.split('T')[0])
    );

    const checkDate = new Date(now);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Daily data for past 7 days
    const dailyData: { date: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('zh-CN', { weekday: 'short' });
      const count = tasks.filter(
        (t) => t.isCompleted && t.completedAt && t.completedAt.split('T')[0] === dateStr
      ).length;
      dailyData.push({ date: dateStr, label: dayLabel, count });
    }

    const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

    return {
      completedThisWeek,
      completedThisMonth,
      totalCompleted,
      totalTasks,
      streak,
      dailyData,
      maxDaily,
    };
  }, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <BarChart3 size={22} className="text-[#DC4C3E]" />
        效率统计
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle2 size={20} className="text-green-600" />}
          label="本周完成"
          value={stats.completedThisWeek}
          bgColor="#ECFDF5"
        />
        <StatCard
          icon={<CalendarDays size={20} className="text-blue-600" />}
          label="本月完成"
          value={stats.completedThisMonth}
          bgColor="#EFF6FF"
        />
        <StatCard
          icon={<Flame size={20} className="text-orange-500" />}
          label="连续完成天数"
          value={stats.streak}
          bgColor="#FFF7ED"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-[#DC4C3E]" />}
          label="总完成率"
          value={
            stats.totalTasks > 0
              ? `${Math.round((stats.totalCompleted / stats.totalTasks) * 100)}%`
              : '0%'
          }
          bgColor="#FEF2F2"
        />
      </div>

      {/* Weekly trend chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-6">近7天完成趋势</h2>
        <div className="flex items-end gap-3 h-40">
          {stats.dailyData.map((day) => {
            const heightPercent =
              stats.maxDaily > 0 ? (day.count / stats.maxDaily) * 100 : 0;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium">
                  {day.count > 0 ? day.count : ''}
                </span>
                <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                  <div
                    className="w-full max-w-[32px] rounded-t-md transition-all duration-500 ease-out"
                    style={{
                      height: `${Math.max(heightPercent, day.count > 0 ? 8 : 2)}%`,
                      backgroundColor: isToday
                        ? '#DC4C3E'
                        : day.count > 0
                        ? '#DC4C3E80'
                        : '#E5E7EB',
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] ${
                    isToday ? 'text-[#DC4C3E] font-bold' : 'text-gray-400'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">任务概览</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">总任务数</span>
            <span className="text-sm font-medium text-gray-800">{stats.totalTasks}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">已完成</span>
            <span className="text-sm font-medium text-green-600">{stats.totalCompleted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">进行中</span>
            <span className="text-sm font-medium text-blue-600">
              {stats.totalTasks - stats.totalCompleted}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#DC4C3E] rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.totalTasks > 0
                    ? Math.round((stats.totalCompleted / stats.totalTasks) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center">
            完成率{' '}
            {stats.totalTasks > 0
              ? Math.round((stats.totalCompleted / stats.totalTasks) * 100)
              : 0}
            %
          </p>
        </div>
      </div>
    </div>
  );
}
