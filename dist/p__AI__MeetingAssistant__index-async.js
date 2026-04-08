((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__AI__MeetingAssistant__index'],
{ "src/pages/AI/MeetingAssistant/index.tsx": function (module, exports, __mako_require__){
// MeetingAssistant.tsx - 升级版 AI 会议助手，集成腾讯会议 API
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
var _interop_require_default = __mako_require__("@swc/helpers/_/_interop_require_default");
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _jsxdevruntime = __mako_require__("node_modules/react/jsx-dev-runtime.js");
var _icons = __mako_require__("node_modules/@ant-design/icons/es/index.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _dayjs = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/dayjs/dayjs.min.js"));
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var _ai = __mako_require__("src/services/ai.ts");
var _tencentMeeting = __mako_require__("src/services/tencentMeeting.ts");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const { TextArea } = _antd.Input;
const { Title, Paragraph, Text } = _antd.Typography;
const MeetingAssistant = ()=>{
    _s();
    const [loading, setLoading] = (0, _react.useState)(false);
    const [recording, setRecording] = (0, _react.useState)(false);
    const [transcript, setTranscript] = (0, _react.useState)('');
    const [meetingSummary, setMeetingSummary] = (0, _react.useState)('');
    const [actionItems, setActionItems] = (0, _react.useState)([]);
    const [decisions, setDecisions] = (0, _react.useState)([]);
    const [participants, setParticipants] = (0, _react.useState)([]);
    const [recordingDuration, setRecordingDuration] = (0, _react.useState)(0);
    // 会议管理
    const [showCreateModal, setShowCreateModal] = (0, _react.useState)(false);
    const [meetingList, setMeetingList] = (0, _react.useState)([]);
    const [currentMeeting, setCurrentMeeting] = (0, _react.useState)(null);
    const [meetingSubject, setMeetingSubject] = (0, _react.useState)('');
    const [meetingDate, setMeetingDate] = (0, _react.useState)((0, _dayjs.default)());
    const [startTime, setStartTime] = (0, _react.useState)((0, _dayjs.default)());
    const [endTime, setEndTime] = (0, _react.useState)((0, _dayjs.default)().add(1, 'hour'));
    const mediaRecorderRef = (0, _react.useRef)(null);
    const timerRef = (0, _react.useRef)(null);
    // 加载会议列表
    (0, _react.useEffect)(()=>{
        loadMeetingList();
    }, []);
    // 录音计时器
    (0, _react.useEffect)(()=>{
        if (recording) timerRef.current = setInterval(()=>{
            setRecordingDuration((prev)=>prev + 1);
        }, 1000);
        else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setRecordingDuration(0);
        }
        return ()=>{
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [
        recording
    ]);
    const formatDuration = (seconds)=>{
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor(seconds % 3600 / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    const loadMeetingList = async ()=>{
        setLoading(true);
        try {
            const meetings = await _tencentMeeting.tencentMeetingService.getUserMeetings();
            setMeetingList(meetings);
        } catch (error) {
            _antd.message.error(error.message || '加载会议列表失败');
        } finally{
            setLoading(false);
        }
    };
    const handleCreateMeeting = async ()=>{
        if (!meetingSubject.trim()) {
            _antd.message.warning('请输入会议主题');
            return; // 明确返回 void
        }
        setLoading(true);
        try {
            const startDateTime = meetingDate.hour(startTime.hour()).minute(startTime.minute()).unix();
            const endDateTime = meetingDate.hour(endTime.hour()).minute(endTime.minute()).unix();
            const meetingInfo = await _tencentMeeting.tencentMeetingService.createMeeting({
                subject: meetingSubject,
                type: 0,
                start_time: startDateTime.toString(),
                end_time: endDateTime.toString(),
                settings: {
                    mute_enable_join: true,
                    allow_unmute_self: true,
                    auto_record_type: 'cloud'
                }
            });
            setCurrentMeeting(meetingInfo);
            setShowCreateModal(false);
            _antd.message.success('会议创建成功！');
            loadMeetingList();
            _antd.Modal.info({
                title: '会议创建成功',
                width: 600,
                content: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions, {
                    column: 1,
                    bordered: true,
                    children: [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                            label: "会议主题",
                            children: meetingInfo.subject
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 168,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                            label: "会议号",
                            children: meetingInfo.meeting_code
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 171,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                            label: "会议链接",
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                children: [
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("a", {
                                        href: meetingInfo.join_url,
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        children: meetingInfo.join_url
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 176,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                        size: "small",
                                        icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CopyOutlined, {}, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 185,
                                            columnNumber: 25
                                        }, void 0),
                                        onClick: ()=>{
                                            navigator.clipboard.writeText(meetingInfo.join_url);
                                            _antd.message.success('已复制链接');
                                        }
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 183,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 175,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 174,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                    lineNumber: 167,
                    columnNumber: 11
                }, this)
            });
        } catch (error) {
            _antd.message.error(error.message || '创建会议失败');
        } finally{
            setLoading(false);
        }
    };
    const handleJoinMeeting = (meeting)=>{
        window.open(meeting.join_url, '_blank');
        _antd.message.info('正在打开会议链接...');
    };
    const handleCancelMeeting = async (meetingId)=>{
        _antd.Modal.confirm({
            title: '确认取消会议',
            content: '取消后将无法恢复，确定要取消这个会议吗？',
            onOk: async ()=>{
                setLoading(true);
                try {
                    await _tencentMeeting.tencentMeetingService.cancelMeeting(meetingId, '主动取消');
                    _antd.message.success('会议已取消');
                    loadMeetingList();
                } catch (error) {
                    _antd.message.error(error.message || '取消会议失败');
                } finally{
                    setLoading(false);
                }
            }
        });
    };
    const handleStartRecording = async ()=>{
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks = [];
            mediaRecorder.ondataavailable = (e)=>audioChunks.push(e.data);
            mediaRecorder.onstop = async ()=>{
                _antd.message.success('录音已停止，正在处理...');
            };
            mediaRecorder.start();
            setRecording(true);
            _antd.message.success('开始录音...');
        } catch  {
            _antd.message.error('无法访问麦克风，请检查权限设置');
        }
    };
    const handleStopRecording = ()=>{
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track)=>{
                track.stop();
            });
            setRecording(false);
        }
    };
    const handleGenerateNotes = async ()=>{
        if (!transcript.trim()) {
            _antd.message.warning('请先输入或录制会议内容');
            return; // 明确返回 void
        }
        setLoading(true);
        try {
            const response = await (0, _ai.aiGenerateMeetingNotes)({
                transcript,
                meetingType: 'general',
                participants
            });
            const data = response.data;
            setMeetingSummary(data.summary || '');
            setActionItems(data.actionItems || []);
            setDecisions(data.decisions || []);
            _antd.message.success('会议记录生成成功');
        } catch  {
            _antd.message.error('生成失败，请重试');
        } finally{
            setLoading(false);
        }
    };
    const handleExport = ()=>{
        const content = `
# 会议摘要
${meetingSummary}

# 会议信息
${currentMeeting ? `- 会议主题：${currentMeeting.subject}\n- 会议号：${currentMeeting.meeting_code}\n- 会议时间：${currentMeeting.start_time}` : ''}

# 参会人员
${participants.map((p)=>`- ${p}`).join('\n')}

# 决策事项
${decisions.map((d, i)=>`${i + 1}. ${d}`).join('\n')}

# 行动项
${actionItems.map((item, i)=>`${i + 1}. ${item.task} - 负责人：${item.assignee} - 截止：${item.deadline}`).join('\n')}

# 会议转录
${transcript}
        `;
        const blob = new Blob([
            content
        ], {
            type: 'text/markdown'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-notes-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        _antd.message.success('导出成功');
    };
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        header: {
            title: 'AI 会议助手',
            subTitle: '预约会议、实时转录、智能摘要、自动提取行动项'
        },
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Row, {
                gutter: [
                    16,
                    16
                ],
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                        span: 24,
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                            title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                children: [
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.VideoCameraOutlined, {}, void 0, false, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 326,
                                        columnNumber: 17
                                    }, void 0),
                                    "会议管理"
                                ]
                            }, void 0, true, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 325,
                                columnNumber: 15
                            }, void 0),
                            extra: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                type: "primary",
                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CalendarOutlined, {}, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 333,
                                    columnNumber: 23
                                }, void 0),
                                onClick: ()=>setShowCreateModal(true),
                                children: "预约会议"
                            }, void 0, false, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 331,
                                columnNumber: 15
                            }, void 0),
                            bordered: true,
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Spin, {
                                spinning: loading,
                                children: meetingList.length === 0 ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Alert, {
                                    message: "暂无会议",
                                    description: "点击右上角「预约会议」按钮创建新会议",
                                    type: "info",
                                    showIcon: true
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 343,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProList, {
                                    rowKey: "meeting_id",
                                    dataSource: meetingList,
                                    metas: {
                                        title: {
                                            dataIndex: 'subject'
                                        },
                                        description: {
                                            render: (_, row)=>`会议号：${row.meeting_code}`
                                        },
                                        actions: {
                                            render: (_, row)=>[
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        type: "link",
                                                        icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.LinkOutlined, {}, void 0, false, {
                                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                            lineNumber: 363,
                                                            columnNumber: 33
                                                        }, void 0),
                                                        onClick: ()=>handleJoinMeeting(row),
                                                        children: "加入"
                                                    }, "join", false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 360,
                                                        columnNumber: 25
                                                    }, void 0),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        type: "link",
                                                        danger: true,
                                                        onClick: ()=>handleCancelMeeting(row.meeting_id),
                                                        children: "取消"
                                                    }, "cancel", false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 368,
                                                        columnNumber: 25
                                                    }, void 0)
                                                ]
                                        }
                                    }
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 350,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 341,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 323,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                        lineNumber: 322,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                        xs: 24,
                        lg: 16,
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                            title: "会议内容",
                            bordered: true,
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                direction: "vertical",
                                style: {
                                    width: '100%'
                                },
                                size: "large",
                                children: [
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                type: recording ? 'default' : 'primary',
                                                danger: recording,
                                                icon: recording ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.PauseCircleOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 393,
                                                    columnNumber: 37
                                                }, void 0) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.AudioOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 393,
                                                    columnNumber: 63
                                                }, void 0),
                                                onClick: recording ? handleStopRecording : handleStartRecording,
                                                size: "large",
                                                children: recording ? '停止录音' : '开始录音'
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 390,
                                                columnNumber: 17
                                            }, this),
                                            recording && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Badge, {
                                                        status: "processing",
                                                        text: "正在录音"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 403,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                        strong: true,
                                                        children: formatDuration(recordingDuration)
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 404,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 402,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 389,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                level: 5,
                                                children: "会议转录 / 手动输入"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 410,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(TextArea, {
                                                value: transcript,
                                                onChange: (e)=>setTranscript(e.target.value),
                                                placeholder: "会议内容将实时显示在这里，也可以手动输入...",
                                                rows: 12,
                                                style: {
                                                    minHeight: '300px'
                                                }
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 411,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 409,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                type: "primary",
                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.FileTextOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 423,
                                                    columnNumber: 25
                                                }, void 0),
                                                onClick: handleGenerateNotes,
                                                loading: loading,
                                                size: "large",
                                                children: "生成会议记录"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 421,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.DownloadOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 431,
                                                    columnNumber: 25
                                                }, void 0),
                                                onClick: handleExport,
                                                disabled: !meetingSummary,
                                                children: "导出记录"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 430,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 420,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 388,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 387,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                        lineNumber: 386,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                        xs: 24,
                        lg: 8,
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                            direction: "vertical",
                            style: {
                                width: '100%'
                            },
                            size: 16,
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                    title: "参会人员",
                                    bordered: true,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                        direction: "vertical",
                                        style: {
                                            width: '100%'
                                        },
                                        children: [
                                            participants.length > 0 ? participants.map((name)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Avatar, {
                                                            size: "small",
                                                            icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.TeamOutlined, {}, void 0, false, {
                                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                                lineNumber: 450,
                                                                columnNumber: 50
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                            lineNumber: 450,
                                                            columnNumber: 23
                                                        }, this),
                                                        " ",
                                                        name
                                                    ]
                                                }, name, true, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 449,
                                                    columnNumber: 21
                                                }, this)) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                type: "secondary",
                                                children: "暂无参会人员"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 454,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Input, {
                                                placeholder: "添加参会人员",
                                                onPressEnter: (e)=>{
                                                    const value = e.currentTarget.value.trim();
                                                    if (value) {
                                                        setParticipants([
                                                            ...participants,
                                                            value
                                                        ]);
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 456,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 446,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 445,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                    title: "会议时长",
                                    bordered: true,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.ClockCircleOutlined, {}, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 470,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                strong: true,
                                                children: formatDuration(recordingDuration)
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 471,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                        lineNumber: 469,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 468,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 444,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                        lineNumber: 443,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                        span: 24,
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tabs, {
                                items: [
                                    {
                                        key: 'summary',
                                        label: '会议摘要',
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Spin, {
                                            spinning: loading,
                                            children: meetingSummary ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Paragraph, {
                                                children: meetingSummary
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 488,
                                                columnNumber: 25
                                            }, void 0) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                type: "secondary",
                                                children: "暂无摘要"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                lineNumber: 490,
                                                columnNumber: 25
                                            }, void 0)
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 486,
                                            columnNumber: 21
                                        }, void 0)
                                    },
                                    {
                                        key: 'actions',
                                        label: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                            children: [
                                                "行动项",
                                                ' ',
                                                actionItems.length > 0 && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Badge, {
                                                    count: actionItems.length
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 501,
                                                    columnNumber: 25
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 498,
                                            columnNumber: 21
                                        }, void 0),
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProList, {
                                            rowKey: "id",
                                            dataSource: actionItems,
                                            metas: {
                                                title: {
                                                    dataIndex: 'task'
                                                },
                                                description: {
                                                    render: (_, row)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                                    type: "secondary",
                                                                    children: [
                                                                        "负责人：",
                                                                        row.assignee
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                                    lineNumber: 514,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                                    type: "secondary",
                                                                    children: [
                                                                        "截止：",
                                                                        row.deadline
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                                    lineNumber: 517,
                                                                    columnNumber: 31
                                                                }, void 0)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                            lineNumber: 513,
                                                            columnNumber: 29
                                                        }, void 0)
                                                },
                                                actions: {
                                                    render: (_, row)=>[
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tag, {
                                                                color: row.status === 'completed' ? 'success' : 'default',
                                                                children: row.status === 'completed' ? '已完成' : '进行中'
                                                            }, "status", false, {
                                                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                                lineNumber: 523,
                                                                columnNumber: 29
                                                            }, void 0)
                                                        ]
                                                }
                                            },
                                            locale: {
                                                emptyText: '暂无行动项'
                                            }
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 506,
                                            columnNumber: 21
                                        }, void 0)
                                    },
                                    {
                                        key: 'decisions',
                                        label: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                            children: [
                                                "决策事项",
                                                ' ',
                                                decisions.length > 0 && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Badge, {
                                                    count: decisions.length
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                    lineNumber: 546,
                                                    columnNumber: 25
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 543,
                                            columnNumber: 21
                                        }, void 0),
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Timeline, {
                                            items: decisions.length > 0 ? decisions.map((d)=>({
                                                    children: d,
                                                    dot: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CheckCircleOutlined, {}, void 0, false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 556,
                                                        columnNumber: 36
                                                    }, void 0)
                                                })) : [
                                                {
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                        type: "secondary",
                                                        children: "暂无决策事项"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                                        lineNumber: 561,
                                                        columnNumber: 35
                                                    }, void 0)
                                                }
                                            ]
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 551,
                                            columnNumber: 21
                                        }, void 0)
                                    }
                                ]
                            }, void 0, false, {
                                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                lineNumber: 480,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 479,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                        lineNumber: 478,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                lineNumber: 320,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Modal, {
                title: "预约会议",
                open: showCreateModal,
                onOk: handleCreateMeeting,
                onCancel: ()=>setShowCreateModal(false),
                confirmLoading: loading,
                width: 600,
                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                    direction: "vertical",
                    style: {
                        width: '100%'
                    },
                    size: "large",
                    children: [
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                    level: 5,
                                    children: "会议主题 *"
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 586,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Input, {
                                    value: meetingSubject,
                                    onChange: (e)=>setMeetingSubject(e.target.value),
                                    placeholder: "请输入会议主题",
                                    maxLength: 100
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 587,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 585,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                    level: 5,
                                    children: "会议日期 *"
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 595,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.DatePicker, {
                                    value: meetingDate,
                                    onChange: (date)=>date && setMeetingDate(date),
                                    style: {
                                        width: '100%'
                                    },
                                    format: "YYYY-MM-DD"
                                }, void 0, false, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 596,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 594,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Row, {
                            gutter: 16,
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    span: 12,
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                            level: 5,
                                            children: "开始时间 *"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 605,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.TimePicker, {
                                            value: startTime,
                                            onChange: (time)=>time && setStartTime(time),
                                            style: {
                                                width: '100%'
                                            },
                                            format: "HH:mm"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 606,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 604,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    span: 12,
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                            level: 5,
                                            children: "结束时间 *"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 614,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.TimePicker, {
                                            value: endTime,
                                            onChange: (time)=>time && setEndTime(time),
                                            style: {
                                                width: '100%'
                                            },
                                            format: "HH:mm"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                            lineNumber: 615,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                                    lineNumber: 613,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 603,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Alert, {
                            message: "提示",
                            description: "创建会议后，您将获得会议号和入会链接，可分享给参会人员",
                            type: "info",
                            showIcon: true
                        }, void 0, false, {
                            fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                            lineNumber: 623,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                    lineNumber: 584,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "src/pages/AI/MeetingAssistant/index.tsx",
                lineNumber: 576,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/AI/MeetingAssistant/index.tsx",
        lineNumber: 314,
        columnNumber: 5
    }, this);
};
_s(MeetingAssistant, "FVyiCc5OX16TB5NMfe/wZp1Nvzg=");
_c = MeetingAssistant;
var _default = MeetingAssistant;
var _c;
$RefreshReg$(_c, "MeetingAssistant");
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
"src/services/tencentMeeting.ts": function (module, exports, __mako_require__){
"use strict";
__mako_require__.d(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
__mako_require__.e(exports, {
    default: function() {
        return _default;
    },
    tencentMeetingService: function() {
        return tencentMeetingService;
    }
});
var _interop_require_default = __mako_require__("@swc/helpers/_/_interop_require_default");
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _axios = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/axios/index.js"));
var _crypto = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/node-libs-browser-okam/polyfill/crypto.js"));
const process = __mako_require__("node_modules/node-libs-browser-okam/polyfill/process.js");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
class TencentMeetingService {
    config;
    apiUrl;
    axiosInstance;
    constructor(config){
        this.config = config;
        this.apiUrl = config.apiUrl || 'https://api.meeting.qq.com/v1';
        this.axiosInstance = _axios.default.create({
            baseURL: this.apiUrl,
            timeout: 10000
        });
        // 添加请求拦截器，自动添加签名
        this.axiosInstance.interceptors.request.use((config)=>{
            var _config_method;
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = this.generateNonce();
            config.headers = config.headers || {};
            config.headers['X-TC-Key'] = this.config.secretId;
            config.headers['X-TC-Timestamp'] = timestamp;
            config.headers['X-TC-Nonce'] = nonce;
            config.headers['X-TC-Signature'] = this.generateSignature(((_config_method = config.method) === null || _config_method === void 0 ? void 0 : _config_method.toUpperCase()) || 'GET', config.url || '', timestamp, nonce, JSON.stringify(config.data || {}));
            config.headers['AppId'] = this.config.appId;
            config.headers['SdkId'] = this.config.sdkId;
            return config;
        });
    }
    /**
     * 创建会议
     */ async createMeeting(params) {
        try {
            const response = await this.axiosInstance.post('/meetings', {
                userid: this.config.sdkId,
                instanceid: 1,
                ...params
            });
            return {
                meeting_id: response.data.meeting_info[0].meeting_id,
                meeting_code: response.data.meeting_info[0].meeting_code,
                subject: response.data.meeting_info[0].subject,
                join_url: response.data.meeting_info[0].join_url,
                start_time: response.data.meeting_info[0].start_time,
                end_time: response.data.meeting_info[0].end_time
            };
        } catch (error) {
            var _error_response;
            console.error('创建会议失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 查询会议详情
     */ async getMeetingInfo(meetingId) {
        try {
            const response = await this.axiosInstance.get(`/meetings/${meetingId}`, {
                params: {
                    userid: this.config.sdkId,
                    instanceid: 1
                }
            });
            const data = response.data.meeting_info_list[0];
            return {
                meeting_id: data.meeting_id,
                meeting_code: data.meeting_code,
                subject: data.subject,
                join_url: data.join_url,
                start_time: data.start_time,
                end_time: data.end_time,
                status: data.status
            };
        } catch (error) {
            var _error_response;
            console.error('查询会议失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 取消会议
     */ async cancelMeeting(meetingId, reason) {
        try {
            await this.axiosInstance.post(`/meetings/${meetingId}/cancel`, {
                userid: this.config.sdkId,
                instanceid: 1,
                reason_code: 1,
                reason_detail: reason || '主动取消'
            });
        } catch (error) {
            var _error_response;
            console.error('取消会议失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 修改会议
     */ async updateMeeting(meetingId, params) {
        try {
            await this.axiosInstance.put(`/meetings/${meetingId}`, {
                userid: this.config.sdkId,
                instanceid: 1,
                ...params
            });
        } catch (error) {
            var _error_response;
            console.error('修改会议失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 查询用户的会议列表
     */ async getUserMeetings(startTime, endTime) {
        try {
            const response = await this.axiosInstance.get('/meetings', {
                params: {
                    userid: this.config.sdkId,
                    instanceid: 1,
                    start_time: startTime,
                    end_time: endTime
                }
            });
            return response.data.meeting_info_list.map((item)=>({
                    meeting_id: item.meeting_id,
                    meeting_code: item.meeting_code,
                    subject: item.subject,
                    join_url: item.join_url,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    status: item.status
                }));
        } catch (error) {
            var _error_response;
            console.error('查询会议列表失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 获取参会成员列表
     */ async getParticipants(meetingId) {
        try {
            const response = await this.axiosInstance.get(`/meetings/${meetingId}/participants`, {
                params: {
                    userid: this.config.sdkId
                }
            });
            return response.data.participants || [];
        } catch (error) {
            var _error_response;
            console.error('获取参会成员失败:', ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) || error.message);
            throw new Error(this.handleError(error));
        }
    }
    /**
     * 生成签名
     */ generateSignature(method, uri, timestamp, nonce, body) {
        const headerString = [
            `X-TC-Key=${this.config.secretId}`,
            `X-TC-Nonce=${nonce}`,
            `X-TC-Timestamp=${timestamp}`
        ].sort().join('&');
        const stringToSign = [
            method,
            headerString,
            uri,
            body
        ].join('\n');
        return _crypto.default.createHmac('sha256', this.config.secretKey).update(stringToSign).digest('hex');
    }
    /**
     * 生成随机数
     */ generateNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    /**
     * 错误处理
     */ handleError(error) {
        var _error_response;
        if ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) {
            const errorCode = error.response.data.error_code;
            const errorMsg = error.response.data.error_msg;
            return `${errorMsg} (${errorCode})`;
        }
        return '会议服务暂时不可用，请稍后重试';
    }
}
const tencentMeetingService = new TencentMeetingService({
    appId: process.env.TENCENT_MEETING_APP_ID || '',
    sdkId: process.env.TENCENT_MEETING_SDK_ID || '',
    secretId: process.env.TENCENT_MEETING_SECRET_ID || '',
    secretKey: process.env.TENCENT_MEETING_SECRET_KEY || ''
});
var _default = TencentMeetingService;
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
//# sourceMappingURL=p__AI__MeetingAssistant__index-async.js.map