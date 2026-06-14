((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['common'],
{ "src/services/ai.ts": function (module, exports, __mako_require__){
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
    aiBatchTranslate: function() {
        return aiBatchTranslate;
    },
    aiGenerateMeetingNotes: function() {
        return aiGenerateMeetingNotes;
    },
    aiMeetingAnalytics: function() {
        return aiMeetingAnalytics;
    },
    aiMeetingSummary: function() {
        return aiMeetingSummary;
    },
    aiOptimizeDocument: function() {
        return aiOptimizeDocument;
    },
    aiTranslate: function() {
        return aiTranslate;
    },
    aiWriteDocument: function() {
        return aiWriteDocument;
    },
    startRealtimeTranscription: function() {
        return startRealtimeTranscription;
    }
});
var _interop_require_wildcard = __mako_require__("@swc/helpers/_/_interop_require_wildcard");
var _reactrefresh = /*#__PURE__*/ _interop_require_wildcard._(__mako_require__("node_modules/react-refresh/runtime.js"));
var _max = __mako_require__("src/.umi/exports.ts");
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
// AI 服务基础配置
const AI_API_BASE = '/api/ai'; // 根据实际情况修改
async function aiWriteDocument(params) {
    return (0, _max.request)(`${AI_API_BASE}/document/write`, {
        method: 'POST',
        data: params
    });
}
async function aiOptimizeDocument(params) {
    return (0, _max.request)(`${AI_API_BASE}/document/optimize`, {
        method: 'POST',
        data: params
    });
}
async function aiTranslate(params) {
    return (0, _max.request)(`${AI_API_BASE}/translate`, {
        method: 'POST',
        data: params
    });
}
async function aiBatchTranslate(params) {
    return (0, _max.request)(`${AI_API_BASE}/translate/batch`, {
        method: 'POST',
        data: params
    });
}
async function aiGenerateMeetingNotes(params) {
    return (0, _max.request)(`${AI_API_BASE}/meeting/notes`, {
        method: 'POST',
        data: params
    });
}
async function aiMeetingSummary(params) {
    return (0, _max.request)(`${AI_API_BASE}/meeting/summary`, {
        method: 'POST',
        data: params
    });
}
async function startRealtimeTranscription(params) {
    return (0, _max.request)(`${AI_API_BASE}/meeting/transcribe/start`, {
        method: 'POST',
        data: params
    });
}
async function aiMeetingAnalytics(params) {
    return (0, _max.request)(`${AI_API_BASE}/meeting/analytics/${params.meetingId}`, {
        method: 'GET'
    });
}
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
//# sourceMappingURL=common-async.js.map