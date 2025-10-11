((typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] = (typeof globalThis !== 'undefined' ? globalThis : self)["makoChunk_ant-design-pro"] || []).push([
        ['p__UserInfo__index'],
{ "src/pages/UserInfo/index.tsx": function (module, exports, __mako_require__){
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
var _antd = __mako_require__("node_modules/antd/es/index.js");
var _max = __mako_require__("src/.umi/exports.ts");
var _react = /*#__PURE__*/ _interop_require_default._(__mako_require__("node_modules/react/index.js"));
var prevRefreshReg;
var prevRefreshSig;
prevRefreshReg = self.$RefreshReg$;
prevRefreshSig = self.$RefreshSig$;
self.$RefreshReg$ = (type, id)=>{
    _reactrefresh.register(type, module.id + id);
};
self.$RefreshSig$ = _reactrefresh.createSignatureFunctionForTransform;
var _s = $RefreshSig$();
const UserInfo = ()=>{
    _s();
    const { initialState } = (0, _max.useModel)('@@initialState');
    const { currentUser } = initialState || {};
    return /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)("div", {
        style: {
            padding: 24
        },
        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Card, {
            title: "🔍 当前用户信息检查",
            bordered: true,
            children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions, {
                column: 1,
                bordered: true,
                children: [
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "用户名",
                        children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.name) || '未获取到'
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 13,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "用户ID",
                        children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.userid) || '未获取到'
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 16,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "邮箱",
                        children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.email) || '未获取到'
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 19,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "权限级别 (access)",
                        children: /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Tag, {
                            color: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.access) === 'admin' ? 'green' : 'orange',
                            children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.access) || '未获取到'
                        }, void 0, false, {
                            fileName: "src/pages/UserInfo/index.tsx",
                            lineNumber: 23,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 22,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "职位",
                        children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.title) || '未获取到'
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 27,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, _jsxdevruntime.jsxDEV)(_antd.Descriptions.Item, {
                        label: "部门",
                        children: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.group) || '未获取到'
                    }, void 0, false, {
                        fileName: "src/pages/UserInfo/index.tsx",
                        lineNumber: 30,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "src/pages/UserInfo/index.tsx",
                lineNumber: 12,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "src/pages/UserInfo/index.tsx",
            lineNumber: 11,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "src/pages/UserInfo/index.tsx",
        lineNumber: 10,
        columnNumber: 9
    }, this);
};
_s(UserInfo, "5mtXJ3qWOimX20WagWjCR+f3GVk=", false, function() {
    return [
        _max.useModel
    ];
});
_c = UserInfo;
var _default = UserInfo;
var _c;
$RefreshReg$(_c, "UserInfo");
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
//# sourceMappingURL=p__UserInfo__index-async.js.map