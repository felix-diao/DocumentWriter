import { Edit2, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: 'meeting' | 'task' | 'reminder' | 'other';
  color: string;
}

const eventTypes = [
  { label: '会议', value: 'meeting', color: '#3b82f6' },
  { label: '任务', value: 'task', color: '#10b981' },
  { label: '提醒', value: 'reminder', color: '#f59e0b' },
  { label: '其他', value: 'other', color: '#6b7280' },
];

const CalendarManagement: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: '团队周会',
      start: new Date(2025, 9, 13, 10),
      end: new Date(2025, 9, 13, 11),
      type: 'meeting',
      color: '#3b82f6',
      description: '讨论本周工作进展',
    },
    {
      id: '2',
      title: '项目截止日',
      start: new Date(2025, 9, 15, 9),
      end: new Date(2025, 9, 15, 18),
      type: 'task',
      color: '#10b981',
      description: '完成项目第一阶段开发',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: '',
    type: 'other' as CalendarEvent['type'],
  });

  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);

  /** ================== 工具函数 ================== **/
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const handlePrevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  const handleNextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 生成整个月份日期数组（包含前后空格，保证 5*7 或 6*7 格子）
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // 前面空格
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    // 当月日期
    for (let i = 1; i <= lastDay.getDate(); i++)
      days.push(new Date(year, month, i));
    // 补齐成完整周
    while (days.length % 7 !== 0) days.push(null);

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    let filteredEvents = events.filter(
      (event) => event.start.toDateString() === date.toDateString(),
    );

    if (!showMeetings) {
      filteredEvents = filteredEvents.filter((e) => e.type !== 'meeting');
    }
    if (!showTasks) {
      filteredEvents = filteredEvents.filter((e) => e.type !== 'task');
    }

    return filteredEvents;
  };

  /** ================== Modal 操作 ================== **/
  const openCreateModal = () => {
    setEditingEvent(null);
    const now = selectedDate;
    setFormData({
      title: '',
      startDate: now.toISOString().split('T')[0],
      startTime: '09:00',
      endDate: now.toISOString().split('T')[0],
      endTime: '10:00',
      description: '',
      type: 'other',
    });
    setShowModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      startDate: event.start.toISOString().split('T')[0],
      startTime: formatTime(event.start),
      endDate: event.end.toISOString().split('T')[0],
      endTime: formatTime(event.end),
      description: event.description || '',
      type: event.type,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return alert('请输入事件标题');
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    if (end <= start) return alert('结束时间必须晚于开始时间');

    const color =
      eventTypes.find((t) => t.value === formData.type)?.color || '#6b7280';

    if (editingEvent) {
      setEvents(
        events.map((e) =>
          e.id === editingEvent.id
            ? {
                ...e,
                title: formData.title,
                start,
                end,
                description: formData.description,
                type: formData.type,
                color,
              }
            : e,
        ),
      );
    } else {
      setEvents([
        ...events,
        {
          id: Date.now().toString(),
          title: formData.title,
          start,
          end,
          description: formData.description,
          type: formData.type,
          color,
        },
      ]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除吗？')) setEvents(events.filter((e) => e.id !== id));
  };

  /** ================== 渲染日历网格 ================== **/
  const renderCalendarGrid = (
    days: (Date | null)[],
    isSmall: boolean = false,
  ) => {
    let filteredDays = days;
    let weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    if (!showWeekends) {
      filteredDays = [];
      weekdays = ['一', '二', '三', '四', '五'];
      for (let i = 0; i < days.length; i++) {
        const weekdayIdx = i % 7;
        if (weekdayIdx !== 0 && weekdayIdx !== 6) {
          filteredDays.push(days[i]);
        }
      }
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${weekdays.length}, 1fr)`,
          gap: '4px',
        }}
      >
        {weekdays.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontWeight: '600',
              fontSize: isSmall ? '11px' : '14px',
              padding: isSmall ? '4px 0' : '8px 0',
              color: '#4b5563',
            }}
          >
            {d}
          </div>
        ))}
        {filteredDays.map((day, idx) => {
          const dayEvents = day ? getEventsForDate(day) : [];
          const isToday =
            day && day.toDateString() === new Date().toDateString();
          const isSelected =
            day && day.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={day ? day.toISOString() : `empty-${idx}`}
              onClick={() => day && setSelectedDate(day)}
              style={{
                minHeight: isSmall ? '28px' : '112px',
                border: '1px solid',
                borderColor: !day
                  ? '#e5e7eb'
                  : isSelected
                    ? '#60a5fa'
                    : isToday
                      ? '#fbbf24'
                      : '#e5e7eb',
                borderRadius: isSmall ? '4px' : '6px',
                padding: isSmall ? '2px' : '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: !day
                  ? '#f9fafb'
                  : isSelected
                    ? '#eff6ff'
                    : isToday
                      ? '#fef3c7'
                      : '#ffffff',
              }}
              onMouseEnter={(e) => {
                if (day && !isSelected && !isToday) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (day && !isSelected && !isToday) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              {day && (
                <>
                  <div
                    style={{
                      fontSize: isSmall ? '11px' : '14px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: isToday
                        ? '#b45309'
                        : isSelected
                          ? '#1d4ed8'
                          : '#374151',
                    }}
                  >
                    {day.getDate()}
                  </div>
                  {!isSmall && (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            backgroundColor: ev.color,
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'box-shadow 0.2s',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(ev);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                            }}
                          >
                            {ev.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              opacity: 0.9,
                              marginLeft: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatTime(ev.start)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
          {/* 左侧小日历 */}
          <div
            style={{
              width: '280px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div className="bg-white rounded-xl shadow p-3">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '300' }}>‹</span>
                </button>
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {monthName}
                </h2>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '300' }}>›</span>
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  今
                </button>
              </div>
              {renderCalendarGrid(days, true)}
            </div>

            {/* 筛选按钮 */}
            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">
                我的日历
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showMeetings}
                    onChange={(e) => setShowMeetings(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    会议信息
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showTasks}
                    onChange={(e) => setShowTasks(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    待办任务
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(e) => setShowWeekends(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    显示周末
                  </span>
                </label>
              </div>
            </div>

            {/* 当日事件列表 */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-gray-800">
                  {selectedDate.toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-700 transition-colors"
                >
                  <Plus size={12} /> 新建
                </button>
              </div>
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">
                  暂无事件
                </p>
              ) : (
                <ul className="space-y-2">
                  {getEventsForDate(selectedDate).map((ev) => (
                    <li
                      key={ev.id}
                      className="border-l-4 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all cursor-pointer"
                      style={{ borderLeftColor: ev.color }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs text-gray-800 flex-1">
                          {ev.title}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(ev);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Edit2 size={14} className="text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(ev.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <span>{formatTime(ev.start)}</span>
                        <span>-</span>
                        <span>{formatTime(ev.end)}</span>
                      </div>
                      {ev.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {ev.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 右侧大日历 */}
          <div
            style={{ flex: 1, minWidth: 0 }}
            className="bg-white rounded-xl shadow p-6"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '24px',
                gap: '32px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    fontSize: '28px',
                    fontWeight: '300',
                  }}
                >
                  ‹
                </button>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {monthName}
                </h2>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    fontSize: '28px',
                    fontWeight: '300',
                  }}
                >
                  ›
                </button>
              </div>

              <div
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    padding: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      backgroundColor:
                        viewMode === 'month' ? '#ffffff' : 'transparent',
                      color: viewMode === 'month' ? '#111827' : '#4b5563',
                      boxShadow:
                        viewMode === 'month'
                          ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          : 'none',
                    }}
                  >
                    月
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      backgroundColor:
                        viewMode === 'day' ? '#ffffff' : 'transparent',
                      color: viewMode === 'day' ? '#111827' : '#4b5563',
                      boxShadow:
                        viewMode === 'day'
                          ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          : 'none',
                    }}
                  >
                    天
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleToday}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  今天
                </button>
              </div>
            </div>
            {viewMode === 'month' ? (
              renderCalendarGrid(days, false)
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedDate.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </h3>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-400 text-center py-12">暂无事件</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map((ev) => (
                      <div
                        key={ev.id}
                        className="border-l-4 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer"
                        style={{ borderLeftColor: ev.color }}
                        onClick={() => openEditModal(ev)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-base text-gray-800">
                            {ev.title}
                          </h4>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(ev);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Edit2 size={16} className="text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ev.id);
                              }}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                          <span>{formatTime(ev.start)}</span>
                          <span>-</span>
                          <span>{formatTime(ev.end)}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${ev.color}20`,
                              color: ev.color,
                            }}
                          >
                            {eventTypes.find((t) => t.value === ev.type)?.label}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-sm text-gray-600">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingEvent ? '编辑事件' : '新建事件'}
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="eventTitle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  事件标题
                </label>
                <input
                  id="eventTitle"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="请输入事件标题"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="eventStartDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    开始日期
                  </label>
                  <input
                    id="eventStartDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="eventStartTime"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    开始时间
                  </label>
                  <input
                    id="eventStartTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="eventEndDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    结束日期
                  </label>
                  <input
                    id="eventEndDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="eventEndTime"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    结束时间
                  </label>
                  <input
                    id="eventEndTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="eventType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  事件类型
                </label>
                <select
                  id="eventType"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as CalendarEvent['type'],
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {eventTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="eventDescription"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  描述
                </label>
                <textarea
                  id="eventDescription"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="请输入事件描述（可选）"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarManagement;
