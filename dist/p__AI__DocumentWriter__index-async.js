((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__AI__DocumentWriter__index'],
{ "src/pages/AI/DocumentWriter/index.tsx": function (module, exports, __mako_require__){
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
var _icons = __mako_require__("node_modules/@ant-design/icons/es/index.js");
var _procomponents = __mako_require__("node_modules/@ant-design/pro-components/es/index.js");
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _react = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react/index.js"));
var _ai = __mako_require__("src/services/ai.ts");
var _ossStorage = __mako_require__("src/services/ossStorage.ts");
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
const { Title } = _antd.Typography;
const DocumentWriter = ()=>{
    _s();
    const [loading, setLoading] = (0, _react.useState)(false);
    const [uploadProgress, setUploadProgress] = (0, _react.useState)(0);
    const [prompt, setPrompt] = (0, _react.useState)('');
    const [content, setContent] = (0, _react.useState)('');
    const [htmlContent, setHtmlContent] = (0, _react.useState)('');
    const [documentType, setDocumentType] = (0, _react.useState)('speech');
    const [scenario, setScenario] = (0, _react.useState)('');
    const [titleInput, setTitleInput] = (0, _react.useState)('');
    const [lengthOption, setLengthOption] = (0, _react.useState)('medium');
    const [uploadedFiles, setUploadedFiles] = (0, _react.useState)([]);
    const [savedDocs, setSavedDocs] = (0, _react.useState)([]);
    const [showSaveModal, setShowSaveModal] = (0, _react.useState)(false);
    const [settingsPanelOpen, setSettingsPanelOpen] = (0, _react.useState)(true);
    const scenarioOptions = {
        speech: [
            {
                label: '开场演讲',
                value: 'opening'
            },
            {
                label: '闭幕演讲',
                value: 'closing'
            }
        ],
        notice: [
            {
                label: '内部通知',
                value: 'internal'
            },
            {
                label: '外部通知',
                value: 'external'
            }
        ],
        report: [
            {
                label: '个人工作报告',
                value: 'personal'
            },
            {
                label: '单位工作报告',
                value: 'unit'
            },
            {
                label: '专项工作报告',
                value: 'special'
            }
        ],
        research: [
            {
                label: '市场调研报告',
                value: 'market'
            },
            {
                label: '行业调研报告',
                value: 'industry'
            }
        ],
        suggestion: [
            {
                label: '政策建议',
                value: 'policy'
            },
            {
                label: '管理建议',
                value: 'management'
            }
        ]
    };
    const formatContentToHTML = (text)=>{
        if (!text) return '<p><br></p>';
        return text.split('\n').map((line)=>{
            const trimmed = line.trim();
            if (!trimmed) return '<p><br></p>';
            if (trimmed.startsWith('#')) {
                const level = (line.match(/^#+/) || [
                    ''
                ])[0].length;
                const content = trimmed.replace(/^#+\s*/, '');
                if (level === 1) return `<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 24px 0 20px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h1>`;
                else if (level === 2) return `<h2 style="font-size: 18px; font-weight: bold; margin: 20px 0 12px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h2>`;
                else return `<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0 10px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif;">${content}</h3>`;
            }
            return `<p style="text-indent: 2em; line-height: 1.75; margin: 8px 0; font-size: 16px; color: #000;">${trimmed}</p>`;
        }).join('');
    };
    const handleGenerate = async ()=>{
        if (!prompt.trim()) {
            _antd.message.warning('请输入文档主题或描述');
            return;
        }
        setLoading(true);
        try {
            var _response_data;
            const filesContent = uploadedFiles.map((f)=>`\n[附加素材: ${f.name}]`).join('');
            const response = await (0, _ai.aiWriteDocument)({
                prompt: `${prompt}\n类型: ${documentType}\n场景: ${scenario}\n字数: ${lengthOption}${filesContent}`,
                documentType: documentType,
                tone: 'formal',
                language: 'zh-CN'
            });
            const generatedContent = ((_response_data = response.data) === null || _response_data === void 0 ? void 0 : _response_data.content) || '';
            setContent(generatedContent);
            setHtmlContent(formatContentToHTML(generatedContent));
            _antd.message.success('文档生成成功');
        } catch (error) {
            _antd.message.error('生成失败，请重试');
            console.error(error);
        } finally{
            setLoading(false);
        }
    };
    const handleOptimize = async ()=>{
        if (!content.trim()) {
            _antd.message.warning('请先生成文档内容');
            return;
        }
        setLoading(true);
        try {
            var _response_data;
            const response = await (0, _ai.aiOptimizeDocument)({
                content,
                optimizationType: 'all'
            });
            const optimizedContent = ((_response_data = response.data) === null || _response_data === void 0 ? void 0 : _response_data.content) || '';
            setContent(optimizedContent);
            setHtmlContent(formatContentToHTML(optimizedContent));
            _antd.message.success('文档优化成功');
        } catch (error) {
            _antd.message.error('优化失败，请重试');
            console.error(error);
        } finally{
            setLoading(false);
        }
    };
    const handleCopy = ()=>{
        const editor = document.getElementById('word-editor');
        if (editor) {
            const text = editor.innerText;
            navigator.clipboard.writeText(text);
            _antd.message.success('已复制到剪贴板');
        }
    };
    const handleSaveToCloud = ()=>{
        if (!content.trim()) {
            _antd.message.warning('请先生成文档内容');
            return;
        }
        setShowSaveModal(true);
    };
    const handleConfirmSave = async ()=>{
        if (!titleInput.trim()) {
            _antd.message.warning('请输入文档标题');
            return;
        }
        setLoading(true);
        setUploadProgress(0);
        try {
            const editor = document.getElementById('word-editor');
            const currentContent = (editor === null || editor === void 0 ? void 0 : editor.innerText) || content;
            const blob = new Blob([
                currentContent
            ], {
                type: 'text/plain'
            });
            const file = new File([
                blob
            ], `${titleInput}.txt`, {
                type: 'text/plain'
            });
            const result = await _ossStorage.ossStorageService.uploadFile(file, {
                folder: 'documents',
                onProgress: (percent)=>setUploadProgress(percent)
            });
            const newDoc = {
                id: Date.now().toString(),
                title: titleInput,
                content: currentContent,
                type: documentType,
                scenario,
                url: result.url,
                createdAt: new Date(),
                size: result.size
            };
            setSavedDocs([
                newDoc,
                ...savedDocs
            ]);
            _antd.message.success('文档已保存到云端');
            setShowSaveModal(false);
            setTitleInput('');
        } catch (error) {
            _antd.message.error(error.message || '保存失败');
            console.error(error);
        } finally{
            setLoading(false);
            setUploadProgress(0);
        }
    };
    const handleDownload = (doc)=>{
        const blob = new Blob([
            doc.content
        ], {
            type: 'text/plain'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        _antd.message.success('下载成功');
    };
    const handleDelete = (docId)=>{
        _antd.Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个文档吗？',
            onOk: ()=>{
                setSavedDocs(savedDocs.filter((d)=>d.id !== docId));
                _antd.message.success('文档已删除');
            }
        });
    };
    const handleLoadDocument = (doc)=>{
        setContent(doc.content);
        setHtmlContent(formatContentToHTML(doc.content));
        setDocumentType(doc.type);
        setScenario(doc.scenario || '');
        _antd.message.success('文档已加载');
    };
    const execCommand = (command, value)=>{
        document.execCommand(command, false, value);
    };
    const handleInput = (e)=>{
        const text = e.currentTarget.innerText;
        setContent(text);
    };
    const insertTable = ()=>{
        const table = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #000;"><tr><td style="padding: 8px; border: 1px solid #000;">单元格1</td><td style="padding: 8px; border: 1px solid #000;">单元格2</td></tr><tr><td style="padding: 8px; border: 1px solid #000;">单元格3</td><td style="padding: 8px; border: 1px solid #000;">单元格4</td></tr></table>';
        execCommand('insertHTML', table);
    };
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        header: {
            title: 'AI 公文生成器',
            subTitle: '智能写作，高效办公'
        },
        children: [
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                style: {
                    position: 'relative'
                },
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Row, {
                        gutter: [
                            16,
                            16
                        ],
                        children: [
                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                xs: 24,
                                lg: settingsPanelOpen ? 16 : 24,
                                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                    bordered: true,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Spin, {
                                        spinning: loading,
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                            direction: "vertical",
                                            style: {
                                                width: '100%'
                                            },
                                            size: "middle",
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                    style: {
                                                        background: '#f3f4f6',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e5e7eb',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '6px',
                                                        alignItems: 'center'
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                            defaultValue: "16px",
                                                            style: {
                                                                width: 85
                                                            },
                                                            size: "small",
                                                            onChange: (val)=>execCommand('fontSize', val),
                                                            options: [
                                                                {
                                                                    label: '12px',
                                                                    value: '2'
                                                                },
                                                                {
                                                                    label: '14px',
                                                                    value: '3'
                                                                },
                                                                {
                                                                    label: '16px',
                                                                    value: '4'
                                                                },
                                                                {
                                                                    label: '18px',
                                                                    value: '5'
                                                                },
                                                                {
                                                                    label: '20px',
                                                                    value: '6'
                                                                }
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 315,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                borderLeft: '1px solid #d1d5db',
                                                                height: '20px',
                                                                margin: '0 4px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 329,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "粗体",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.BoldOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 340,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('bold')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 338,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 337,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "斜体",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.ItalicOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 347,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('italic')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 345,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 344,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "下划线",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.UnderlineOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 354,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('underline')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 352,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 351,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "删除线",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.StrikethroughOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 361,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('strikeThrough')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 359,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 358,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                borderLeft: '1px solid #d1d5db',
                                                                height: '20px',
                                                                margin: '0 4px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 366,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "字体颜色",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.FontColorsOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 377,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>{
                                                                    const color = window.prompt('请输入颜色（如：red 或 #ff0000）', '#000000');
                                                                    if (color) execCommand('foreColor', color);
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 375,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 374,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "高亮",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.HighlightOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 390,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('backColor', '#ffff00')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 388,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 387,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                borderLeft: '1px solid #d1d5db',
                                                                height: '20px',
                                                                margin: '0 4px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 395,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "左对齐",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.AlignLeftOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 406,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('justifyLeft')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 404,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 403,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "居中",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.AlignCenterOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 413,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('justifyCenter')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 411,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 410,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "右对齐",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.AlignRightOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 420,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('justifyRight')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 418,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 417,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                borderLeft: '1px solid #d1d5db',
                                                                height: '20px',
                                                                margin: '0 4px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 425,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "编号",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.OrderedListOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 436,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('insertOrderedList')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 434,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 433,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "符号",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.UnorderedListOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 443,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('insertUnorderedList')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 441,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 440,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "表格",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.TableOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 450,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: insertTable
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 448,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 447,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "链接",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.LinkOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 457,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>{
                                                                    const url = window.prompt('请输入链接地址:');
                                                                    if (url) execCommand('createLink', url);
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 455,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 454,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                borderLeft: '1px solid #d1d5db',
                                                                height: '20px',
                                                                margin: '0 4px'
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 465,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "撤销",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.UndoOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 476,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('undo')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 474,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 473,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                                                            title: "重做",
                                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.RedoOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 483,
                                                                    columnNumber: 31
                                                                }, void 0),
                                                                onClick: ()=>execCommand('redo')
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 481,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 480,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            style: {
                                                                flex: 1
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 488,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                            size: "small",
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                    size: "small",
                                                                    icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.ReloadOutlined, {}, void 0, false, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 493,
                                                                        columnNumber: 31
                                                                    }, void 0),
                                                                    onClick: handleOptimize,
                                                                    disabled: !content,
                                                                    children: "优化"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 491,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                    size: "small",
                                                                    icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CopyOutlined, {}, void 0, false, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 501,
                                                                        columnNumber: 31
                                                                    }, void 0),
                                                                    onClick: handleCopy,
                                                                    disabled: !content,
                                                                    children: "复制"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 499,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                    size: "small",
                                                                    type: "primary",
                                                                    icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CloudUploadOutlined, {}, void 0, false, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 510,
                                                                        columnNumber: 31
                                                                    }, void 0),
                                                                    onClick: handleSaveToCloud,
                                                                    disabled: !content,
                                                                    children: "保存"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 507,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 490,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                    lineNumber: 303,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                    style: {
                                                        background: '#e5e5e5',
                                                        padding: '40px 20px',
                                                        borderRadius: '4px',
                                                        minHeight: '900px',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'flex-start'
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        id: "word-editor",
                                                        contentEditable: true,
                                                        // biome-ignore lint/security/noDangerouslySetInnerHtml: 需要渲染富文本编辑器内容
                                                        dangerouslySetInnerHTML: {
                                                            __html: htmlContent
                                                        },
                                                        onInput: handleInput,
                                                        style: {
                                                            width: '21cm',
                                                            minHeight: '29.7cm',
                                                            background: '#ffffff',
                                                            padding: '2.54cm 3.18cm',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                            fontSize: '16px',
                                                            lineHeight: '1.75',
                                                            fontFamily: '"Times New Roman", "仿宋", "FangSong", "SimSun", serif',
                                                            color: '#000',
                                                            outline: 'none',
                                                            wordWrap: 'break-word',
                                                            overflowWrap: 'break-word'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 531,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                    lineNumber: 520,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                        lineNumber: 296,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 295,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                lineNumber: 294,
                                columnNumber: 11
                            }, this),
                            settingsPanelOpen && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                xs: 24,
                                lg: 8,
                                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                    direction: "vertical",
                                    style: {
                                        width: '100%'
                                    },
                                    size: "middle",
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                            title: "文档设置",
                                            bordered: true,
                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                direction: "vertical",
                                                style: {
                                                    width: '100%'
                                                },
                                                size: "middle",
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "公文类型"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 575,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                                value: documentType,
                                                                onChange: (val)=>{
                                                                    setDocumentType(val);
                                                                    setScenario('');
                                                                },
                                                                style: {
                                                                    width: '100%'
                                                                },
                                                                options: [
                                                                    {
                                                                        label: '演讲稿',
                                                                        value: 'speech'
                                                                    },
                                                                    {
                                                                        label: '通知',
                                                                        value: 'notice'
                                                                    },
                                                                    {
                                                                        label: '工作报告',
                                                                        value: 'report'
                                                                    },
                                                                    {
                                                                        label: '调研报告',
                                                                        value: 'research'
                                                                    },
                                                                    {
                                                                        label: '意见建议',
                                                                        value: 'suggestion'
                                                                    }
                                                                ]
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 576,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 574,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "写作场景"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 594,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                                value: scenario,
                                                                onChange: setScenario,
                                                                style: {
                                                                    width: '100%'
                                                                },
                                                                placeholder: "选择场景",
                                                                options: scenarioOptions[documentType] || []
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 595,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 593,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "公文标题"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 605,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Input, {
                                                                value: titleInput,
                                                                onChange: (e)=>setTitleInput(e.target.value),
                                                                placeholder: "请输入公文标题",
                                                                maxLength: 100
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 606,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 604,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "字数"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 615,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                                value: lengthOption,
                                                                onChange: setLengthOption,
                                                                style: {
                                                                    width: '100%'
                                                                },
                                                                options: [
                                                                    {
                                                                        label: '短 (500字左右)',
                                                                        value: 'short'
                                                                    },
                                                                    {
                                                                        label: '中 (1000字左右)',
                                                                        value: 'medium'
                                                                    },
                                                                    {
                                                                        label: '长 (2000字以上)',
                                                                        value: 'long'
                                                                    }
                                                                ]
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 616,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 614,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "写作素材（可选）"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 629,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Upload, {
                                                                beforeUpload: (file)=>{
                                                                    setUploadedFiles([
                                                                        ...uploadedFiles,
                                                                        file
                                                                    ]);
                                                                    return false;
                                                                },
                                                                multiple: true,
                                                                fileList: uploadedFiles.map((f, idx)=>({
                                                                        uid: `${f.name}-${idx}`,
                                                                        name: f.name,
                                                                        status: 'done'
                                                                    })),
                                                                onRemove: (file)=>{
                                                                    const idx = uploadedFiles.findIndex((f, i)=>`${f.name}-${i}` === file.uid);
                                                                    if (idx > -1) {
                                                                        const newFiles = [
                                                                            ...uploadedFiles
                                                                        ];
                                                                        newFiles.splice(idx, 1);
                                                                        setUploadedFiles(newFiles);
                                                                    }
                                                                },
                                                                children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                    icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.UploadOutlined, {}, void 0, false, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 652,
                                                                        columnNumber: 39
                                                                    }, void 0),
                                                                    block: true,
                                                                    size: "small",
                                                                    children: "添加文件"
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 652,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 630,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 628,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Title, {
                                                                level: 5,
                                                                children: "文档描述"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 659,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(TextArea, {
                                                                value: prompt,
                                                                onChange: (e)=>setPrompt(e.target.value),
                                                                placeholder: "请输入文档主题或详细描述...",
                                                                rows: 5,
                                                                maxLength: 2000,
                                                                showCount: true
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 660,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 658,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        type: "primary",
                                                        icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.EditOutlined, {}, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 672,
                                                            columnNumber: 29
                                                        }, void 0),
                                                        onClick: handleGenerate,
                                                        loading: loading,
                                                        block: true,
                                                        size: "large",
                                                        children: "生成文档"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 670,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                lineNumber: 569,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                            lineNumber: 568,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                            title: "已保存的文档",
                                            bordered: true,
                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List, {
                                                dataSource: savedDocs,
                                                locale: {
                                                    emptyText: '暂无保存的文档'
                                                },
                                                renderItem: (doc)=>/*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List.Item, {
                                                        actions: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                type: "link",
                                                                size: "small",
                                                                onClick: ()=>handleLoadDocument(doc),
                                                                children: "加载"
                                                            }, "load", false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 691,
                                                                columnNumber: 27
                                                            }, void 0),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                type: "link",
                                                                size: "small",
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.DownloadOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 703,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                onClick: ()=>handleDownload(doc)
                                                            }, "download", false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 699,
                                                                columnNumber: 27
                                                            }, void 0),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                type: "link",
                                                                size: "small",
                                                                danger: true,
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.DeleteOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                    lineNumber: 711,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                onClick: ()=>handleDelete(doc.id)
                                                            }, "delete", false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 706,
                                                                columnNumber: 27
                                                            }, void 0)
                                                        ],
                                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List.Item.Meta, {
                                                            avatar: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.FileTextOutlined, {
                                                                style: {
                                                                    fontSize: 20,
                                                                    color: '#1890ff'
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 718,
                                                                columnNumber: 29
                                                            }, void 0),
                                                            title: doc.title,
                                                            description: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                                direction: "vertical",
                                                                size: 0,
                                                                children: [
                                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                        style: {
                                                                            fontSize: '12px'
                                                                        },
                                                                        children: [
                                                                            "类型: ",
                                                                            doc.type
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 725,
                                                                        columnNumber: 31
                                                                    }, void 0),
                                                                    doc.scenario && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                        style: {
                                                                            fontSize: '12px'
                                                                        },
                                                                        children: [
                                                                            "场景: ",
                                                                            doc.scenario
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 729,
                                                                        columnNumber: 33
                                                                    }, void 0),
                                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                                        style: {
                                                                            fontSize: '12px'
                                                                        },
                                                                        children: doc.createdAt.toLocaleDateString('zh-CN')
                                                                    }, void 0, false, {
                                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                        lineNumber: 733,
                                                                        columnNumber: 31
                                                                    }, void 0)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                                lineNumber: 724,
                                                                columnNumber: 29
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                            lineNumber: 716,
                                                            columnNumber: 25
                                                        }, void 0)
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                        lineNumber: 689,
                                                        columnNumber: 23
                                                    }, void 0)
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                                lineNumber: 685,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                            lineNumber: 684,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 562,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                lineNumber: 561,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                        lineNumber: 292,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                        style: {
                            position: 'fixed',
                            right: settingsPanelOpen ? 'calc((100vw - 1200px) / 2 + 400px + 16px)' : '20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 999,
                            transition: 'right 0.3s ease'
                        },
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tooltip, {
                            title: settingsPanelOpen ? '收起面板' : '展开面板',
                            placement: "left",
                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                type: "primary",
                                shape: "circle",
                                size: "large",
                                icon: settingsPanelOpen ? /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.RightOutlined, {}, void 0, false, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 769,
                                    columnNumber: 41
                                }, void 0) : /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.LeftOutlined, {}, void 0, false, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 769,
                                    columnNumber: 61
                                }, void 0),
                                onClick: ()=>setSettingsPanelOpen(!settingsPanelOpen),
                                style: {
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    width: '48px',
                                    height: '48px'
                                }
                            }, void 0, false, {
                                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                lineNumber: 765,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                            lineNumber: 761,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/AI/DocumentWriter/index.tsx",
                        lineNumber: 749,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                lineNumber: 291,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Modal, {
                title: "保存文档到云端",
                open: showSaveModal,
                onOk: handleConfirmSave,
                onCancel: ()=>{
                    setShowSaveModal(false);
                    setTitleInput('');
                },
                confirmLoading: loading,
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
                                    children: "文档标题"
                                }, void 0, false, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 793,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Input, {
                                    value: titleInput,
                                    onChange: (e)=>setTitleInput(e.target.value),
                                    placeholder: "请输入文档标题",
                                    maxLength: 100
                                }, void 0, false, {
                                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                                    lineNumber: 794,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                            lineNumber: 792,
                            columnNumber: 11
                        }, this),
                        uploadProgress > 0 && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Progress, {
                            percent: uploadProgress,
                            status: "active"
                        }, void 0, false, {
                            fileName: "src/pages/AI/DocumentWriter/index.tsx",
                            lineNumber: 802,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "src/pages/AI/DocumentWriter/index.tsx",
                    lineNumber: 791,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "src/pages/AI/DocumentWriter/index.tsx",
                lineNumber: 781,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "src/pages/AI/DocumentWriter/index.tsx",
        lineNumber: 285,
        columnNumber: 5
    }, this);
};
_s(DocumentWriter, "NjDBJgrmw4aJ+HZWNgQUCHigDNg=");
_c = DocumentWriter;
var _default = DocumentWriter;
var _c;
$RefreshReg$(_c, "DocumentWriter");
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
"src/services/ossStorage.ts": function (module, exports, __mako_require__){
// services/ossStorageMock.ts
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
    ossStorageService: function() {
        return ossStorageService;
    }
});
var _interop_require_default = __mako_require__("@swc/helpers/_/_interop_require_default");
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _axios = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/axios/index.js"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
const ossStorageService = {
    /**
     * 上传单个文件（Mock）
     */ uploadFile: async (file, options = {})=>{
        const formData = new FormData();
        formData.append('filename', options.filename || file.name);
        formData.append('folder', options.folder || 'documents');
        formData.append('size', file.size.toString());
        formData.append('type', file.type);
        const response = await _axios.default.post('/api/storage/upload', formData, {
            onUploadProgress: (progressEvent)=>{
                if (options.onProgress && progressEvent.total) {
                    const percent = Math.round(progressEvent.loaded * 100 / progressEvent.total);
                    options.onProgress(percent);
                }
            }
        });
        // 确保返回对象和 OSSStorageService 一致
        return {
            name: response.data.data.name,
            url: response.data.data.url,
            size: response.data.data.size,
            type: response.data.data.type,
            uploadTime: new Date(response.data.data.uploadTime)
        };
    },
    /**
     * 上传多个文件（Mock）
     */ uploadMultipleFiles: async (files, options = {})=>{
        const results = [];
        for (const file of files)try {
            const res = await ossStorageService.uploadFile(file, options);
            results.push(res);
        } catch (error) {
            console.error(`上传文件 ${file.name} 失败`, error);
        }
        return results;
    },
    /**
     * 获取文件临时访问 URL
     */ getSignedUrl: async (objectName, expires = 3600)=>{
        const response = await _axios.default.get(`/api/storage/file/${objectName}/url`);
        return response.data.data.url;
    },
    /**
     * 删除文件
     */ deleteFile: async (objectName)=>{
        await _axios.default.delete(`/api/storage/file/${objectName}`);
    },
    /**
     * 列出文件
     */ listFiles: async (folder)=>{
        const response = await _axios.default.get('/api/storage/files', {
            params: {
                folder
            }
        });
        return response.data.data.files.map((f)=>({
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                uploadTime: new Date(f.uploadTime)
            }));
    }
};
var _default = ossStorageService;
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
//# sourceMappingURL=p__AI__DocumentWriter__index-async.js.map