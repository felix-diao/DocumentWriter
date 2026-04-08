((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__AI__Translator__index'],
{ "src/pages/AI/Translator/index.tsx": function (module, exports, __mako_require__){
// Translator.tsx
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
var _baiduTranslate = __mako_require__("src/services/baiduTranslate.ts");
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
const { Text } = _antd.Typography;
const Translator = ()=>{
    _s();
    const [loading, setLoading] = (0, _react.useState)(false);
    const [sourceText, setSourceText] = (0, _react.useState)('');
    const [translatedText, setTranslatedText] = (0, _react.useState)('');
    const [sourceLang, setSourceLang] = (0, _react.useState)('zh-CN');
    const [targetLang, setTargetLang] = (0, _react.useState)('en-US');
    const [translationHistory, setTranslationHistory] = (0, _react.useState)([]);
    const [_charCount, setCharCount] = (0, _react.useState)(0);
    const languages = [
        {
            label: '中文',
            value: 'zh-CN'
        },
        {
            label: '英语',
            value: 'en-US'
        },
        {
            label: '日语',
            value: 'ja-JP'
        },
        {
            label: '韩语',
            value: 'ko-KR'
        },
        {
            label: '法语',
            value: 'fr-FR'
        },
        {
            label: '德语',
            value: 'de-DE'
        },
        {
            label: '西班牙语',
            value: 'es-ES'
        },
        {
            label: '俄语',
            value: 'ru-RU'
        }
    ];
    (0, _react.useEffect)(()=>{
        setCharCount(sourceText.length);
    }, [
        sourceText
    ]);
    const handleTranslate = async ()=>{
        if (!sourceText.trim()) {
            _antd.message.warning('请输入要翻译的内容');
            return;
        }
        setLoading(true);
        try {
            const result = await _baiduTranslate.baiduTranslateService.translate({
                text: sourceText,
                from: sourceLang,
                to: targetLang
            });
            setTranslatedText(result);
            const newHistory = {
                id: Date.now().toString(),
                sourceText,
                translatedText: result,
                sourceLang,
                targetLang,
                timestamp: new Date()
            };
            setTranslationHistory([
                newHistory,
                ...translationHistory.slice(0, 19)
            ]);
            _antd.message.success('翻译完成');
        } catch (error) {
            _antd.message.error(error.message || '翻译失败');
        } finally{
            setLoading(false);
        }
    };
    const handleSwapLanguages = ()=>{
        const tempLang = sourceLang;
        setSourceLang(targetLang);
        setTargetLang(tempLang);
        setSourceText(translatedText);
        setTranslatedText(sourceText);
    };
    const handleCopy = (text)=>{
        navigator.clipboard.writeText(text);
        _antd.message.success('已复制到剪贴板');
    };
    const handleSpeak = (text, lang)=>{
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            speechSynthesis.speak(utterance);
        } else _antd.message.warning('浏览器不支持语音朗读');
    };
    const handleClear = ()=>{
        setSourceText('');
        setTranslatedText('');
    };
    const handleLoadHistory = (history)=>{
        setSourceText(history.sourceText);
        setTranslatedText(history.translatedText);
        setSourceLang(history.sourceLang);
        setTargetLang(history.targetLang);
    };
    const handleDeleteHistory = (id)=>{
        setTranslationHistory(translationHistory.filter((h)=>h.id !== id));
        _antd.message.success('已删除历史记录');
    };
    const handleDocumentUpload = async (file)=>{
        if (file.size > 5242880) {
            _antd.message.error('文件不能超过 5MB');
            return false;
        }
        setLoading(true);
        try {
            const text = await file.text();
            setSourceText(text);
            _antd.message.success('文件加载成功，准备翻译...');
            setTimeout(()=>handleTranslate(), 500);
        } catch  {
            _antd.message.error('文件读取失败');
        } finally{
            setLoading(false);
        }
        return false;
    };
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.PageContainer, {
        header: {
            title: 'AI 翻译',
            subTitle: '支持历史记录和文档翻译'
        },
        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tabs, {
                items: [
                    {
                        key: 'text',
                        label: '文本翻译',
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Row, {
                            gutter: [
                                24,
                                24
                            ],
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    span: 24,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                        size: "large",
                                        style: {
                                            width: '100%',
                                            justifyContent: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                value: sourceLang,
                                                onChange: setSourceLang,
                                                style: {
                                                    width: 150
                                                },
                                                options: languages
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 180,
                                                columnNumber: 23
                                            }, void 0),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.SwapOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 187,
                                                    columnNumber: 31
                                                }, void 0),
                                                onClick: handleSwapLanguages,
                                                shape: "circle"
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 186,
                                                columnNumber: 23
                                            }, void 0),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Select, {
                                                value: targetLang,
                                                onChange: setTargetLang,
                                                style: {
                                                    width: 150
                                                },
                                                options: languages
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 191,
                                                columnNumber: 23
                                            }, void 0)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Translator/index.tsx",
                                        lineNumber: 176,
                                        columnNumber: 21
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 175,
                                    columnNumber: 19
                                }, void 0),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    xs: 24,
                                    lg: 12,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                        title: "原文",
                                        bordered: true,
                                        children: [
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(TextArea, {
                                                value: sourceText,
                                                onChange: (e)=>setSourceText(e.target.value),
                                                placeholder: "输入要翻译的内容...",
                                                rows: 12,
                                                maxLength: 5000,
                                                showCount: true
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 202,
                                                columnNumber: 23
                                            }, void 0),
                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                style: {
                                                    marginTop: 16
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        type: "primary",
                                                        onClick: handleTranslate,
                                                        loading: loading,
                                                        block: true,
                                                        size: "large",
                                                        children: "翻译"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Translator/index.tsx",
                                                        lineNumber: 211,
                                                        columnNumber: 25
                                                    }, void 0),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        onClick: handleClear,
                                                        style: {
                                                            marginTop: 8
                                                        },
                                                        block: true,
                                                        children: "清空"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Translator/index.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 25
                                                    }, void 0),
                                                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                        icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.SoundOutlined, {}, void 0, false, {
                                                            fileName: "src/pages/AI/Translator/index.tsx",
                                                            lineNumber: 228,
                                                            columnNumber: 33
                                                        }, void 0),
                                                        onClick: ()=>handleSpeak(sourceText, sourceLang),
                                                        disabled: !sourceText,
                                                        style: {
                                                            marginTop: 8
                                                        },
                                                        block: true,
                                                        children: "朗读"
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Translator/index.tsx",
                                                        lineNumber: 227,
                                                        columnNumber: 25
                                                    }, void 0)
                                                ]
                                            }, void 0, true, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 210,
                                                columnNumber: 23
                                            }, void 0)
                                        ]
                                    }, void 0, true, {
                                        fileName: "src/pages/AI/Translator/index.tsx",
                                        lineNumber: 201,
                                        columnNumber: 21
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 200,
                                    columnNumber: 19
                                }, void 0),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    xs: 24,
                                    lg: 12,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                        title: "译文",
                                        bordered: true,
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Spin, {
                                            spinning: loading,
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(TextArea, {
                                                    value: translatedText,
                                                    placeholder: "翻译结果将显示在这里...",
                                                    rows: 12,
                                                    readOnly: true
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 243,
                                                    columnNumber: 25
                                                }, void 0),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                    style: {
                                                        marginTop: 16
                                                    },
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                        children: [
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.CopyOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 252,
                                                                    columnNumber: 37
                                                                }, void 0),
                                                                onClick: ()=>handleCopy(translatedText),
                                                                disabled: !translatedText,
                                                                children: "复制"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                                lineNumber: 251,
                                                                columnNumber: 29
                                                            }, void 0),
                                                            /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                                icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.SoundOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 259,
                                                                    columnNumber: 37
                                                                }, void 0),
                                                                onClick: ()=>handleSpeak(translatedText, targetLang),
                                                                disabled: !translatedText,
                                                                children: "朗读"
                                                            }, void 0, false, {
                                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                                lineNumber: 258,
                                                                columnNumber: 29
                                                            }, void 0)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "src/pages/AI/Translator/index.tsx",
                                                        lineNumber: 250,
                                                        columnNumber: 27
                                                    }, void 0)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 25
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 242,
                                            columnNumber: 23
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/Translator/index.tsx",
                                        lineNumber: 241,
                                        columnNumber: 21
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 240,
                                    columnNumber: 19
                                }, void 0),
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Col, {
                                    span: 24,
                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_procomponents.ProCard, {
                                        title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                            children: [
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.HistoryOutlined, {}, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 277,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("span", {
                                                    children: "翻译历史"
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 27
                                                }, void 0),
                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tag, {
                                                    color: "blue",
                                                    children: translationHistory.length
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 279,
                                                    columnNumber: 27
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 276,
                                            columnNumber: 25
                                        }, void 0),
                                        bordered: true,
                                        collapsible: true,
                                        defaultCollapsed: true,
                                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List, {
                                            dataSource: translationHistory,
                                            locale: {
                                                emptyText: '暂无历史记录'
                                            },
                                            renderItem: (item)=>{
                                                var _languages_find, _languages_find1;
                                                return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List.Item, {
                                                    actions: [
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                            type: "link",
                                                            size: "small",
                                                            onClick: ()=>handleLoadHistory(item),
                                                            children: "加载"
                                                        }, "load", false, {
                                                            fileName: "src/pages/AI/Translator/index.tsx",
                                                            lineNumber: 292,
                                                            columnNumber: 31
                                                        }, void 0),
                                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Button, {
                                                            type: "link",
                                                            size: "small",
                                                            danger: true,
                                                            icon: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.DeleteOutlined, {}, void 0, false, {
                                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                                lineNumber: 305,
                                                                columnNumber: 39
                                                            }, void 0),
                                                            onClick: ()=>handleDeleteHistory(item.id)
                                                        }, "delete", false, {
                                                            fileName: "src/pages/AI/Translator/index.tsx",
                                                            lineNumber: 300,
                                                            columnNumber: 31
                                                        }, void 0)
                                                    ],
                                                    children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.List.Item.Meta, {
                                                        title: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Space, {
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tag, {
                                                                    color: "blue",
                                                                    children: (_languages_find = languages.find((l)=>l.value === item.sourceLang)) === null || _languages_find === void 0 ? void 0 : _languages_find.label
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 313,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.SwapOutlined, {}, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 320,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tag, {
                                                                    color: "green",
                                                                    children: (_languages_find1 = languages.find((l)=>l.value === item.targetLang)) === null || _languages_find1 === void 0 ? void 0 : _languages_find1.label
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 321,
                                                                    columnNumber: 35
                                                                }, void 0)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Translator/index.tsx",
                                                            lineNumber: 312,
                                                            columnNumber: 33
                                                        }, void 0),
                                                        description: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                                    type: "secondary",
                                                                    children: [
                                                                        item.sourceText.substring(0, 50),
                                                                        item.sourceText.length > 50 ? '...' : ''
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 332,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("br", {}, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 336,
                                                                    columnNumber: 35
                                                                }, void 0),
                                                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                                                    type: "secondary",
                                                                    style: {
                                                                        fontSize: 12
                                                                    },
                                                                    children: item.timestamp.toLocaleString('zh-CN')
                                                                }, void 0, false, {
                                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                                    lineNumber: 337,
                                                                    columnNumber: 35
                                                                }, void 0)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "src/pages/AI/Translator/index.tsx",
                                                            lineNumber: 331,
                                                            columnNumber: 33
                                                        }, void 0)
                                                    }, void 0, false, {
                                                        fileName: "src/pages/AI/Translator/index.tsx",
                                                        lineNumber: 310,
                                                        columnNumber: 29
                                                    }, void 0)
                                                }, void 0, false, {
                                                    fileName: "src/pages/AI/Translator/index.tsx",
                                                    lineNumber: 290,
                                                    columnNumber: 27
                                                }, void 0);
                                            }
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 286,
                                            columnNumber: 23
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "src/pages/AI/Translator/index.tsx",
                                        lineNumber: 274,
                                        columnNumber: 21
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 273,
                                    columnNumber: 19
                                }, void 0)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/Translator/index.tsx",
                            lineNumber: 174,
                            columnNumber: 17
                        }, void 0)
                    },
                    {
                        key: 'document',
                        label: '文档翻译',
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                            style: {
                                padding: '40px',
                                textAlign: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Upload.Dragger, {
                                    beforeUpload: handleDocumentUpload,
                                    maxCount: 1,
                                    accept: ".txt,.doc,.docx,.pdf,.md",
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                            className: "ant-upload-drag-icon",
                                            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_icons.FileTextOutlined, {
                                                style: {
                                                    fontSize: 48
                                                }
                                            }, void 0, false, {
                                                fileName: "src/pages/AI/Translator/index.tsx",
                                                lineNumber: 365,
                                                columnNumber: 23
                                            }, void 0)
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 364,
                                            columnNumber: 21
                                        }, void 0),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                            className: "ant-upload-text",
                                            children: "点击或拖拽文件上传"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 367,
                                            columnNumber: 21
                                        }, void 0),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("p", {
                                            className: "ant-upload-hint",
                                            children: "支持 TXT、MD、DOC、DOCX、PDF，最大 5MB"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 368,
                                            columnNumber: 21
                                        }, void 0)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 359,
                                    columnNumber: 19
                                }, void 0),
                                loading && /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
                                    style: {
                                        marginTop: 24
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Progress, {
                                            percent: 50,
                                            status: "active"
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 374,
                                            columnNumber: 23
                                        }, void 0),
                                        /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(Text, {
                                            type: "secondary",
                                            children: "正在处理文档..."
                                        }, void 0, false, {
                                            fileName: "src/pages/AI/Translator/index.tsx",
                                            lineNumber: 375,
                                            columnNumber: 23
                                        }, void 0)
                                    ]
                                }, void 0, true, {
                                    fileName: "src/pages/AI/Translator/index.tsx",
                                    lineNumber: 373,
                                    columnNumber: 21
                                }, void 0)
                            ]
                        }, void 0, true, {
                            fileName: "src/pages/AI/Translator/index.tsx",
                            lineNumber: 358,
                            columnNumber: 17
                        }, void 0)
                    }
                ]
            }, void 0, false, {
                fileName: "src/pages/AI/Translator/index.tsx",
                lineNumber: 168,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "src/pages/AI/Translator/index.tsx",
            lineNumber: 167,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "src/pages/AI/Translator/index.tsx",
        lineNumber: 161,
        columnNumber: 5
    }, this);
};
_s(Translator, "d9MLdr93OkMnhwhHzfJP9L1fGQI=");
_c = Translator;
var _default = Translator;
var _c;
$RefreshReg$(_c, "Translator");
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
"src/services/baiduTranslate.ts": function (module, exports, __mako_require__){
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
    baiduTranslateService: function() {
        return baiduTranslateService;
    },
    default: function() {
        return _default;
    }
});
var _interop_require_default = __mako_require__("@swc/helpers/_/_interop_require_default");
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _axios = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/axios/index.js"));
var _md5 = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/md5/md5.js"));
const process = __mako_require__("node_modules/node-libs-browser-okam/polyfill/process.js");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
class BaiduTranslateService {
    config;
    apiUrl;
    constructor(config){
        this.config = config;
        this.apiUrl = config.apiUrl || 'https://fanyi-api.baidu.com/api/trans/vip/translate';
    }
    /**
     * 生成签名
     * sign = MD5(appid+query+salt+密钥)
     */ generateSign(query, salt) {
        const { appid, secretKey } = this.config;
        const str = `${appid}${query}${salt}${secretKey}`;
        return (0, _md5.default)(str);
    }
    /**
     * 翻译文本
     */ async translate(params) {
        const { text, from, to } = params;
        const salt = Date.now().toString();
        const sign = this.generateSign(text, salt);
        try {
            const response = await _axios.default.get(this.apiUrl, {
                params: {
                    q: text,
                    from: this.convertLangCode(from),
                    to: this.convertLangCode(to),
                    appid: this.config.appid,
                    salt,
                    sign
                },
                timeout: 10000
            });
            if (response.data.trans_result && response.data.trans_result.length > 0) return response.data.trans_result.map((item)=>item.dst).join('\n');
            throw new Error('翻译失败：未返回结果');
        } catch (error) {
            var _error_response;
            console.error('百度翻译 API 错误:', error);
            // 处理常见错误
            if ((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.data) {
                const errorCode = error.response.data.error_code;
                const errorMsg = this.getErrorMessage(errorCode);
                throw new Error(errorMsg);
            }
            throw new Error('翻译服务暂时不可用，请稍后重试');
        }
    }
    /**
     * 批量翻译
     */ async batchTranslate(texts, from, to) {
        const results = [];
        // 避免并发过多，分批处理
        const batchSize = 5;
        for(let i = 0; i < texts.length; i += batchSize){
            const batch = texts.slice(i, i + batchSize);
            const promises = batch.map((text)=>this.translate({
                    text,
                    from,
                    to
                }).catch((error)=>{
                    console.error(`翻译失败: ${text}`, error);
                    return text; // 失败时返回原文
                }));
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            // 添加延迟，避免超过 API 频率限制
            if (i + batchSize < texts.length) await this.delay(1000);
        }
        return results;
    }
    /**
     * 转换语言代码
     * 将前端使用的语言代码转换为百度 API 的代码
     */ convertLangCode(langCode) {
        const langMap = {
            'zh-CN': 'zh',
            'en-US': 'en',
            'ja-JP': 'jp',
            'ko-KR': 'kor',
            'fr-FR': 'fra',
            'de-DE': 'de',
            'es-ES': 'spa',
            'ru-RU': 'ru'
        };
        return langMap[langCode] || langCode;
    }
    /**
     * 获取错误信息
     */ getErrorMessage(errorCode) {
        const errorMap = {
            '52000': '成功',
            '52001': '请求超时，请重试',
            '52002': '系统错误，请重试',
            '52003': '未授权用户，请检查 appid 和密钥',
            '54000': '必填参数为空',
            '54001': '签名错误',
            '54003': '访问频率受限',
            '54004': '账户余额不足',
            '54005': '长query请求频繁',
            '58000': '客户端IP非法',
            '58001': '译文语言方向不支持'
        };
        return errorMap[errorCode] || `翻译错误 (${errorCode})`;
    }
    delay(ms) {
        return new Promise((resolve)=>setTimeout(resolve, ms));
    }
}
const baiduTranslateService = new BaiduTranslateService({
    appid: process.env.BAIDU_TRANSLATE_APPID || '',
    secretKey: process.env.BAIDU_TRANSLATE_SECRET || ''
});
var _default = BaiduTranslateService;
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
//# sourceMappingURL=p__AI__Translator__index-async.js.map