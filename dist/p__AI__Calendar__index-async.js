((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__AI__Calendar__index'],
{ "src/pages/AI/Calendar/index.tsx": function (module, exports, __mako_require__){
"use strict";
__mako_require__.d(exports, "__esModule", {
    value: true
});
__mako_require__.d(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _jsxdevruntime = __mako_require__("node_modules/react/jsx-dev-runtime.js");
var _lucidereact = __mako_require__("node_modules/lucide-react/dist/esm/lucide-react.js");
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const eventTypes = [
    {
        label: '会议',
        value: 'meeting',
        color: '#3b82f6'
    },
    {
        label: '任务',
        value: 'task',
        color: '#10b981'
    },
    {
        label: '提醒',
        value: 'reminder',
        color: '#f59e0b'
    },
    {
        label: '其他',
        value: 'other',
        color: '#6b7280'
    }
];
const CalendarManagement = ()=>{
    _s();
    const [currentDate, setCurrentDate] = (0, _react.useState)(new Date());
    const [selectedDate, setSelectedDate] = (0, _react.useState)(new Date());
    const [events, setEvents] = (0, _react.useState)([
        {
            id: '1',
            title: '团队周会',
            start: new Date(2025, 9, 13, 10),
            end: new Date(2025, 9, 13, 11),
            type: 'meeting',
            color: '#3b82f6',
            description: '讨论本周工作进展'
        },
        {
            id: '2',
            title: '项目截止日',
            start: new Date(2025, 9, 15, 9),
            end: new Date(2025, 9, 15, 18),
            type: 'task',
            color: '#10b981',
            description: '完成项目第一阶段开发'
        }
    ]);
    const [showModal, setShowModal] = (0, _react.useState)(false);
    const [editingEvent, setEditingEvent] = (0, _react.useState)(null);
    const [formData, setFormData] = (0, _react.useState)({
        title: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        description: '',
        type: 'other'
    });
    const [viewMode, setViewMode] = (0, _react.useState)('month');
    const [showMeetings, setShowMeetings] = (0, _react.useState)(true);
    const [showTasks, setShowTasks] = (0, _react.useState)(true);
    const [showWeekends, setShowWeekends] = (0, _react.useState)(true);
    const formatTime = (date)=>date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    const handlePrevMonth = ()=>setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const handleNextMonth = ()=>setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    const handleToday = ()=>{
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };
    const getDaysInMonth = (date)=>{
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for(let i = 0; i < firstDay.getDay(); i++)days.push(null);
        for(let i = 1; i <= lastDay.getDate(); i++)days.push(new Date(year, month, i));
        while(days.length % 7 !== 0)days.push(null);
        return days;
    };
    const getEventsForDate = (date)=>{
        if (!date) return [];
        let filteredEvents = events.filter((event)=>event.start.toDateString() === date.toDateString());
        if (!showMeetings) filteredEvents = filteredEvents.filter((e)=>e.type !== 'meeting');
        if (!showTasks) filteredEvents = filteredEvents.filter((e)=>e.type !== 'task');
        return filteredEvents;
    };
    const openCreateModal = ()=>{
        setEditingEvent(null);
        const now = selectedDate;
        setFormData({
            title: '',
            startDate: now.toISOString().split('T')[0],
            startTime: '09:00',
            endDate: now.toISOString().split('T')[0],
            endTime: '10:00',
            description: '',
            type: 'other'
        });
        setShowModal(true);
    };
    const openEditModal = (event)=>{
        setEditingEvent(event);
        setFormData({
            title: event.title,
            startDate: event.start.toISOString().split('T')[0],
            startTime: formatTime(event.start),
            endDate: event.end.toISOString().split('T')[0],
            endTime: formatTime(event.end),
            description: event.description || '',
            type: event.type
        });
        setShowModal(true);
    };
    const handleSave = ()=>{
        var _eventTypes_find;
        if (!formData.title.trim()) return alert('请输入事件标题');
        const start = new Date(`${formData.startDate}T${formData.startTime}`);
        const end = new Date(`${formData.endDate}T${formData.endTime}`);
        if (end <= start) return alert('结束时间必须晚于开始时间');
        const color = ((_eventTypes_find = eventTypes.find((t)=>t.value === formData.type)) === null || _eventTypes_find === void 0 ? void 0 : _eventTypes_find.color) || '#6b7280';
        if (editingEvent) setEvents(events.map((e)=>e.id === editingEvent.id ? {
                ...e,
                title: formData.title,
                start,
                end,
                description: formData.description,
                type: formData.type,
                color
            } : e));
        else setEvents([
            ...events,
            {
                id: Date.now().toString(),
                title: formData.title,
                start,
                end,
                description: formData.description,
                type: formData.type,
                color
            }
        ]);
        setShowModal(false);
    };
    const handleDelete = (id)=>{
        if (confirm('确定删除吗？')) setEvents(events.filter((e)=>e.id !== id));
    };
    const renderCalendarGrid = (days, isSmall = false)=>{
        let filteredDays = days;
        let weekdays = [
            '日',
            '一',
            '二',
            '三',
            '四',
            '五',
            '六'
        ];
        if (!showWeekends) {
            filteredDays = [];
            weekdays = [
                '一',
                '二',
                '三',
                '四',
                '五'
            ];
            for(let i = 0; i < days.length; i++){
                const weekdayIdx = i % 7;
                if (weekdayIdx !== 0 && weekdayIdx !== 6) filteredDays.push(days[i]);
            }
        }
        return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
            style: {
                display: 'grid',
                gridTemplateColumns: `repeat(${weekdays.length}, 1fr)`,
                gap: '4px'
            },
            children: [
                weekdays.map((d)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            textAlign: 'center',
                            fontWeight: '600',
                            fontSize: isSmall ? '11px' : '14px',
                            padding: isSmall ? '4px 0' : '8px 0',
                            color: '#4b5563'
                        },
                        children: d
                    }, d, false, {
                        fileName: "src/pages/AI/Calendar/index.tsx",
                        lineNumber: 211,
                        columnNumber: 11
                    }, this)),
                filteredDays.map((day, idx)=>{
                    const dayEvents = day ? getEventsForDate(day) : [];
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    const isSelected = day && day.toDateString() === selectedDate.toDateString();
                    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        onClick: ()=>day && setSelectedDate(day),
                        style: {
                            minHeight: isSmall ? '28px' : '112px',
                            border: '1px solid',
                            borderColor: !day ? '#e5e7eb' : isSelected ? '#60a5fa' : isToday ? '#fbbf24' : '#e5e7eb',
                            borderRadius: isSmall ? '4px' : '6px',
                            padding: isSmall ? '2px' : '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: !day ? '#f9fafb' : isSelected ? '#eff6ff' : isToday ? '#fef3c7' : '#ffffff'
                        },
                        onMouseEnter: (e)=>{
                            if (day && !isSelected && !isToday) e.currentTarget.style.backgroundColor = '#f9fafb';
                        },
                        onMouseLeave: (e)=>{
                            if (day && !isSelected && !isToday) e.currentTarget.style.backgroundColor = '#ffffff';
                        },
                        children: day && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_jsxdevruntime.Fragment, {
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        fontSize: isSmall ? '11px' : '14px',
                                        fontWeight: '600',
                                        marginBottom: '4px',
                                        color: isToday ? '#b45309' : isSelected ? '#1d4ed8' : '#374151'
                                    },
                                    children: day.getDate()
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 271,
                                    columnNumber: 19
                                }, this),
                                !isSmall && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        overflow: 'hidden'
                                    },
                                    children: dayEvents.map((ev)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
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
                                                transition: 'box-shadow 0.2s'
                                            },
                                            onClick: (e)=>{
                                                e.stopPropagation();
                                                openEditModal(ev);
                                            },
                                            onMouseEnter: (e)=>{
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                            },
                                            onMouseLeave: (e)=>{
                                                e.currentTarget.style.boxShadow = 'none';
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                    style: {
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        flex: 1
                                                    },
                                                    children: ev.title
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 325,
                                                    columnNumber: 27
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                    style: {
                                                        fontSize: '10px',
                                                        opacity: 0.9,
                                                        marginLeft: '4px',
                                                        whiteSpace: 'nowrap'
                                                    },
                                                    children: formatTime(ev.start)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 334,
                                                    columnNumber: 27
                                                }, this)
                                            ]
                                        }, ev.id, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 296,
                                            columnNumber: 25
                                        }, this))
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 286,
                                    columnNumber: 21
                                }, this)
                            ]
                        }, void 0, true)
                    }, day ? day.toISOString() : `empty-${idx}`, false, {
                        fileName: "src/pages/AI/Calendar/index.tsx",
                        lineNumber: 232,
                        columnNumber: 13
                    }, this);
                })
            ]
        }, void 0, true, {
            fileName: "src/pages/AI/Calendar/index.tsx",
            lineNumber: 203,
            columnNumber: 7
        }, this);
    };
    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long'
    });
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        style: {
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
            padding: '24px'
        },
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    maxWidth: '1280px',
                    margin: '0 auto'
                },
                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                    style: {
                        display: 'flex',
                        gap: '24px',
                        flexDirection: 'row'
                    },
                    children: [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            style: {
                                width: '280px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                flexShrink: 0
                            },
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginBottom: '8px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handlePrevMonth,
                                                    style: {
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#6b7280',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: 'none'
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                        style: {
                                                            fontSize: '18px',
                                                            fontWeight: '300'
                                                        },
                                                        children: "‹"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 414,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 399,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h2", {
                                                    style: {
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        color: '#1f2937',
                                                        margin: '0 8px',
                                                        whiteSpace: 'nowrap'
                                                    },
                                                    children: monthName
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 416,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handleNextMonth,
                                                    style: {
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#6b7280',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: 'none'
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                        style: {
                                                            fontSize: '18px',
                                                            fontWeight: '300'
                                                        },
                                                        children: "›"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 442,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 427,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handleToday,
                                                    style: {
                                                        marginLeft: '8px',
                                                        padding: '2px 8px',
                                                        fontSize: '12px',
                                                        backgroundColor: '#dbeafe',
                                                        color: '#1e40af',
                                                        borderRadius: '4px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: '500'
                                                    },
                                                    children: "今"
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 444,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 391,
                                            columnNumber: 15
                                        }, this),
                                        renderCalendarGrid(days, true)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 383,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h3", {
                                            style: {
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#4b5563',
                                                marginBottom: '8px'
                                            },
                                            children: "我的日历"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 474,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        cursor: 'pointer'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                            type: "checkbox",
                                                            checked: showMeetings,
                                                            onChange: (e)=>setShowMeetings(e.target.checked),
                                                            style: {
                                                                width: '16px',
                                                                height: '16px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 495,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                            style: {
                                                                fontSize: '14px',
                                                                color: '#374151'
                                                            },
                                                            children: "会议信息"
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 501,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 487,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        cursor: 'pointer'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                            type: "checkbox",
                                                            checked: showTasks,
                                                            onChange: (e)=>setShowTasks(e.target.checked),
                                                            style: {
                                                                width: '16px',
                                                                height: '16px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 513,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                            style: {
                                                                fontSize: '14px',
                                                                color: '#374151'
                                                            },
                                                            children: "待办任务"
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 519,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 505,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        cursor: 'pointer'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                            type: "checkbox",
                                                            checked: showWeekends,
                                                            onChange: (e)=>setShowWeekends(e.target.checked),
                                                            style: {
                                                                width: '16px',
                                                                height: '16px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 531,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                            style: {
                                                                fontSize: '14px',
                                                                color: '#374151'
                                                            },
                                                            children: "显示周末"
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 537,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 523,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 484,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 466,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                        padding: '12px',
                                        maxHeight: '300px',
                                        overflowY: 'auto'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '8px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h2", {
                                                    style: {
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        color: '#1f2937'
                                                    },
                                                    children: selectedDate.toLocaleDateString('zh-CN', {
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 563,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: openCreateModal,
                                                    style: {
                                                        padding: '4px 8px',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_lucidereact.Plus, {
                                                            size: 12
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 591,
                                                            columnNumber: 19
                                                        }, this),
                                                        " 新建"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 575,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 555,
                                            columnNumber: 15
                                        }, this),
                                        getEventsForDate(selectedDate).length === 0 ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                            style: {
                                                color: '#9ca3af',
                                                fontSize: '12px',
                                                textAlign: 'center',
                                                padding: '16px 0'
                                            },
                                            children: "暂无事件"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 595,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("ul", {
                                            style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                listStyle: 'none',
                                                padding: 0,
                                                margin: 0
                                            },
                                            children: getEventsForDate(selectedDate).map((ev)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("li", {
                                                    style: {
                                                        borderLeft: `4px solid ${ev.color}`,
                                                        borderRadius: '8px',
                                                        padding: '8px',
                                                        backgroundColor: '#f9fafb',
                                                        cursor: 'pointer'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'start',
                                                                marginBottom: '4px'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    style: {
                                                                        fontWeight: '600',
                                                                        fontSize: '12px',
                                                                        color: '#1f2937',
                                                                        flex: 1
                                                                    },
                                                                    children: ev.title
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 635,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                                    style: {
                                                                        display: 'flex',
                                                                        gap: '4px'
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                                            type: "button",
                                                                            onClick: (e)=>{
                                                                                e.stopPropagation();
                                                                                openEditModal(ev);
                                                                            },
                                                                            style: {
                                                                                padding: '4px',
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            },
                                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_lucidereact.Edit2, {
                                                                                size: 14,
                                                                                color: "#4b5563"
                                                                            }, void 0, false, {
                                                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                                                lineNumber: 661,
                                                                                columnNumber: 29
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                                            lineNumber: 646,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                                            type: "button",
                                                                            onClick: (e)=>{
                                                                                e.stopPropagation();
                                                                                handleDelete(ev.id);
                                                                            },
                                                                            style: {
                                                                                padding: '4px',
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            },
                                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_lucidereact.Trash2, {
                                                                                size: 14,
                                                                                color: "#ef4444"
                                                                            }, void 0, false, {
                                                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                                                lineNumber: 678,
                                                                                columnNumber: 29
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                                            lineNumber: 663,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 645,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 627,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                fontSize: '12px',
                                                                color: '#6b7280',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: formatTime(ev.start)
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 691,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: "-"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 692,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: formatTime(ev.end)
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 693,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 682,
                                                            columnNumber: 23
                                                        }, this),
                                                        ev.description && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                fontSize: '12px',
                                                                color: '#9ca3af',
                                                                marginTop: '4px'
                                                            },
                                                            children: ev.description
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 696,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, ev.id, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 617,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 606,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 545,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/Calendar/index.tsx",
                            lineNumber: 374,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            style: {
                                flex: 1,
                                minWidth: 0,
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                padding: '24px'
                            },
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: '16px',
                                        position: 'relative'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handlePrevMonth,
                                                    style: {
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#9ca3af',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: 'none',
                                                        transition: 'color 0.2s'
                                                    },
                                                    onMouseEnter: (e)=>{
                                                        e.currentTarget.style.color = '#4b5563';
                                                    },
                                                    onMouseLeave: (e)=>{
                                                        e.currentTarget.style.color = '#9ca3af';
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                        style: {
                                                            fontSize: '24px',
                                                            fontWeight: '300'
                                                        },
                                                        children: "‹"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 758,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 736,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h2", {
                                                    style: {
                                                        fontSize: '24px',
                                                        fontWeight: '700',
                                                        color: '#1f2937',
                                                        margin: 0,
                                                        whiteSpace: 'nowrap'
                                                    },
                                                    children: monthName
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 760,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handleNextMonth,
                                                    style: {
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#9ca3af',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: 'none',
                                                        transition: 'color 0.2s'
                                                    },
                                                    onMouseEnter: (e)=>{
                                                        e.currentTarget.style.color = '#4b5563';
                                                    },
                                                    onMouseLeave: (e)=>{
                                                        e.currentTarget.style.color = '#9ca3af';
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                        style: {
                                                            fontSize: '24px',
                                                            fontWeight: '300'
                                                        },
                                                        children: "›"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 793,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 771,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: handleToday,
                                                    style: {
                                                        padding: '6px 16px',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: '500',
                                                        fontSize: '14px',
                                                        whiteSpace: 'nowrap',
                                                        transition: 'background-color 0.2s'
                                                    },
                                                    onMouseEnter: (e)=>{
                                                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                                                    },
                                                    onMouseLeave: (e)=>{
                                                        e.currentTarget.style.backgroundColor = '#2563eb';
                                                    },
                                                    children: "今天"
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 795,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 733,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                position: 'absolute',
                                                right: 0,
                                                display: 'flex',
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: '8px',
                                                padding: '4px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: ()=>setViewMode('month'),
                                                    style: {
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        backgroundColor: viewMode === 'month' ? '#ffffff' : 'transparent',
                                                        color: viewMode === 'month' ? '#111827' : '#6b7280',
                                                        boxShadow: viewMode === 'month' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                                        transition: 'all 0.2s'
                                                    },
                                                    children: "月"
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 831,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                    type: "button",
                                                    onClick: ()=>setViewMode('day'),
                                                    style: {
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        backgroundColor: viewMode === 'day' ? '#ffffff' : 'transparent',
                                                        color: viewMode === 'day' ? '#111827' : '#6b7280',
                                                        boxShadow: viewMode === 'day' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                                        transition: 'all 0.2s'
                                                    },
                                                    children: "天"
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 854,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 821,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 724,
                                    columnNumber: 13
                                }, this),
                                viewMode === 'month' ? renderCalendarGrid(days, false) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h3", {
                                            style: {
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                color: '#1f2937'
                                            },
                                            children: selectedDate.toLocaleDateString('zh-CN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                weekday: 'long'
                                            })
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 889,
                                            columnNumber: 17
                                        }, this),
                                        getEventsForDate(selectedDate).length === 0 ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                            style: {
                                                color: '#9ca3af',
                                                textAlign: 'center',
                                                padding: '48px 0'
                                            },
                                            children: "暂无事件"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 904,
                                            columnNumber: 19
                                        }, this) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                            style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            },
                                            children: getEventsForDate(selectedDate).map((ev)=>{
                                                var _eventTypes_find;
                                                return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                    style: {
                                                        borderLeft: `4px solid ${ev.color}`,
                                                        borderRadius: '8px',
                                                        padding: '16px',
                                                        backgroundColor: '#f9fafb',
                                                        cursor: 'pointer'
                                                    },
                                                    onClick: ()=>openEditModal(ev),
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'start',
                                                                marginBottom: '8px'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h4", {
                                                                    style: {
                                                                        fontWeight: '600',
                                                                        fontSize: '16px',
                                                                        color: '#1f2937',
                                                                        margin: 0
                                                                    },
                                                                    children: ev.title
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 941,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                                    style: {
                                                                        display: 'flex',
                                                                        gap: '8px'
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                                            type: "button",
                                                                            onClick: (e)=>{
                                                                                e.stopPropagation();
                                                                                openEditModal(ev);
                                                                            },
                                                                            style: {
                                                                                padding: '6px',
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            },
                                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_lucidereact.Edit2, {
                                                                                size: 16,
                                                                                color: "#4b5563"
                                                                            }, void 0, false, {
                                                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                                                lineNumber: 967,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                                            lineNumber: 952,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                                                            type: "button",
                                                                            onClick: (e)=>{
                                                                                e.stopPropagation();
                                                                                handleDelete(ev.id);
                                                                            },
                                                                            style: {
                                                                                padding: '6px',
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            },
                                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_lucidereact.Trash2, {
                                                                                size: 16,
                                                                                color: "#ef4444"
                                                                            }, void 0, false, {
                                                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                                                lineNumber: 984,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                                            lineNumber: 969,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 951,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 933,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                fontSize: '14px',
                                                                color: '#6b7280',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '8px'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: formatTime(ev.start)
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 998,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: "-"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 999,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    children: formatTime(ev.end)
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 1000,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                    style: {
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '12px',
                                                                        backgroundColor: `${ev.color}20`,
                                                                        color: ev.color
                                                                    },
                                                                    children: (_eventTypes_find = eventTypes.find((t)=>t.value === ev.type)) === null || _eventTypes_find === void 0 ? void 0 : _eventTypes_find.label
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                                    lineNumber: 1001,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 988,
                                                            columnNumber: 25
                                                        }, this),
                                                        ev.description && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                                            style: {
                                                                fontSize: '14px',
                                                                color: '#6b7280',
                                                                margin: 0
                                                            },
                                                            children: ev.description
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                                            lineNumber: 1014,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, ev.id, true, {
                                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                                    lineNumber: 922,
                                                    columnNumber: 23
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Calendar/index.tsx",
                                            lineNumber: 914,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Calendar/index.tsx",
                                    lineNumber: 882,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/Calendar/index.tsx",
                            lineNumber: 714,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/AI/Calendar/index.tsx",
                    lineNumber: 372,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "src/pages/AI/Calendar/index.tsx",
                lineNumber: 371,
                columnNumber: 7
            }, this),
            showModal && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                },
                onClick: ()=>setShowModal(false),
                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                    style: {
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxWidth: '512px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    },
                    onClick: (e)=>e.stopPropagation(),
                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            padding: '24px',
                            overflowY: 'auto',
                            flex: 1
                        },
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("h2", {
                                style: {
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: '#1f2937',
                                    marginBottom: '24px',
                                    margin: 0
                                },
                                children: editingEvent ? '编辑事件' : '新建事件'
                            }, void 0, false, {
                                fileName: "src/pages/AI/Calendar/index.tsx",
                                lineNumber: 1068,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                htmlFor: "event-title",
                                                style: {
                                                    display: 'block',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    marginBottom: '4px'
                                                },
                                                children: "事件标题"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1087,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                type: "text",
                                                id: "event-title",
                                                value: formData.title,
                                                onChange: (e)=>setFormData({
                                                        ...formData,
                                                        title: e.target.value
                                                    }),
                                                placeholder: "请输入事件标题",
                                                style: {
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1099,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1086,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '16px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                        htmlFor: "event-start-date",
                                                        style: {
                                                            display: 'block',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: '#374151',
                                                            marginBottom: '4px'
                                                        },
                                                        children: "开始日期"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1126,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                        type: "date",
                                                        id: "event-start-date",
                                                        value: formData.startDate,
                                                        onChange: (e)=>setFormData({
                                                                ...formData,
                                                                startDate: e.target.value
                                                            }),
                                                        style: {
                                                            width: '100%',
                                                            padding: '8px 16px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1138,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1125,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                        htmlFor: "event-start-time",
                                                        style: {
                                                            display: 'block',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: '#374151',
                                                            marginBottom: '4px'
                                                        },
                                                        children: "开始时间"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1157,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                        type: "time",
                                                        id: "event-start-time",
                                                        value: formData.startTime,
                                                        onChange: (e)=>setFormData({
                                                                ...formData,
                                                                startTime: e.target.value
                                                            }),
                                                        style: {
                                                            width: '100%',
                                                            padding: '8px 16px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1169,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1156,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1118,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '16px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                        htmlFor: "event-end-date",
                                                        style: {
                                                            display: 'block',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: '#374151',
                                                            marginBottom: '4px'
                                                        },
                                                        children: "结束日期"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1196,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                        type: "date",
                                                        id: "event-end-date",
                                                        value: formData.endDate,
                                                        onChange: (e)=>setFormData({
                                                                ...formData,
                                                                endDate: e.target.value
                                                            }),
                                                        style: {
                                                            width: '100%',
                                                            padding: '8px 16px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1208,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1195,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                        htmlFor: "event-end-time",
                                                        style: {
                                                            display: 'block',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: '#374151',
                                                            marginBottom: '4px'
                                                        },
                                                        children: "结束时间"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1227,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("input", {
                                                        type: "time",
                                                        id: "event-end-time",
                                                        value: formData.endTime,
                                                        onChange: (e)=>setFormData({
                                                                ...formData,
                                                                endTime: e.target.value
                                                            }),
                                                        style: {
                                                            width: '100%',
                                                            padding: '8px 16px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1239,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1226,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1188,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                htmlFor: "event-type",
                                                style: {
                                                    display: 'block',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    marginBottom: '4px'
                                                },
                                                children: "事件类型"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1259,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("select", {
                                                id: "event-type",
                                                value: formData.type,
                                                onChange: (e)=>setFormData({
                                                        ...formData,
                                                        type: e.target.value
                                                    }),
                                                style: {
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                },
                                                children: eventTypes.map((t)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("option", {
                                                        value: t.value,
                                                        children: t.label
                                                    }, t.value, false, {
                                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                                        lineNumber: 1291,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1271,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1258,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("label", {
                                                htmlFor: "event-description",
                                                style: {
                                                    display: 'block',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    marginBottom: '4px'
                                                },
                                                children: "描述"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1298,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("textarea", {
                                                id: "event-description",
                                                value: formData.description,
                                                onChange: (e)=>setFormData({
                                                        ...formData,
                                                        description: e.target.value
                                                    }),
                                                rows: 3,
                                                placeholder: "请输入事件描述（可选）",
                                                style: {
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    resize: 'none',
                                                    boxSizing: 'border-box'
                                                }
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Calendar/index.tsx",
                                                lineNumber: 1310,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1297,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "src/pages/AI/Calendar/index.tsx",
                                lineNumber: 1079,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                style: {
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '24px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                        type: "button",
                                        onClick: ()=>setShowModal(false),
                                        style: {
                                            flex: 1,
                                            padding: '8px 16px',
                                            backgroundColor: '#f3f4f6',
                                            color: '#374151',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            fontSize: '14px'
                                        },
                                        children: "取消"
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1332,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("button", {
                                        type: "button",
                                        onClick: handleSave,
                                        style: {
                                            flex: 1,
                                            padding: '8px 16px',
                                            backgroundColor: '#2563eb',
                                            color: 'white',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            fontSize: '14px'
                                        },
                                        children: "保存"
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/Calendar/index.tsx",
                                        lineNumber: 1349,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "src/pages/AI/Calendar/index.tsx",
                                lineNumber: 1331,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/AI/Calendar/index.tsx",
                        lineNumber: 1067,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "src/pages/AI/Calendar/index.tsx",
                    lineNumber: 1052,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "src/pages/AI/Calendar/index.tsx",
                lineNumber: 1036,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/AI/Calendar/index.tsx",
        lineNumber: 364,
        columnNumber: 5
    }, this);
};
_s(CalendarManagement, "ZCgVNGXOrxLmLHzTDgBAmTSN2Q4=");
_c = CalendarManagement;
var _default = CalendarManagement;
var _c;
$RefreshReg$(_c, "CalendarManagement");
if (prevRefreshReg) self.$RefreshReg$ = prevRefreshReg;
if (prevRefreshSig) self.$RefreshSig$ = prevRefreshSig;
function registerClassComponent(filename, moduleExports) {
    for(const key in moduleExports)try {
        if (key === "__esModule") continue;
        const exportValue = moduleExports[key];
        if (_reactrefresh.isLikelyComponentType(exportValue) && exportValue.prototype && exportValue.prototype.isReactComponent) _reactrefresh.register(exportValue, filename + " " + key);
    } catch (e) {}
}
function $RefreshIsReactComponentLike$(moduleExports) {
    if (_reactrefresh.isLikelyComponentType(moduleExports || moduleExports.default)) return true;
    for(var key in moduleExports)try {
        if (_reactrefresh.isLikelyComponentType(moduleExports[key])) return true;
    } catch (e) {}
    return false;
}
registerClassComponent(module.id, module.exports);
if ($RefreshIsReactComponentLike$(module.exports)) {
    module.meta.hot.accept();
    _reactrefresh.performReactRefresh();
}

},
 }]);
//# sourceMappingURL=p__AI__Calendar__index-async.js.map