// Bundle JS cua app 'Tra cuu ICD-10 2026' (React, da build).
// Dung lam TAI LIEU THAM CHIEU de doi chieu logic check ICD - KHONG bien dich, khong chay.
// Duoc trich ra tu tasks/task-028.md va tasks/task-029.md (truoc day bi dan trung 2 lan, moi ban 355 KB).
// Tham chieu boi: tasks/task-028.md, tasks/task-029.md

(function() {
    const f = document.createElement("link").relList;
    if (f && f.supports && f.supports("modulepreload"))
        return;
    for (const w of document.querySelectorAll('link[rel="modulepreload"]'))
        I(w);
    new MutationObserver(w => {
        for (const R of w)
            if (R.type === "childList")
                for (const Y of R.addedNodes)
                    Y.tagName === "LINK" && Y.rel === "modulepreload" && I(Y)
    }
    ).observe(document, {
        childList: !0,
        subtree: !0
    });
    function m(w) {
        const R = {};
        return w.integrity && (R.integrity = w.integrity),
        w.referrerPolicy && (R.referrerPolicy = w.referrerPolicy),
        w.crossOrigin === "use-credentials" ? R.credentials = "include" : w.crossOrigin === "anonymous" ? R.credentials = "omit" : R.credentials = "same-origin",
        R
    }
    function I(w) {
        if (w.ep)
            return;
        w.ep = !0;
        const R = m(w);
        fetch(w.href, R)
    }
}
)();
function Hd(g) {
    return g && g.__esModule && Object.prototype.hasOwnProperty.call(g, "default") ? g.default : g
}
var zu = {
    exports: {}
}
  , Sr = {}
  , Ru = {
    exports: {}
}
  , b = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Oa;
function $d() {
    if (Oa)
        return b;
    Oa = 1;
    var g = Symbol.for("react.element")
      , f = Symbol.for("react.portal")
      , m = Symbol.for("react.fragment")
      , I = Symbol.for("react.strict_mode")
      , w = Symbol.for("react.profiler")
      , R = Symbol.for("react.provider")
      , Y = Symbol.for("react.context")
      , W = Symbol.for("react.forward_ref")
      , C = Symbol.for("react.suspense")
      , K = Symbol.for("react.memo")
      , P = Symbol.for("react.lazy")
      , V = Symbol.iterator;
    function F(d) {
        return d === null || typeof d != "object" ? null : (d = V && d[V] || d["@@iterator"],
        typeof d == "function" ? d : null)
    }
    var T = {
        isMounted: function() {
            return !1
        },
        enqueueForceUpdate: function() {},
        enqueueReplaceState: function() {},
        enqueueSetState: function() {}
    }
      , oe = Object.assign
      , le = {};
    function q(d, y, Q) {
        this.props = d,
        this.context = y,
        this.refs = le,
        this.updater = Q || T
    }
    q.prototype.isReactComponent = {},
    q.prototype.setState = function(d, y) {
        if (typeof d != "object" && typeof d != "function" && d != null)
            throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
        this.updater.enqueueSetState(this, d, y, "setState")
    }
    ,
    q.prototype.forceUpdate = function(d) {
        this.updater.enqueueForceUpdate(this, d, "forceUpdate")
    }
    ;
    function ge() {}
    ge.prototype = q.prototype;
    function he(d, y, Q) {
        this.props = d,
        this.context = y,
        this.refs = le,
        this.updater = Q || T
    }
    var ue = he.prototype = new ge;
    ue.constructor = he,
    oe(ue, q.prototype),
    ue.isPureReactComponent = !0;
    var G = Array.isArray
      , xe = Object.prototype.hasOwnProperty
      , Ce = {
        current: null
    }
      , $ = {
        key: !0,
        ref: !0,
        __self: !0,
        __source: !0
    };
    function ee(d, y, Q) {
        var J, ne = {}, te = null, fe = null;
        if (y != null)
            for (J in y.ref !== void 0 && (fe = y.ref),
            y.key !== void 0 && (te = "" + y.key),
            y)
                xe.call(y, J) && !$.hasOwnProperty(J) && (ne[J] = y[J]);
        var ce = arguments.length - 2;
        if (ce === 1)
            ne.children = Q;
        else if (1 < ce) {
            for (var ye = Array(ce), be = 0; be < ce; be++)
                ye[be] = arguments[be + 2];
            ne.children = ye
        }
        if (d && d.defaultProps)
            for (J in ce = d.defaultProps,
            ce)
                ne[J] === void 0 && (ne[J] = ce[J]);
        return {
            $$typeof: g,
            type: d,
            key: te,
            ref: fe,
            props: ne,
            _owner: Ce.current
        }
    }
    function Ie(d, y) {
        return {
            $$typeof: g,
            type: d.type,
            key: y,
            ref: d.ref,
            props: d.props,
            _owner: d._owner
        }
    }
    function Qe(d) {
        return typeof d == "object" && d !== null && d.$$typeof === g
    }
    function kn(d) {
        var y = {
            "=": "=0",
            ":": "=2"
        };
        return "$" + d.replace(/[=:]/g, function(Q) {
            return y[Q]
        })
    }
    var Je = /\/+/g;
    function Fe(d, y) {
        return typeof d == "object" && d !== null && d.key != null ? kn("" + d.key) : y.toString(36)
    }
    function j(d, y, Q, J, ne) {
        var te = typeof d;
        (te === "undefined" || te === "boolean") && (d = null);
        var fe = !1;
        if (d === null)
            fe = !0;
        else
            switch (te) {
            case "string":
            case "number":
                fe = !0;
                break;
            case "object":
                switch (d.$$typeof) {
                case g:
                case f:
                    fe = !0
                }
            }
        if (fe)
            return fe = d,
            ne = ne(fe),
            d = J === "" ? "." + Fe(fe, 0) : J,
            G(ne) ? (Q = "",
            d != null && (Q = d.replace(Je, "$&/") + "/"),
            j(ne, y, Q, "", function(be) {
                return be
            })) : ne != null && (Qe(ne) && (ne = Ie(ne, Q + (!ne.key || fe && fe.key === ne.key ? "" : ("" + ne.key).replace(Je, "$&/") + "/") + d)),
            y.push(ne)),
            1;
        if (fe = 0,
        J = J === "" ? "." : J + ":",
        G(d))
            for (var ce = 0; ce < d.length; ce++) {
                te = d[ce];
                var ye = J + Fe(te, ce);
                fe += j(te, y, Q, ye, ne)
            }
        else if (ye = F(d),
        typeof ye == "function")
            for (d = ye.call(d),
            ce = 0; !(te = d.next()).done; )
                te = te.value,
                ye = J + Fe(te, ce++),
                fe += j(te, y, Q, ye, ne);
        else if (te === "object")
            throw y = String(d),
            Error("Objects are not valid as a React child (found: " + (y === "[object Object]" ? "object with keys {" + Object.keys(d).join(", ") + "}" : y) + "). If you meant to render a collection of children, use an array instead.");
        return fe
    }
    function Z(d, y, Q) {
        if (d == null)
            return d;
        var J = []
          , ne = 0;
        return j(d, J, "", "", function(te) {
            return y.call(Q, te, ne++)
        }),
        J
    }
    function se(d) {
        if (d._status === -1) {
            var y = d._result;
            y = y(),
            y.then(function(Q) {
                (d._status === 0 || d._status === -1) && (d._status = 1,
                d._result = Q)
            }, function(Q) {
                (d._status === 0 || d._status === -1) && (d._status = 2,
                d._result = Q)
            }),
            d._status === -1 && (d._status = 0,
            d._result = y)
        }
        if (d._status === 1)
            return d._result.default;
        throw d._result
    }
    var ae = {
        current: null
    }
      , N = {
        transition: null
    }
      , U = {
        ReactCurrentDispatcher: ae,
        ReactCurrentBatchConfig: N,
        ReactCurrentOwner: Ce
    };
    function E() {
        throw Error("act(...) is not supported in production builds of React.")
    }
    return b.Children = {
        map: Z,
        forEach: function(d, y, Q) {
            Z(d, function() {
                y.apply(this, arguments)
            }, Q)
        },
        count: function(d) {
            var y = 0;
            return Z(d, function() {
                y++
            }),
            y
        },
        toArray: function(d) {
            return Z(d, function(y) {
                return y
            }) || []
        },
        only: function(d) {
            if (!Qe(d))
                throw Error("React.Children.only expected to receive a single React element child.");
            return d
        }
    },
    b.Component = q,
    b.Fragment = m,
    b.Profiler = w,
    b.PureComponent = he,
    b.StrictMode = I,
    b.Suspense = C,
    b.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = U,
    b.act = E,
    b.cloneElement = function(d, y, Q) {
        if (d == null)
            throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + d + ".");
        var J = oe({}, d.props)
          , ne = d.key
          , te = d.ref
          , fe = d._owner;
        if (y != null) {
            if (y.ref !== void 0 && (te = y.ref,
            fe = Ce.current),
            y.key !== void 0 && (ne = "" + y.key),
            d.type && d.type.defaultProps)
                var ce = d.type.defaultProps;
            for (ye in y)
                xe.call(y, ye) && !$.hasOwnProperty(ye) && (J[ye] = y[ye] === void 0 && ce !== void 0 ? ce[ye] : y[ye])
        }
        var ye = arguments.length - 2;
        if (ye === 1)
            J.children = Q;
        else if (1 < ye) {
            ce = Array(ye);
            for (var be = 0; be < ye; be++)
                ce[be] = arguments[be + 2];
            J.children = ce
        }
        return {
            $$typeof: g,
            type: d.type,
            key: ne,
            ref: te,
            props: J,
            _owner: fe
        }
    }
    ,
    b.createContext = function(d) {
        return d = {
            $$typeof: Y,
            _currentValue: d,
            _currentValue2: d,
            _threadCount: 0,
            Provider: null,
            Consumer: null,
            _defaultValue: null,
            _globalName: null
        },
        d.Provider = {
            $$typeof: R,
            _context: d
        },
        d.Consumer = d
    }
    ,
    b.createElement = ee,
    b.createFactory = function(d) {
        var y = ee.bind(null, d);
        return y.type = d,
        y
    }
    ,
    b.createRef = function() {
        return {
            current: null
        }
    }
    ,
    b.forwardRef = function(d) {
        return {
            $$typeof: W,
            render: d
        }
    }
    ,
    b.isValidElement = Qe,
    b.lazy = function(d) {
        return {
            $$typeof: P,
            _payload: {
                _status: -1,
                _result: d
            },
            _init: se
        }
    }
    ,
    b.memo = function(d, y) {
        return {
            $$typeof: K,
            type: d,
            compare: y === void 0 ? null : y
        }
    }
    ,
    b.startTransition = function(d) {
        var y = N.transition;
        N.transition = {};
        try {
            d()
        } finally {
            N.transition = y
        }
    }
    ,
    b.unstable_act = E,
    b.useCallback = function(d, y) {
        return ae.current.useCallback(d, y)
    }
    ,
    b.useContext = function(d) {
        return ae.current.useContext(d)
    }
    ,
    b.useDebugValue = function() {}
    ,
    b.useDeferredValue = function(d) {
        return ae.current.useDeferredValue(d)
    }
    ,
    b.useEffect = function(d, y) {
        return ae.current.useEffect(d, y)
    }
    ,
    b.useId = function() {
        return ae.current.useId()
    }
    ,
    b.useImperativeHandle = function(d, y, Q) {
        return ae.current.useImperativeHandle(d, y, Q)
    }
    ,
    b.useInsertionEffect = function(d, y) {
        return ae.current.useInsertionEffect(d, y)
    }
    ,
    b.useLayoutEffect = function(d, y) {
        return ae.current.useLayoutEffect(d, y)
    }
    ,
    b.useMemo = function(d, y) {
        return ae.current.useMemo(d, y)
    }
    ,
    b.useReducer = function(d, y, Q) {
        return ae.current.useReducer(d, y, Q)
    }
    ,
    b.useRef = function(d) {
        return ae.current.useRef(d)
    }
    ,
    b.useState = function(d) {
        return ae.current.useState(d)
    }
    ,
    b.useSyncExternalStore = function(d, y, Q) {
        return ae.current.useSyncExternalStore(d, y, Q)
    }
    ,
    b.useTransition = function() {
        return ae.current.useTransition()
    }
    ,
    b.version = "18.3.1",
    b
}
var Ia;
function Uu() {
    return Ia || (Ia = 1,
    Ru.exports = $d()),
    Ru.exports
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Fa;
function Qd() {
    if (Fa)
        return Sr;
    Fa = 1;
    var g = Uu()
      , f = Symbol.for("react.element")
      , m = Symbol.for("react.fragment")
      , I = Object.prototype.hasOwnProperty
      , w = g.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
      , R = {
        key: !0,
        ref: !0,
        __self: !0,
        __source: !0
    };
    function Y(W, C, K) {
        var P, V = {}, F = null, T = null;
        K !== void 0 && (F = "" + K),
        C.key !== void 0 && (F = "" + C.key),
        C.ref !== void 0 && (T = C.ref);
        for (P in C)
            I.call(C, P) && !R.hasOwnProperty(P) && (V[P] = C[P]);
        if (W && W.defaultProps)
            for (P in C = W.defaultProps,
            C)
                V[P] === void 0 && (V[P] = C[P]);
        return {
            $$typeof: f,
            type: W,
            key: F,
            ref: T,
            props: V,
            _owner: w.current
        }
    }
    return Sr.Fragment = m,
    Sr.jsx = Y,
    Sr.jsxs = Y,
    Sr
}
var Ua;
function Wd() {
    return Ua || (Ua = 1,
    zu.exports = Qd()),
    zu.exports
}
var s = Wd()
  , H = Uu();
const Kd = Hd(H);
var Ol = {}
  , Du = {
    exports: {}
}
  , qe = {}
  , Ou = {
    exports: {}
}
  , Iu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Va;
function Yd() {
    return Va || (Va = 1,
    (function(g) {
        function f(N, U) {
            var E = N.length;
            N.push(U);
            e: for (; 0 < E; ) {
                var d = E - 1 >>> 1
                  , y = N[d];
                if (0 < w(y, U))
                    N[d] = U,
                    N[E] = y,
                    E = d;
                else
                    break e
            }
        }
        function m(N) {
            return N.length === 0 ? null : N[0]
        }
        function I(N) {
            if (N.length === 0)
                return null;
            var U = N[0]
              , E = N.pop();
            if (E !== U) {
                N[0] = E;
                e: for (var d = 0, y = N.length, Q = y >>> 1; d < Q; ) {
                    var J = 2 * (d + 1) - 1
                      , ne = N[J]
                      , te = J + 1
                      , fe = N[te];
                    if (0 > w(ne, E))
                        te < y && 0 > w(fe, ne) ? (N[d] = fe,
                        N[te] = E,
                        d = te) : (N[d] = ne,
                        N[J] = E,
                        d = J);
                    else if (te < y && 0 > w(fe, E))
                        N[d] = fe,
                        N[te] = E,
                        d = te;
                    else
                        break e
                }
            }
            return U
        }
        function w(N, U) {
            var E = N.sortIndex - U.sortIndex;
            return E !== 0 ? E : N.id - U.id
        }
        if (typeof performance == "object" && typeof performance.now == "function") {
            var R = performance;
            g.unstable_now = function() {
                return R.now()
            }
        } else {
            var Y = Date
              , W = Y.now();
            g.unstable_now = function() {
                return Y.now() - W
            }
        }
        var C = []
          , K = []
          , P = 1
          , V = null
          , F = 3
          , T = !1
          , oe = !1
          , le = !1
          , q = typeof setTimeout == "function" ? setTimeout : null
          , ge = typeof clearTimeout == "function" ? clearTimeout : null
          , he = typeof setImmediate < "u" ? setImmediate : null;
        typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
        function ue(N) {
            for (var U = m(K); U !== null; ) {
                if (U.callback === null)
                    I(K);
                else if (U.startTime <= N)
                    I(K),
                    U.sortIndex = U.expirationTime,
                    f(C, U);
                else
                    break;
                U = m(K)
            }
        }
        function G(N) {
            if (le = !1,
            ue(N),
            !oe)
                if (m(C) !== null)
                    oe = !0,
                    se(xe);
                else {
                    var U = m(K);
                    U !== null && ae(G, U.startTime - N)
                }
        }
        function xe(N, U) {
            oe = !1,
            le && (le = !1,
            ge(ee),
            ee = -1),
            T = !0;
            var E = F;
            try {
                for (ue(U),
                V = m(C); V !== null && (!(V.expirationTime > U) || N && !kn()); ) {
                    var d = V.callback;
                    if (typeof d == "function") {
                        V.callback = null,
                        F = V.priorityLevel;
                        var y = d(V.expirationTime <= U);
                        U = g.unstable_now(),
                        typeof y == "function" ? V.callback = y : V === m(C) && I(C),
                        ue(U)
                    } else
                        I(C);
                    V = m(C)
                }
                if (V !== null)
                    var Q = !0;
                else {
                    var J = m(K);
                    J !== null && ae(G, J.startTime - U),
                    Q = !1
                }
                return Q
            } finally {
                V = null,
                F = E,
                T = !1
            }
        }
        var Ce = !1
          , $ = null
          , ee = -1
          , Ie = 5
          , Qe = -1;
        function kn() {
            return !(g.unstable_now() - Qe < Ie)
        }
        function Je() {
            if ($ !== null) {
                var N = g.unstable_now();
                Qe = N;
                var U = !0;
                try {
                    U = $(!0, N)
                } finally {
                    U ? Fe() : (Ce = !1,
                    $ = null)
                }
            } else
                Ce = !1
        }
        var Fe;
        if (typeof he == "function")
            Fe = function() {
                he(Je)
            }
            ;
        else if (typeof MessageChannel < "u") {
            var j = new MessageChannel
              , Z = j.port2;
            j.port1.onmessage = Je,
            Fe = function() {
                Z.postMessage(null)
            }
        } else
            Fe = function() {
                q(Je, 0)
            }
            ;
        function se(N) {
            $ = N,
            Ce || (Ce = !0,
            Fe())
        }
        function ae(N, U) {
            ee = q(function() {
                N(g.unstable_now())
            }, U)
        }
        g.unstable_IdlePriority = 5,
        g.unstable_ImmediatePriority = 1,
        g.unstable_LowPriority = 4,
        g.unstable_NormalPriority = 3,
        g.unstable_Profiling = null,
        g.unstable_UserBlockingPriority = 2,
        g.unstable_cancelCallback = function(N) {
            N.callback = null
        }
        ,
        g.unstable_continueExecution = function() {
            oe || T || (oe = !0,
            se(xe))
        }
        ,
        g.unstable_forceFrameRate = function(N) {
            0 > N || 125 < N ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : Ie = 0 < N ? Math.floor(1e3 / N) : 5
        }
        ,
        g.unstable_getCurrentPriorityLevel = function() {
            return F
        }
        ,
        g.unstable_getFirstCallbackNode = function() {
            return m(C)
        }
        ,
        g.unstable_next = function(N) {
            switch (F) {
            case 1:
            case 2:
            case 3:
                var U = 3;
                break;
            default:
                U = F
            }
            var E = F;
            F = U;
            try {
                return N()
            } finally {
                F = E
            }
        }
        ,
        g.unstable_pauseExecution = function() {}
        ,
        g.unstable_requestPaint = function() {}
        ,
        g.unstable_runWithPriority = function(N, U) {
            switch (N) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                break;
            default:
                N = 3
            }
            var E = F;
            F = N;
            try {
                return U()
            } finally {
                F = E
            }
        }
        ,
        g.unstable_scheduleCallback = function(N, U, E) {
            var d = g.unstable_now();
            switch (typeof E == "object" && E !== null ? (E = E.delay,
            E = typeof E == "number" && 0 < E ? d + E : d) : E = d,
            N) {
            case 1:
                var y = -1;
                break;
            case 2:
                y = 250;
                break;
            case 5:
                y = 1073741823;
                break;
            case 4:
                y = 1e4;
                break;
            default:
                y = 5e3
            }
            return y = E + y,
            N = {
                id: P++,
                callback: U,
                priorityLevel: N,
                startTime: E,
                expirationTime: y,
                sortIndex: -1
            },
            E > d ? (N.sortIndex = E,
            f(K, N),
            m(C) === null && N === m(K) && (le ? (ge(ee),
            ee = -1) : le = !0,
            ae(G, E - d))) : (N.sortIndex = y,
            f(C, N),
            oe || T || (oe = !0,
            se(xe))),
            N
        }
        ,
        g.unstable_shouldYield = kn,
        g.unstable_wrapCallback = function(N) {
            var U = F;
            return function() {
                var E = F;
                F = U;
                try {
                    return N.apply(this, arguments)
                } finally {
                    F = E
                }
            }
        }
    }
    )(Iu)),
    Iu
}
var Aa;
function Xd() {
    return Aa || (Aa = 1,
    Ou.exports = Yd()),
    Ou.exports
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ba;
function Gd() {
    if (Ba)
        return qe;
    Ba = 1;
    var g = Uu()
      , f = Xd();
    function m(e) {
        for (var n = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, t = 1; t < arguments.length; t++)
            n += "&args[]=" + encodeURIComponent(arguments[t]);
        return "Minified React error #" + e + "; visit " + n + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    }
    var I = new Set
      , w = {};
    function R(e, n) {
        Y(e, n),
        Y(e + "Capture", n)
    }
    function Y(e, n) {
        for (w[e] = n,
        e = 0; e < n.length; e++)
            I.add(n[e])
    }
    var W = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u")
      , C = Object.prototype.hasOwnProperty
      , K = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/
      , P = {}
      , V = {};
    function F(e) {
        return C.call(V, e) ? !0 : C.call(P, e) ? !1 : K.test(e) ? V[e] = !0 : (P[e] = !0,
        !1)
    }
    function T(e, n, t, r) {
        if (t !== null && t.type === 0)
            return !1;
        switch (typeof n) {
        case "function":
        case "symbol":
            return !0;
        case "boolean":
            return r ? !1 : t !== null ? !t.acceptsBooleans : (e = e.toLowerCase().slice(0, 5),
            e !== "data-" && e !== "aria-");
        default:
            return !1
        }
    }
    function oe(e, n, t, r) {
        if (n === null || typeof n > "u" || T(e, n, t, r))
            return !0;
        if (r)
            return !1;
        if (t !== null)
            switch (t.type) {
            case 3:
                return !n;
            case 4:
                return n === !1;
            case 5:
                return isNaN(n);
            case 6:
                return isNaN(n) || 1 > n
            }
        return !1
    }
    function le(e, n, t, r, l, i, u) {
        this.acceptsBooleans = n === 2 || n === 3 || n === 4,
        this.attributeName = r,
        this.attributeNamespace = l,
        this.mustUseProperty = t,
        this.propertyName = e,
        this.type = n,
        this.sanitizeURL = i,
        this.removeEmptyString = u
    }
    var q = {};
    "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
        q[e] = new le(e,0,!1,e,null,!1,!1)
    }),
    [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
        var n = e[0];
        q[n] = new le(n,1,!1,e[1],null,!1,!1)
    }),
    ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
        q[e] = new le(e,2,!1,e.toLowerCase(),null,!1,!1)
    }),
    ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
        q[e] = new le(e,2,!1,e,null,!1,!1)
    }),
    "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
        q[e] = new le(e,3,!1,e.toLowerCase(),null,!1,!1)
    }),
    ["checked", "multiple", "muted", "selected"].forEach(function(e) {
        q[e] = new le(e,3,!0,e,null,!1,!1)
    }),
    ["capture", "download"].forEach(function(e) {
        q[e] = new le(e,4,!1,e,null,!1,!1)
    }),
    ["cols", "rows", "size", "span"].forEach(function(e) {
        q[e] = new le(e,6,!1,e,null,!1,!1)
    }),
    ["rowSpan", "start"].forEach(function(e) {
        q[e] = new le(e,5,!1,e.toLowerCase(),null,!1,!1)
    });
    var ge = /[\-:]([a-z])/g;
    function he(e) {
        return e[1].toUpperCase()
    }
    "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
        var n = e.replace(ge, he);
        q[n] = new le(n,1,!1,e,null,!1,!1)
    }),
    "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
        var n = e.replace(ge, he);
        q[n] = new le(n,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)
    }),
    ["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
        var n = e.replace(ge, he);
        q[n] = new le(n,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)
    }),
    ["tabIndex", "crossOrigin"].forEach(function(e) {
        q[e] = new le(e,1,!1,e.toLowerCase(),null,!1,!1)
    }),
    q.xlinkHref = new le("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),
    ["src", "href", "action", "formAction"].forEach(function(e) {
        q[e] = new le(e,1,!1,e.toLowerCase(),null,!0,!0)
    });
    function ue(e, n, t, r) {
        var l = q.hasOwnProperty(n) ? q[n] : null;
        (l !== null ? l.type !== 0 : r || !(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (oe(n, t, l, r) && (t = null),
        r || l === null ? F(n) && (t === null ? e.removeAttribute(n) : e.setAttribute(n, "" + t)) : l.mustUseProperty ? e[l.propertyName] = t === null ? l.type === 3 ? !1 : "" : t : (n = l.attributeName,
        r = l.attributeNamespace,
        t === null ? e.removeAttribute(n) : (l = l.type,
        t = l === 3 || l === 4 && t === !0 ? "" : "" + t,
        r ? e.setAttributeNS(r, n, t) : e.setAttribute(n, t))))
    }
    var G = g.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      , xe = Symbol.for("react.element")
      , Ce = Symbol.for("react.portal")
      , $ = Symbol.for("react.fragment")
      , ee = Symbol.for("react.strict_mode")
      , Ie = Symbol.for("react.profiler")
      , Qe = Symbol.for("react.provider")
      , kn = Symbol.for("react.context")
      , Je = Symbol.for("react.forward_ref")
      , Fe = Symbol.for("react.suspense")
      , j = Symbol.for("react.suspense_list")
      , Z = Symbol.for("react.memo")
      , se = Symbol.for("react.lazy")
      , ae = Symbol.for("react.offscreen")
      , N = Symbol.iterator;
    function U(e) {
        return e === null || typeof e != "object" ? null : (e = N && e[N] || e["@@iterator"],
        typeof e == "function" ? e : null)
    }
    var E = Object.assign, d;
    function y(e) {
        if (d === void 0)
            try {
                throw Error()
            } catch (t) {
                var n = t.stack.trim().match(/\n( *(at )?)/);
                d = n && n[1] || ""
            }
        return `
` + d + e
    }
    var Q = !1;
    function J(e, n) {
        if (!e || Q)
            return "";
        Q = !0;
        var t = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        try {
            if (n)
                if (n = function() {
                    throw Error()
                }
                ,
                Object.defineProperty(n.prototype, "props", {
                    set: function() {
                        throw Error()
                    }
                }),
                typeof Reflect == "object" && Reflect.construct) {
                    try {
                        Reflect.construct(n, [])
                    } catch (v) {
                        var r = v
                    }
                    Reflect.construct(e, [], n)
                } else {
                    try {
                        n.call()
                    } catch (v) {
                        r = v
                    }
                    e.call(n.prototype)
                }
            else {
                try {
                    throw Error()
                } catch (v) {
                    r = v
                }
                e()
            }
        } catch (v) {
            if (v && r && typeof v.stack == "string") {
                for (var l = v.stack.split(`
`), i = r.stack.split(`
`), u = l.length - 1, o = i.length - 1; 1 <= u && 0 <= o && l[u] !== i[o]; )
                    o--;
                for (; 1 <= u && 0 <= o; u--,
                o--)
                    if (l[u] !== i[o]) {
                        if (u !== 1 || o !== 1)
                            do
                                if (u--,
                                o--,
                                0 > o || l[u] !== i[o]) {
                                    var a = `
` + l[u].replace(" at new ", " at ");
                                    return e.displayName && a.includes("<anonymous>") && (a = a.replace("<anonymous>", e.displayName)),
                                    a
                                }
                            while (1 <= u && 0 <= o);
                        break
                    }
            }
        } finally {
            Q = !1,
            Error.prepareStackTrace = t
        }
        return (e = e ? e.displayName || e.name : "") ? y(e) : ""
    }
    function ne(e) {
        switch (e.tag) {
        case 5:
            return y(e.type);
        case 16:
            return y("Lazy");
        case 13:
            return y("Suspense");
        case 19:
            return y("SuspenseList");
        case 0:
        case 2:
        case 15:
            return e = J(e.type, !1),
            e;
        case 11:
            return e = J(e.type.render, !1),
            e;
        case 1:
            return e = J(e.type, !0),
            e;
        default:
            return ""
        }
    }
    function te(e) {
        if (e == null)
            return null;
        if (typeof e == "function")
            return e.displayName || e.name || null;
        if (typeof e == "string")
            return e;
        switch (e) {
        case $:
            return "Fragment";
        case Ce:
            return "Portal";
        case Ie:
            return "Profiler";
        case ee:
            return "StrictMode";
        case Fe:
            return "Suspense";
        case j:
            return "SuspenseList"
        }
        if (typeof e == "object")
            switch (e.$$typeof) {
            case kn:
                return (e.displayName || "Context") + ".Consumer";
            case Qe:
                return (e._context.displayName || "Context") + ".Provider";
            case Je:
                var n = e.render;
                return e = e.displayName,
                e || (e = n.displayName || n.name || "",
                e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"),
                e;
            case Z:
                return n = e.displayName || null,
                n !== null ? n : te(e.type) || "Memo";
            case se:
                n = e._payload,
                e = e._init;
                try {
                    return te(e(n))
                } catch {}
            }
        return null
    }
    function fe(e) {
        var n = e.type;
        switch (e.tag) {
        case 24:
            return "Cache";
        case 9:
            return (n.displayName || "Context") + ".Consumer";
        case 10:
            return (n._context.displayName || "Context") + ".Provider";
        case 18:
            return "DehydratedFragment";
        case 11:
            return e = n.render,
            e = e.displayName || e.name || "",
            n.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
        case 7:
            return "Fragment";
        case 5:
            return n;
        case 4:
            return "Portal";
        case 3:
            return "Root";
        case 6:
            return "Text";
        case 16:
            return te(n);
        case 8:
            return n === ee ? "StrictMode" : "Mode";
        case 22:
            return "Offscreen";
        case 12:
            return "Profiler";
        case 21:
            return "Scope";
        case 13:
            return "Suspense";
        case 19:
            return "SuspenseList";
        case 25:
            return "TracingMarker";
        case 1:
        case 0:
        case 17:
        case 2:
        case 14:
        case 15:
            if (typeof n == "function")
                return n.displayName || n.name || null;
            if (typeof n == "string")
                return n
        }
        return null
    }
    function ce(e) {
        switch (typeof e) {
        case "boolean":
        case "number":
        case "string":
        case "undefined":
            return e;
        case "object":
            return e;
        default:
            return ""
        }
    }
    function ye(e) {
        var n = e.type;
        return (e = e.nodeName) && e.toLowerCase() === "input" && (n === "checkbox" || n === "radio")
    }
    function be(e) {
        var n = ye(e) ? "checked" : "value"
          , t = Object.getOwnPropertyDescriptor(e.constructor.prototype, n)
          , r = "" + e[n];
        if (!e.hasOwnProperty(n) && typeof t < "u" && typeof t.get == "function" && typeof t.set == "function") {
            var l = t.get
              , i = t.set;
            return Object.defineProperty(e, n, {
                configurable: !0,
                get: function() {
                    return l.call(this)
                },
                set: function(u) {
                    r = "" + u,
                    i.call(this, u)
                }
            }),
            Object.defineProperty(e, n, {
                enumerable: t.enumerable
            }),
            {
                getValue: function() {
                    return r
                },
                setValue: function(u) {
                    r = "" + u
                },
                stopTracking: function() {
                    e._valueTracker = null,
                    delete e[n]
                }
            }
        }
    }
    function Nr(e) {
        e._valueTracker || (e._valueTracker = be(e))
    }
    function Au(e) {
        if (!e)
            return !1;
        var n = e._valueTracker;
        if (!n)
            return !0;
        var t = n.getValue()
          , r = "";
        return e && (r = ye(e) ? e.checked ? "true" : "false" : e.value),
        e = r,
        e !== t ? (n.setValue(e),
        !0) : !1
    }
    function jr(e) {
        if (e = e || (typeof document < "u" ? document : void 0),
        typeof e > "u")
            return null;
        try {
            return e.activeElement || e.body
        } catch {
            return e.body
        }
    }
    function Vl(e, n) {
        var t = n.checked;
        return E({}, n, {
            defaultChecked: void 0,
            defaultValue: void 0,
            value: void 0,
            checked: t ?? e._wrapperState.initialChecked
        })
    }
    function Bu(e, n) {
        var t = n.defaultValue == null ? "" : n.defaultValue
          , r = n.checked != null ? n.checked : n.defaultChecked;
        t = ce(n.value != null ? n.value : t),
        e._wrapperState = {
            initialChecked: r,
            initialValue: t,
            controlled: n.type === "checkbox" || n.type === "radio" ? n.checked != null : n.value != null
        }
    }
    function Hu(e, n) {
        n = n.checked,
        n != null && ue(e, "checked", n, !1)
    }
    function Al(e, n) {
        Hu(e, n);
        var t = ce(n.value)
          , r = n.type;
        if (t != null)
            r === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + t) : e.value !== "" + t && (e.value = "" + t);
        else if (r === "submit" || r === "reset") {
            e.removeAttribute("value");
            return
        }
        n.hasOwnProperty("value") ? Bl(e, n.type, t) : n.hasOwnProperty("defaultValue") && Bl(e, n.type, ce(n.defaultValue)),
        n.checked == null && n.defaultChecked != null && (e.defaultChecked = !!n.defaultChecked)
    }
    function $u(e, n, t) {
        if (n.hasOwnProperty("value") || n.hasOwnProperty("defaultValue")) {
            var r = n.type;
            if (!(r !== "submit" && r !== "reset" || n.value !== void 0 && n.value !== null))
                return;
            n = "" + e._wrapperState.initialValue,
            t || n === e.value || (e.value = n),
            e.defaultValue = n
        }
        t = e.name,
        t !== "" && (e.name = ""),
        e.defaultChecked = !!e._wrapperState.initialChecked,
        t !== "" && (e.name = t)
    }
    function Bl(e, n, t) {
        (n !== "number" || jr(e.ownerDocument) !== e) && (t == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + t && (e.defaultValue = "" + t))
    }
    var It = Array.isArray;
    function dt(e, n, t, r) {
        if (e = e.options,
        n) {
            n = {};
            for (var l = 0; l < t.length; l++)
                n["$" + t[l]] = !0;
            for (t = 0; t < e.length; t++)
                l = n.hasOwnProperty("$" + e[t].value),
                e[t].selected !== l && (e[t].selected = l),
                l && r && (e[t].defaultSelected = !0)
        } else {
            for (t = "" + ce(t),
            n = null,
            l = 0; l < e.length; l++) {
                if (e[l].value === t) {
                    e[l].selected = !0,
                    r && (e[l].defaultSelected = !0);
                    return
                }
                n !== null || e[l].disabled || (n = e[l])
            }
            n !== null && (n.selected = !0)
        }
    }
    function Hl(e, n) {
        if (n.dangerouslySetInnerHTML != null)
            throw Error(m(91));
        return E({}, n, {
            value: void 0,
            defaultValue: void 0,
            children: "" + e._wrapperState.initialValue
        })
    }
    function Qu(e, n) {
        var t = n.value;
        if (t == null) {
            if (t = n.children,
            n = n.defaultValue,
            t != null) {
                if (n != null)
                    throw Error(m(92));
                if (It(t)) {
                    if (1 < t.length)
                        throw Error(m(93));
                    t = t[0]
                }
                n = t
            }
            n == null && (n = ""),
            t = n
        }
        e._wrapperState = {
            initialValue: ce(t)
        }
    }
    function Wu(e, n) {
        var t = ce(n.value)
          , r = ce(n.defaultValue);
        t != null && (t = "" + t,
        t !== e.value && (e.value = t),
        n.defaultValue == null && e.defaultValue !== t && (e.defaultValue = t)),
        r != null && (e.defaultValue = "" + r)
    }
    function Ku(e) {
        var n = e.textContent;
        n === e._wrapperState.initialValue && n !== "" && n !== null && (e.value = n)
    }
    function Yu(e) {
        switch (e) {
        case "svg":
            return "http://www.w3.org/2000/svg";
        case "math":
            return "http://www.w3.org/1998/Math/MathML";
        default:
            return "http://www.w3.org/1999/xhtml"
        }
    }
    function $l(e, n) {
        return e == null || e === "http://www.w3.org/1999/xhtml" ? Yu(n) : e === "http://www.w3.org/2000/svg" && n === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e
    }
    var Er, Xu = (function(e) {
        return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(n, t, r, l) {
            MSApp.execUnsafeLocalFunction(function() {
                return e(n, t, r, l)
            })
        }
        : e
    }
    )(function(e, n) {
        if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML"in e)
            e.innerHTML = n;
        else {
            for (Er = Er || document.createElement("div"),
            Er.innerHTML = "<svg>" + n.valueOf().toString() + "</svg>",
            n = Er.firstChild; e.firstChild; )
                e.removeChild(e.firstChild);
            for (; n.firstChild; )
                e.appendChild(n.firstChild)
        }
    });
    function Ft(e, n) {
        if (n) {
            var t = e.firstChild;
            if (t && t === e.lastChild && t.nodeType === 3) {
                t.nodeValue = n;
                return
            }
        }
        e.textContent = n
    }
    var Ut = {
        animationIterationCount: !0,
        aspectRatio: !0,
        borderImageOutset: !0,
        borderImageSlice: !0,
        borderImageWidth: !0,
        boxFlex: !0,
        boxFlexGroup: !0,
        boxOrdinalGroup: !0,
        columnCount: !0,
        columns: !0,
        flex: !0,
        flexGrow: !0,
        flexPositive: !0,
        flexShrink: !0,
        flexNegative: !0,
        flexOrder: !0,
        gridArea: !0,
        gridRow: !0,
        gridRowEnd: !0,
        gridRowSpan: !0,
        gridRowStart: !0,
        gridColumn: !0,
        gridColumnEnd: !0,
        gridColumnSpan: !0,
        gridColumnStart: !0,
        fontWeight: !0,
        lineClamp: !0,
        lineHeight: !0,
        opacity: !0,
        order: !0,
        orphans: !0,
        tabSize: !0,
        widows: !0,
        zIndex: !0,
        zoom: !0,
        fillOpacity: !0,
        floodOpacity: !0,
        stopOpacity: !0,
        strokeDasharray: !0,
        strokeDashoffset: !0,
        strokeMiterlimit: !0,
        strokeOpacity: !0,
        strokeWidth: !0
    }
      , Ka = ["Webkit", "ms", "Moz", "O"];
    Object.keys(Ut).forEach(function(e) {
        Ka.forEach(function(n) {
            n = n + e.charAt(0).toUpperCase() + e.substring(1),
            Ut[n] = Ut[e]
        })
    });
    function Gu(e, n, t) {
        return n == null || typeof n == "boolean" || n === "" ? "" : t || typeof n != "number" || n === 0 || Ut.hasOwnProperty(e) && Ut[e] ? ("" + n).trim() : n + "px"
    }
    function qu(e, n) {
        e = e.style;
        for (var t in n)
            if (n.hasOwnProperty(t)) {
                var r = t.indexOf("--") === 0
                  , l = Gu(t, n[t], r);
                t === "float" && (t = "cssFloat"),
                r ? e.setProperty(t, l) : e[t] = l
            }
    }
    var Ya = E({
        menuitem: !0
    }, {
        area: !0,
        base: !0,
        br: !0,
        col: !0,
        embed: !0,
        hr: !0,
        img: !0,
        input: !0,
        keygen: !0,
        link: !0,
        meta: !0,
        param: !0,
        source: !0,
        track: !0,
        wbr: !0
    });
    function Ql(e, n) {
        if (n) {
            if (Ya[e] && (n.children != null || n.dangerouslySetInnerHTML != null))
                throw Error(m(137, e));
            if (n.dangerouslySetInnerHTML != null) {
                if (n.children != null)
                    throw Error(m(60));
                if (typeof n.dangerouslySetInnerHTML != "object" || !("__html"in n.dangerouslySetInnerHTML))
                    throw Error(m(61))
            }
            if (n.style != null && typeof n.style != "object")
                throw Error(m(62))
        }
    }
    function Wl(e, n) {
        if (e.indexOf("-") === -1)
            return typeof n.is == "string";
        switch (e) {
        case "annotation-xml":
        case "color-profile":
        case "font-face":
        case "font-face-src":
        case "font-face-uri":
        case "font-face-format":
        case "font-face-name":
        case "missing-glyph":
            return !1;
        default:
            return !0
        }
    }
    var Kl = null;
    function Yl(e) {
        return e = e.target || e.srcElement || window,
        e.correspondingUseElement && (e = e.correspondingUseElement),
        e.nodeType === 3 ? e.parentNode : e
    }
    var Xl = null
      , ft = null
      , pt = null;
    function Zu(e) {
        if (e = ur(e)) {
            if (typeof Xl != "function")
                throw Error(m(280));
            var n = e.stateNode;
            n && (n = qr(n),
            Xl(e.stateNode, e.type, n))
        }
    }
    function Ju(e) {
        ft ? pt ? pt.push(e) : pt = [e] : ft = e
    }
    function bu() {
        if (ft) {
            var e = ft
              , n = pt;
            if (pt = ft = null,
            Zu(e),
            n)
                for (e = 0; e < n.length; e++)
                    Zu(n[e])
        }
    }
    function eo(e, n) {
        return e(n)
    }
    function no() {}
    var Gl = !1;
    function to(e, n, t) {
        if (Gl)
            return e(n, t);
        Gl = !0;
        try {
            return eo(e, n, t)
        } finally {
            Gl = !1,
            (ft !== null || pt !== null) && (no(),
            bu())
        }
    }
    function Vt(e, n) {
        var t = e.stateNode;
        if (t === null)
            return null;
        var r = qr(t);
        if (r === null)
            return null;
        t = r[n];
        e: switch (n) {
        case "onClick":
        case "onClickCapture":
        case "onDoubleClick":
        case "onDoubleClickCapture":
        case "onMouseDown":
        case "onMouseDownCapture":
        case "onMouseMove":
        case "onMouseMoveCapture":
        case "onMouseUp":
        case "onMouseUpCapture":
        case "onMouseEnter":
            (r = !r.disabled) || (e = e.type,
            r = !(e === "button" || e === "input" || e === "select" || e === "textarea")),
            e = !r;
            break e;
        default:
            e = !1
        }
        if (e)
            return null;
        if (t && typeof t != "function")
            throw Error(m(231, n, typeof t));
        return t
    }
    var ql = !1;
    if (W)
        try {
            var At = {};
            Object.defineProperty(At, "passive", {
                get: function() {
                    ql = !0
                }
            }),
            window.addEventListener("test", At, At),
            window.removeEventListener("test", At, At)
        } catch {
            ql = !1
        }
    function Xa(e, n, t, r, l, i, u, o, a) {
        var v = Array.prototype.slice.call(arguments, 3);
        try {
            n.apply(t, v)
        } catch (x) {
            this.onError(x)
        }
    }
    var Bt = !1
      , Tr = null
      , Pr = !1
      , Zl = null
      , Ga = {
        onError: function(e) {
            Bt = !0,
            Tr = e
        }
    };
    function qa(e, n, t, r, l, i, u, o, a) {
        Bt = !1,
        Tr = null,
        Xa.apply(Ga, arguments)
    }
    function Za(e, n, t, r, l, i, u, o, a) {
        if (qa.apply(this, arguments),
        Bt) {
            if (Bt) {
                var v = Tr;
                Bt = !1,
                Tr = null
            } else
                throw Error(m(198));
            Pr || (Pr = !0,
            Zl = v)
        }
    }
    function Jn(e) {
        var n = e
          , t = e;
        if (e.alternate)
            for (; n.return; )
                n = n.return;
        else {
            e = n;
            do
                n = e,
                (n.flags & 4098) !== 0 && (t = n.return),
                e = n.return;
            while (e)
        }
        return n.tag === 3 ? t : null
    }
    function ro(e) {
        if (e.tag === 13) {
            var n = e.memoizedState;
            if (n === null && (e = e.alternate,
            e !== null && (n = e.memoizedState)),
            n !== null)
                return n.dehydrated
        }
        return null
    }
    function lo(e) {
        if (Jn(e) !== e)
            throw Error(m(188))
    }
    function Ja(e) {
        var n = e.alternate;
        if (!n) {
            if (n = Jn(e),
            n === null)
                throw Error(m(188));
            return n !== e ? null : e
        }
        for (var t = e, r = n; ; ) {
            var l = t.return;
            if (l === null)
                break;
            var i = l.alternate;
            if (i === null) {
                if (r = l.return,
                r !== null) {
                    t = r;
                    continue
                }
                break
            }
            if (l.child === i.child) {
                for (i = l.child; i; ) {
                    if (i === t)
                        return lo(l),
                        e;
                    if (i === r)
                        return lo(l),
                        n;
                    i = i.sibling
                }
                throw Error(m(188))
            }
            if (t.return !== r.return)
                t = l,
                r = i;
            else {
                for (var u = !1, o = l.child; o; ) {
                    if (o === t) {
                        u = !0,
                        t = l,
                        r = i;
                        break
                    }
                    if (o === r) {
                        u = !0,
                        r = l,
                        t = i;
                        break
                    }
                    o = o.sibling
                }
                if (!u) {
                    for (o = i.child; o; ) {
                        if (o === t) {
                            u = !0,
                            t = i,
                            r = l;
                            break
                        }
                        if (o === r) {
                            u = !0,
                            r = i,
                            t = l;
                            break
                        }
                        o = o.sibling
                    }
                    if (!u)
                        throw Error(m(189))
                }
            }
            if (t.alternate !== r)
                throw Error(m(190))
        }
        if (t.tag !== 3)
            throw Error(m(188));
        return t.stateNode.current === t ? e : n
    }
    function io(e) {
        return e = Ja(e),
        e !== null ? uo(e) : null
    }
    function uo(e) {
        if (e.tag === 5 || e.tag === 6)
            return e;
        for (e = e.child; e !== null; ) {
            var n = uo(e);
            if (n !== null)
                return n;
            e = e.sibling
        }
        return null
    }
    var oo = f.unstable_scheduleCallback
      , so = f.unstable_cancelCallback
      , ba = f.unstable_shouldYield
      , ec = f.unstable_requestPaint
      , je = f.unstable_now
      , nc = f.unstable_getCurrentPriorityLevel
      , Jl = f.unstable_ImmediatePriority
      , ao = f.unstable_UserBlockingPriority
      , Lr = f.unstable_NormalPriority
      , tc = f.unstable_LowPriority
      , co = f.unstable_IdlePriority
      , Mr = null
      , xn = null;
    function rc(e) {
        if (xn && typeof xn.onCommitFiberRoot == "function")
            try {
                xn.onCommitFiberRoot(Mr, e, void 0, (e.current.flags & 128) === 128)
            } catch {}
    }
    var fn = Math.clz32 ? Math.clz32 : uc
      , lc = Math.log
      , ic = Math.LN2;
    function uc(e) {
        return e >>>= 0,
        e === 0 ? 32 : 31 - (lc(e) / ic | 0) | 0
    }
    var zr = 64
      , Rr = 4194304;
    function Ht(e) {
        switch (e & -e) {
        case 1:
            return 1;
        case 2:
            return 2;
        case 4:
            return 4;
        case 8:
            return 8;
        case 16:
            return 16;
        case 32:
            return 32;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
            return e & 4194240;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
            return e & 130023424;
        case 134217728:
            return 134217728;
        case 268435456:
            return 268435456;
        case 536870912:
            return 536870912;
        case 1073741824:
            return 1073741824;
        default:
            return e
        }
    }
    function Dr(e, n) {
        var t = e.pendingLanes;
        if (t === 0)
            return 0;
        var r = 0
          , l = e.suspendedLanes
          , i = e.pingedLanes
          , u = t & 268435455;
        if (u !== 0) {
            var o = u & ~l;
            o !== 0 ? r = Ht(o) : (i &= u,
            i !== 0 && (r = Ht(i)))
        } else
            u = t & ~l,
            u !== 0 ? r = Ht(u) : i !== 0 && (r = Ht(i));
        if (r === 0)
            return 0;
        if (n !== 0 && n !== r && (n & l) === 0 && (l = r & -r,
        i = n & -n,
        l >= i || l === 16 && (i & 4194240) !== 0))
            return n;
        if ((r & 4) !== 0 && (r |= t & 16),
        n = e.entangledLanes,
        n !== 0)
            for (e = e.entanglements,
            n &= r; 0 < n; )
                t = 31 - fn(n),
                l = 1 << t,
                r |= e[t],
                n &= ~l;
        return r
    }
    function oc(e, n) {
        switch (e) {
        case 1:
        case 2:
        case 4:
            return n + 250;
        case 8:
        case 16:
        case 32:
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
            return n + 5e3;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
            return -1;
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
            return -1;
        default:
            return -1
        }
    }
    function sc(e, n) {
        for (var t = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
            var u = 31 - fn(i)
              , o = 1 << u
              , a = l[u];
            a === -1 ? ((o & t) === 0 || (o & r) !== 0) && (l[u] = oc(o, n)) : a <= n && (e.expiredLanes |= o),
            i &= ~o
        }
    }
    function bl(e) {
        return e = e.pendingLanes & -1073741825,
        e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
    }
    function fo() {
        var e = zr;
        return zr <<= 1,
        (zr & 4194240) === 0 && (zr = 64),
        e
    }
    function ei(e) {
        for (var n = [], t = 0; 31 > t; t++)
            n.push(e);
        return n
    }
    function $t(e, n, t) {
        e.pendingLanes |= n,
        n !== 536870912 && (e.suspendedLanes = 0,
        e.pingedLanes = 0),
        e = e.eventTimes,
        n = 31 - fn(n),
        e[n] = t
    }
    function ac(e, n) {
        var t = e.pendingLanes & ~n;
        e.pendingLanes = n,
        e.suspendedLanes = 0,
        e.pingedLanes = 0,
        e.expiredLanes &= n,
        e.mutableReadLanes &= n,
        e.entangledLanes &= n,
        n = e.entanglements;
        var r = e.eventTimes;
        for (e = e.expirationTimes; 0 < t; ) {
            var l = 31 - fn(t)
              , i = 1 << l;
            n[l] = 0,
            r[l] = -1,
            e[l] = -1,
            t &= ~i
        }
    }
    function ni(e, n) {
        var t = e.entangledLanes |= n;
        for (e = e.entanglements; t; ) {
            var r = 31 - fn(t)
              , l = 1 << r;
            l & n | e[r] & n && (e[r] |= n),
            t &= ~l
        }
    }
    var de = 0;
    function po(e) {
        return e &= -e,
        1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1
    }
    var ho, ti, mo, vo, go, ri = !1, Or = [], Rn = null, Dn = null, On = null, Qt = new Map, Wt = new Map, In = [], cc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
    function yo(e, n) {
        switch (e) {
        case "focusin":
        case "focusout":
            Rn = null;
            break;
        case "dragenter":
        case "dragleave":
            Dn = null;
            break;
        case "mouseover":
        case "mouseout":
            On = null;
            break;
        case "pointerover":
        case "pointerout":
            Qt.delete(n.pointerId);
            break;
        case "gotpointercapture":
        case "lostpointercapture":
            Wt.delete(n.pointerId)
        }
    }
    function Kt(e, n, t, r, l, i) {
        return e === null || e.nativeEvent !== i ? (e = {
            blockedOn: n,
            domEventName: t,
            eventSystemFlags: r,
            nativeEvent: i,
            targetContainers: [l]
        },
        n !== null && (n = ur(n),
        n !== null && ti(n)),
        e) : (e.eventSystemFlags |= r,
        n = e.targetContainers,
        l !== null && n.indexOf(l) === -1 && n.push(l),
        e)
    }
    function dc(e, n, t, r, l) {
        switch (n) {
        case "focusin":
            return Rn = Kt(Rn, e, n, t, r, l),
            !0;
        case "dragenter":
            return Dn = Kt(Dn, e, n, t, r, l),
            !0;
        case "mouseover":
            return On = Kt(On, e, n, t, r, l),
            !0;
        case "pointerover":
            var i = l.pointerId;
            return Qt.set(i, Kt(Qt.get(i) || null, e, n, t, r, l)),
            !0;
        case "gotpointercapture":
            return i = l.pointerId,
            Wt.set(i, Kt(Wt.get(i) || null, e, n, t, r, l)),
            !0
        }
        return !1
    }
    function ko(e) {
        var n = bn(e.target);
        if (n !== null) {
            var t = Jn(n);
            if (t !== null) {
                if (n = t.tag,
                n === 13) {
                    if (n = ro(t),
                    n !== null) {
                        e.blockedOn = n,
                        go(e.priority, function() {
                            mo(t)
                        });
                        return
                    }
                } else if (n === 3 && t.stateNode.current.memoizedState.isDehydrated) {
                    e.blockedOn = t.tag === 3 ? t.stateNode.containerInfo : null;
                    return
                }
            }
        }
        e.blockedOn = null
    }
    function Ir(e) {
        if (e.blockedOn !== null)
            return !1;
        for (var n = e.targetContainers; 0 < n.length; ) {
            var t = ii(e.domEventName, e.eventSystemFlags, n[0], e.nativeEvent);
            if (t === null) {
                t = e.nativeEvent;
                var r = new t.constructor(t.type,t);
                Kl = r,
                t.target.dispatchEvent(r),
                Kl = null
            } else
                return n = ur(t),
                n !== null && ti(n),
                e.blockedOn = t,
                !1;
            n.shift()
        }
        return !0
    }
    function xo(e, n, t) {
        Ir(e) && t.delete(n)
    }
    function fc() {
        ri = !1,
        Rn !== null && Ir(Rn) && (Rn = null),
        Dn !== null && Ir(Dn) && (Dn = null),
        On !== null && Ir(On) && (On = null),
        Qt.forEach(xo),
        Wt.forEach(xo)
    }
    function Yt(e, n) {
        e.blockedOn === n && (e.blockedOn = null,
        ri || (ri = !0,
        f.unstable_scheduleCallback(f.unstable_NormalPriority, fc)))
    }
    function Xt(e) {
        function n(l) {
            return Yt(l, e)
        }
        if (0 < Or.length) {
            Yt(Or[0], e);
            for (var t = 1; t < Or.length; t++) {
                var r = Or[t];
                r.blockedOn === e && (r.blockedOn = null)
            }
        }
        for (Rn !== null && Yt(Rn, e),
        Dn !== null && Yt(Dn, e),
        On !== null && Yt(On, e),
        Qt.forEach(n),
        Wt.forEach(n),
        t = 0; t < In.length; t++)
            r = In[t],
            r.blockedOn === e && (r.blockedOn = null);
        for (; 0 < In.length && (t = In[0],
        t.blockedOn === null); )
            ko(t),
            t.blockedOn === null && In.shift()
    }
    var ht = G.ReactCurrentBatchConfig
      , Fr = !0;
    function pc(e, n, t, r) {
        var l = de
          , i = ht.transition;
        ht.transition = null;
        try {
            de = 1,
            li(e, n, t, r)
        } finally {
            de = l,
            ht.transition = i
        }
    }
    function hc(e, n, t, r) {
        var l = de
          , i = ht.transition;
        ht.transition = null;
        try {
            de = 4,
            li(e, n, t, r)
        } finally {
            de = l,
            ht.transition = i
        }
    }
    function li(e, n, t, r) {
        if (Fr) {
            var l = ii(e, n, t, r);
            if (l === null)
                wi(e, n, r, Ur, t),
                yo(e, r);
            else if (dc(l, e, n, t, r))
                r.stopPropagation();
            else if (yo(e, r),
            n & 4 && -1 < cc.indexOf(e)) {
                for (; l !== null; ) {
                    var i = ur(l);
                    if (i !== null && ho(i),
                    i = ii(e, n, t, r),
                    i === null && wi(e, n, r, Ur, t),
                    i === l)
                        break;
                    l = i
                }
                l !== null && r.stopPropagation()
            } else
                wi(e, n, r, null, t)
        }
    }
    var Ur = null;
    function ii(e, n, t, r) {
        if (Ur = null,
        e = Yl(r),
        e = bn(e),
        e !== null)
            if (n = Jn(e),
            n === null)
                e = null;
            else if (t = n.tag,
            t === 13) {
                if (e = ro(n),
                e !== null)
                    return e;
                e = null
            } else if (t === 3) {
                if (n.stateNode.current.memoizedState.isDehydrated)
                    return n.tag === 3 ? n.stateNode.containerInfo : null;
                e = null
            } else
                n !== e && (e = null);
        return Ur = e,
        null
    }
    function So(e) {
        switch (e) {
        case "cancel":
        case "click":
        case "close":
        case "contextmenu":
        case "copy":
        case "cut":
        case "auxclick":
        case "dblclick":
        case "dragend":
        case "dragstart":
        case "drop":
        case "focusin":
        case "focusout":
        case "input":
        case "invalid":
        case "keydown":
        case "keypress":
        case "keyup":
        case "mousedown":
        case "mouseup":
        case "paste":
        case "pause":
        case "play":
        case "pointercancel":
        case "pointerdown":
        case "pointerup":
        case "ratechange":
        case "reset":
        case "resize":
        case "seeked":
        case "submit":
        case "touchcancel":
        case "touchend":
        case "touchstart":
        case "volumechange":
        case "change":
        case "selectionchange":
        case "textInput":
        case "compositionstart":
        case "compositionend":
        case "compositionupdate":
        case "beforeblur":
        case "afterblur":
        case "beforeinput":
        case "blur":
        case "fullscreenchange":
        case "focus":
        case "hashchange":
        case "popstate":
        case "select":
        case "selectstart":
            return 1;
        case "drag":
        case "dragenter":
        case "dragexit":
        case "dragleave":
        case "dragover":
        case "mousemove":
        case "mouseout":
        case "mouseover":
        case "pointermove":
        case "pointerout":
        case "pointerover":
        case "scroll":
        case "toggle":
        case "touchmove":
        case "wheel":
        case "mouseenter":
        case "mouseleave":
        case "pointerenter":
        case "pointerleave":
            return 4;
        case "message":
            switch (nc()) {
            case Jl:
                return 1;
            case ao:
                return 4;
            case Lr:
            case tc:
                return 16;
            case co:
                return 536870912;
            default:
                return 16
            }
        default:
            return 16
        }
    }
    var Fn = null
      , ui = null
      , Vr = null;
    function wo() {
        if (Vr)
            return Vr;
        var e, n = ui, t = n.length, r, l = "value"in Fn ? Fn.value : Fn.textContent, i = l.length;
        for (e = 0; e < t && n[e] === l[e]; e++)
            ;
        var u = t - e;
        for (r = 1; r <= u && n[t - r] === l[i - r]; r++)
            ;
        return Vr = l.slice(e, 1 < r ? 1 - r : void 0)
    }
    function Ar(e) {
        var n = e.keyCode;
        return "charCode"in e ? (e = e.charCode,
        e === 0 && n === 13 && (e = 13)) : e = n,
        e === 10 && (e = 13),
        32 <= e || e === 13 ? e : 0
    }
    function Br() {
        return !0
    }
    function _o() {
        return !1
    }
    function en(e) {
        function n(t, r, l, i, u) {
            this._reactName = t,
            this._targetInst = l,
            this.type = r,
            this.nativeEvent = i,
            this.target = u,
            this.currentTarget = null;
            for (var o in e)
                e.hasOwnProperty(o) && (t = e[o],
                this[o] = t ? t(i) : i[o]);
            return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? Br : _o,
            this.isPropagationStopped = _o,
            this
        }
        return E(n.prototype, {
            preventDefault: function() {
                this.defaultPrevented = !0;
                var t = this.nativeEvent;
                t && (t.preventDefault ? t.preventDefault() : typeof t.returnValue != "unknown" && (t.returnValue = !1),
                this.isDefaultPrevented = Br)
            },
            stopPropagation: function() {
                var t = this.nativeEvent;
                t && (t.stopPropagation ? t.stopPropagation() : typeof t.cancelBubble != "unknown" && (t.cancelBubble = !0),
                this.isPropagationStopped = Br)
            },
            persist: function() {},
            isPersistent: Br
        }),
        n
    }
    var mt = {
        eventPhase: 0,
        bubbles: 0,
        cancelable: 0,
        timeStamp: function(e) {
            return e.timeStamp || Date.now()
        },
        defaultPrevented: 0,
        isTrusted: 0
    }, oi = en(mt), Gt = E({}, mt, {
        view: 0,
        detail: 0
    }), mc = en(Gt), si, ai, qt, Hr = E({}, Gt, {
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        pageX: 0,
        pageY: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        getModifierState: di,
        button: 0,
        buttons: 0,
        relatedTarget: function(e) {
            return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget
        },
        movementX: function(e) {
            return "movementX"in e ? e.movementX : (e !== qt && (qt && e.type === "mousemove" ? (si = e.screenX - qt.screenX,
            ai = e.screenY - qt.screenY) : ai = si = 0,
            qt = e),
            si)
        },
        movementY: function(e) {
            return "movementY"in e ? e.movementY : ai
        }
    }), Co = en(Hr), vc = E({}, Hr, {
        dataTransfer: 0
    }), gc = en(vc), yc = E({}, Gt, {
        relatedTarget: 0
    }), ci = en(yc), kc = E({}, mt, {
        animationName: 0,
        elapsedTime: 0,
        pseudoElement: 0
    }), xc = en(kc), Sc = E({}, mt, {
        clipboardData: function(e) {
            return "clipboardData"in e ? e.clipboardData : window.clipboardData
        }
    }), wc = en(Sc), _c = E({}, mt, {
        data: 0
    }), No = en(_c), Cc = {
        Esc: "Escape",
        Spacebar: " ",
        Left: "ArrowLeft",
        Up: "ArrowUp",
        Right: "ArrowRight",
        Down: "ArrowDown",
        Del: "Delete",
        Win: "OS",
        Menu: "ContextMenu",
        Apps: "ContextMenu",
        Scroll: "ScrollLock",
        MozPrintableKey: "Unidentified"
    }, Nc = {
        8: "Backspace",
        9: "Tab",
        12: "Clear",
        13: "Enter",
        16: "Shift",
        17: "Control",
        18: "Alt",
        19: "Pause",
        20: "CapsLock",
        27: "Escape",
        32: " ",
        33: "PageUp",
        34: "PageDown",
        35: "End",
        36: "Home",
        37: "ArrowLeft",
        38: "ArrowUp",
        39: "ArrowRight",
        40: "ArrowDown",
        45: "Insert",
        46: "Delete",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        119: "F8",
        120: "F9",
        121: "F10",
        122: "F11",
        123: "F12",
        144: "NumLock",
        145: "ScrollLock",
        224: "Meta"
    }, jc = {
        Alt: "altKey",
        Control: "ctrlKey",
        Meta: "metaKey",
        Shift: "shiftKey"
    };
    function Ec(e) {
        var n = this.nativeEvent;
        return n.getModifierState ? n.getModifierState(e) : (e = jc[e]) ? !!n[e] : !1
    }
    function di() {
        return Ec
    }
    var Tc = E({}, Gt, {
        key: function(e) {
            if (e.key) {
                var n = Cc[e.key] || e.key;
                if (n !== "Unidentified")
                    return n
            }
            return e.type === "keypress" ? (e = Ar(e),
            e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Nc[e.keyCode] || "Unidentified" : ""
        },
        code: 0,
        location: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        repeat: 0,
        locale: 0,
        getModifierState: di,
        charCode: function(e) {
            return e.type === "keypress" ? Ar(e) : 0
        },
        keyCode: function(e) {
            return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
        },
        which: function(e) {
            return e.type === "keypress" ? Ar(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
        }
    })
      , Pc = en(Tc)
      , Lc = E({}, Hr, {
        pointerId: 0,
        width: 0,
        height: 0,
        pressure: 0,
        tangentialPressure: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        pointerType: 0,
        isPrimary: 0
    })
      , jo = en(Lc)
      , Mc = E({}, Gt, {
        touches: 0,
        targetTouches: 0,
        changedTouches: 0,
        altKey: 0,
        metaKey: 0,
        ctrlKey: 0,
        shiftKey: 0,
        getModifierState: di
    })
      , zc = en(Mc)
      , Rc = E({}, mt, {
        propertyName: 0,
        elapsedTime: 0,
        pseudoElement: 0
    })
      , Dc = en(Rc)
      , Oc = E({}, Hr, {
        deltaX: function(e) {
            return "deltaX"in e ? e.deltaX : "wheelDeltaX"in e ? -e.wheelDeltaX : 0
        },
        deltaY: function(e) {
            return "deltaY"in e ? e.deltaY : "wheelDeltaY"in e ? -e.wheelDeltaY : "wheelDelta"in e ? -e.wheelDelta : 0
        },
        deltaZ: 0,
        deltaMode: 0
    })
      , Ic = en(Oc)
      , Fc = [9, 13, 27, 32]
      , fi = W && "CompositionEvent"in window
      , Zt = null;
    W && "documentMode"in document && (Zt = document.documentMode);
    var Uc = W && "TextEvent"in window && !Zt
      , Eo = W && (!fi || Zt && 8 < Zt && 11 >= Zt)
      , To = " "
      , Po = !1;
    function Lo(e, n) {
        switch (e) {
        case "keyup":
            return Fc.indexOf(n.keyCode) !== -1;
        case "keydown":
            return n.keyCode !== 229;
        case "keypress":
        case "mousedown":
        case "focusout":
            return !0;
        default:
            return !1
        }
    }
    function Mo(e) {
        return e = e.detail,
        typeof e == "object" && "data"in e ? e.data : null
    }
    var vt = !1;
    function Vc(e, n) {
        switch (e) {
        case "compositionend":
            return Mo(n);
        case "keypress":
            return n.which !== 32 ? null : (Po = !0,
            To);
        case "textInput":
            return e = n.data,
            e === To && Po ? null : e;
        default:
            return null
        }
    }
    function Ac(e, n) {
        if (vt)
            return e === "compositionend" || !fi && Lo(e, n) ? (e = wo(),
            Vr = ui = Fn = null,
            vt = !1,
            e) : null;
        switch (e) {
        case "paste":
            return null;
        case "keypress":
            if (!(n.ctrlKey || n.altKey || n.metaKey) || n.ctrlKey && n.altKey) {
                if (n.char && 1 < n.char.length)
                    return n.char;
                if (n.which)
                    return String.fromCharCode(n.which)
            }
            return null;
        case "compositionend":
            return Eo && n.locale !== "ko" ? null : n.data;
        default:
            return null
        }
    }
    var Bc = {
        color: !0,
        date: !0,
        datetime: !0,
        "datetime-local": !0,
        email: !0,
        month: !0,
        number: !0,
        password: !0,
        range: !0,
        search: !0,
        tel: !0,
        text: !0,
        time: !0,
        url: !0,
        week: !0
    };
    function zo(e) {
        var n = e && e.nodeName && e.nodeName.toLowerCase();
        return n === "input" ? !!Bc[e.type] : n === "textarea"
    }
    function Ro(e, n, t, r) {
        Ju(r),
        n = Yr(n, "onChange"),
        0 < n.length && (t = new oi("onChange","change",null,t,r),
        e.push({
            event: t,
            listeners: n
        }))
    }
    var Jt = null
      , bt = null;
    function Hc(e) {
        Zo(e, 0)
    }
    function $r(e) {
        var n = St(e);
        if (Au(n))
            return e
    }
    function $c(e, n) {
        if (e === "change")
            return n
    }
    var Do = !1;
    if (W) {
        var pi;
        if (W) {
            var hi = "oninput"in document;
            if (!hi) {
                var Oo = document.createElement("div");
                Oo.setAttribute("oninput", "return;"),
                hi = typeof Oo.oninput == "function"
            }
            pi = hi
        } else
            pi = !1;
        Do = pi && (!document.documentMode || 9 < document.documentMode)
    }
    function Io() {
        Jt && (Jt.detachEvent("onpropertychange", Fo),
        bt = Jt = null)
    }
    function Fo(e) {
        if (e.propertyName === "value" && $r(bt)) {
            var n = [];
            Ro(n, bt, e, Yl(e)),
            to(Hc, n)
        }
    }
    function Qc(e, n, t) {
        e === "focusin" ? (Io(),
        Jt = n,
        bt = t,
        Jt.attachEvent("onpropertychange", Fo)) : e === "focusout" && Io()
    }
    function Wc(e) {
        if (e === "selectionchange" || e === "keyup" || e === "keydown")
            return $r(bt)
    }
    function Kc(e, n) {
        if (e === "click")
            return $r(n)
    }
    function Yc(e, n) {
        if (e === "input" || e === "change")
            return $r(n)
    }
    function Xc(e, n) {
        return e === n && (e !== 0 || 1 / e === 1 / n) || e !== e && n !== n
    }
    var pn = typeof Object.is == "function" ? Object.is : Xc;
    function er(e, n) {
        if (pn(e, n))
            return !0;
        if (typeof e != "object" || e === null || typeof n != "object" || n === null)
            return !1;
        var t = Object.keys(e)
          , r = Object.keys(n);
        if (t.length !== r.length)
            return !1;
        for (r = 0; r < t.length; r++) {
            var l = t[r];
            if (!C.call(n, l) || !pn(e[l], n[l]))
                return !1
        }
        return !0
    }
    function Uo(e) {
        for (; e && e.firstChild; )
            e = e.firstChild;
        return e
    }
    function Vo(e, n) {
        var t = Uo(e);
        e = 0;
        for (var r; t; ) {
            if (t.nodeType === 3) {
                if (r = e + t.textContent.length,
                e <= n && r >= n)
                    return {
                        node: t,
                        offset: n - e
                    };
                e = r
            }
            e: {
                for (; t; ) {
                    if (t.nextSibling) {
                        t = t.nextSibling;
                        break e
                    }
                    t = t.parentNode
                }
                t = void 0
            }
            t = Uo(t)
        }
    }
    function Ao(e, n) {
        return e && n ? e === n ? !0 : e && e.nodeType === 3 ? !1 : n && n.nodeType === 3 ? Ao(e, n.parentNode) : "contains"in e ? e.contains(n) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(n) & 16) : !1 : !1
    }
    function Bo() {
        for (var e = window, n = jr(); n instanceof e.HTMLIFrameElement; ) {
            try {
                var t = typeof n.contentWindow.location.href == "string"
            } catch {
                t = !1
            }
            if (t)
                e = n.contentWindow;
            else
                break;
            n = jr(e.document)
        }
        return n
    }
    function mi(e) {
        var n = e && e.nodeName && e.nodeName.toLowerCase();
        return n && (n === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || n === "textarea" || e.contentEditable === "true")
    }
    function Gc(e) {
        var n = Bo()
          , t = e.focusedElem
          , r = e.selectionRange;
        if (n !== t && t && t.ownerDocument && Ao(t.ownerDocument.documentElement, t)) {
            if (r !== null && mi(t)) {
                if (n = r.start,
                e = r.end,
                e === void 0 && (e = n),
                "selectionStart"in t)
                    t.selectionStart = n,
                    t.selectionEnd = Math.min(e, t.value.length);
                else if (e = (n = t.ownerDocument || document) && n.defaultView || window,
                e.getSelection) {
                    e = e.getSelection();
                    var l = t.textContent.length
                      , i = Math.min(r.start, l);
                    r = r.end === void 0 ? i : Math.min(r.end, l),
                    !e.extend && i > r && (l = r,
                    r = i,
                    i = l),
                    l = Vo(t, i);
                    var u = Vo(t, r);
                    l && u && (e.rangeCount !== 1 || e.anchorNode !== l.node || e.anchorOffset !== l.offset || e.focusNode !== u.node || e.focusOffset !== u.offset) && (n = n.createRange(),
                    n.setStart(l.node, l.offset),
                    e.removeAllRanges(),
                    i > r ? (e.addRange(n),
                    e.extend(u.node, u.offset)) : (n.setEnd(u.node, u.offset),
                    e.addRange(n)))
                }
            }
            for (n = [],
            e = t; e = e.parentNode; )
                e.nodeType === 1 && n.push({
                    element: e,
                    left: e.scrollLeft,
                    top: e.scrollTop
                });
            for (typeof t.focus == "function" && t.focus(),
            t = 0; t < n.length; t++)
                e = n[t],
                e.element.scrollLeft = e.left,
                e.element.scrollTop = e.top
        }
    }
    var qc = W && "documentMode"in document && 11 >= document.documentMode
      , gt = null
      , vi = null
      , nr = null
      , gi = !1;
    function Ho(e, n, t) {
        var r = t.window === t ? t.document : t.nodeType === 9 ? t : t.ownerDocument;
        gi || gt == null || gt !== jr(r) || (r = gt,
        "selectionStart"in r && mi(r) ? r = {
            start: r.selectionStart,
            end: r.selectionEnd
        } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(),
        r = {
            anchorNode: r.anchorNode,
            anchorOffset: r.anchorOffset,
            focusNode: r.focusNode,
            focusOffset: r.focusOffset
        }),
        nr && er(nr, r) || (nr = r,
        r = Yr(vi, "onSelect"),
        0 < r.length && (n = new oi("onSelect","select",null,n,t),
        e.push({
            event: n,
            listeners: r
        }),
        n.target = gt)))
    }
    function Qr(e, n) {
        var t = {};
        return t[e.toLowerCase()] = n.toLowerCase(),
        t["Webkit" + e] = "webkit" + n,
        t["Moz" + e] = "moz" + n,
        t
    }
    var yt = {
        animationend: Qr("Animation", "AnimationEnd"),
        animationiteration: Qr("Animation", "AnimationIteration"),
        animationstart: Qr("Animation", "AnimationStart"),
        transitionend: Qr("Transition", "TransitionEnd")
    }
      , yi = {}
      , $o = {};
    W && ($o = document.createElement("div").style,
    "AnimationEvent"in window || (delete yt.animationend.animation,
    delete yt.animationiteration.animation,
    delete yt.animationstart.animation),
    "TransitionEvent"in window || delete yt.transitionend.transition);
    function Wr(e) {
        if (yi[e])
            return yi[e];
        if (!yt[e])
            return e;
        var n = yt[e], t;
        for (t in n)
            if (n.hasOwnProperty(t) && t in $o)
                return yi[e] = n[t];
        return e
    }
    var Qo = Wr("animationend")
      , Wo = Wr("animationiteration")
      , Ko = Wr("animationstart")
      , Yo = Wr("transitionend")
      , Xo = new Map
      , Go = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
    function Un(e, n) {
        Xo.set(e, n),
        R(n, [e])
    }
    for (var ki = 0; ki < Go.length; ki++) {
        var xi = Go[ki]
          , Zc = xi.toLowerCase()
          , Jc = xi[0].toUpperCase() + xi.slice(1);
        Un(Zc, "on" + Jc)
    }
    Un(Qo, "onAnimationEnd"),
    Un(Wo, "onAnimationIteration"),
    Un(Ko, "onAnimationStart"),
    Un("dblclick", "onDoubleClick"),
    Un("focusin", "onFocus"),
    Un("focusout", "onBlur"),
    Un(Yo, "onTransitionEnd"),
    Y("onMouseEnter", ["mouseout", "mouseover"]),
    Y("onMouseLeave", ["mouseout", "mouseover"]),
    Y("onPointerEnter", ["pointerout", "pointerover"]),
    Y("onPointerLeave", ["pointerout", "pointerover"]),
    R("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")),
    R("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),
    R("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]),
    R("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")),
    R("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")),
    R("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
    var tr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" ")
      , bc = new Set("cancel close invalid load scroll toggle".split(" ").concat(tr));
    function qo(e, n, t) {
        var r = e.type || "unknown-event";
        e.currentTarget = t,
        Za(r, n, void 0, e),
        e.currentTarget = null
    }
    function Zo(e, n) {
        n = (n & 4) !== 0;
        for (var t = 0; t < e.length; t++) {
            var r = e[t]
              , l = r.event;
            r = r.listeners;
            e: {
                var i = void 0;
                if (n)
                    for (var u = r.length - 1; 0 <= u; u--) {
                        var o = r[u]
                          , a = o.instance
                          , v = o.currentTarget;
                        if (o = o.listener,
                        a !== i && l.isPropagationStopped())
                            break e;
                        qo(l, o, v),
                        i = a
                    }
                else
                    for (u = 0; u < r.length; u++) {
                        if (o = r[u],
                        a = o.instance,
                        v = o.currentTarget,
                        o = o.listener,
                        a !== i && l.isPropagationStopped())
                            break e;
                        qo(l, o, v),
                        i = a
                    }
            }
        }
        if (Pr)
            throw e = Zl,
            Pr = !1,
            Zl = null,
            e
    }
    function me(e, n) {
        var t = n[Ti];
        t === void 0 && (t = n[Ti] = new Set);
        var r = e + "__bubble";
        t.has(r) || (Jo(n, e, 2, !1),
        t.add(r))
    }
    function Si(e, n, t) {
        var r = 0;
        n && (r |= 4),
        Jo(t, e, r, n)
    }
    var Kr = "_reactListening" + Math.random().toString(36).slice(2);
    function rr(e) {
        if (!e[Kr]) {
            e[Kr] = !0,
            I.forEach(function(t) {
                t !== "selectionchange" && (bc.has(t) || Si(t, !1, e),
                Si(t, !0, e))
            });
            var n = e.nodeType === 9 ? e : e.ownerDocument;
            n === null || n[Kr] || (n[Kr] = !0,
            Si("selectionchange", !1, n))
        }
    }
    function Jo(e, n, t, r) {
        switch (So(n)) {
        case 1:
            var l = pc;
            break;
        case 4:
            l = hc;
            break;
        default:
            l = li
        }
        t = l.bind(null, n, t, e),
        l = void 0,
        !ql || n !== "touchstart" && n !== "touchmove" && n !== "wheel" || (l = !0),
        r ? l !== void 0 ? e.addEventListener(n, t, {
            capture: !0,
            passive: l
        }) : e.addEventListener(n, t, !0) : l !== void 0 ? e.addEventListener(n, t, {
            passive: l
        }) : e.addEventListener(n, t, !1)
    }
    function wi(e, n, t, r, l) {
        var i = r;
        if ((n & 1) === 0 && (n & 2) === 0 && r !== null)
            e: for (; ; ) {
                if (r === null)
                    return;
                var u = r.tag;
                if (u === 3 || u === 4) {
                    var o = r.stateNode.containerInfo;
                    if (o === l || o.nodeType === 8 && o.parentNode === l)
                        break;
                    if (u === 4)
                        for (u = r.return; u !== null; ) {
                            var a = u.tag;
                            if ((a === 3 || a === 4) && (a = u.stateNode.containerInfo,
                            a === l || a.nodeType === 8 && a.parentNode === l))
                                return;
                            u = u.return
                        }
                    for (; o !== null; ) {
                        if (u = bn(o),
                        u === null)
                            return;
                        if (a = u.tag,
                        a === 5 || a === 6) {
                            r = i = u;
                            continue e
                        }
                        o = o.parentNode
                    }
                }
                r = r.return
            }
        to(function() {
            var v = i
              , x = Yl(t)
              , S = [];
            e: {
                var k = Xo.get(e);
                if (k !== void 0) {
                    var L = oi
                      , z = e;
                    switch (e) {
                    case "keypress":
                        if (Ar(t) === 0)
                            break e;
                    case "keydown":
                    case "keyup":
                        L = Pc;
                        break;
                    case "focusin":
                        z = "focus",
                        L = ci;
                        break;
                    case "focusout":
                        z = "blur",
                        L = ci;
                        break;
                    case "beforeblur":
                    case "afterblur":
                        L = ci;
                        break;
                    case "click":
                        if (t.button === 2)
                            break e;
                    case "auxclick":
                    case "dblclick":
                    case "mousedown":
                    case "mousemove":
                    case "mouseup":
                    case "mouseout":
                    case "mouseover":
                    case "contextmenu":
                        L = Co;
                        break;
                    case "drag":
                    case "dragend":
                    case "dragenter":
                    case "dragexit":
                    case "dragleave":
                    case "dragover":
                    case "dragstart":
                    case "drop":
                        L = gc;
                        break;
                    case "touchcancel":
                    case "touchend":
                    case "touchmove":
                    case "touchstart":
                        L = zc;
                        break;
                    case Qo:
                    case Wo:
                    case Ko:
                        L = xc;
                        break;
                    case Yo:
                        L = Dc;
                        break;
                    case "scroll":
                        L = mc;
                        break;
                    case "wheel":
                        L = Ic;
                        break;
                    case "copy":
                    case "cut":
                    case "paste":
                        L = wc;
                        break;
                    case "gotpointercapture":
                    case "lostpointercapture":
                    case "pointercancel":
                    case "pointerdown":
                    case "pointermove":
                    case "pointerout":
                    case "pointerover":
                    case "pointerup":
                        L = jo
                    }
                    var D = (n & 4) !== 0
                      , Ee = !D && e === "scroll"
                      , p = D ? k !== null ? k + "Capture" : null : k;
                    D = [];
                    for (var c = v, h; c !== null; ) {
                        h = c;
                        var _ = h.stateNode;
                        if (h.tag === 5 && _ !== null && (h = _,
                        p !== null && (_ = Vt(c, p),
                        _ != null && D.push(lr(c, _, h)))),
                        Ee)
                            break;
                        c = c.return
                    }
                    0 < D.length && (k = new L(k,z,null,t,x),
                    S.push({
                        event: k,
                        listeners: D
                    }))
                }
            }
            if ((n & 7) === 0) {
                e: {
                    if (k = e === "mouseover" || e === "pointerover",
                    L = e === "mouseout" || e === "pointerout",
                    k && t !== Kl && (z = t.relatedTarget || t.fromElement) && (bn(z) || z[Nn]))
                        break e;
                    if ((L || k) && (k = x.window === x ? x : (k = x.ownerDocument) ? k.defaultView || k.parentWindow : window,
                    L ? (z = t.relatedTarget || t.toElement,
                    L = v,
                    z = z ? bn(z) : null,
                    z !== null && (Ee = Jn(z),
                    z !== Ee || z.tag !== 5 && z.tag !== 6) && (z = null)) : (L = null,
                    z = v),
                    L !== z)) {
                        if (D = Co,
                        _ = "onMouseLeave",
                        p = "onMouseEnter",
                        c = "mouse",
                        (e === "pointerout" || e === "pointerover") && (D = jo,
                        _ = "onPointerLeave",
                        p = "onPointerEnter",
                        c = "pointer"),
                        Ee = L == null ? k : St(L),
                        h = z == null ? k : St(z),
                        k = new D(_,c + "leave",L,t,x),
                        k.target = Ee,
                        k.relatedTarget = h,
                        _ = null,
                        bn(x) === v && (D = new D(p,c + "enter",z,t,x),
                        D.target = h,
                        D.relatedTarget = Ee,
                        _ = D),
                        Ee = _,
                        L && z)
                            n: {
                                for (D = L,
                                p = z,
                                c = 0,
                                h = D; h; h = kt(h))
                                    c++;
                                for (h = 0,
                                _ = p; _; _ = kt(_))
                                    h++;
                                for (; 0 < c - h; )
                                    D = kt(D),
                                    c--;
                                for (; 0 < h - c; )
                                    p = kt(p),
                                    h--;
                                for (; c--; ) {
                                    if (D === p || p !== null && D === p.alternate)
                                        break n;
                                    D = kt(D),
                                    p = kt(p)
                                }
                                D = null
                            }
                        else
                            D = null;
                        L !== null && bo(S, k, L, D, !1),
                        z !== null && Ee !== null && bo(S, Ee, z, D, !0)
                    }
                }
                e: {
                    if (k = v ? St(v) : window,
                    L = k.nodeName && k.nodeName.toLowerCase(),
                    L === "select" || L === "input" && k.type === "file")
                        var O = $c;
                    else if (zo(k))
                        if (Do)
                            O = Yc;
                        else {
                            O = Wc;
                            var A = Qc
                        }
                    else
                        (L = k.nodeName) && L.toLowerCase() === "input" && (k.type === "checkbox" || k.type === "radio") && (O = Kc);
                    if (O && (O = O(e, v))) {
                        Ro(S, O, t, x);
                        break e
                    }
                    A && A(e, k, v),
                    e === "focusout" && (A = k._wrapperState) && A.controlled && k.type === "number" && Bl(k, "number", k.value)
                }
                switch (A = v ? St(v) : window,
                e) {
                case "focusin":
                    (zo(A) || A.contentEditable === "true") && (gt = A,
                    vi = v,
                    nr = null);
                    break;
                case "focusout":
                    nr = vi = gt = null;
                    break;
                case "mousedown":
                    gi = !0;
                    break;
                case "contextmenu":
                case "mouseup":
                case "dragend":
                    gi = !1,
                    Ho(S, t, x);
                    break;
                case "selectionchange":
                    if (qc)
                        break;
                case "keydown":
                case "keyup":
                    Ho(S, t, x)
                }
                var B;
                if (fi)
                    e: {
                        switch (e) {
                        case "compositionstart":
                            var X = "onCompositionStart";
                            break e;
                        case "compositionend":
                            X = "onCompositionEnd";
                            break e;
                        case "compositionupdate":
                            X = "onCompositionUpdate";
                            break e
                        }
                        X = void 0
                    }
                else
                    vt ? Lo(e, t) && (X = "onCompositionEnd") : e === "keydown" && t.keyCode === 229 && (X = "onCompositionStart");
                X && (Eo && t.locale !== "ko" && (vt || X !== "onCompositionStart" ? X === "onCompositionEnd" && vt && (B = wo()) : (Fn = x,
                ui = "value"in Fn ? Fn.value : Fn.textContent,
                vt = !0)),
                A = Yr(v, X),
                0 < A.length && (X = new No(X,e,null,t,x),
                S.push({
                    event: X,
                    listeners: A
                }),
                B ? X.data = B : (B = Mo(t),
                B !== null && (X.data = B)))),
                (B = Uc ? Vc(e, t) : Ac(e, t)) && (v = Yr(v, "onBeforeInput"),
                0 < v.length && (x = new No("onBeforeInput","beforeinput",null,t,x),
                S.push({
                    event: x,
                    listeners: v
                }),
                x.data = B))
            }
            Zo(S, n)
        })
    }
    function lr(e, n, t) {
        return {
            instance: e,
            listener: n,
            currentTarget: t
        }
    }
    function Yr(e, n) {
        for (var t = n + "Capture", r = []; e !== null; ) {
            var l = e
              , i = l.stateNode;
            l.tag === 5 && i !== null && (l = i,
            i = Vt(e, t),
            i != null && r.unshift(lr(e, i, l)),
            i = Vt(e, n),
            i != null && r.push(lr(e, i, l))),
            e = e.return
        }
        return r
    }
    function kt(e) {
        if (e === null)
            return null;
        do
            e = e.return;
        while (e && e.tag !== 5);
        return e || null
    }
    function bo(e, n, t, r, l) {
        for (var i = n._reactName, u = []; t !== null && t !== r; ) {
            var o = t
              , a = o.alternate
              , v = o.stateNode;
            if (a !== null && a === r)
                break;
            o.tag === 5 && v !== null && (o = v,
            l ? (a = Vt(t, i),
            a != null && u.unshift(lr(t, a, o))) : l || (a = Vt(t, i),
            a != null && u.push(lr(t, a, o)))),
            t = t.return
        }
        u.length !== 0 && e.push({
            event: n,
            listeners: u
        })
    }
    var ed = /\r\n?/g
      , nd = /\u0000|\uFFFD/g;
    function es(e) {
        return (typeof e == "string" ? e : "" + e).replace(ed, `
`).replace(nd, "")
    }
    function Xr(e, n, t) {
        if (n = es(n),
        es(e) !== n && t)
            throw Error(m(425))
    }
    function Gr() {}
    var _i = null
      , Ci = null;
    function Ni(e, n) {
        return e === "textarea" || e === "noscript" || typeof n.children == "string" || typeof n.children == "number" || typeof n.dangerouslySetInnerHTML == "object" && n.dangerouslySetInnerHTML !== null && n.dangerouslySetInnerHTML.__html != null
    }
    var ji = typeof setTimeout == "function" ? setTimeout : void 0
      , td = typeof clearTimeout == "function" ? clearTimeout : void 0
      , ns = typeof Promise == "function" ? Promise : void 0
      , rd = typeof queueMicrotask == "function" ? queueMicrotask : typeof ns < "u" ? function(e) {
        return ns.resolve(null).then(e).catch(ld)
    }
    : ji;
    function ld(e) {
        setTimeout(function() {
            throw e
        })
    }
    function Ei(e, n) {
        var t = n
          , r = 0;
        do {
            var l = t.nextSibling;
            if (e.removeChild(t),
            l && l.nodeType === 8)
                if (t = l.data,
                t === "/$") {
                    if (r === 0) {
                        e.removeChild(l),
                        Xt(n);
                        return
                    }
                    r--
                } else
                    t !== "$" && t !== "$?" && t !== "$!" || r++;
            t = l
        } while (t);
        Xt(n)
    }
    function Vn(e) {
        for (; e != null; e = e.nextSibling) {
            var n = e.nodeType;
            if (n === 1 || n === 3)
                break;
            if (n === 8) {
                if (n = e.data,
                n === "$" || n === "$!" || n === "$?")
                    break;
                if (n === "/$")
                    return null
            }
        }
        return e
    }
    function ts(e) {
        e = e.previousSibling;
        for (var n = 0; e; ) {
            if (e.nodeType === 8) {
                var t = e.data;
                if (t === "$" || t === "$!" || t === "$?") {
                    if (n === 0)
                        return e;
                    n--
                } else
                    t === "/$" && n++
            }
            e = e.previousSibling
        }
        return null
    }
    var xt = Math.random().toString(36).slice(2)
      , Sn = "__reactFiber$" + xt
      , ir = "__reactProps$" + xt
      , Nn = "__reactContainer$" + xt
      , Ti = "__reactEvents$" + xt
      , id = "__reactListeners$" + xt
      , ud = "__reactHandles$" + xt;
    function bn(e) {
        var n = e[Sn];
        if (n)
            return n;
        for (var t = e.parentNode; t; ) {
            if (n = t[Nn] || t[Sn]) {
                if (t = n.alternate,
                n.child !== null || t !== null && t.child !== null)
                    for (e = ts(e); e !== null; ) {
                        if (t = e[Sn])
                            return t;
                        e = ts(e)
                    }
                return n
            }
            e = t,
            t = e.parentNode
        }
        return null
    }
    function ur(e) {
        return e = e[Sn] || e[Nn],
        !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e
    }
    function St(e) {
        if (e.tag === 5 || e.tag === 6)
            return e.stateNode;
        throw Error(m(33))
    }
    function qr(e) {
        return e[ir] || null
    }
    var Pi = []
      , wt = -1;
    function An(e) {
        return {
            current: e
        }
    }
    function ve(e) {
        0 > wt || (e.current = Pi[wt],
        Pi[wt] = null,
        wt--)
    }
    function pe(e, n) {
        wt++,
        Pi[wt] = e.current,
        e.current = n
    }
    var Bn = {}
      , Ue = An(Bn)
      , We = An(!1)
      , et = Bn;
    function _t(e, n) {
        var t = e.type.contextTypes;
        if (!t)
            return Bn;
        var r = e.stateNode;
        if (r && r.__reactInternalMemoizedUnmaskedChildContext === n)
            return r.__reactInternalMemoizedMaskedChildContext;
        var l = {}, i;
        for (i in t)
            l[i] = n[i];
        return r && (e = e.stateNode,
        e.__reactInternalMemoizedUnmaskedChildContext = n,
        e.__reactInternalMemoizedMaskedChildContext = l),
        l
    }
    function Ke(e) {
        return e = e.childContextTypes,
        e != null
    }
    function Zr() {
        ve(We),
        ve(Ue)
    }
    function rs(e, n, t) {
        if (Ue.current !== Bn)
            throw Error(m(168));
        pe(Ue, n),
        pe(We, t)
    }
    function ls(e, n, t) {
        var r = e.stateNode;
        if (n = n.childContextTypes,
        typeof r.getChildContext != "function")
            return t;
        r = r.getChildContext();
        for (var l in r)
            if (!(l in n))
                throw Error(m(108, fe(e) || "Unknown", l));
        return E({}, t, r)
    }
    function Jr(e) {
        return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Bn,
        et = Ue.current,
        pe(Ue, e),
        pe(We, We.current),
        !0
    }
    function is(e, n, t) {
        var r = e.stateNode;
        if (!r)
            throw Error(m(169));
        t ? (e = ls(e, n, et),
        r.__reactInternalMemoizedMergedChildContext = e,
        ve(We),
        ve(Ue),
        pe(Ue, e)) : ve(We),
        pe(We, t)
    }
    var jn = null
      , br = !1
      , Li = !1;
    function us(e) {
        jn === null ? jn = [e] : jn.push(e)
    }
    function od(e) {
        br = !0,
        us(e)
    }
    function Hn() {
        if (!Li && jn !== null) {
            Li = !0;
            var e = 0
              , n = de;
            try {
                var t = jn;
                for (de = 1; e < t.length; e++) {
                    var r = t[e];
                    do
                        r = r(!0);
                    while (r !== null)
                }
                jn = null,
                br = !1
            } catch (l) {
                throw jn !== null && (jn = jn.slice(e + 1)),
                oo(Jl, Hn),
                l
            } finally {
                de = n,
                Li = !1
            }
        }
        return null
    }
    var Ct = []
      , Nt = 0
      , el = null
      , nl = 0
      , ln = []
      , un = 0
      , nt = null
      , En = 1
      , Tn = "";
    function tt(e, n) {
        Ct[Nt++] = nl,
        Ct[Nt++] = el,
        el = e,
        nl = n
    }
    function os(e, n, t) {
        ln[un++] = En,
        ln[un++] = Tn,
        ln[un++] = nt,
        nt = e;
        var r = En;
        e = Tn;
        var l = 32 - fn(r) - 1;
        r &= ~(1 << l),
        t += 1;
        var i = 32 - fn(n) + l;
        if (30 < i) {
            var u = l - l % 5;
            i = (r & (1 << u) - 1).toString(32),
            r >>= u,
            l -= u,
            En = 1 << 32 - fn(n) + l | t << l | r,
            Tn = i + e
        } else
            En = 1 << i | t << l | r,
            Tn = e
    }
    function Mi(e) {
        e.return !== null && (tt(e, 1),
        os(e, 1, 0))
    }
    function zi(e) {
        for (; e === el; )
            el = Ct[--Nt],
            Ct[Nt] = null,
            nl = Ct[--Nt],
            Ct[Nt] = null;
        for (; e === nt; )
            nt = ln[--un],
            ln[un] = null,
            Tn = ln[--un],
            ln[un] = null,
            En = ln[--un],
            ln[un] = null
    }
    var nn = null
      , tn = null
      , ke = !1
      , hn = null;
    function ss(e, n) {
        var t = cn(5, null, null, 0);
        t.elementType = "DELETED",
        t.stateNode = n,
        t.return = e,
        n = e.deletions,
        n === null ? (e.deletions = [t],
        e.flags |= 16) : n.push(t)
    }
    function as(e, n) {
        switch (e.tag) {
        case 5:
            var t = e.type;
            return n = n.nodeType !== 1 || t.toLowerCase() !== n.nodeName.toLowerCase() ? null : n,
            n !== null ? (e.stateNode = n,
            nn = e,
            tn = Vn(n.firstChild),
            !0) : !1;
        case 6:
            return n = e.pendingProps === "" || n.nodeType !== 3 ? null : n,
            n !== null ? (e.stateNode = n,
            nn = e,
            tn = null,
            !0) : !1;
        case 13:
            return n = n.nodeType !== 8 ? null : n,
            n !== null ? (t = nt !== null ? {
                id: En,
                overflow: Tn
            } : null,
            e.memoizedState = {
                dehydrated: n,
                treeContext: t,
                retryLane: 1073741824
            },
            t = cn(18, null, null, 0),
            t.stateNode = n,
            t.return = e,
            e.child = t,
            nn = e,
            tn = null,
            !0) : !1;
        default:
            return !1
        }
    }
    function Ri(e) {
        return (e.mode & 1) !== 0 && (e.flags & 128) === 0
    }
    function Di(e) {
        if (ke) {
            var n = tn;
            if (n) {
                var t = n;
                if (!as(e, n)) {
                    if (Ri(e))
                        throw Error(m(418));
                    n = Vn(t.nextSibling);
                    var r = nn;
                    n && as(e, n) ? ss(r, t) : (e.flags = e.flags & -4097 | 2,
                    ke = !1,
                    nn = e)
                }
            } else {
                if (Ri(e))
                    throw Error(m(418));
                e.flags = e.flags & -4097 | 2,
                ke = !1,
                nn = e
            }
        }
    }
    function cs(e) {
        for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; )
            e = e.return;
        nn = e
    }
    function tl(e) {
        if (e !== nn)
            return !1;
        if (!ke)
            return cs(e),
            ke = !0,
            !1;
        var n;
        if ((n = e.tag !== 3) && !(n = e.tag !== 5) && (n = e.type,
        n = n !== "head" && n !== "body" && !Ni(e.type, e.memoizedProps)),
        n && (n = tn)) {
            if (Ri(e))
                throw ds(),
                Error(m(418));
            for (; n; )
                ss(e, n),
                n = Vn(n.nextSibling)
        }
        if (cs(e),
        e.tag === 13) {
            if (e = e.memoizedState,
            e = e !== null ? e.dehydrated : null,
            !e)
                throw Error(m(317));
            e: {
                for (e = e.nextSibling,
                n = 0; e; ) {
                    if (e.nodeType === 8) {
                        var t = e.data;
                        if (t === "/$") {
                            if (n === 0) {
                                tn = Vn(e.nextSibling);
                                break e
                            }
                            n--
                        } else
                            t !== "$" && t !== "$!" && t !== "$?" || n++
                    }
                    e = e.nextSibling
                }
                tn = null
            }
        } else
            tn = nn ? Vn(e.stateNode.nextSibling) : null;
        return !0
    }
    function ds() {
        for (var e = tn; e; )
            e = Vn(e.nextSibling)
    }
    function jt() {
        tn = nn = null,
        ke = !1
    }
    function Oi(e) {
        hn === null ? hn = [e] : hn.push(e)
    }
    var sd = G.ReactCurrentBatchConfig;
    function or(e, n, t) {
        if (e = t.ref,
        e !== null && typeof e != "function" && typeof e != "object") {
            if (t._owner) {
                if (t = t._owner,
                t) {
                    if (t.tag !== 1)
                        throw Error(m(309));
                    var r = t.stateNode
                }
                if (!r)
                    throw Error(m(147, e));
                var l = r
                  , i = "" + e;
                return n !== null && n.ref !== null && typeof n.ref == "function" && n.ref._stringRef === i ? n.ref : (n = function(u) {
                    var o = l.refs;
                    u === null ? delete o[i] : o[i] = u
                }
                ,
                n._stringRef = i,
                n)
            }
            if (typeof e != "string")
                throw Error(m(284));
            if (!t._owner)
                throw Error(m(290, e))
        }
        return e
    }
    function rl(e, n) {
        throw e = Object.prototype.toString.call(n),
        Error(m(31, e === "[object Object]" ? "object with keys {" + Object.keys(n).join(", ") + "}" : e))
    }
    function fs(e) {
        var n = e._init;
        return n(e._payload)
    }
    function ps(e) {
        function n(p, c) {
            if (e) {
                var h = p.deletions;
                h === null ? (p.deletions = [c],
                p.flags |= 16) : h.push(c)
            }
        }
        function t(p, c) {
            if (!e)
                return null;
            for (; c !== null; )
                n(p, c),
                c = c.sibling;
            return null
        }
        function r(p, c) {
            for (p = new Map; c !== null; )
                c.key !== null ? p.set(c.key, c) : p.set(c.index, c),
                c = c.sibling;
            return p
        }
        function l(p, c) {
            return p = qn(p, c),
            p.index = 0,
            p.sibling = null,
            p
        }
        function i(p, c, h) {
            return p.index = h,
            e ? (h = p.alternate,
            h !== null ? (h = h.index,
            h < c ? (p.flags |= 2,
            c) : h) : (p.flags |= 2,
            c)) : (p.flags |= 1048576,
            c)
        }
        function u(p) {
            return e && p.alternate === null && (p.flags |= 2),
            p
        }
        function o(p, c, h, _) {
            return c === null || c.tag !== 6 ? (c = ju(h, p.mode, _),
            c.return = p,
            c) : (c = l(c, h),
            c.return = p,
            c)
        }
        function a(p, c, h, _) {
            var O = h.type;
            return O === $ ? x(p, c, h.props.children, _, h.key) : c !== null && (c.elementType === O || typeof O == "object" && O !== null && O.$$typeof === se && fs(O) === c.type) ? (_ = l(c, h.props),
            _.ref = or(p, c, h),
            _.return = p,
            _) : (_ = El(h.type, h.key, h.props, null, p.mode, _),
            _.ref = or(p, c, h),
            _.return = p,
            _)
        }
        function v(p, c, h, _) {
            return c === null || c.tag !== 4 || c.stateNode.containerInfo !== h.containerInfo || c.stateNode.implementation !== h.implementation ? (c = Eu(h, p.mode, _),
            c.return = p,
            c) : (c = l(c, h.children || []),
            c.return = p,
            c)
        }
        function x(p, c, h, _, O) {
            return c === null || c.tag !== 7 ? (c = ct(h, p.mode, _, O),
            c.return = p,
            c) : (c = l(c, h),
            c.return = p,
            c)
        }
        function S(p, c, h) {
            if (typeof c == "string" && c !== "" || typeof c == "number")
                return c = ju("" + c, p.mode, h),
                c.return = p,
                c;
            if (typeof c == "object" && c !== null) {
                switch (c.$$typeof) {
                case xe:
                    return h = El(c.type, c.key, c.props, null, p.mode, h),
                    h.ref = or(p, null, c),
                    h.return = p,
                    h;
                case Ce:
                    return c = Eu(c, p.mode, h),
                    c.return = p,
                    c;
                case se:
                    var _ = c._init;
                    return S(p, _(c._payload), h)
                }
                if (It(c) || U(c))
                    return c = ct(c, p.mode, h, null),
                    c.return = p,
                    c;
                rl(p, c)
            }
            return null
        }
        function k(p, c, h, _) {
            var O = c !== null ? c.key : null;
            if (typeof h == "string" && h !== "" || typeof h == "number")
                return O !== null ? null : o(p, c, "" + h, _);
            if (typeof h == "object" && h !== null) {
                switch (h.$$typeof) {
                case xe:
                    return h.key === O ? a(p, c, h, _) : null;
                case Ce:
                    return h.key === O ? v(p, c, h, _) : null;
                case se:
                    return O = h._init,
                    k(p, c, O(h._payload), _)
                }
                if (It(h) || U(h))
                    return O !== null ? null : x(p, c, h, _, null);
                rl(p, h)
            }
            return null
        }
        function L(p, c, h, _, O) {
            if (typeof _ == "string" && _ !== "" || typeof _ == "number")
                return p = p.get(h) || null,
                o(c, p, "" + _, O);
            if (typeof _ == "object" && _ !== null) {
                switch (_.$$typeof) {
                case xe:
                    return p = p.get(_.key === null ? h : _.key) || null,
                    a(c, p, _, O);
                case Ce:
                    return p = p.get(_.key === null ? h : _.key) || null,
                    v(c, p, _, O);
                case se:
                    var A = _._init;
                    return L(p, c, h, A(_._payload), O)
                }
                if (It(_) || U(_))
                    return p = p.get(h) || null,
                    x(c, p, _, O, null);
                rl(c, _)
            }
            return null
        }
        function z(p, c, h, _) {
            for (var O = null, A = null, B = c, X = c = 0, Re = null; B !== null && X < h.length; X++) {
                B.index > X ? (Re = B,
                B = null) : Re = B.sibling;
                var ie = k(p, B, h[X], _);
                if (ie === null) {
                    B === null && (B = Re);
                    break
                }
                e && B && ie.alternate === null && n(p, B),
                c = i(ie, c, X),
                A === null ? O = ie : A.sibling = ie,
                A = ie,
                B = Re
            }
            if (X === h.length)
                return t(p, B),
                ke && tt(p, X),
                O;
            if (B === null) {
                for (; X < h.length; X++)
                    B = S(p, h[X], _),
                    B !== null && (c = i(B, c, X),
                    A === null ? O = B : A.sibling = B,
                    A = B);
                return ke && tt(p, X),
                O
            }
            for (B = r(p, B); X < h.length; X++)
                Re = L(B, p, X, h[X], _),
                Re !== null && (e && Re.alternate !== null && B.delete(Re.key === null ? X : Re.key),
                c = i(Re, c, X),
                A === null ? O = Re : A.sibling = Re,
                A = Re);
            return e && B.forEach(function(Zn) {
                return n(p, Zn)
            }),
            ke && tt(p, X),
            O
        }
        function D(p, c, h, _) {
            var O = U(h);
            if (typeof O != "function")
                throw Error(m(150));
            if (h = O.call(h),
            h == null)
                throw Error(m(151));
            for (var A = O = null, B = c, X = c = 0, Re = null, ie = h.next(); B !== null && !ie.done; X++,
            ie = h.next()) {
                B.index > X ? (Re = B,
                B = null) : Re = B.sibling;
                var Zn = k(p, B, ie.value, _);
                if (Zn === null) {
                    B === null && (B = Re);
                    break
                }
                e && B && Zn.alternate === null && n(p, B),
                c = i(Zn, c, X),
                A === null ? O = Zn : A.sibling = Zn,
                A = Zn,
                B = Re
            }
            if (ie.done)
                return t(p, B),
                ke && tt(p, X),
                O;
            if (B === null) {
                for (; !ie.done; X++,
                ie = h.next())
                    ie = S(p, ie.value, _),
                    ie !== null && (c = i(ie, c, X),
                    A === null ? O = ie : A.sibling = ie,
                    A = ie);
                return ke && tt(p, X),
                O
            }
            for (B = r(p, B); !ie.done; X++,
            ie = h.next())
                ie = L(B, p, X, ie.value, _),
                ie !== null && (e && ie.alternate !== null && B.delete(ie.key === null ? X : ie.key),
                c = i(ie, c, X),
                A === null ? O = ie : A.sibling = ie,
                A = ie);
            return e && B.forEach(function(Bd) {
                return n(p, Bd)
            }),
            ke && tt(p, X),
            O
        }
        function Ee(p, c, h, _) {
            if (typeof h == "object" && h !== null && h.type === $ && h.key === null && (h = h.props.children),
            typeof h == "object" && h !== null) {
                switch (h.$$typeof) {
                case xe:
                    e: {
                        for (var O = h.key, A = c; A !== null; ) {
                            if (A.key === O) {
                                if (O = h.type,
                                O === $) {
                                    if (A.tag === 7) {
                                        t(p, A.sibling),
                                        c = l(A, h.props.children),
                                        c.return = p,
                                        p = c;
                                        break e
                                    }
                                } else if (A.elementType === O || typeof O == "object" && O !== null && O.$$typeof === se && fs(O) === A.type) {
                                    t(p, A.sibling),
                                    c = l(A, h.props),
                                    c.ref = or(p, A, h),
                                    c.return = p,
                                    p = c;
                                    break e
                                }
                                t(p, A);
                                break
                            } else
                                n(p, A);
                            A = A.sibling
                        }
                        h.type === $ ? (c = ct(h.props.children, p.mode, _, h.key),
                        c.return = p,
                        p = c) : (_ = El(h.type, h.key, h.props, null, p.mode, _),
                        _.ref = or(p, c, h),
                        _.return = p,
                        p = _)
                    }
                    return u(p);
                case Ce:
                    e: {
                        for (A = h.key; c !== null; ) {
                            if (c.key === A)
                                if (c.tag === 4 && c.stateNode.containerInfo === h.containerInfo && c.stateNode.implementation === h.implementation) {
                                    t(p, c.sibling),
                                    c = l(c, h.children || []),
                                    c.return = p,
                                    p = c;
                                    break e
                                } else {
                                    t(p, c);
                                    break
                                }
                            else
                                n(p, c);
                            c = c.sibling
                        }
                        c = Eu(h, p.mode, _),
                        c.return = p,
                        p = c
                    }
                    return u(p);
                case se:
                    return A = h._init,
                    Ee(p, c, A(h._payload), _)
                }
                if (It(h))
                    return z(p, c, h, _);
                if (U(h))
                    return D(p, c, h, _);
                rl(p, h)
            }
            return typeof h == "string" && h !== "" || typeof h == "number" ? (h = "" + h,
            c !== null && c.tag === 6 ? (t(p, c.sibling),
            c = l(c, h),
            c.return = p,
            p = c) : (t(p, c),
            c = ju(h, p.mode, _),
            c.return = p,
            p = c),
            u(p)) : t(p, c)
        }
        return Ee
    }
    var Et = ps(!0)
      , hs = ps(!1)
      , ll = An(null)
      , il = null
      , Tt = null
      , Ii = null;
    function Fi() {
        Ii = Tt = il = null
    }
    function Ui(e) {
        var n = ll.current;
        ve(ll),
        e._currentValue = n
    }
    function Vi(e, n, t) {
        for (; e !== null; ) {
            var r = e.alternate;
            if ((e.childLanes & n) !== n ? (e.childLanes |= n,
            r !== null && (r.childLanes |= n)) : r !== null && (r.childLanes & n) !== n && (r.childLanes |= n),
            e === t)
                break;
            e = e.return
        }
    }
    function Pt(e, n) {
        il = e,
        Ii = Tt = null,
        e = e.dependencies,
        e !== null && e.firstContext !== null && ((e.lanes & n) !== 0 && (Ye = !0),
        e.firstContext = null)
    }
    function on(e) {
        var n = e._currentValue;
        if (Ii !== e)
            if (e = {
                context: e,
                memoizedValue: n,
                next: null
            },
            Tt === null) {
                if (il === null)
                    throw Error(m(308));
                Tt = e,
                il.dependencies = {
                    lanes: 0,
                    firstContext: e
                }
            } else
                Tt = Tt.next = e;
        return n
    }
    var rt = null;
    function Ai(e) {
        rt === null ? rt = [e] : rt.push(e)
    }
    function ms(e, n, t, r) {
        var l = n.interleaved;
        return l === null ? (t.next = t,
        Ai(n)) : (t.next = l.next,
        l.next = t),
        n.interleaved = t,
        Pn(e, r)
    }
    function Pn(e, n) {
        e.lanes |= n;
        var t = e.alternate;
        for (t !== null && (t.lanes |= n),
        t = e,
        e = e.return; e !== null; )
            e.childLanes |= n,
            t = e.alternate,
            t !== null && (t.childLanes |= n),
            t = e,
            e = e.return;
        return t.tag === 3 ? t.stateNode : null
    }
    var $n = !1;
    function Bi(e) {
        e.updateQueue = {
            baseState: e.memoizedState,
            firstBaseUpdate: null,
            lastBaseUpdate: null,
            shared: {
                pending: null,
                interleaved: null,
                lanes: 0
            },
            effects: null
        }
    }
    function vs(e, n) {
        e = e.updateQueue,
        n.updateQueue === e && (n.updateQueue = {
            baseState: e.baseState,
            firstBaseUpdate: e.firstBaseUpdate,
            lastBaseUpdate: e.lastBaseUpdate,
            shared: e.shared,
            effects: e.effects
        })
    }
    function Ln(e, n) {
        return {
            eventTime: e,
            lane: n,
            tag: 0,
            payload: null,
            callback: null,
            next: null
        }
    }
    function Qn(e, n, t) {
        var r = e.updateQueue;
        if (r === null)
            return null;
        if (r = r.shared,
        (re & 2) !== 0) {
            var l = r.pending;
            return l === null ? n.next = n : (n.next = l.next,
            l.next = n),
            r.pending = n,
            Pn(e, t)
        }
        return l = r.interleaved,
        l === null ? (n.next = n,
        Ai(r)) : (n.next = l.next,
        l.next = n),
        r.interleaved = n,
        Pn(e, t)
    }
    function ul(e, n, t) {
        if (n = n.updateQueue,
        n !== null && (n = n.shared,
        (t & 4194240) !== 0)) {
            var r = n.lanes;
            r &= e.pendingLanes,
            t |= r,
            n.lanes = t,
            ni(e, t)
        }
    }
    function gs(e, n) {
        var t = e.updateQueue
          , r = e.alternate;
        if (r !== null && (r = r.updateQueue,
        t === r)) {
            var l = null
              , i = null;
            if (t = t.firstBaseUpdate,
            t !== null) {
                do {
                    var u = {
                        eventTime: t.eventTime,
                        lane: t.lane,
                        tag: t.tag,
                        payload: t.payload,
                        callback: t.callback,
                        next: null
                    };
                    i === null ? l = i = u : i = i.next = u,
                    t = t.next
                } while (t !== null);
                i === null ? l = i = n : i = i.next = n
            } else
                l = i = n;
            t = {
                baseState: r.baseState,
                firstBaseUpdate: l,
                lastBaseUpdate: i,
                shared: r.shared,
                effects: r.effects
            },
            e.updateQueue = t;
            return
        }
        e = t.lastBaseUpdate,
        e === null ? t.firstBaseUpdate = n : e.next = n,
        t.lastBaseUpdate = n
    }
    function ol(e, n, t, r) {
        var l = e.updateQueue;
        $n = !1;
        var i = l.firstBaseUpdate
          , u = l.lastBaseUpdate
          , o = l.shared.pending;
        if (o !== null) {
            l.shared.pending = null;
            var a = o
              , v = a.next;
            a.next = null,
            u === null ? i = v : u.next = v,
            u = a;
            var x = e.alternate;
            x !== null && (x = x.updateQueue,
            o = x.lastBaseUpdate,
            o !== u && (o === null ? x.firstBaseUpdate = v : o.next = v,
            x.lastBaseUpdate = a))
        }
        if (i !== null) {
            var S = l.baseState;
            u = 0,
            x = v = a = null,
            o = i;
            do {
                var k = o.lane
                  , L = o.eventTime;
                if ((r & k) === k) {
                    x !== null && (x = x.next = {
                        eventTime: L,
                        lane: 0,
                        tag: o.tag,
                        payload: o.payload,
                        callback: o.callback,
                        next: null
                    });
                    e: {
                        var z = e
                          , D = o;
                        switch (k = n,
                        L = t,
                        D.tag) {
                        case 1:
                            if (z = D.payload,
                            typeof z == "function") {
                                S = z.call(L, S, k);
                                break e
                            }
                            S = z;
                            break e;
                        case 3:
                            z.flags = z.flags & -65537 | 128;
                        case 0:
                            if (z = D.payload,
                            k = typeof z == "function" ? z.call(L, S, k) : z,
                            k == null)
                                break e;
                            S = E({}, S, k);
                            break e;
                        case 2:
                            $n = !0
                        }
                    }
                    o.callback !== null && o.lane !== 0 && (e.flags |= 64,
                    k = l.effects,
                    k === null ? l.effects = [o] : k.push(o))
                } else
                    L = {
                        eventTime: L,
                        lane: k,
                        tag: o.tag,
                        payload: o.payload,
                        callback: o.callback,
                        next: null
                    },
                    x === null ? (v = x = L,
                    a = S) : x = x.next = L,
                    u |= k;
                if (o = o.next,
                o === null) {
                    if (o = l.shared.pending,
                    o === null)
                        break;
                    k = o,
                    o = k.next,
                    k.next = null,
                    l.lastBaseUpdate = k,
                    l.shared.pending = null
                }
            } while (!0);
            if (x === null && (a = S),
            l.baseState = a,
            l.firstBaseUpdate = v,
            l.lastBaseUpdate = x,
            n = l.shared.interleaved,
            n !== null) {
                l = n;
                do
                    u |= l.lane,
                    l = l.next;
                while (l !== n)
            } else
                i === null && (l.shared.lanes = 0);
            ut |= u,
            e.lanes = u,
            e.memoizedState = S
        }
    }
    function ys(e, n, t) {
        if (e = n.effects,
        n.effects = null,
        e !== null)
            for (n = 0; n < e.length; n++) {
                var r = e[n]
                  , l = r.callback;
                if (l !== null) {
                    if (r.callback = null,
                    r = t,
                    typeof l != "function")
                        throw Error(m(191, l));
                    l.call(r)
                }
            }
    }
    var sr = {}
      , wn = An(sr)
      , ar = An(sr)
      , cr = An(sr);
    function lt(e) {
        if (e === sr)
            throw Error(m(174));
        return e
    }
    function Hi(e, n) {
        switch (pe(cr, n),
        pe(ar, e),
        pe(wn, sr),
        e = n.nodeType,
        e) {
        case 9:
        case 11:
            n = (n = n.documentElement) ? n.namespaceURI : $l(null, "");
            break;
        default:
            e = e === 8 ? n.parentNode : n,
            n = e.namespaceURI || null,
            e = e.tagName,
            n = $l(n, e)
        }
        ve(wn),
        pe(wn, n)
    }
    function Lt() {
        ve(wn),
        ve(ar),
        ve(cr)
    }
    function ks(e) {
        lt(cr.current);
        var n = lt(wn.current)
          , t = $l(n, e.type);
        n !== t && (pe(ar, e),
        pe(wn, t))
    }
    function $i(e) {
        ar.current === e && (ve(wn),
        ve(ar))
    }
    var Se = An(0);
    function sl(e) {
        for (var n = e; n !== null; ) {
            if (n.tag === 13) {
                var t = n.memoizedState;
                if (t !== null && (t = t.dehydrated,
                t === null || t.data === "$?" || t.data === "$!"))
                    return n
            } else if (n.tag === 19 && n.memoizedProps.revealOrder !== void 0) {
                if ((n.flags & 128) !== 0)
                    return n
            } else if (n.child !== null) {
                n.child.return = n,
                n = n.child;
                continue
            }
            if (n === e)
                break;
            for (; n.sibling === null; ) {
                if (n.return === null || n.return === e)
                    return null;
                n = n.return
            }
            n.sibling.return = n.return,
            n = n.sibling
        }
        return null
    }
    var Qi = [];
    function Wi() {
        for (var e = 0; e < Qi.length; e++)
            Qi[e]._workInProgressVersionPrimary = null;
        Qi.length = 0
    }
    var al = G.ReactCurrentDispatcher
      , Ki = G.ReactCurrentBatchConfig
      , it = 0
      , we = null
      , Pe = null
      , Me = null
      , cl = !1
      , dr = !1
      , fr = 0
      , ad = 0;
    function Ve() {
        throw Error(m(321))
    }
    function Yi(e, n) {
        if (n === null)
            return !1;
        for (var t = 0; t < n.length && t < e.length; t++)
            if (!pn(e[t], n[t]))
                return !1;
        return !0
    }
    function Xi(e, n, t, r, l, i) {
        if (it = i,
        we = n,
        n.memoizedState = null,
        n.updateQueue = null,
        n.lanes = 0,
        al.current = e === null || e.memoizedState === null ? pd : hd,
        e = t(r, l),
        dr) {
            i = 0;
            do {
                if (dr = !1,
                fr = 0,
                25 <= i)
                    throw Error(m(301));
                i += 1,
                Me = Pe = null,
                n.updateQueue = null,
                al.current = md,
                e = t(r, l)
            } while (dr)
        }
        if (al.current = pl,
        n = Pe !== null && Pe.next !== null,
        it = 0,
        Me = Pe = we = null,
        cl = !1,
        n)
            throw Error(m(300));
        return e
    }
    function Gi() {
        var e = fr !== 0;
        return fr = 0,
        e
    }
    function _n() {
        var e = {
            memoizedState: null,
            baseState: null,
            baseQueue: null,
            queue: null,
            next: null
        };
        return Me === null ? we.memoizedState = Me = e : Me = Me.next = e,
        Me
    }
    function sn() {
        if (Pe === null) {
            var e = we.alternate;
            e = e !== null ? e.memoizedState : null
        } else
            e = Pe.next;
        var n = Me === null ? we.memoizedState : Me.next;
        if (n !== null)
            Me = n,
            Pe = e;
        else {
            if (e === null)
                throw Error(m(310));
            Pe = e,
            e = {
                memoizedState: Pe.memoizedState,
                baseState: Pe.baseState,
                baseQueue: Pe.baseQueue,
                queue: Pe.queue,
                next: null
            },
            Me === null ? we.memoizedState = Me = e : Me = Me.next = e
        }
        return Me
    }
    function pr(e, n) {
        return typeof n == "function" ? n(e) : n
    }
    function qi(e) {
        var n = sn()
          , t = n.queue;
        if (t === null)
            throw Error(m(311));
        t.lastRenderedReducer = e;
        var r = Pe
          , l = r.baseQueue
          , i = t.pending;
        if (i !== null) {
            if (l !== null) {
                var u = l.next;
                l.next = i.next,
                i.next = u
            }
            r.baseQueue = l = i,
            t.pending = null
        }
        if (l !== null) {
            i = l.next,
            r = r.baseState;
            var o = u = null
              , a = null
              , v = i;
            do {
                var x = v.lane;
                if ((it & x) === x)
                    a !== null && (a = a.next = {
                        lane: 0,
                        action: v.action,
                        hasEagerState: v.hasEagerState,
                        eagerState: v.eagerState,
                        next: null
                    }),
                    r = v.hasEagerState ? v.eagerState : e(r, v.action);
                else {
                    var S = {
                        lane: x,
                        action: v.action,
                        hasEagerState: v.hasEagerState,
                        eagerState: v.eagerState,
                        next: null
                    };
                    a === null ? (o = a = S,
                    u = r) : a = a.next = S,
                    we.lanes |= x,
                    ut |= x
                }
                v = v.next
            } while (v !== null && v !== i);
            a === null ? u = r : a.next = o,
            pn(r, n.memoizedState) || (Ye = !0),
            n.memoizedState = r,
            n.baseState = u,
            n.baseQueue = a,
            t.lastRenderedState = r
        }
        if (e = t.interleaved,
        e !== null) {
            l = e;
            do
                i = l.lane,
                we.lanes |= i,
                ut |= i,
                l = l.next;
            while (l !== e)
        } else
            l === null && (t.lanes = 0);
        return [n.memoizedState, t.dispatch]
    }
    function Zi(e) {
        var n = sn()
          , t = n.queue;
        if (t === null)
            throw Error(m(311));
        t.lastRenderedReducer = e;
        var r = t.dispatch
          , l = t.pending
          , i = n.memoizedState;
        if (l !== null) {
            t.pending = null;
            var u = l = l.next;
            do
                i = e(i, u.action),
                u = u.next;
            while (u !== l);
            pn(i, n.memoizedState) || (Ye = !0),
            n.memoizedState = i,
            n.baseQueue === null && (n.baseState = i),
            t.lastRenderedState = i
        }
        return [i, r]
    }
    function xs() {}
    function Ss(e, n) {
        var t = we
          , r = sn()
          , l = n()
          , i = !pn(r.memoizedState, l);
        if (i && (r.memoizedState = l,
        Ye = !0),
        r = r.queue,
        Ji(Cs.bind(null, t, r, e), [e]),
        r.getSnapshot !== n || i || Me !== null && Me.memoizedState.tag & 1) {
            if (t.flags |= 2048,
            hr(9, _s.bind(null, t, r, l, n), void 0, null),
            ze === null)
                throw Error(m(349));
            (it & 30) !== 0 || ws(t, n, l)
        }
        return l
    }
    function ws(e, n, t) {
        e.flags |= 16384,
        e = {
            getSnapshot: n,
            value: t
        },
        n = we.updateQueue,
        n === null ? (n = {
            lastEffect: null,
            stores: null
        },
        we.updateQueue = n,
        n.stores = [e]) : (t = n.stores,
        t === null ? n.stores = [e] : t.push(e))
    }
    function _s(e, n, t, r) {
        n.value = t,
        n.getSnapshot = r,
        Ns(n) && js(e)
    }
    function Cs(e, n, t) {
        return t(function() {
            Ns(n) && js(e)
        })
    }
    function Ns(e) {
        var n = e.getSnapshot;
        e = e.value;
        try {
            var t = n();
            return !pn(e, t)
        } catch {
            return !0
        }
    }
    function js(e) {
        var n = Pn(e, 1);
        n !== null && yn(n, e, 1, -1)
    }
    function Es(e) {
        var n = _n();
        return typeof e == "function" && (e = e()),
        n.memoizedState = n.baseState = e,
        e = {
            pending: null,
            interleaved: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: pr,
            lastRenderedState: e
        },
        n.queue = e,
        e = e.dispatch = fd.bind(null, we, e),
        [n.memoizedState, e]
    }
    function hr(e, n, t, r) {
        return e = {
            tag: e,
            create: n,
            destroy: t,
            deps: r,
            next: null
        },
        n = we.updateQueue,
        n === null ? (n = {
            lastEffect: null,
            stores: null
        },
        we.updateQueue = n,
        n.lastEffect = e.next = e) : (t = n.lastEffect,
        t === null ? n.lastEffect = e.next = e : (r = t.next,
        t.next = e,
        e.next = r,
        n.lastEffect = e)),
        e
    }
    function Ts() {
        return sn().memoizedState
    }
    function dl(e, n, t, r) {
        var l = _n();
        we.flags |= e,
        l.memoizedState = hr(1 | n, t, void 0, r === void 0 ? null : r)
    }
    function fl(e, n, t, r) {
        var l = sn();
        r = r === void 0 ? null : r;
        var i = void 0;
        if (Pe !== null) {
            var u = Pe.memoizedState;
            if (i = u.destroy,
            r !== null && Yi(r, u.deps)) {
                l.memoizedState = hr(n, t, i, r);
                return
            }
        }
        we.flags |= e,
        l.memoizedState = hr(1 | n, t, i, r)
    }
    function Ps(e, n) {
        return dl(8390656, 8, e, n)
    }
    function Ji(e, n) {
        return fl(2048, 8, e, n)
    }
    function Ls(e, n) {
        return fl(4, 2, e, n)
    }
    function Ms(e, n) {
        return fl(4, 4, e, n)
    }
    function zs(e, n) {
        if (typeof n == "function")
            return e = e(),
            n(e),
            function() {
                n(null)
            }
            ;
        if (n != null)
            return e = e(),
            n.current = e,
            function() {
                n.current = null
            }
    }
    function Rs(e, n, t) {
        return t = t != null ? t.concat([e]) : null,
        fl(4, 4, zs.bind(null, n, e), t)
    }
    function bi() {}
    function Ds(e, n) {
        var t = sn();
        n = n === void 0 ? null : n;
        var r = t.memoizedState;
        return r !== null && n !== null && Yi(n, r[1]) ? r[0] : (t.memoizedState = [e, n],
        e)
    }
    function Os(e, n) {
        var t = sn();
        n = n === void 0 ? null : n;
        var r = t.memoizedState;
        return r !== null && n !== null && Yi(n, r[1]) ? r[0] : (e = e(),
        t.memoizedState = [e, n],
        e)
    }
    function Is(e, n, t) {
        return (it & 21) === 0 ? (e.baseState && (e.baseState = !1,
        Ye = !0),
        e.memoizedState = t) : (pn(t, n) || (t = fo(),
        we.lanes |= t,
        ut |= t,
        e.baseState = !0),
        n)
    }
    function cd(e, n) {
        var t = de;
        de = t !== 0 && 4 > t ? t : 4,
        e(!0);
        var r = Ki.transition;
        Ki.transition = {};
        try {
            e(!1),
            n()
        } finally {
            de = t,
            Ki.transition = r
        }
    }
    function Fs() {
        return sn().memoizedState
    }
    function dd(e, n, t) {
        var r = Xn(e);
        if (t = {
            lane: r,
            action: t,
            hasEagerState: !1,
            eagerState: null,
            next: null
        },
        Us(e))
            Vs(n, t);
        else if (t = ms(e, n, t, r),
        t !== null) {
            var l = $e();
            yn(t, e, r, l),
            As(t, n, r)
        }
    }
    function fd(e, n, t) {
        var r = Xn(e)
          , l = {
            lane: r,
            action: t,
            hasEagerState: !1,
            eagerState: null,
            next: null
        };
        if (Us(e))
            Vs(n, l);
        else {
            var i = e.alternate;
            if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = n.lastRenderedReducer,
            i !== null))
                try {
                    var u = n.lastRenderedState
                      , o = i(u, t);
                    if (l.hasEagerState = !0,
                    l.eagerState = o,
                    pn(o, u)) {
                        var a = n.interleaved;
                        a === null ? (l.next = l,
                        Ai(n)) : (l.next = a.next,
                        a.next = l),
                        n.interleaved = l;
                        return
                    }
                } catch {} finally {}
            t = ms(e, n, l, r),
            t !== null && (l = $e(),
            yn(t, e, r, l),
            As(t, n, r))
        }
    }
    function Us(e) {
        var n = e.alternate;
        return e === we || n !== null && n === we
    }
    function Vs(e, n) {
        dr = cl = !0;
        var t = e.pending;
        t === null ? n.next = n : (n.next = t.next,
        t.next = n),
        e.pending = n
    }
    function As(e, n, t) {
        if ((t & 4194240) !== 0) {
            var r = n.lanes;
            r &= e.pendingLanes,
            t |= r,
            n.lanes = t,
            ni(e, t)
        }
    }
    var pl = {
        readContext: on,
        useCallback: Ve,
        useContext: Ve,
        useEffect: Ve,
        useImperativeHandle: Ve,
        useInsertionEffect: Ve,
        useLayoutEffect: Ve,
        useMemo: Ve,
        useReducer: Ve,
        useRef: Ve,
        useState: Ve,
        useDebugValue: Ve,
        useDeferredValue: Ve,
        useTransition: Ve,
        useMutableSource: Ve,
        useSyncExternalStore: Ve,
        useId: Ve,
        unstable_isNewReconciler: !1
    }
      , pd = {
        readContext: on,
        useCallback: function(e, n) {
            return _n().memoizedState = [e, n === void 0 ? null : n],
            e
        },
        useContext: on,
        useEffect: Ps,
        useImperativeHandle: function(e, n, t) {
            return t = t != null ? t.concat([e]) : null,
            dl(4194308, 4, zs.bind(null, n, e), t)
        },
        useLayoutEffect: function(e, n) {
            return dl(4194308, 4, e, n)
        },
        useInsertionEffect: function(e, n) {
            return dl(4, 2, e, n)
        },
        useMemo: function(e, n) {
            var t = _n();
            return n = n === void 0 ? null : n,
            e = e(),
            t.memoizedState = [e, n],
            e
        },
        useReducer: function(e, n, t) {
            var r = _n();
            return n = t !== void 0 ? t(n) : n,
            r.memoizedState = r.baseState = n,
            e = {
                pending: null,
                interleaved: null,
                lanes: 0,
                dispatch: null,
                lastRenderedReducer: e,
                lastRenderedState: n
            },
            r.queue = e,
            e = e.dispatch = dd.bind(null, we, e),
            [r.memoizedState, e]
        },
        useRef: function(e) {
            var n = _n();
            return e = {
                current: e
            },
            n.memoizedState = e
        },
        useState: Es,
        useDebugValue: bi,
        useDeferredValue: function(e) {
            return _n().memoizedState = e
        },
        useTransition: function() {
            var e = Es(!1)
              , n = e[0];
            return e = cd.bind(null, e[1]),
            _n().memoizedState = e,
            [n, e]
        },
        useMutableSource: function() {},
        useSyncExternalStore: function(e, n, t) {
            var r = we
              , l = _n();
            if (ke) {
                if (t === void 0)
                    throw Error(m(407));
                t = t()
            } else {
                if (t = n(),
                ze === null)
                    throw Error(m(349));
                (it & 30) !== 0 || ws(r, n, t)
            }
            l.memoizedState = t;
            var i = {
                value: t,
                getSnapshot: n
            };
            return l.queue = i,
            Ps(Cs.bind(null, r, i, e), [e]),
            r.flags |= 2048,
            hr(9, _s.bind(null, r, i, t, n), void 0, null),
            t
        },
        useId: function() {
            var e = _n()
              , n = ze.identifierPrefix;
            if (ke) {
                var t = Tn
                  , r = En;
                t = (r & ~(1 << 32 - fn(r) - 1)).toString(32) + t,
                n = ":" + n + "R" + t,
                t = fr++,
                0 < t && (n += "H" + t.toString(32)),
                n += ":"
            } else
                t = ad++,
                n = ":" + n + "r" + t.toString(32) + ":";
            return e.memoizedState = n
        },
        unstable_isNewReconciler: !1
    }
      , hd = {
        readContext: on,
        useCallback: Ds,
        useContext: on,
        useEffect: Ji,
        useImperativeHandle: Rs,
        useInsertionEffect: Ls,
        useLayoutEffect: Ms,
        useMemo: Os,
        useReducer: qi,
        useRef: Ts,
        useState: function() {
            return qi(pr)
        },
        useDebugValue: bi,
        useDeferredValue: function(e) {
            var n = sn();
            return Is(n, Pe.memoizedState, e)
        },
        useTransition: function() {
            var e = qi(pr)[0]
              , n = sn().memoizedState;
            return [e, n]
        },
        useMutableSource: xs,
        useSyncExternalStore: Ss,
        useId: Fs,
        unstable_isNewReconciler: !1
    }
      , md = {
        readContext: on,
        useCallback: Ds,
        useContext: on,
        useEffect: Ji,
        useImperativeHandle: Rs,
        useInsertionEffect: Ls,
        useLayoutEffect: Ms,
        useMemo: Os,
        useReducer: Zi,
        useRef: Ts,
        useState: function() {
            return Zi(pr)
        },
        useDebugValue: bi,
        useDeferredValue: function(e) {
            var n = sn();
            return Pe === null ? n.memoizedState = e : Is(n, Pe.memoizedState, e)
        },
        useTransition: function() {
            var e = Zi(pr)[0]
              , n = sn().memoizedState;
            return [e, n]
        },
        useMutableSource: xs,
        useSyncExternalStore: Ss,
        useId: Fs,
        unstable_isNewReconciler: !1
    };
    function mn(e, n) {
        if (e && e.defaultProps) {
            n = E({}, n),
            e = e.defaultProps;
            for (var t in e)
                n[t] === void 0 && (n[t] = e[t]);
            return n
        }
        return n
    }
    function eu(e, n, t, r) {
        n = e.memoizedState,
        t = t(r, n),
        t = t == null ? n : E({}, n, t),
        e.memoizedState = t,
        e.lanes === 0 && (e.updateQueue.baseState = t)
    }
    var hl = {
        isMounted: function(e) {
            return (e = e._reactInternals) ? Jn(e) === e : !1
        },
        enqueueSetState: function(e, n, t) {
            e = e._reactInternals;
            var r = $e()
              , l = Xn(e)
              , i = Ln(r, l);
            i.payload = n,
            t != null && (i.callback = t),
            n = Qn(e, i, l),
            n !== null && (yn(n, e, l, r),
            ul(n, e, l))
        },
        enqueueReplaceState: function(e, n, t) {
            e = e._reactInternals;
            var r = $e()
              , l = Xn(e)
              , i = Ln(r, l);
            i.tag = 1,
            i.payload = n,
            t != null && (i.callback = t),
            n = Qn(e, i, l),
            n !== null && (yn(n, e, l, r),
            ul(n, e, l))
        },
        enqueueForceUpdate: function(e, n) {
            e = e._reactInternals;
            var t = $e()
              , r = Xn(e)
              , l = Ln(t, r);
            l.tag = 2,
            n != null && (l.callback = n),
            n = Qn(e, l, r),
            n !== null && (yn(n, e, r, t),
            ul(n, e, r))
        }
    };
    function Bs(e, n, t, r, l, i, u) {
        return e = e.stateNode,
        typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, u) : n.prototype && n.prototype.isPureReactComponent ? !er(t, r) || !er(l, i) : !0
    }
    function Hs(e, n, t) {
        var r = !1
          , l = Bn
          , i = n.contextType;
        return typeof i == "object" && i !== null ? i = on(i) : (l = Ke(n) ? et : Ue.current,
        r = n.contextTypes,
        i = (r = r != null) ? _t(e, l) : Bn),
        n = new n(t,i),
        e.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null,
        n.updater = hl,
        e.stateNode = n,
        n._reactInternals = e,
        r && (e = e.stateNode,
        e.__reactInternalMemoizedUnmaskedChildContext = l,
        e.__reactInternalMemoizedMaskedChildContext = i),
        n
    }
    function $s(e, n, t, r) {
        e = n.state,
        typeof n.componentWillReceiveProps == "function" && n.componentWillReceiveProps(t, r),
        typeof n.UNSAFE_componentWillReceiveProps == "function" && n.UNSAFE_componentWillReceiveProps(t, r),
        n.state !== e && hl.enqueueReplaceState(n, n.state, null)
    }
    function nu(e, n, t, r) {
        var l = e.stateNode;
        l.props = t,
        l.state = e.memoizedState,
        l.refs = {},
        Bi(e);
        var i = n.contextType;
        typeof i == "object" && i !== null ? l.context = on(i) : (i = Ke(n) ? et : Ue.current,
        l.context = _t(e, i)),
        l.state = e.memoizedState,
        i = n.getDerivedStateFromProps,
        typeof i == "function" && (eu(e, n, i, t),
        l.state = e.memoizedState),
        typeof n.getDerivedStateFromProps == "function" || typeof l.getSnapshotBeforeUpdate == "function" || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (n = l.state,
        typeof l.componentWillMount == "function" && l.componentWillMount(),
        typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount(),
        n !== l.state && hl.enqueueReplaceState(l, l.state, null),
        ol(e, t, l, r),
        l.state = e.memoizedState),
        typeof l.componentDidMount == "function" && (e.flags |= 4194308)
    }
    function Mt(e, n) {
        try {
            var t = ""
              , r = n;
            do
                t += ne(r),
                r = r.return;
            while (r);
            var l = t
        } catch (i) {
            l = `
Error generating stack: ` + i.message + `
` + i.stack
        }
        return {
            value: e,
            source: n,
            stack: l,
            digest: null
        }
    }
    function tu(e, n, t) {
        return {
            value: e,
            source: null,
            stack: t ?? null,
            digest: n ?? null
        }
    }
    function ru(e, n) {
        try {
            console.error(n.value)
        } catch (t) {
            setTimeout(function() {
                throw t
            })
        }
    }
    var vd = typeof WeakMap == "function" ? WeakMap : Map;
    function Qs(e, n, t) {
        t = Ln(-1, t),
        t.tag = 3,
        t.payload = {
            element: null
        };
        var r = n.value;
        return t.callback = function() {
            Sl || (Sl = !0,
            yu = r),
            ru(e, n)
        }
        ,
        t
    }
    function Ws(e, n, t) {
        t = Ln(-1, t),
        t.tag = 3;
        var r = e.type.getDerivedStateFromError;
        if (typeof r == "function") {
            var l = n.value;
            t.payload = function() {
                return r(l)
            }
            ,
            t.callback = function() {
                ru(e, n)
            }
        }
        var i = e.stateNode;
        return i !== null && typeof i.componentDidCatch == "function" && (t.callback = function() {
            ru(e, n),
            typeof r != "function" && (Kn === null ? Kn = new Set([this]) : Kn.add(this));
            var u = n.stack;
            this.componentDidCatch(n.value, {
                componentStack: u !== null ? u : ""
            })
        }
        ),
        t
    }
    function Ks(e, n, t) {
        var r = e.pingCache;
        if (r === null) {
            r = e.pingCache = new vd;
            var l = new Set;
            r.set(n, l)
        } else
            l = r.get(n),
            l === void 0 && (l = new Set,
            r.set(n, l));
        l.has(t) || (l.add(t),
        e = Ld.bind(null, e, n, t),
        n.then(e, e))
    }
    function Ys(e) {
        do {
            var n;
            if ((n = e.tag === 13) && (n = e.memoizedState,
            n = n !== null ? n.dehydrated !== null : !0),
            n)
                return e;
            e = e.return
        } while (e !== null);
        return null
    }
    function Xs(e, n, t, r, l) {
        return (e.mode & 1) === 0 ? (e === n ? e.flags |= 65536 : (e.flags |= 128,
        t.flags |= 131072,
        t.flags &= -52805,
        t.tag === 1 && (t.alternate === null ? t.tag = 17 : (n = Ln(-1, 1),
        n.tag = 2,
        Qn(t, n, 1))),
        t.lanes |= 1),
        e) : (e.flags |= 65536,
        e.lanes = l,
        e)
    }
    var gd = G.ReactCurrentOwner
      , Ye = !1;
    function He(e, n, t, r) {
        n.child = e === null ? hs(n, null, t, r) : Et(n, e.child, t, r)
    }
    function Gs(e, n, t, r, l) {
        t = t.render;
        var i = n.ref;
        return Pt(n, l),
        r = Xi(e, n, t, r, i, l),
        t = Gi(),
        e !== null && !Ye ? (n.updateQueue = e.updateQueue,
        n.flags &= -2053,
        e.lanes &= ~l,
        Mn(e, n, l)) : (ke && t && Mi(n),
        n.flags |= 1,
        He(e, n, r, l),
        n.child)
    }
    function qs(e, n, t, r, l) {
        if (e === null) {
            var i = t.type;
            return typeof i == "function" && !Nu(i) && i.defaultProps === void 0 && t.compare === null && t.defaultProps === void 0 ? (n.tag = 15,
            n.type = i,
            Zs(e, n, i, r, l)) : (e = El(t.type, null, r, n, n.mode, l),
            e.ref = n.ref,
            e.return = n,
            n.child = e)
        }
        if (i = e.child,
        (e.lanes & l) === 0) {
            var u = i.memoizedProps;
            if (t = t.compare,
            t = t !== null ? t : er,
            t(u, r) && e.ref === n.ref)
                return Mn(e, n, l)
        }
        return n.flags |= 1,
        e = qn(i, r),
        e.ref = n.ref,
        e.return = n,
        n.child = e
    }
    function Zs(e, n, t, r, l) {
        if (e !== null) {
            var i = e.memoizedProps;
            if (er(i, r) && e.ref === n.ref)
                if (Ye = !1,
                n.pendingProps = r = i,
                (e.lanes & l) !== 0)
                    (e.flags & 131072) !== 0 && (Ye = !0);
                else
                    return n.lanes = e.lanes,
                    Mn(e, n, l)
        }
        return lu(e, n, t, r, l)
    }
    function Js(e, n, t) {
        var r = n.pendingProps
          , l = r.children
          , i = e !== null ? e.memoizedState : null;
        if (r.mode === "hidden")
            if ((n.mode & 1) === 0)
                n.memoizedState = {
                    baseLanes: 0,
                    cachePool: null,
                    transitions: null
                },
                pe(Rt, rn),
                rn |= t;
            else {
                if ((t & 1073741824) === 0)
                    return e = i !== null ? i.baseLanes | t : t,
                    n.lanes = n.childLanes = 1073741824,
                    n.memoizedState = {
                        baseLanes: e,
                        cachePool: null,
                        transitions: null
                    },
                    n.updateQueue = null,
                    pe(Rt, rn),
                    rn |= e,
                    null;
                n.memoizedState = {
                    baseLanes: 0,
                    cachePool: null,
                    transitions: null
                },
                r = i !== null ? i.baseLanes : t,
                pe(Rt, rn),
                rn |= r
            }
        else
            i !== null ? (r = i.baseLanes | t,
            n.memoizedState = null) : r = t,
            pe(Rt, rn),
            rn |= r;
        return He(e, n, l, t),
        n.child
    }
    function bs(e, n) {
        var t = n.ref;
        (e === null && t !== null || e !== null && e.ref !== t) && (n.flags |= 512,
        n.flags |= 2097152)
    }
    function lu(e, n, t, r, l) {
        var i = Ke(t) ? et : Ue.current;
        return i = _t(n, i),
        Pt(n, l),
        t = Xi(e, n, t, r, i, l),
        r = Gi(),
        e !== null && !Ye ? (n.updateQueue = e.updateQueue,
        n.flags &= -2053,
        e.lanes &= ~l,
        Mn(e, n, l)) : (ke && r && Mi(n),
        n.flags |= 1,
        He(e, n, t, l),
        n.child)
    }
    function ea(e, n, t, r, l) {
        if (Ke(t)) {
            var i = !0;
            Jr(n)
        } else
            i = !1;
        if (Pt(n, l),
        n.stateNode === null)
            vl(e, n),
            Hs(n, t, r),
            nu(n, t, r, l),
            r = !0;
        else if (e === null) {
            var u = n.stateNode
              , o = n.memoizedProps;
            u.props = o;
            var a = u.context
              , v = t.contextType;
            typeof v == "object" && v !== null ? v = on(v) : (v = Ke(t) ? et : Ue.current,
            v = _t(n, v));
            var x = t.getDerivedStateFromProps
              , S = typeof x == "function" || typeof u.getSnapshotBeforeUpdate == "function";
            S || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (o !== r || a !== v) && $s(n, u, r, v),
            $n = !1;
            var k = n.memoizedState;
            u.state = k,
            ol(n, r, u, l),
            a = n.memoizedState,
            o !== r || k !== a || We.current || $n ? (typeof x == "function" && (eu(n, t, x, r),
            a = n.memoizedState),
            (o = $n || Bs(n, t, o, r, k, a, v)) ? (S || typeof u.UNSAFE_componentWillMount != "function" && typeof u.componentWillMount != "function" || (typeof u.componentWillMount == "function" && u.componentWillMount(),
            typeof u.UNSAFE_componentWillMount == "function" && u.UNSAFE_componentWillMount()),
            typeof u.componentDidMount == "function" && (n.flags |= 4194308)) : (typeof u.componentDidMount == "function" && (n.flags |= 4194308),
            n.memoizedProps = r,
            n.memoizedState = a),
            u.props = r,
            u.state = a,
            u.context = v,
            r = o) : (typeof u.componentDidMount == "function" && (n.flags |= 4194308),
            r = !1)
        } else {
            u = n.stateNode,
            vs(e, n),
            o = n.memoizedProps,
            v = n.type === n.elementType ? o : mn(n.type, o),
            u.props = v,
            S = n.pendingProps,
            k = u.context,
            a = t.contextType,
            typeof a == "object" && a !== null ? a = on(a) : (a = Ke(t) ? et : Ue.current,
            a = _t(n, a));
            var L = t.getDerivedStateFromProps;
            (x = typeof L == "function" || typeof u.getSnapshotBeforeUpdate == "function") || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (o !== S || k !== a) && $s(n, u, r, a),
            $n = !1,
            k = n.memoizedState,
            u.state = k,
            ol(n, r, u, l);
            var z = n.memoizedState;
            o !== S || k !== z || We.current || $n ? (typeof L == "function" && (eu(n, t, L, r),
            z = n.memoizedState),
            (v = $n || Bs(n, t, v, r, k, z, a) || !1) ? (x || typeof u.UNSAFE_componentWillUpdate != "function" && typeof u.componentWillUpdate != "function" || (typeof u.componentWillUpdate == "function" && u.componentWillUpdate(r, z, a),
            typeof u.UNSAFE_componentWillUpdate == "function" && u.UNSAFE_componentWillUpdate(r, z, a)),
            typeof u.componentDidUpdate == "function" && (n.flags |= 4),
            typeof u.getSnapshotBeforeUpdate == "function" && (n.flags |= 1024)) : (typeof u.componentDidUpdate != "function" || o === e.memoizedProps && k === e.memoizedState || (n.flags |= 4),
            typeof u.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && k === e.memoizedState || (n.flags |= 1024),
            n.memoizedProps = r,
            n.memoizedState = z),
            u.props = r,
            u.state = z,
            u.context = a,
            r = v) : (typeof u.componentDidUpdate != "function" || o === e.memoizedProps && k === e.memoizedState || (n.flags |= 4),
            typeof u.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && k === e.memoizedState || (n.flags |= 1024),
            r = !1)
        }
        return iu(e, n, t, r, i, l)
    }
    function iu(e, n, t, r, l, i) {
        bs(e, n);
        var u = (n.flags & 128) !== 0;
        if (!r && !u)
            return l && is(n, t, !1),
            Mn(e, n, i);
        r = n.stateNode,
        gd.current = n;
        var o = u && typeof t.getDerivedStateFromError != "function" ? null : r.render();
        return n.flags |= 1,
        e !== null && u ? (n.child = Et(n, e.child, null, i),
        n.child = Et(n, null, o, i)) : He(e, n, o, i),
        n.memoizedState = r.state,
        l && is(n, t, !0),
        n.child
    }
    function na(e) {
        var n = e.stateNode;
        n.pendingContext ? rs(e, n.pendingContext, n.pendingContext !== n.context) : n.context && rs(e, n.context, !1),
        Hi(e, n.containerInfo)
    }
    function ta(e, n, t, r, l) {
        return jt(),
        Oi(l),
        n.flags |= 256,
        He(e, n, t, r),
        n.child
    }
    var uu = {
        dehydrated: null,
        treeContext: null,
        retryLane: 0
    };
    function ou(e) {
        return {
            baseLanes: e,
            cachePool: null,
            transitions: null
        }
    }
    function ra(e, n, t) {
        var r = n.pendingProps, l = Se.current, i = !1, u = (n.flags & 128) !== 0, o;
        if ((o = u) || (o = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
        o ? (i = !0,
        n.flags &= -129) : (e === null || e.memoizedState !== null) && (l |= 1),
        pe(Se, l & 1),
        e === null)
            return Di(n),
            e = n.memoizedState,
            e !== null && (e = e.dehydrated,
            e !== null) ? ((n.mode & 1) === 0 ? n.lanes = 1 : e.data === "$!" ? n.lanes = 8 : n.lanes = 1073741824,
            null) : (u = r.children,
            e = r.fallback,
            i ? (r = n.mode,
            i = n.child,
            u = {
                mode: "hidden",
                children: u
            },
            (r & 1) === 0 && i !== null ? (i.childLanes = 0,
            i.pendingProps = u) : i = Tl(u, r, 0, null),
            e = ct(e, r, t, null),
            i.return = n,
            e.return = n,
            i.sibling = e,
            n.child = i,
            n.child.memoizedState = ou(t),
            n.memoizedState = uu,
            e) : su(n, u));
        if (l = e.memoizedState,
        l !== null && (o = l.dehydrated,
        o !== null))
            return yd(e, n, u, r, o, l, t);
        if (i) {
            i = r.fallback,
            u = n.mode,
            l = e.child,
            o = l.sibling;
            var a = {
                mode: "hidden",
                children: r.children
            };
            return (u & 1) === 0 && n.child !== l ? (r = n.child,
            r.childLanes = 0,
            r.pendingProps = a,
            n.deletions = null) : (r = qn(l, a),
            r.subtreeFlags = l.subtreeFlags & 14680064),
            o !== null ? i = qn(o, i) : (i = ct(i, u, t, null),
            i.flags |= 2),
            i.return = n,
            r.return = n,
            r.sibling = i,
            n.child = r,
            r = i,
            i = n.child,
            u = e.child.memoizedState,
            u = u === null ? ou(t) : {
                baseLanes: u.baseLanes | t,
                cachePool: null,
                transitions: u.transitions
            },
            i.memoizedState = u,
            i.childLanes = e.childLanes & ~t,
            n.memoizedState = uu,
            r
        }
        return i = e.child,
        e = i.sibling,
        r = qn(i, {
            mode: "visible",
            children: r.children
        }),
        (n.mode & 1) === 0 && (r.lanes = t),
        r.return = n,
        r.sibling = null,
        e !== null && (t = n.deletions,
        t === null ? (n.deletions = [e],
        n.flags |= 16) : t.push(e)),
        n.child = r,
        n.memoizedState = null,
        r
    }
    function su(e, n) {
        return n = Tl({
            mode: "visible",
            children: n
        }, e.mode, 0, null),
        n.return = e,
        e.child = n
    }
    function ml(e, n, t, r) {
        return r !== null && Oi(r),
        Et(n, e.child, null, t),
        e = su(n, n.pendingProps.children),
        e.flags |= 2,
        n.memoizedState = null,
        e
    }
    function yd(e, n, t, r, l, i, u) {
        if (t)
            return n.flags & 256 ? (n.flags &= -257,
            r = tu(Error(m(422))),
            ml(e, n, u, r)) : n.memoizedState !== null ? (n.child = e.child,
            n.flags |= 128,
            null) : (i = r.fallback,
            l = n.mode,
            r = Tl({
                mode: "visible",
                children: r.children
            }, l, 0, null),
            i = ct(i, l, u, null),
            i.flags |= 2,
            r.return = n,
            i.return = n,
            r.sibling = i,
            n.child = r,
            (n.mode & 1) !== 0 && Et(n, e.child, null, u),
            n.child.memoizedState = ou(u),
            n.memoizedState = uu,
            i);
        if ((n.mode & 1) === 0)
            return ml(e, n, u, null);
        if (l.data === "$!") {
            if (r = l.nextSibling && l.nextSibling.dataset,
            r)
                var o = r.dgst;
            return r = o,
            i = Error(m(419)),
            r = tu(i, r, void 0),
            ml(e, n, u, r)
        }
        if (o = (u & e.childLanes) !== 0,
        Ye || o) {
            if (r = ze,
            r !== null) {
                switch (u & -u) {
                case 4:
                    l = 2;
                    break;
                case 16:
                    l = 8;
                    break;
                case 64:
                case 128:
                case 256:
                case 512:
                case 1024:
                case 2048:
                case 4096:
                case 8192:
                case 16384:
                case 32768:
                case 65536:
                case 131072:
                case 262144:
                case 524288:
                case 1048576:
                case 2097152:
                case 4194304:
                case 8388608:
                case 16777216:
                case 33554432:
                case 67108864:
                    l = 32;
                    break;
                case 536870912:
                    l = 268435456;
                    break;
                default:
                    l = 0
                }
                l = (l & (r.suspendedLanes | u)) !== 0 ? 0 : l,
                l !== 0 && l !== i.retryLane && (i.retryLane = l,
                Pn(e, l),
                yn(r, e, l, -1))
            }
            return Cu(),
            r = tu(Error(m(421))),
            ml(e, n, u, r)
        }
        return l.data === "$?" ? (n.flags |= 128,
        n.child = e.child,
        n = Md.bind(null, e),
        l._reactRetry = n,
        null) : (e = i.treeContext,
        tn = Vn(l.nextSibling),
        nn = n,
        ke = !0,
        hn = null,
        e !== null && (ln[un++] = En,
        ln[un++] = Tn,
        ln[un++] = nt,
        En = e.id,
        Tn = e.overflow,
        nt = n),
        n = su(n, r.children),
        n.flags |= 4096,
        n)
    }
    function la(e, n, t) {
        e.lanes |= n;
        var r = e.alternate;
        r !== null && (r.lanes |= n),
        Vi(e.return, n, t)
    }
    function au(e, n, t, r, l) {
        var i = e.memoizedState;
        i === null ? e.memoizedState = {
            isBackwards: n,
            rendering: null,
            renderingStartTime: 0,
            last: r,
            tail: t,
            tailMode: l
        } : (i.isBackwards = n,
        i.rendering = null,
        i.renderingStartTime = 0,
        i.last = r,
        i.tail = t,
        i.tailMode = l)
    }
    function ia(e, n, t) {
        var r = n.pendingProps
          , l = r.revealOrder
          , i = r.tail;
        if (He(e, n, r.children, t),
        r = Se.current,
        (r & 2) !== 0)
            r = r & 1 | 2,
            n.flags |= 128;
        else {
            if (e !== null && (e.flags & 128) !== 0)
                e: for (e = n.child; e !== null; ) {
                    if (e.tag === 13)
                        e.memoizedState !== null && la(e, t, n);
                    else if (e.tag === 19)
                        la(e, t, n);
                    else if (e.child !== null) {
                        e.child.return = e,
                        e = e.child;
                        continue
                    }
                    if (e === n)
                        break e;
                    for (; e.sibling === null; ) {
                        if (e.return === null || e.return === n)
                            break e;
                        e = e.return
                    }
                    e.sibling.return = e.return,
                    e = e.sibling
                }
            r &= 1
        }
        if (pe(Se, r),
        (n.mode & 1) === 0)
            n.memoizedState = null;
        else
            switch (l) {
            case "forwards":
                for (t = n.child,
                l = null; t !== null; )
                    e = t.alternate,
                    e !== null && sl(e) === null && (l = t),
                    t = t.sibling;
                t = l,
                t === null ? (l = n.child,
                n.child = null) : (l = t.sibling,
                t.sibling = null),
                au(n, !1, l, t, i);
                break;
            case "backwards":
                for (t = null,
                l = n.child,
                n.child = null; l !== null; ) {
                    if (e = l.alternate,
                    e !== null && sl(e) === null) {
                        n.child = l;
                        break
                    }
                    e = l.sibling,
                    l.sibling = t,
                    t = l,
                    l = e
                }
                au(n, !0, t, null, i);
                break;
            case "together":
                au(n, !1, null, null, void 0);
                break;
            default:
                n.memoizedState = null
            }
        return n.child
    }
    function vl(e, n) {
        (n.mode & 1) === 0 && e !== null && (e.alternate = null,
        n.alternate = null,
        n.flags |= 2)
    }
    function Mn(e, n, t) {
        if (e !== null && (n.dependencies = e.dependencies),
        ut |= n.lanes,
        (t & n.childLanes) === 0)
            return null;
        if (e !== null && n.child !== e.child)
            throw Error(m(153));
        if (n.child !== null) {
            for (e = n.child,
            t = qn(e, e.pendingProps),
            n.child = t,
            t.return = n; e.sibling !== null; )
                e = e.sibling,
                t = t.sibling = qn(e, e.pendingProps),
                t.return = n;
            t.sibling = null
        }
        return n.child
    }
    function kd(e, n, t) {
        switch (n.tag) {
        case 3:
            na(n),
            jt();
            break;
        case 5:
            ks(n);
            break;
        case 1:
            Ke(n.type) && Jr(n);
            break;
        case 4:
            Hi(n, n.stateNode.containerInfo);
            break;
        case 10:
            var r = n.type._context
              , l = n.memoizedProps.value;
            pe(ll, r._currentValue),
            r._currentValue = l;
            break;
        case 13:
            if (r = n.memoizedState,
            r !== null)
                return r.dehydrated !== null ? (pe(Se, Se.current & 1),
                n.flags |= 128,
                null) : (t & n.child.childLanes) !== 0 ? ra(e, n, t) : (pe(Se, Se.current & 1),
                e = Mn(e, n, t),
                e !== null ? e.sibling : null);
            pe(Se, Se.current & 1);
            break;
        case 19:
            if (r = (t & n.childLanes) !== 0,
            (e.flags & 128) !== 0) {
                if (r)
                    return ia(e, n, t);
                n.flags |= 128
            }
            if (l = n.memoizedState,
            l !== null && (l.rendering = null,
            l.tail = null,
            l.lastEffect = null),
            pe(Se, Se.current),
            r)
                break;
            return null;
        case 22:
        case 23:
            return n.lanes = 0,
            Js(e, n, t)
        }
        return Mn(e, n, t)
    }
    var ua, cu, oa, sa;
    ua = function(e, n) {
        for (var t = n.child; t !== null; ) {
            if (t.tag === 5 || t.tag === 6)
                e.appendChild(t.stateNode);
            else if (t.tag !== 4 && t.child !== null) {
                t.child.return = t,
                t = t.child;
                continue
            }
            if (t === n)
                break;
            for (; t.sibling === null; ) {
                if (t.return === null || t.return === n)
                    return;
                t = t.return
            }
            t.sibling.return = t.return,
            t = t.sibling
        }
    }
    ,
    cu = function() {}
    ,
    oa = function(e, n, t, r) {
        var l = e.memoizedProps;
        if (l !== r) {
            e = n.stateNode,
            lt(wn.current);
            var i = null;
            switch (t) {
            case "input":
                l = Vl(e, l),
                r = Vl(e, r),
                i = [];
                break;
            case "select":
                l = E({}, l, {
                    value: void 0
                }),
                r = E({}, r, {
                    value: void 0
                }),
                i = [];
                break;
            case "textarea":
                l = Hl(e, l),
                r = Hl(e, r),
                i = [];
                break;
            default:
                typeof l.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Gr)
            }
            Ql(t, r);
            var u;
            t = null;
            for (v in l)
                if (!r.hasOwnProperty(v) && l.hasOwnProperty(v) && l[v] != null)
                    if (v === "style") {
                        var o = l[v];
                        for (u in o)
                            o.hasOwnProperty(u) && (t || (t = {}),
                            t[u] = "")
                    } else
                        v !== "dangerouslySetInnerHTML" && v !== "children" && v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && v !== "autoFocus" && (w.hasOwnProperty(v) ? i || (i = []) : (i = i || []).push(v, null));
            for (v in r) {
                var a = r[v];
                if (o = l != null ? l[v] : void 0,
                r.hasOwnProperty(v) && a !== o && (a != null || o != null))
                    if (v === "style")
                        if (o) {
                            for (u in o)
                                !o.hasOwnProperty(u) || a && a.hasOwnProperty(u) || (t || (t = {}),
                                t[u] = "");
                            for (u in a)
                                a.hasOwnProperty(u) && o[u] !== a[u] && (t || (t = {}),
                                t[u] = a[u])
                        } else
                            t || (i || (i = []),
                            i.push(v, t)),
                            t = a;
                    else
                        v === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0,
                        o = o ? o.__html : void 0,
                        a != null && o !== a && (i = i || []).push(v, a)) : v === "children" ? typeof a != "string" && typeof a != "number" || (i = i || []).push(v, "" + a) : v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && (w.hasOwnProperty(v) ? (a != null && v === "onScroll" && me("scroll", e),
                        i || o === a || (i = [])) : (i = i || []).push(v, a))
            }
            t && (i = i || []).push("style", t);
            var v = i;
            (n.updateQueue = v) && (n.flags |= 4)
        }
    }
    ,
    sa = function(e, n, t, r) {
        t !== r && (n.flags |= 4)
    }
    ;
    function mr(e, n) {
        if (!ke)
            switch (e.tailMode) {
            case "hidden":
                n = e.tail;
                for (var t = null; n !== null; )
                    n.alternate !== null && (t = n),
                    n = n.sibling;
                t === null ? e.tail = null : t.sibling = null;
                break;
            case "collapsed":
                t = e.tail;
                for (var r = null; t !== null; )
                    t.alternate !== null && (r = t),
                    t = t.sibling;
                r === null ? n || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null
            }
    }
    function Ae(e) {
        var n = e.alternate !== null && e.alternate.child === e.child
          , t = 0
          , r = 0;
        if (n)
            for (var l = e.child; l !== null; )
                t |= l.lanes | l.childLanes,
                r |= l.subtreeFlags & 14680064,
                r |= l.flags & 14680064,
                l.return = e,
                l = l.sibling;
        else
            for (l = e.child; l !== null; )
                t |= l.lanes | l.childLanes,
                r |= l.subtreeFlags,
                r |= l.flags,
                l.return = e,
                l = l.sibling;
        return e.subtreeFlags |= r,
        e.childLanes = t,
        n
    }
    function xd(e, n, t) {
        var r = n.pendingProps;
        switch (zi(n),
        n.tag) {
        case 2:
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
            return Ae(n),
            null;
        case 1:
            return Ke(n.type) && Zr(),
            Ae(n),
            null;
        case 3:
            return r = n.stateNode,
            Lt(),
            ve(We),
            ve(Ue),
            Wi(),
            r.pendingContext && (r.context = r.pendingContext,
            r.pendingContext = null),
            (e === null || e.child === null) && (tl(n) ? n.flags |= 4 : e === null || e.memoizedState.isDehydrated && (n.flags & 256) === 0 || (n.flags |= 1024,
            hn !== null && (Su(hn),
            hn = null))),
            cu(e, n),
            Ae(n),
            null;
        case 5:
            $i(n);
            var l = lt(cr.current);
            if (t = n.type,
            e !== null && n.stateNode != null)
                oa(e, n, t, r, l),
                e.ref !== n.ref && (n.flags |= 512,
                n.flags |= 2097152);
            else {
                if (!r) {
                    if (n.stateNode === null)
                        throw Error(m(166));
                    return Ae(n),
                    null
                }
                if (e = lt(wn.current),
                tl(n)) {
                    r = n.stateNode,
                    t = n.type;
                    var i = n.memoizedProps;
                    switch (r[Sn] = n,
                    r[ir] = i,
                    e = (n.mode & 1) !== 0,
                    t) {
                    case "dialog":
                        me("cancel", r),
                        me("close", r);
                        break;
                    case "iframe":
                    case "object":
                    case "embed":
                        me("load", r);
                        break;
                    case "video":
                    case "audio":
                        for (l = 0; l < tr.length; l++)
                            me(tr[l], r);
                        break;
                    case "source":
                        me("error", r);
                        break;
                    case "img":
                    case "image":
                    case "link":
                        me("error", r),
                        me("load", r);
                        break;
                    case "details":
                        me("toggle", r);
                        break;
                    case "input":
                        Bu(r, i),
                        me("invalid", r);
                        break;
                    case "select":
                        r._wrapperState = {
                            wasMultiple: !!i.multiple
                        },
                        me("invalid", r);
                        break;
                    case "textarea":
                        Qu(r, i),
                        me("invalid", r)
                    }
                    Ql(t, i),
                    l = null;
                    for (var u in i)
                        if (i.hasOwnProperty(u)) {
                            var o = i[u];
                            u === "children" ? typeof o == "string" ? r.textContent !== o && (i.suppressHydrationWarning !== !0 && Xr(r.textContent, o, e),
                            l = ["children", o]) : typeof o == "number" && r.textContent !== "" + o && (i.suppressHydrationWarning !== !0 && Xr(r.textContent, o, e),
                            l = ["children", "" + o]) : w.hasOwnProperty(u) && o != null && u === "onScroll" && me("scroll", r)
                        }
                    switch (t) {
                    case "input":
                        Nr(r),
                        $u(r, i, !0);
                        break;
                    case "textarea":
                        Nr(r),
                        Ku(r);
                        break;
                    case "select":
                    case "option":
                        break;
                    default:
                        typeof i.onClick == "function" && (r.onclick = Gr)
                    }
                    r = l,
                    n.updateQueue = r,
                    r !== null && (n.flags |= 4)
                } else {
                    u = l.nodeType === 9 ? l : l.ownerDocument,
                    e === "http://www.w3.org/1999/xhtml" && (e = Yu(t)),
                    e === "http://www.w3.org/1999/xhtml" ? t === "script" ? (e = u.createElement("div"),
                    e.innerHTML = "<script><\/script>",
                    e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = u.createElement(t, {
                        is: r.is
                    }) : (e = u.createElement(t),
                    t === "select" && (u = e,
                    r.multiple ? u.multiple = !0 : r.size && (u.size = r.size))) : e = u.createElementNS(e, t),
                    e[Sn] = n,
                    e[ir] = r,
                    ua(e, n, !1, !1),
                    n.stateNode = e;
                    e: {
                        switch (u = Wl(t, r),
                        t) {
                        case "dialog":
                            me("cancel", e),
                            me("close", e),
                            l = r;
                            break;
                        case "iframe":
                        case "object":
                        case "embed":
                            me("load", e),
                            l = r;
                            break;
                        case "video":
                        case "audio":
                            for (l = 0; l < tr.length; l++)
                                me(tr[l], e);
                            l = r;
                            break;
                        case "source":
                            me("error", e),
                            l = r;
                            break;
                        case "img":
                        case "image":
                        case "link":
                            me("error", e),
                            me("load", e),
                            l = r;
                            break;
                        case "details":
                            me("toggle", e),
                            l = r;
                            break;
                        case "input":
                            Bu(e, r),
                            l = Vl(e, r),
                            me("invalid", e);
                            break;
                        case "option":
                            l = r;
                            break;
                        case "select":
                            e._wrapperState = {
                                wasMultiple: !!r.multiple
                            },
                            l = E({}, r, {
                                value: void 0
                            }),
                            me("invalid", e);
                            break;
                        case "textarea":
                            Qu(e, r),
                            l = Hl(e, r),
                            me("invalid", e);
                            break;
                        default:
                            l = r
                        }
                        Ql(t, l),
                        o = l;
                        for (i in o)
                            if (o.hasOwnProperty(i)) {
                                var a = o[i];
                                i === "style" ? qu(e, a) : i === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0,
                                a != null && Xu(e, a)) : i === "children" ? typeof a == "string" ? (t !== "textarea" || a !== "") && Ft(e, a) : typeof a == "number" && Ft(e, "" + a) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (w.hasOwnProperty(i) ? a != null && i === "onScroll" && me("scroll", e) : a != null && ue(e, i, a, u))
                            }
                        switch (t) {
                        case "input":
                            Nr(e),
                            $u(e, r, !1);
                            break;
                        case "textarea":
                            Nr(e),
                            Ku(e);
                            break;
                        case "option":
                            r.value != null && e.setAttribute("value", "" + ce(r.value));
                            break;
                        case "select":
                            e.multiple = !!r.multiple,
                            i = r.value,
                            i != null ? dt(e, !!r.multiple, i, !1) : r.defaultValue != null && dt(e, !!r.multiple, r.defaultValue, !0);
                            break;
                        default:
                            typeof l.onClick == "function" && (e.onclick = Gr)
                        }
                        switch (t) {
                        case "button":
                        case "input":
                        case "select":
                        case "textarea":
                            r = !!r.autoFocus;
                            break e;
                        case "img":
                            r = !0;
                            break e;
                        default:
                            r = !1
                        }
                    }
                    r && (n.flags |= 4)
                }
                n.ref !== null && (n.flags |= 512,
                n.flags |= 2097152)
            }
            return Ae(n),
            null;
        case 6:
            if (e && n.stateNode != null)
                sa(e, n, e.memoizedProps, r);
            else {
                if (typeof r != "string" && n.stateNode === null)
                    throw Error(m(166));
                if (t = lt(cr.current),
                lt(wn.current),
                tl(n)) {
                    if (r = n.stateNode,
                    t = n.memoizedProps,
                    r[Sn] = n,
                    (i = r.nodeValue !== t) && (e = nn,
                    e !== null))
                        switch (e.tag) {
                        case 3:
                            Xr(r.nodeValue, t, (e.mode & 1) !== 0);
                            break;
                        case 5:
                            e.memoizedProps.suppressHydrationWarning !== !0 && Xr(r.nodeValue, t, (e.mode & 1) !== 0)
                        }
                    i && (n.flags |= 4)
                } else
                    r = (t.nodeType === 9 ? t : t.ownerDocument).createTextNode(r),
                    r[Sn] = n,
                    n.stateNode = r
            }
            return Ae(n),
            null;
        case 13:
            if (ve(Se),
            r = n.memoizedState,
            e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
                if (ke && tn !== null && (n.mode & 1) !== 0 && (n.flags & 128) === 0)
                    ds(),
                    jt(),
                    n.flags |= 98560,
                    i = !1;
                else if (i = tl(n),
                r !== null && r.dehydrated !== null) {
                    if (e === null) {
                        if (!i)
                            throw Error(m(318));
                        if (i = n.memoizedState,
                        i = i !== null ? i.dehydrated : null,
                        !i)
                            throw Error(m(317));
                        i[Sn] = n
                    } else
                        jt(),
                        (n.flags & 128) === 0 && (n.memoizedState = null),
                        n.flags |= 4;
                    Ae(n),
                    i = !1
                } else
                    hn !== null && (Su(hn),
                    hn = null),
                    i = !0;
                if (!i)
                    return n.flags & 65536 ? n : null
            }
            return (n.flags & 128) !== 0 ? (n.lanes = t,
            n) : (r = r !== null,
            r !== (e !== null && e.memoizedState !== null) && r && (n.child.flags |= 8192,
            (n.mode & 1) !== 0 && (e === null || (Se.current & 1) !== 0 ? Le === 0 && (Le = 3) : Cu())),
            n.updateQueue !== null && (n.flags |= 4),
            Ae(n),
            null);
        case 4:
            return Lt(),
            cu(e, n),
            e === null && rr(n.stateNode.containerInfo),
            Ae(n),
            null;
        case 10:
            return Ui(n.type._context),
            Ae(n),
            null;
        case 17:
            return Ke(n.type) && Zr(),
            Ae(n),
            null;
        case 19:
            if (ve(Se),
            i = n.memoizedState,
            i === null)
                return Ae(n),
                null;
            if (r = (n.flags & 128) !== 0,
            u = i.rendering,
            u === null)
                if (r)
                    mr(i, !1);
                else {
                    if (Le !== 0 || e !== null && (e.flags & 128) !== 0)
                        for (e = n.child; e !== null; ) {
                            if (u = sl(e),
                            u !== null) {
                                for (n.flags |= 128,
                                mr(i, !1),
                                r = u.updateQueue,
                                r !== null && (n.updateQueue = r,
                                n.flags |= 4),
                                n.subtreeFlags = 0,
                                r = t,
                                t = n.child; t !== null; )
                                    i = t,
                                    e = r,
                                    i.flags &= 14680066,
                                    u = i.alternate,
                                    u === null ? (i.childLanes = 0,
                                    i.lanes = e,
                                    i.child = null,
                                    i.subtreeFlags = 0,
                                    i.memoizedProps = null,
                                    i.memoizedState = null,
                                    i.updateQueue = null,
                                    i.dependencies = null,
                                    i.stateNode = null) : (i.childLanes = u.childLanes,
                                    i.lanes = u.lanes,
                                    i.child = u.child,
                                    i.subtreeFlags = 0,
                                    i.deletions = null,
                                    i.memoizedProps = u.memoizedProps,
                                    i.memoizedState = u.memoizedState,
                                    i.updateQueue = u.updateQueue,
                                    i.type = u.type,
                                    e = u.dependencies,
                                    i.dependencies = e === null ? null : {
                                        lanes: e.lanes,
                                        firstContext: e.firstContext
                                    }),
                                    t = t.sibling;
                                return pe(Se, Se.current & 1 | 2),
                                n.child
                            }
                            e = e.sibling
                        }
                    i.tail !== null && je() > Dt && (n.flags |= 128,
                    r = !0,
                    mr(i, !1),
                    n.lanes = 4194304)
                }
            else {
                if (!r)
                    if (e = sl(u),
                    e !== null) {
                        if (n.flags |= 128,
                        r = !0,
                        t = e.updateQueue,
                        t !== null && (n.updateQueue = t,
                        n.flags |= 4),
                        mr(i, !0),
                        i.tail === null && i.tailMode === "hidden" && !u.alternate && !ke)
                            return Ae(n),
                            null
                    } else
                        2 * je() - i.renderingStartTime > Dt && t !== 1073741824 && (n.flags |= 128,
                        r = !0,
                        mr(i, !1),
                        n.lanes = 4194304);
                i.isBackwards ? (u.sibling = n.child,
                n.child = u) : (t = i.last,
                t !== null ? t.sibling = u : n.child = u,
                i.last = u)
            }
            return i.tail !== null ? (n = i.tail,
            i.rendering = n,
            i.tail = n.sibling,
            i.renderingStartTime = je(),
            n.sibling = null,
            t = Se.current,
            pe(Se, r ? t & 1 | 2 : t & 1),
            n) : (Ae(n),
            null);
        case 22:
        case 23:
            return _u(),
            r = n.memoizedState !== null,
            e !== null && e.memoizedState !== null !== r && (n.flags |= 8192),
            r && (n.mode & 1) !== 0 ? (rn & 1073741824) !== 0 && (Ae(n),
            n.subtreeFlags & 6 && (n.flags |= 8192)) : Ae(n),
            null;
        case 24:
            return null;
        case 25:
            return null
        }
        throw Error(m(156, n.tag))
    }
    function Sd(e, n) {
        switch (zi(n),
        n.tag) {
        case 1:
            return Ke(n.type) && Zr(),
            e = n.flags,
            e & 65536 ? (n.flags = e & -65537 | 128,
            n) : null;
        case 3:
            return Lt(),
            ve(We),
            ve(Ue),
            Wi(),
            e = n.flags,
            (e & 65536) !== 0 && (e & 128) === 0 ? (n.flags = e & -65537 | 128,
            n) : null;
        case 5:
            return $i(n),
            null;
        case 13:
            if (ve(Se),
            e = n.memoizedState,
            e !== null && e.dehydrated !== null) {
                if (n.alternate === null)
                    throw Error(m(340));
                jt()
            }
            return e = n.flags,
            e & 65536 ? (n.flags = e & -65537 | 128,
            n) : null;
        case 19:
            return ve(Se),
            null;
        case 4:
            return Lt(),
            null;
        case 10:
            return Ui(n.type._context),
            null;
        case 22:
        case 23:
            return _u(),
            null;
        case 24:
            return null;
        default:
            return null
        }
    }
    var gl = !1
      , Be = !1
      , wd = typeof WeakSet == "function" ? WeakSet : Set
      , M = null;
    function zt(e, n) {
        var t = e.ref;
        if (t !== null)
            if (typeof t == "function")
                try {
                    t(null)
                } catch (r) {
                    Ne(e, n, r)
                }
            else
                t.current = null
    }
    function du(e, n, t) {
        try {
            t()
        } catch (r) {
            Ne(e, n, r)
        }
    }
    var aa = !1;
    function _d(e, n) {
        if (_i = Fr,
        e = Bo(),
        mi(e)) {
            if ("selectionStart"in e)
                var t = {
                    start: e.selectionStart,
                    end: e.selectionEnd
                };
            else
                e: {
                    t = (t = e.ownerDocument) && t.defaultView || window;
                    var r = t.getSelection && t.getSelection();
                    if (r && r.rangeCount !== 0) {
                        t = r.anchorNode;
                        var l = r.anchorOffset
                          , i = r.focusNode;
                        r = r.focusOffset;
                        try {
                            t.nodeType,
                            i.nodeType
                        } catch {
                            t = null;
                            break e
                        }
                        var u = 0
                          , o = -1
                          , a = -1
                          , v = 0
                          , x = 0
                          , S = e
                          , k = null;
                        n: for (; ; ) {
                            for (var L; S !== t || l !== 0 && S.nodeType !== 3 || (o = u + l),
                            S !== i || r !== 0 && S.nodeType !== 3 || (a = u + r),
                            S.nodeType === 3 && (u += S.nodeValue.length),
                            (L = S.firstChild) !== null; )
                                k = S,
                                S = L;
                            for (; ; ) {
                                if (S === e)
                                    break n;
                                if (k === t && ++v === l && (o = u),
                                k === i && ++x === r && (a = u),
                                (L = S.nextSibling) !== null)
                                    break;
                                S = k,
                                k = S.parentNode
                            }
                            S = L
                        }
                        t = o === -1 || a === -1 ? null : {
                            start: o,
                            end: a
                        }
                    } else
                        t = null
                }
            t = t || {
                start: 0,
                end: 0
            }
        } else
            t = null;
        for (Ci = {
            focusedElem: e,
            selectionRange: t
        },
        Fr = !1,
        M = n; M !== null; )
            if (n = M,
            e = n.child,
            (n.subtreeFlags & 1028) !== 0 && e !== null)
                e.return = n,
                M = e;
            else
                for (; M !== null; ) {
                    n = M;
                    try {
                        var z = n.alternate;
                        if ((n.flags & 1024) !== 0)
                            switch (n.tag) {
                            case 0:
                            case 11:
                            case 15:
                                break;
                            case 1:
                                if (z !== null) {
                                    var D = z.memoizedProps
                                      , Ee = z.memoizedState
                                      , p = n.stateNode
                                      , c = p.getSnapshotBeforeUpdate(n.elementType === n.type ? D : mn(n.type, D), Ee);
                                    p.__reactInternalSnapshotBeforeUpdate = c
                                }
                                break;
                            case 3:
                                var h = n.stateNode.containerInfo;
                                h.nodeType === 1 ? h.textContent = "" : h.nodeType === 9 && h.documentElement && h.removeChild(h.documentElement);
                                break;
                            case 5:
                            case 6:
                            case 4:
                            case 17:
                                break;
                            default:
                                throw Error(m(163))
                            }
                    } catch (_) {
                        Ne(n, n.return, _)
                    }
                    if (e = n.sibling,
                    e !== null) {
                        e.return = n.return,
                        M = e;
                        break
                    }
                    M = n.return
                }
        return z = aa,
        aa = !1,
        z
    }
    function vr(e, n, t) {
        var r = n.updateQueue;
        if (r = r !== null ? r.lastEffect : null,
        r !== null) {
            var l = r = r.next;
            do {
                if ((l.tag & e) === e) {
                    var i = l.destroy;
                    l.destroy = void 0,
                    i !== void 0 && du(n, t, i)
                }
                l = l.next
            } while (l !== r)
        }
    }
    function yl(e, n) {
        if (n = n.updateQueue,
        n = n !== null ? n.lastEffect : null,
        n !== null) {
            var t = n = n.next;
            do {
                if ((t.tag & e) === e) {
                    var r = t.create;
                    t.destroy = r()
                }
                t = t.next
            } while (t !== n)
        }
    }
    function fu(e) {
        var n = e.ref;
        if (n !== null) {
            var t = e.stateNode;
            switch (e.tag) {
            case 5:
                e = t;
                break;
            default:
                e = t
            }
            typeof n == "function" ? n(e) : n.current = e
        }
    }
    function ca(e) {
        var n = e.alternate;
        n !== null && (e.alternate = null,
        ca(n)),
        e.child = null,
        e.deletions = null,
        e.sibling = null,
        e.tag === 5 && (n = e.stateNode,
        n !== null && (delete n[Sn],
        delete n[ir],
        delete n[Ti],
        delete n[id],
        delete n[ud])),
        e.stateNode = null,
        e.return = null,
        e.dependencies = null,
        e.memoizedProps = null,
        e.memoizedState = null,
        e.pendingProps = null,
        e.stateNode = null,
        e.updateQueue = null
    }
    function da(e) {
        return e.tag === 5 || e.tag === 3 || e.tag === 4
    }
    function fa(e) {
        e: for (; ; ) {
            for (; e.sibling === null; ) {
                if (e.return === null || da(e.return))
                    return null;
                e = e.return
            }
            for (e.sibling.return = e.return,
            e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
                if (e.flags & 2 || e.child === null || e.tag === 4)
                    continue e;
                e.child.return = e,
                e = e.child
            }
            if (!(e.flags & 2))
                return e.stateNode
        }
    }
    function pu(e, n, t) {
        var r = e.tag;
        if (r === 5 || r === 6)
            e = e.stateNode,
            n ? t.nodeType === 8 ? t.parentNode.insertBefore(e, n) : t.insertBefore(e, n) : (t.nodeType === 8 ? (n = t.parentNode,
            n.insertBefore(e, t)) : (n = t,
            n.appendChild(e)),
            t = t._reactRootContainer,
            t != null || n.onclick !== null || (n.onclick = Gr));
        else if (r !== 4 && (e = e.child,
        e !== null))
            for (pu(e, n, t),
            e = e.sibling; e !== null; )
                pu(e, n, t),
                e = e.sibling
    }
    function hu(e, n, t) {
        var r = e.tag;
        if (r === 5 || r === 6)
            e = e.stateNode,
            n ? t.insertBefore(e, n) : t.appendChild(e);
        else if (r !== 4 && (e = e.child,
        e !== null))
            for (hu(e, n, t),
            e = e.sibling; e !== null; )
                hu(e, n, t),
                e = e.sibling
    }
    var De = null
      , vn = !1;
    function Wn(e, n, t) {
        for (t = t.child; t !== null; )
            pa(e, n, t),
            t = t.sibling
    }
    function pa(e, n, t) {
        if (xn && typeof xn.onCommitFiberUnmount == "function")
            try {
                xn.onCommitFiberUnmount(Mr, t)
            } catch {}
        switch (t.tag) {
        case 5:
            Be || zt(t, n);
        case 6:
            var r = De
              , l = vn;
            De = null,
            Wn(e, n, t),
            De = r,
            vn = l,
            De !== null && (vn ? (e = De,
            t = t.stateNode,
            e.nodeType === 8 ? e.parentNode.removeChild(t) : e.removeChild(t)) : De.removeChild(t.stateNode));
            break;
        case 18:
            De !== null && (vn ? (e = De,
            t = t.stateNode,
            e.nodeType === 8 ? Ei(e.parentNode, t) : e.nodeType === 1 && Ei(e, t),
            Xt(e)) : Ei(De, t.stateNode));
            break;
        case 4:
            r = De,
            l = vn,
            De = t.stateNode.containerInfo,
            vn = !0,
            Wn(e, n, t),
            De = r,
            vn = l;
            break;
        case 0:
        case 11:
        case 14:
        case 15:
            if (!Be && (r = t.updateQueue,
            r !== null && (r = r.lastEffect,
            r !== null))) {
                l = r = r.next;
                do {
                    var i = l
                      , u = i.destroy;
                    i = i.tag,
                    u !== void 0 && ((i & 2) !== 0 || (i & 4) !== 0) && du(t, n, u),
                    l = l.next
                } while (l !== r)
            }
            Wn(e, n, t);
            break;
        case 1:
            if (!Be && (zt(t, n),
            r = t.stateNode,
            typeof r.componentWillUnmount == "function"))
                try {
                    r.props = t.memoizedProps,
                    r.state = t.memoizedState,
                    r.componentWillUnmount()
                } catch (o) {
                    Ne(t, n, o)
                }
            Wn(e, n, t);
            break;
        case 21:
            Wn(e, n, t);
            break;
        case 22:
            t.mode & 1 ? (Be = (r = Be) || t.memoizedState !== null,
            Wn(e, n, t),
            Be = r) : Wn(e, n, t);
            break;
        default:
            Wn(e, n, t)
        }
    }
    function ha(e) {
        var n = e.updateQueue;
        if (n !== null) {
            e.updateQueue = null;
            var t = e.stateNode;
            t === null && (t = e.stateNode = new wd),
            n.forEach(function(r) {
                var l = zd.bind(null, e, r);
                t.has(r) || (t.add(r),
                r.then(l, l))
            })
        }
    }
    function gn(e, n) {
        var t = n.deletions;
        if (t !== null)
            for (var r = 0; r < t.length; r++) {
                var l = t[r];
                try {
                    var i = e
                      , u = n
                      , o = u;
                    e: for (; o !== null; ) {
                        switch (o.tag) {
                        case 5:
                            De = o.stateNode,
                            vn = !1;
                            break e;
                        case 3:
                            De = o.stateNode.containerInfo,
                            vn = !0;
                            break e;
                        case 4:
                            De = o.stateNode.containerInfo,
                            vn = !0;
                            break e
                        }
                        o = o.return
                    }
                    if (De === null)
                        throw Error(m(160));
                    pa(i, u, l),
                    De = null,
                    vn = !1;
                    var a = l.alternate;
                    a !== null && (a.return = null),
                    l.return = null
                } catch (v) {
                    Ne(l, n, v)
                }
            }
        if (n.subtreeFlags & 12854)
            for (n = n.child; n !== null; )
                ma(n, e),
                n = n.sibling
    }
    function ma(e, n) {
        var t = e.alternate
          , r = e.flags;
        switch (e.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
            if (gn(n, e),
            Cn(e),
            r & 4) {
                try {
                    vr(3, e, e.return),
                    yl(3, e)
                } catch (D) {
                    Ne(e, e.return, D)
                }
                try {
                    vr(5, e, e.return)
                } catch (D) {
                    Ne(e, e.return, D)
                }
            }
            break;
        case 1:
            gn(n, e),
            Cn(e),
            r & 512 && t !== null && zt(t, t.return);
            break;
        case 5:
            if (gn(n, e),
            Cn(e),
            r & 512 && t !== null && zt(t, t.return),
            e.flags & 32) {
                var l = e.stateNode;
                try {
                    Ft(l, "")
                } catch (D) {
                    Ne(e, e.return, D)
                }
            }
            if (r & 4 && (l = e.stateNode,
            l != null)) {
                var i = e.memoizedProps
                  , u = t !== null ? t.memoizedProps : i
                  , o = e.type
                  , a = e.updateQueue;
                if (e.updateQueue = null,
                a !== null)
                    try {
                        o === "input" && i.type === "radio" && i.name != null && Hu(l, i),
                        Wl(o, u);
                        var v = Wl(o, i);
                        for (u = 0; u < a.length; u += 2) {
                            var x = a[u]
                              , S = a[u + 1];
                            x === "style" ? qu(l, S) : x === "dangerouslySetInnerHTML" ? Xu(l, S) : x === "children" ? Ft(l, S) : ue(l, x, S, v)
                        }
                        switch (o) {
                        case "input":
                            Al(l, i);
                            break;
                        case "textarea":
                            Wu(l, i);
                            break;
                        case "select":
                            var k = l._wrapperState.wasMultiple;
                            l._wrapperState.wasMultiple = !!i.multiple;
                            var L = i.value;
                            L != null ? dt(l, !!i.multiple, L, !1) : k !== !!i.multiple && (i.defaultValue != null ? dt(l, !!i.multiple, i.defaultValue, !0) : dt(l, !!i.multiple, i.multiple ? [] : "", !1))
                        }
                        l[ir] = i
                    } catch (D) {
                        Ne(e, e.return, D)
                    }
            }
            break;
        case 6:
            if (gn(n, e),
            Cn(e),
            r & 4) {
                if (e.stateNode === null)
                    throw Error(m(162));
                l = e.stateNode,
                i = e.memoizedProps;
                try {
                    l.nodeValue = i
                } catch (D) {
                    Ne(e, e.return, D)
                }
            }
            break;
        case 3:
            if (gn(n, e),
            Cn(e),
            r & 4 && t !== null && t.memoizedState.isDehydrated)
                try {
                    Xt(n.containerInfo)
                } catch (D) {
                    Ne(e, e.return, D)
                }
            break;
        case 4:
            gn(n, e),
            Cn(e);
            break;
        case 13:
            gn(n, e),
            Cn(e),
            l = e.child,
            l.flags & 8192 && (i = l.memoizedState !== null,
            l.stateNode.isHidden = i,
            !i || l.alternate !== null && l.alternate.memoizedState !== null || (gu = je())),
            r & 4 && ha(e);
            break;
        case 22:
            if (x = t !== null && t.memoizedState !== null,
            e.mode & 1 ? (Be = (v = Be) || x,
            gn(n, e),
            Be = v) : gn(n, e),
            Cn(e),
            r & 8192) {
                if (v = e.memoizedState !== null,
                (e.stateNode.isHidden = v) && !x && (e.mode & 1) !== 0)
                    for (M = e,
                    x = e.child; x !== null; ) {
                        for (S = M = x; M !== null; ) {
                            switch (k = M,
                            L = k.child,
                            k.tag) {
                            case 0:
                            case 11:
                            case 14:
                            case 15:
                                vr(4, k, k.return);
                                break;
                            case 1:
                                zt(k, k.return);
                                var z = k.stateNode;
                                if (typeof z.componentWillUnmount == "function") {
                                    r = k,
                                    t = k.return;
                                    try {
                                        n = r,
                                        z.props = n.memoizedProps,
                                        z.state = n.memoizedState,
                                        z.componentWillUnmount()
                                    } catch (D) {
                                        Ne(r, t, D)
                                    }
                                }
                                break;
                            case 5:
                                zt(k, k.return);
                                break;
                            case 22:
                                if (k.memoizedState !== null) {
                                    ya(S);
                                    continue
                                }
                            }
                            L !== null ? (L.return = k,
                            M = L) : ya(S)
                        }
                        x = x.sibling
                    }
                e: for (x = null,
                S = e; ; ) {
                    if (S.tag === 5) {
                        if (x === null) {
                            x = S;
                            try {
                                l = S.stateNode,
                                v ? (i = l.style,
                                typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (o = S.stateNode,
                                a = S.memoizedProps.style,
                                u = a != null && a.hasOwnProperty("display") ? a.display : null,
                                o.style.display = Gu("display", u))
                            } catch (D) {
                                Ne(e, e.return, D)
                            }
                        }
                    } else if (S.tag === 6) {
                        if (x === null)
                            try {
                                S.stateNode.nodeValue = v ? "" : S.memoizedProps
                            } catch (D) {
                                Ne(e, e.return, D)
                            }
                    } else if ((S.tag !== 22 && S.tag !== 23 || S.memoizedState === null || S === e) && S.child !== null) {
                        S.child.return = S,
                        S = S.child;
                        continue
                    }
                    if (S === e)
                        break e;
                    for (; S.sibling === null; ) {
                        if (S.return === null || S.return === e)
                            break e;
                        x === S && (x = null),
                        S = S.return
                    }
                    x === S && (x = null),
                    S.sibling.return = S.return,
                    S = S.sibling
                }
            }
            break;
        case 19:
            gn(n, e),
            Cn(e),
            r & 4 && ha(e);
            break;
        case 21:
            break;
        default:
            gn(n, e),
            Cn(e)
        }
    }
    function Cn(e) {
        var n = e.flags;
        if (n & 2) {
            try {
                e: {
                    for (var t = e.return; t !== null; ) {
                        if (da(t)) {
                            var r = t;
                            break e
                        }
                        t = t.return
                    }
                    throw Error(m(160))
                }
                switch (r.tag) {
                case 5:
                    var l = r.stateNode;
                    r.flags & 32 && (Ft(l, ""),
                    r.flags &= -33);
                    var i = fa(e);
                    hu(e, i, l);
                    break;
                case 3:
                case 4:
                    var u = r.stateNode.containerInfo
                      , o = fa(e);
                    pu(e, o, u);
                    break;
                default:
                    throw Error(m(161))
                }
            } catch (a) {
                Ne(e, e.return, a)
            }
            e.flags &= -3
        }
        n & 4096 && (e.flags &= -4097)
    }
    function Cd(e, n, t) {
        M = e,
        va(e)
    }
    function va(e, n, t) {
        for (var r = (e.mode & 1) !== 0; M !== null; ) {
            var l = M
              , i = l.child;
            if (l.tag === 22 && r) {
                var u = l.memoizedState !== null || gl;
                if (!u) {
                    var o = l.alternate
                      , a = o !== null && o.memoizedState !== null || Be;
                    o = gl;
                    var v = Be;
                    if (gl = u,
                    (Be = a) && !v)
                        for (M = l; M !== null; )
                            u = M,
                            a = u.child,
                            u.tag === 22 && u.memoizedState !== null ? ka(l) : a !== null ? (a.return = u,
                            M = a) : ka(l);
                    for (; i !== null; )
                        M = i,
                        va(i),
                        i = i.sibling;
                    M = l,
                    gl = o,
                    Be = v
                }
                ga(e)
            } else
                (l.subtreeFlags & 8772) !== 0 && i !== null ? (i.return = l,
                M = i) : ga(e)
        }
    }
    function ga(e) {
        for (; M !== null; ) {
            var n = M;
            if ((n.flags & 8772) !== 0) {
                var t = n.alternate;
                try {
                    if ((n.flags & 8772) !== 0)
                        switch (n.tag) {
                        case 0:
                        case 11:
                        case 15:
                            Be || yl(5, n);
                            break;
                        case 1:
                            var r = n.stateNode;
                            if (n.flags & 4 && !Be)
                                if (t === null)
                                    r.componentDidMount();
                                else {
                                    var l = n.elementType === n.type ? t.memoizedProps : mn(n.type, t.memoizedProps);
                                    r.componentDidUpdate(l, t.memoizedState, r.__reactInternalSnapshotBeforeUpdate)
                                }
                            var i = n.updateQueue;
                            i !== null && ys(n, i, r);
                            break;
                        case 3:
                            var u = n.updateQueue;
                            if (u !== null) {
                                if (t = null,
                                n.child !== null)
                                    switch (n.child.tag) {
                                    case 5:
                                        t = n.child.stateNode;
                                        break;
                                    case 1:
                                        t = n.child.stateNode
                                    }
                                ys(n, u, t)
                            }
                            break;
                        case 5:
                            var o = n.stateNode;
                            if (t === null && n.flags & 4) {
                                t = o;
                                var a = n.memoizedProps;
                                switch (n.type) {
                                case "button":
                                case "input":
                                case "select":
                                case "textarea":
                                    a.autoFocus && t.focus();
                                    break;
                                case "img":
                                    a.src && (t.src = a.src)
                                }
                            }
                            break;
                        case 6:
                            break;
                        case 4:
                            break;
                        case 12:
                            break;
                        case 13:
                            if (n.memoizedState === null) {
                                var v = n.alternate;
                                if (v !== null) {
                                    var x = v.memoizedState;
                                    if (x !== null) {
                                        var S = x.dehydrated;
                                        S !== null && Xt(S)
                                    }
                                }
                            }
                            break;
                        case 19:
                        case 17:
                        case 21:
                        case 22:
                        case 23:
                        case 25:
                            break;
                        default:
                            throw Error(m(163))
                        }
                    Be || n.flags & 512 && fu(n)
                } catch (k) {
                    Ne(n, n.return, k)
                }
            }
            if (n === e) {
                M = null;
                break
            }
            if (t = n.sibling,
            t !== null) {
                t.return = n.return,
                M = t;
                break
            }
            M = n.return
        }
    }
    function ya(e) {
        for (; M !== null; ) {
            var n = M;
            if (n === e) {
                M = null;
                break
            }
            var t = n.sibling;
            if (t !== null) {
                t.return = n.return,
                M = t;
                break
            }
            M = n.return
        }
    }
    function ka(e) {
        for (; M !== null; ) {
            var n = M;
            try {
                switch (n.tag) {
                case 0:
                case 11:
                case 15:
                    var t = n.return;
                    try {
                        yl(4, n)
                    } catch (a) {
                        Ne(n, t, a)
                    }
                    break;
                case 1:
                    var r = n.stateNode;
                    if (typeof r.componentDidMount == "function") {
                        var l = n.return;
                        try {
                            r.componentDidMount()
                        } catch (a) {
                            Ne(n, l, a)
                        }
                    }
                    var i = n.return;
                    try {
                        fu(n)
                    } catch (a) {
                        Ne(n, i, a)
                    }
                    break;
                case 5:
                    var u = n.return;
                    try {
                        fu(n)
                    } catch (a) {
                        Ne(n, u, a)
                    }
                }
            } catch (a) {
                Ne(n, n.return, a)
            }
            if (n === e) {
                M = null;
                break
            }
            var o = n.sibling;
            if (o !== null) {
                o.return = n.return,
                M = o;
                break
            }
            M = n.return
        }
    }
    var Nd = Math.ceil
      , kl = G.ReactCurrentDispatcher
      , mu = G.ReactCurrentOwner
      , an = G.ReactCurrentBatchConfig
      , re = 0
      , ze = null
      , Te = null
      , Oe = 0
      , rn = 0
      , Rt = An(0)
      , Le = 0
      , gr = null
      , ut = 0
      , xl = 0
      , vu = 0
      , yr = null
      , Xe = null
      , gu = 0
      , Dt = 1 / 0
      , zn = null
      , Sl = !1
      , yu = null
      , Kn = null
      , wl = !1
      , Yn = null
      , _l = 0
      , kr = 0
      , ku = null
      , Cl = -1
      , Nl = 0;
    function $e() {
        return (re & 6) !== 0 ? je() : Cl !== -1 ? Cl : Cl = je()
    }
    function Xn(e) {
        return (e.mode & 1) === 0 ? 1 : (re & 2) !== 0 && Oe !== 0 ? Oe & -Oe : sd.transition !== null ? (Nl === 0 && (Nl = fo()),
        Nl) : (e = de,
        e !== 0 || (e = window.event,
        e = e === void 0 ? 16 : So(e.type)),
        e)
    }
    function yn(e, n, t, r) {
        if (50 < kr)
            throw kr = 0,
            ku = null,
            Error(m(185));
        $t(e, t, r),
        ((re & 2) === 0 || e !== ze) && (e === ze && ((re & 2) === 0 && (xl |= t),
        Le === 4 && Gn(e, Oe)),
        Ge(e, r),
        t === 1 && re === 0 && (n.mode & 1) === 0 && (Dt = je() + 500,
        br && Hn()))
    }
    function Ge(e, n) {
        var t = e.callbackNode;
        sc(e, n);
        var r = Dr(e, e === ze ? Oe : 0);
        if (r === 0)
            t !== null && so(t),
            e.callbackNode = null,
            e.callbackPriority = 0;
        else if (n = r & -r,
        e.callbackPriority !== n) {
            if (t != null && so(t),
            n === 1)
                e.tag === 0 ? od(Sa.bind(null, e)) : us(Sa.bind(null, e)),
                rd(function() {
                    (re & 6) === 0 && Hn()
                }),
                t = null;
            else {
                switch (po(r)) {
                case 1:
                    t = Jl;
                    break;
                case 4:
                    t = ao;
                    break;
                case 16:
                    t = Lr;
                    break;
                case 536870912:
                    t = co;
                    break;
                default:
                    t = Lr
                }
                t = Pa(t, xa.bind(null, e))
            }
            e.callbackPriority = n,
            e.callbackNode = t
        }
    }
    function xa(e, n) {
        if (Cl = -1,
        Nl = 0,
        (re & 6) !== 0)
            throw Error(m(327));
        var t = e.callbackNode;
        if (Ot() && e.callbackNode !== t)
            return null;
        var r = Dr(e, e === ze ? Oe : 0);
        if (r === 0)
            return null;
        if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || n)
            n = jl(e, r);
        else {
            n = r;
            var l = re;
            re |= 2;
            var i = _a();
            (ze !== e || Oe !== n) && (zn = null,
            Dt = je() + 500,
            st(e, n));
            do
                try {
                    Td();
                    break
                } catch (o) {
                    wa(e, o)
                }
            while (!0);
            Fi(),
            kl.current = i,
            re = l,
            Te !== null ? n = 0 : (ze = null,
            Oe = 0,
            n = Le)
        }
        if (n !== 0) {
            if (n === 2 && (l = bl(e),
            l !== 0 && (r = l,
            n = xu(e, l))),
            n === 1)
                throw t = gr,
                st(e, 0),
                Gn(e, r),
                Ge(e, je()),
                t;
            if (n === 6)
                Gn(e, r);
            else {
                if (l = e.current.alternate,
                (r & 30) === 0 && !jd(l) && (n = jl(e, r),
                n === 2 && (i = bl(e),
                i !== 0 && (r = i,
                n = xu(e, i))),
                n === 1))
                    throw t = gr,
                    st(e, 0),
                    Gn(e, r),
                    Ge(e, je()),
                    t;
                switch (e.finishedWork = l,
                e.finishedLanes = r,
                n) {
                case 0:
                case 1:
                    throw Error(m(345));
                case 2:
                    at(e, Xe, zn);
                    break;
                case 3:
                    if (Gn(e, r),
                    (r & 130023424) === r && (n = gu + 500 - je(),
                    10 < n)) {
                        if (Dr(e, 0) !== 0)
                            break;
                        if (l = e.suspendedLanes,
                        (l & r) !== r) {
                            $e(),
                            e.pingedLanes |= e.suspendedLanes & l;
                            break
                        }
                        e.timeoutHandle = ji(at.bind(null, e, Xe, zn), n);
                        break
                    }
                    at(e, Xe, zn);
                    break;
                case 4:
                    if (Gn(e, r),
                    (r & 4194240) === r)
                        break;
                    for (n = e.eventTimes,
                    l = -1; 0 < r; ) {
                        var u = 31 - fn(r);
                        i = 1 << u,
                        u = n[u],
                        u > l && (l = u),
                        r &= ~i
                    }
                    if (r = l,
                    r = je() - r,
                    r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * Nd(r / 1960)) - r,
                    10 < r) {
                        e.timeoutHandle = ji(at.bind(null, e, Xe, zn), r);
                        break
                    }
                    at(e, Xe, zn);
                    break;
                case 5:
                    at(e, Xe, zn);
                    break;
                default:
                    throw Error(m(329))
                }
            }
        }
        return Ge(e, je()),
        e.callbackNode === t ? xa.bind(null, e) : null
    }
    function xu(e, n) {
        var t = yr;
        return e.current.memoizedState.isDehydrated && (st(e, n).flags |= 256),
        e = jl(e, n),
        e !== 2 && (n = Xe,
        Xe = t,
        n !== null && Su(n)),
        e
    }
    function Su(e) {
        Xe === null ? Xe = e : Xe.push.apply(Xe, e)
    }
    function jd(e) {
        for (var n = e; ; ) {
            if (n.flags & 16384) {
                var t = n.updateQueue;
                if (t !== null && (t = t.stores,
                t !== null))
                    for (var r = 0; r < t.length; r++) {
                        var l = t[r]
                          , i = l.getSnapshot;
                        l = l.value;
                        try {
                            if (!pn(i(), l))
                                return !1
                        } catch {
                            return !1
                        }
                    }
            }
            if (t = n.child,
            n.subtreeFlags & 16384 && t !== null)
                t.return = n,
                n = t;
            else {
                if (n === e)
                    break;
                for (; n.sibling === null; ) {
                    if (n.return === null || n.return === e)
                        return !0;
                    n = n.return
                }
                n.sibling.return = n.return,
                n = n.sibling
            }
        }
        return !0
    }
    function Gn(e, n) {
        for (n &= ~vu,
        n &= ~xl,
        e.suspendedLanes |= n,
        e.pingedLanes &= ~n,
        e = e.expirationTimes; 0 < n; ) {
            var t = 31 - fn(n)
              , r = 1 << t;
            e[t] = -1,
            n &= ~r
        }
    }
    function Sa(e) {
        if ((re & 6) !== 0)
            throw Error(m(327));
        Ot();
        var n = Dr(e, 0);
        if ((n & 1) === 0)
            return Ge(e, je()),
            null;
        var t = jl(e, n);
        if (e.tag !== 0 && t === 2) {
            var r = bl(e);
            r !== 0 && (n = r,
            t = xu(e, r))
        }
        if (t === 1)
            throw t = gr,
            st(e, 0),
            Gn(e, n),
            Ge(e, je()),
            t;
        if (t === 6)
            throw Error(m(345));
        return e.finishedWork = e.current.alternate,
        e.finishedLanes = n,
        at(e, Xe, zn),
        Ge(e, je()),
        null
    }
    function wu(e, n) {
        var t = re;
        re |= 1;
        try {
            return e(n)
        } finally {
            re = t,
            re === 0 && (Dt = je() + 500,
            br && Hn())
        }
    }
    function ot(e) {
        Yn !== null && Yn.tag === 0 && (re & 6) === 0 && Ot();
        var n = re;
        re |= 1;
        var t = an.transition
          , r = de;
        try {
            if (an.transition = null,
            de = 1,
            e)
                return e()
        } finally {
            de = r,
            an.transition = t,
            re = n,
            (re & 6) === 0 && Hn()
        }
    }
    function _u() {
        rn = Rt.current,
        ve(Rt)
    }
    function st(e, n) {
        e.finishedWork = null,
        e.finishedLanes = 0;
        var t = e.timeoutHandle;
        if (t !== -1 && (e.timeoutHandle = -1,
        td(t)),
        Te !== null)
            for (t = Te.return; t !== null; ) {
                var r = t;
                switch (zi(r),
                r.tag) {
                case 1:
                    r = r.type.childContextTypes,
                    r != null && Zr();
                    break;
                case 3:
                    Lt(),
                    ve(We),
                    ve(Ue),
                    Wi();
                    break;
                case 5:
                    $i(r);
                    break;
                case 4:
                    Lt();
                    break;
                case 13:
                    ve(Se);
                    break;
                case 19:
                    ve(Se);
                    break;
                case 10:
                    Ui(r.type._context);
                    break;
                case 22:
                case 23:
                    _u()
                }
                t = t.return
            }
        if (ze = e,
        Te = e = qn(e.current, null),
        Oe = rn = n,
        Le = 0,
        gr = null,
        vu = xl = ut = 0,
        Xe = yr = null,
        rt !== null) {
            for (n = 0; n < rt.length; n++)
                if (t = rt[n],
                r = t.interleaved,
                r !== null) {
                    t.interleaved = null;
                    var l = r.next
                      , i = t.pending;
                    if (i !== null) {
                        var u = i.next;
                        i.next = l,
                        r.next = u
                    }
                    t.pending = r
                }
            rt = null
        }
        return e
    }
    function wa(e, n) {
        do {
            var t = Te;
            try {
                if (Fi(),
                al.current = pl,
                cl) {
                    for (var r = we.memoizedState; r !== null; ) {
                        var l = r.queue;
                        l !== null && (l.pending = null),
                        r = r.next
                    }
                    cl = !1
                }
                if (it = 0,
                Me = Pe = we = null,
                dr = !1,
                fr = 0,
                mu.current = null,
                t === null || t.return === null) {
                    Le = 1,
                    gr = n,
                    Te = null;
                    break
                }
                e: {
                    var i = e
                      , u = t.return
                      , o = t
                      , a = n;
                    if (n = Oe,
                    o.flags |= 32768,
                    a !== null && typeof a == "object" && typeof a.then == "function") {
                        var v = a
                          , x = o
                          , S = x.tag;
                        if ((x.mode & 1) === 0 && (S === 0 || S === 11 || S === 15)) {
                            var k = x.alternate;
                            k ? (x.updateQueue = k.updateQueue,
                            x.memoizedState = k.memoizedState,
                            x.lanes = k.lanes) : (x.updateQueue = null,
                            x.memoizedState = null)
                        }
                        var L = Ys(u);
                        if (L !== null) {
                            L.flags &= -257,
                            Xs(L, u, o, i, n),
                            L.mode & 1 && Ks(i, v, n),
                            n = L,
                            a = v;
                            var z = n.updateQueue;
                            if (z === null) {
                                var D = new Set;
                                D.add(a),
                                n.updateQueue = D
                            } else
                                z.add(a);
                            break e
                        } else {
                            if ((n & 1) === 0) {
                                Ks(i, v, n),
                                Cu();
                                break e
                            }
                            a = Error(m(426))
                        }
                    } else if (ke && o.mode & 1) {
                        var Ee = Ys(u);
                        if (Ee !== null) {
                            (Ee.flags & 65536) === 0 && (Ee.flags |= 256),
                            Xs(Ee, u, o, i, n),
                            Oi(Mt(a, o));
                            break e
                        }
                    }
                    i = a = Mt(a, o),
                    Le !== 4 && (Le = 2),
                    yr === null ? yr = [i] : yr.push(i),
                    i = u;
                    do {
                        switch (i.tag) {
                        case 3:
                            i.flags |= 65536,
                            n &= -n,
                            i.lanes |= n;
                            var p = Qs(i, a, n);
                            gs(i, p);
                            break e;
                        case 1:
                            o = a;
                            var c = i.type
                              , h = i.stateNode;
                            if ((i.flags & 128) === 0 && (typeof c.getDerivedStateFromError == "function" || h !== null && typeof h.componentDidCatch == "function" && (Kn === null || !Kn.has(h)))) {
                                i.flags |= 65536,
                                n &= -n,
                                i.lanes |= n;
                                var _ = Ws(i, o, n);
                                gs(i, _);
                                break e
                            }
                        }
                        i = i.return
                    } while (i !== null)
                }
                Na(t)
            } catch (O) {
                n = O,
                Te === t && t !== null && (Te = t = t.return);
                continue
            }
            break
        } while (!0)
    }
    function _a() {
        var e = kl.current;
        return kl.current = pl,
        e === null ? pl : e
    }
    function Cu() {
        (Le === 0 || Le === 3 || Le === 2) && (Le = 4),
        ze === null || (ut & 268435455) === 0 && (xl & 268435455) === 0 || Gn(ze, Oe)
    }
    function jl(e, n) {
        var t = re;
        re |= 2;
        var r = _a();
        (ze !== e || Oe !== n) && (zn = null,
        st(e, n));
        do
            try {
                Ed();
                break
            } catch (l) {
                wa(e, l)
            }
        while (!0);
        if (Fi(),
        re = t,
        kl.current = r,
        Te !== null)
            throw Error(m(261));
        return ze = null,
        Oe = 0,
        Le
    }
    function Ed() {
        for (; Te !== null; )
            Ca(Te)
    }
    function Td() {
        for (; Te !== null && !ba(); )
            Ca(Te)
    }
    function Ca(e) {
        var n = Ta(e.alternate, e, rn);
        e.memoizedProps = e.pendingProps,
        n === null ? Na(e) : Te = n,
        mu.current = null
    }
    function Na(e) {
        var n = e;
        do {
            var t = n.alternate;
            if (e = n.return,
            (n.flags & 32768) === 0) {
                if (t = xd(t, n, rn),
                t !== null) {
                    Te = t;
                    return
                }
            } else {
                if (t = Sd(t, n),
                t !== null) {
                    t.flags &= 32767,
                    Te = t;
                    return
                }
                if (e !== null)
                    e.flags |= 32768,
                    e.subtreeFlags = 0,
                    e.deletions = null;
                else {
                    Le = 6,
                    Te = null;
                    return
                }
            }
            if (n = n.sibling,
            n !== null) {
                Te = n;
                return
            }
            Te = n = e
        } while (n !== null);
        Le === 0 && (Le = 5)
    }
    function at(e, n, t) {
        var r = de
          , l = an.transition;
        try {
            an.transition = null,
            de = 1,
            Pd(e, n, t, r)
        } finally {
            an.transition = l,
            de = r
        }
        return null
    }
    function Pd(e, n, t, r) {
        do
            Ot();
        while (Yn !== null);
        if ((re & 6) !== 0)
            throw Error(m(327));
        t = e.finishedWork;
        var l = e.finishedLanes;
        if (t === null)
            return null;
        if (e.finishedWork = null,
        e.finishedLanes = 0,
        t === e.current)
            throw Error(m(177));
        e.callbackNode = null,
        e.callbackPriority = 0;
        var i = t.lanes | t.childLanes;
        if (ac(e, i),
        e === ze && (Te = ze = null,
        Oe = 0),
        (t.subtreeFlags & 2064) === 0 && (t.flags & 2064) === 0 || wl || (wl = !0,
        Pa(Lr, function() {
            return Ot(),
            null
        })),
        i = (t.flags & 15990) !== 0,
        (t.subtreeFlags & 15990) !== 0 || i) {
            i = an.transition,
            an.transition = null;
            var u = de;
            de = 1;
            var o = re;
            re |= 4,
            mu.current = null,
            _d(e, t),
            ma(t, e),
            Gc(Ci),
            Fr = !!_i,
            Ci = _i = null,
            e.current = t,
            Cd(t),
            ec(),
            re = o,
            de = u,
            an.transition = i
        } else
            e.current = t;
        if (wl && (wl = !1,
        Yn = e,
        _l = l),
        i = e.pendingLanes,
        i === 0 && (Kn = null),
        rc(t.stateNode),
        Ge(e, je()),
        n !== null)
            for (r = e.onRecoverableError,
            t = 0; t < n.length; t++)
                l = n[t],
                r(l.value, {
                    componentStack: l.stack,
                    digest: l.digest
                });
        if (Sl)
            throw Sl = !1,
            e = yu,
            yu = null,
            e;
        return (_l & 1) !== 0 && e.tag !== 0 && Ot(),
        i = e.pendingLanes,
        (i & 1) !== 0 ? e === ku ? kr++ : (kr = 0,
        ku = e) : kr = 0,
        Hn(),
        null
    }
    function Ot() {
        if (Yn !== null) {
            var e = po(_l)
              , n = an.transition
              , t = de;
            try {
                if (an.transition = null,
                de = 16 > e ? 16 : e,
                Yn === null)
                    var r = !1;
                else {
                    if (e = Yn,
                    Yn = null,
                    _l = 0,
                    (re & 6) !== 0)
                        throw Error(m(331));
                    var l = re;
                    for (re |= 4,
                    M = e.current; M !== null; ) {
                        var i = M
                          , u = i.child;
                        if ((M.flags & 16) !== 0) {
                            var o = i.deletions;
                            if (o !== null) {
                                for (var a = 0; a < o.length; a++) {
                                    var v = o[a];
                                    for (M = v; M !== null; ) {
                                        var x = M;
                                        switch (x.tag) {
                                        case 0:
                                        case 11:
                                        case 15:
                                            vr(8, x, i)
                                        }
                                        var S = x.child;
                                        if (S !== null)
                                            S.return = x,
                                            M = S;
                                        else
                                            for (; M !== null; ) {
                                                x = M;
                                                var k = x.sibling
                                                  , L = x.return;
                                                if (ca(x),
                                                x === v) {
                                                    M = null;
                                                    break
                                                }
                                                if (k !== null) {
                                                    k.return = L,
                                                    M = k;
                                                    break
                                                }
                                                M = L
                                            }
                                    }
                                }
                                var z = i.alternate;
                                if (z !== null) {
                                    var D = z.child;
                                    if (D !== null) {
                                        z.child = null;
                                        do {
                                            var Ee = D.sibling;
                                            D.sibling = null,
                                            D = Ee
                                        } while (D !== null)
                                    }
                                }
                                M = i
                            }
                        }
                        if ((i.subtreeFlags & 2064) !== 0 && u !== null)
                            u.return = i,
                            M = u;
                        else
                            e: for (; M !== null; ) {
                                if (i = M,
                                (i.flags & 2048) !== 0)
                                    switch (i.tag) {
                                    case 0:
                                    case 11:
                                    case 15:
                                        vr(9, i, i.return)
                                    }
                                var p = i.sibling;
                                if (p !== null) {
                                    p.return = i.return,
                                    M = p;
                                    break e
                                }
                                M = i.return
                            }
                    }
                    var c = e.current;
                    for (M = c; M !== null; ) {
                        u = M;
                        var h = u.child;
                        if ((u.subtreeFlags & 2064) !== 0 && h !== null)
                            h.return = u,
                            M = h;
                        else
                            e: for (u = c; M !== null; ) {
                                if (o = M,
                                (o.flags & 2048) !== 0)
                                    try {
                                        switch (o.tag) {
                                        case 0:
                                        case 11:
                                        case 15:
                                            yl(9, o)
                                        }
                                    } catch (O) {
                                        Ne(o, o.return, O)
                                    }
                                if (o === u) {
                                    M = null;
                                    break e
                                }
                                var _ = o.sibling;
                                if (_ !== null) {
                                    _.return = o.return,
                                    M = _;
                                    break e
                                }
                                M = o.return
                            }
                    }
                    if (re = l,
                    Hn(),
                    xn && typeof xn.onPostCommitFiberRoot == "function")
                        try {
                            xn.onPostCommitFiberRoot(Mr, e)
                        } catch {}
                    r = !0
                }
                return r
            } finally {
                de = t,
                an.transition = n
            }
        }
        return !1
    }
    function ja(e, n, t) {
        n = Mt(t, n),
        n = Qs(e, n, 1),
        e = Qn(e, n, 1),
        n = $e(),
        e !== null && ($t(e, 1, n),
        Ge(e, n))
    }
    function Ne(e, n, t) {
        if (e.tag === 3)
            ja(e, e, t);
        else
            for (; n !== null; ) {
                if (n.tag === 3) {
                    ja(n, e, t);
                    break
                } else if (n.tag === 1) {
                    var r = n.stateNode;
                    if (typeof n.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Kn === null || !Kn.has(r))) {
                        e = Mt(t, e),
                        e = Ws(n, e, 1),
                        n = Qn(n, e, 1),
                        e = $e(),
                        n !== null && ($t(n, 1, e),
                        Ge(n, e));
                        break
                    }
                }
                n = n.return
            }
    }
    function Ld(e, n, t) {
        var r = e.pingCache;
        r !== null && r.delete(n),
        n = $e(),
        e.pingedLanes |= e.suspendedLanes & t,
        ze === e && (Oe & t) === t && (Le === 4 || Le === 3 && (Oe & 130023424) === Oe && 500 > je() - gu ? st(e, 0) : vu |= t),
        Ge(e, n)
    }
    function Ea(e, n) {
        n === 0 && ((e.mode & 1) === 0 ? n = 1 : (n = Rr,
        Rr <<= 1,
        (Rr & 130023424) === 0 && (Rr = 4194304)));
        var t = $e();
        e = Pn(e, n),
        e !== null && ($t(e, n, t),
        Ge(e, t))
    }
    function Md(e) {
        var n = e.memoizedState
          , t = 0;
        n !== null && (t = n.retryLane),
        Ea(e, t)
    }
    function zd(e, n) {
        var t = 0;
        switch (e.tag) {
        case 13:
            var r = e.stateNode
              , l = e.memoizedState;
            l !== null && (t = l.retryLane);
            break;
        case 19:
            r = e.stateNode;
            break;
        default:
            throw Error(m(314))
        }
        r !== null && r.delete(n),
        Ea(e, t)
    }
    var Ta;
    Ta = function(e, n, t) {
        if (e !== null)
            if (e.memoizedProps !== n.pendingProps || We.current)
                Ye = !0;
            else {
                if ((e.lanes & t) === 0 && (n.flags & 128) === 0)
                    return Ye = !1,
                    kd(e, n, t);
                Ye = (e.flags & 131072) !== 0
            }
        else
            Ye = !1,
            ke && (n.flags & 1048576) !== 0 && os(n, nl, n.index);
        switch (n.lanes = 0,
        n.tag) {
        case 2:
            var r = n.type;
            vl(e, n),
            e = n.pendingProps;
            var l = _t(n, Ue.current);
            Pt(n, t),
            l = Xi(null, n, r, e, l, t);
            var i = Gi();
            return n.flags |= 1,
            typeof l == "object" && l !== null && typeof l.render == "function" && l.$$typeof === void 0 ? (n.tag = 1,
            n.memoizedState = null,
            n.updateQueue = null,
            Ke(r) ? (i = !0,
            Jr(n)) : i = !1,
            n.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null,
            Bi(n),
            l.updater = hl,
            n.stateNode = l,
            l._reactInternals = n,
            nu(n, r, e, t),
            n = iu(null, n, r, !0, i, t)) : (n.tag = 0,
            ke && i && Mi(n),
            He(null, n, l, t),
            n = n.child),
            n;
        case 16:
            r = n.elementType;
            e: {
                switch (vl(e, n),
                e = n.pendingProps,
                l = r._init,
                r = l(r._payload),
                n.type = r,
                l = n.tag = Dd(r),
                e = mn(r, e),
                l) {
                case 0:
                    n = lu(null, n, r, e, t);
                    break e;
                case 1:
                    n = ea(null, n, r, e, t);
                    break e;
                case 11:
                    n = Gs(null, n, r, e, t);
                    break e;
                case 14:
                    n = qs(null, n, r, mn(r.type, e), t);
                    break e
                }
                throw Error(m(306, r, ""))
            }
            return n;
        case 0:
            return r = n.type,
            l = n.pendingProps,
            l = n.elementType === r ? l : mn(r, l),
            lu(e, n, r, l, t);
        case 1:
            return r = n.type,
            l = n.pendingProps,
            l = n.elementType === r ? l : mn(r, l),
            ea(e, n, r, l, t);
        case 3:
            e: {
                if (na(n),
                e === null)
                    throw Error(m(387));
                r = n.pendingProps,
                i = n.memoizedState,
                l = i.element,
                vs(e, n),
                ol(n, r, null, t);
                var u = n.memoizedState;
                if (r = u.element,
                i.isDehydrated)
                    if (i = {
                        element: r,
                        isDehydrated: !1,
                        cache: u.cache,
                        pendingSuspenseBoundaries: u.pendingSuspenseBoundaries,
                        transitions: u.transitions
                    },
                    n.updateQueue.baseState = i,
                    n.memoizedState = i,
                    n.flags & 256) {
                        l = Mt(Error(m(423)), n),
                        n = ta(e, n, r, t, l);
                        break e
                    } else if (r !== l) {
                        l = Mt(Error(m(424)), n),
                        n = ta(e, n, r, t, l);
                        break e
                    } else
                        for (tn = Vn(n.stateNode.containerInfo.firstChild),
                        nn = n,
                        ke = !0,
                        hn = null,
                        t = hs(n, null, r, t),
                        n.child = t; t; )
                            t.flags = t.flags & -3 | 4096,
                            t = t.sibling;
                else {
                    if (jt(),
                    r === l) {
                        n = Mn(e, n, t);
                        break e
                    }
                    He(e, n, r, t)
                }
                n = n.child
            }
            return n;
        case 5:
            return ks(n),
            e === null && Di(n),
            r = n.type,
            l = n.pendingProps,
            i = e !== null ? e.memoizedProps : null,
            u = l.children,
            Ni(r, l) ? u = null : i !== null && Ni(r, i) && (n.flags |= 32),
            bs(e, n),
            He(e, n, u, t),
            n.child;
        case 6:
            return e === null && Di(n),
            null;
        case 13:
            return ra(e, n, t);
        case 4:
            return Hi(n, n.stateNode.containerInfo),
            r = n.pendingProps,
            e === null ? n.child = Et(n, null, r, t) : He(e, n, r, t),
            n.child;
        case 11:
            return r = n.type,
            l = n.pendingProps,
            l = n.elementType === r ? l : mn(r, l),
            Gs(e, n, r, l, t);
        case 7:
            return He(e, n, n.pendingProps, t),
            n.child;
        case 8:
            return He(e, n, n.pendingProps.children, t),
            n.child;
        case 12:
            return He(e, n, n.pendingProps.children, t),
            n.child;
        case 10:
            e: {
                if (r = n.type._context,
                l = n.pendingProps,
                i = n.memoizedProps,
                u = l.value,
                pe(ll, r._currentValue),
                r._currentValue = u,
                i !== null)
                    if (pn(i.value, u)) {
                        if (i.children === l.children && !We.current) {
                            n = Mn(e, n, t);
                            break e
                        }
                    } else
                        for (i = n.child,
                        i !== null && (i.return = n); i !== null; ) {
                            var o = i.dependencies;
                            if (o !== null) {
                                u = i.child;
                                for (var a = o.firstContext; a !== null; ) {
                                    if (a.context === r) {
                                        if (i.tag === 1) {
                                            a = Ln(-1, t & -t),
                                            a.tag = 2;
                                            var v = i.updateQueue;
                                            if (v !== null) {
                                                v = v.shared;
                                                var x = v.pending;
                                                x === null ? a.next = a : (a.next = x.next,
                                                x.next = a),
                                                v.pending = a
                                            }
                                        }
                                        i.lanes |= t,
                                        a = i.alternate,
                                        a !== null && (a.lanes |= t),
                                        Vi(i.return, t, n),
                                        o.lanes |= t;
                                        break
                                    }
                                    a = a.next
                                }
                            } else if (i.tag === 10)
                                u = i.type === n.type ? null : i.child;
                            else if (i.tag === 18) {
                                if (u = i.return,
                                u === null)
                                    throw Error(m(341));
                                u.lanes |= t,
                                o = u.alternate,
                                o !== null && (o.lanes |= t),
                                Vi(u, t, n),
                                u = i.sibling
                            } else
                                u = i.child;
                            if (u !== null)
                                u.return = i;
                            else
                                for (u = i; u !== null; ) {
                                    if (u === n) {
                                        u = null;
                                        break
                                    }
                                    if (i = u.sibling,
                                    i !== null) {
                                        i.return = u.return,
                                        u = i;
                                        break
                                    }
                                    u = u.return
                                }
                            i = u
                        }
                He(e, n, l.children, t),
                n = n.child
            }
            return n;
        case 9:
            return l = n.type,
            r = n.pendingProps.children,
            Pt(n, t),
            l = on(l),
            r = r(l),
            n.flags |= 1,
            He(e, n, r, t),
            n.child;
        case 14:
            return r = n.type,
            l = mn(r, n.pendingProps),
            l = mn(r.type, l),
            qs(e, n, r, l, t);
        case 15:
            return Zs(e, n, n.type, n.pendingProps, t);
        case 17:
            return r = n.type,
            l = n.pendingProps,
            l = n.elementType === r ? l : mn(r, l),
            vl(e, n),
            n.tag = 1,
            Ke(r) ? (e = !0,
            Jr(n)) : e = !1,
            Pt(n, t),
            Hs(n, r, l),
            nu(n, r, l, t),
            iu(null, n, r, !0, e, t);
        case 19:
            return ia(e, n, t);
        case 22:
            return Js(e, n, t)
        }
        throw Error(m(156, n.tag))
    }
    ;
    function Pa(e, n) {
        return oo(e, n)
    }
    function Rd(e, n, t, r) {
        this.tag = e,
        this.key = t,
        this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null,
        this.index = 0,
        this.ref = null,
        this.pendingProps = n,
        this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null,
        this.mode = r,
        this.subtreeFlags = this.flags = 0,
        this.deletions = null,
        this.childLanes = this.lanes = 0,
        this.alternate = null
    }
    function cn(e, n, t, r) {
        return new Rd(e,n,t,r)
    }
    function Nu(e) {
        return e = e.prototype,
        !(!e || !e.isReactComponent)
    }
    function Dd(e) {
        if (typeof e == "function")
            return Nu(e) ? 1 : 0;
        if (e != null) {
            if (e = e.$$typeof,
            e === Je)
                return 11;
            if (e === Z)
                return 14
        }
        return 2
    }
    function qn(e, n) {
        var t = e.alternate;
        return t === null ? (t = cn(e.tag, n, e.key, e.mode),
        t.elementType = e.elementType,
        t.type = e.type,
        t.stateNode = e.stateNode,
        t.alternate = e,
        e.alternate = t) : (t.pendingProps = n,
        t.type = e.type,
        t.flags = 0,
        t.subtreeFlags = 0,
        t.deletions = null),
        t.flags = e.flags & 14680064,
        t.childLanes = e.childLanes,
        t.lanes = e.lanes,
        t.child = e.child,
        t.memoizedProps = e.memoizedProps,
        t.memoizedState = e.memoizedState,
        t.updateQueue = e.updateQueue,
        n = e.dependencies,
        t.dependencies = n === null ? null : {
            lanes: n.lanes,
            firstContext: n.firstContext
        },
        t.sibling = e.sibling,
        t.index = e.index,
        t.ref = e.ref,
        t
    }
    function El(e, n, t, r, l, i) {
        var u = 2;
        if (r = e,
        typeof e == "function")
            Nu(e) && (u = 1);
        else if (typeof e == "string")
            u = 5;
        else
            e: switch (e) {
            case $:
                return ct(t.children, l, i, n);
            case ee:
                u = 8,
                l |= 8;
                break;
            case Ie:
                return e = cn(12, t, n, l | 2),
                e.elementType = Ie,
                e.lanes = i,
                e;
            case Fe:
                return e = cn(13, t, n, l),
                e.elementType = Fe,
                e.lanes = i,
                e;
            case j:
                return e = cn(19, t, n, l),
                e.elementType = j,
                e.lanes = i,
                e;
            case ae:
                return Tl(t, l, i, n);
            default:
                if (typeof e == "object" && e !== null)
                    switch (e.$$typeof) {
                    case Qe:
                        u = 10;
                        break e;
                    case kn:
                        u = 9;
                        break e;
                    case Je:
                        u = 11;
                        break e;
                    case Z:
                        u = 14;
                        break e;
                    case se:
                        u = 16,
                        r = null;
                        break e
                    }
                throw Error(m(130, e == null ? e : typeof e, ""))
            }
        return n = cn(u, t, n, l),
        n.elementType = e,
        n.type = r,
        n.lanes = i,
        n
    }
    function ct(e, n, t, r) {
        return e = cn(7, e, r, n),
        e.lanes = t,
        e
    }
    function Tl(e, n, t, r) {
        return e = cn(22, e, r, n),
        e.elementType = ae,
        e.lanes = t,
        e.stateNode = {
            isHidden: !1
        },
        e
    }
    function ju(e, n, t) {
        return e = cn(6, e, null, n),
        e.lanes = t,
        e
    }
    function Eu(e, n, t) {
        return n = cn(4, e.children !== null ? e.children : [], e.key, n),
        n.lanes = t,
        n.stateNode = {
            containerInfo: e.containerInfo,
            pendingChildren: null,
            implementation: e.implementation
        },
        n
    }
    function Od(e, n, t, r, l) {
        this.tag = n,
        this.containerInfo = e,
        this.finishedWork = this.pingCache = this.current = this.pendingChildren = null,
        this.timeoutHandle = -1,
        this.callbackNode = this.pendingContext = this.context = null,
        this.callbackPriority = 0,
        this.eventTimes = ei(0),
        this.expirationTimes = ei(-1),
        this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0,
        this.entanglements = ei(0),
        this.identifierPrefix = r,
        this.onRecoverableError = l,
        this.mutableSourceEagerHydrationData = null
    }
    function Tu(e, n, t, r, l, i, u, o, a) {
        return e = new Od(e,n,t,o,a),
        n === 1 ? (n = 1,
        i === !0 && (n |= 8)) : n = 0,
        i = cn(3, null, null, n),
        e.current = i,
        i.stateNode = e,
        i.memoizedState = {
            element: r,
            isDehydrated: t,
            cache: null,
            transitions: null,
            pendingSuspenseBoundaries: null
        },
        Bi(i),
        e
    }
    function Id(e, n, t) {
        var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
        return {
            $$typeof: Ce,
            key: r == null ? null : "" + r,
            children: e,
            containerInfo: n,
            implementation: t
        }
    }
    function La(e) {
        if (!e)
            return Bn;
        e = e._reactInternals;
        e: {
            if (Jn(e) !== e || e.tag !== 1)
                throw Error(m(170));
            var n = e;
            do {
                switch (n.tag) {
                case 3:
                    n = n.stateNode.context;
                    break e;
                case 1:
                    if (Ke(n.type)) {
                        n = n.stateNode.__reactInternalMemoizedMergedChildContext;
                        break e
                    }
                }
                n = n.return
            } while (n !== null);
            throw Error(m(171))
        }
        if (e.tag === 1) {
            var t = e.type;
            if (Ke(t))
                return ls(e, t, n)
        }
        return n
    }
    function Ma(e, n, t, r, l, i, u, o, a) {
        return e = Tu(t, r, !0, e, l, i, u, o, a),
        e.context = La(null),
        t = e.current,
        r = $e(),
        l = Xn(t),
        i = Ln(r, l),
        i.callback = n ?? null,
        Qn(t, i, l),
        e.current.lanes = l,
        $t(e, l, r),
        Ge(e, r),
        e
    }
    function Pl(e, n, t, r) {
        var l = n.current
          , i = $e()
          , u = Xn(l);
        return t = La(t),
        n.context === null ? n.context = t : n.pendingContext = t,
        n = Ln(i, u),
        n.payload = {
            element: e
        },
        r = r === void 0 ? null : r,
        r !== null && (n.callback = r),
        e = Qn(l, n, u),
        e !== null && (yn(e, l, u, i),
        ul(e, l, u)),
        u
    }
    function Ll(e) {
        if (e = e.current,
        !e.child)
            return null;
        switch (e.child.tag) {
        case 5:
            return e.child.stateNode;
        default:
            return e.child.stateNode
        }
    }
    function za(e, n) {
        if (e = e.memoizedState,
        e !== null && e.dehydrated !== null) {
            var t = e.retryLane;
            e.retryLane = t !== 0 && t < n ? t : n
        }
    }
    function Pu(e, n) {
        za(e, n),
        (e = e.alternate) && za(e, n)
    }
    function Fd() {
        return null
    }
    var Ra = typeof reportError == "function" ? reportError : function(e) {
        console.error(e)
    }
    ;
    function Lu(e) {
        this._internalRoot = e
    }
    Ml.prototype.render = Lu.prototype.render = function(e) {
        var n = this._internalRoot;
        if (n === null)
            throw Error(m(409));
        Pl(e, n, null, null)
    }
    ,
    Ml.prototype.unmount = Lu.prototype.unmount = function() {
        var e = this._internalRoot;
        if (e !== null) {
            this._internalRoot = null;
            var n = e.containerInfo;
            ot(function() {
                Pl(null, e, null, null)
            }),
            n[Nn] = null
        }
    }
    ;
    function Ml(e) {
        this._internalRoot = e
    }
    Ml.prototype.unstable_scheduleHydration = function(e) {
        if (e) {
            var n = vo();
            e = {
                blockedOn: null,
                target: e,
                priority: n
            };
            for (var t = 0; t < In.length && n !== 0 && n < In[t].priority; t++)
                ;
            In.splice(t, 0, e),
            t === 0 && ko(e)
        }
    }
    ;
    function Mu(e) {
        return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11)
    }
    function zl(e) {
        return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
    }
    function Da() {}
    function Ud(e, n, t, r, l) {
        if (l) {
            if (typeof r == "function") {
                var i = r;
                r = function() {
                    var v = Ll(u);
                    i.call(v)
                }
            }
            var u = Ma(n, r, e, 0, null, !1, !1, "", Da);
            return e._reactRootContainer = u,
            e[Nn] = u.current,
            rr(e.nodeType === 8 ? e.parentNode : e),
            ot(),
            u
        }
        for (; l = e.lastChild; )
            e.removeChild(l);
        if (typeof r == "function") {
            var o = r;
            r = function() {
                var v = Ll(a);
                o.call(v)
            }
        }
        var a = Tu(e, 0, !1, null, null, !1, !1, "", Da);
        return e._reactRootContainer = a,
        e[Nn] = a.current,
        rr(e.nodeType === 8 ? e.parentNode : e),
        ot(function() {
            Pl(n, a, t, r)
        }),
        a
    }
    function Rl(e, n, t, r, l) {
        var i = t._reactRootContainer;
        if (i) {
            var u = i;
            if (typeof l == "function") {
                var o = l;
                l = function() {
                    var a = Ll(u);
                    o.call(a)
                }
            }
            Pl(n, u, e, l)
        } else
            u = Ud(t, n, e, l, r);
        return Ll(u)
    }
    ho = function(e) {
        switch (e.tag) {
        case 3:
            var n = e.stateNode;
            if (n.current.memoizedState.isDehydrated) {
                var t = Ht(n.pendingLanes);
                t !== 0 && (ni(n, t | 1),
                Ge(n, je()),
                (re & 6) === 0 && (Dt = je() + 500,
                Hn()))
            }
            break;
        case 13:
            ot(function() {
                var r = Pn(e, 1);
                if (r !== null) {
                    var l = $e();
                    yn(r, e, 1, l)
                }
            }),
            Pu(e, 1)
        }
    }
    ,
    ti = function(e) {
        if (e.tag === 13) {
            var n = Pn(e, 134217728);
            if (n !== null) {
                var t = $e();
                yn(n, e, 134217728, t)
            }
            Pu(e, 134217728)
        }
    }
    ,
    mo = function(e) {
        if (e.tag === 13) {
            var n = Xn(e)
              , t = Pn(e, n);
            if (t !== null) {
                var r = $e();
                yn(t, e, n, r)
            }
            Pu(e, n)
        }
    }
    ,
    vo = function() {
        return de
    }
    ,
    go = function(e, n) {
        var t = de;
        try {
            return de = e,
            n()
        } finally {
            de = t
        }
    }
    ,
    Xl = function(e, n, t) {
        switch (n) {
        case "input":
            if (Al(e, t),
            n = t.name,
            t.type === "radio" && n != null) {
                for (t = e; t.parentNode; )
                    t = t.parentNode;
                for (t = t.querySelectorAll("input[name=" + JSON.stringify("" + n) + '][type="radio"]'),
                n = 0; n < t.length; n++) {
                    var r = t[n];
                    if (r !== e && r.form === e.form) {
                        var l = qr(r);
                        if (!l)
                            throw Error(m(90));
                        Au(r),
                        Al(r, l)
                    }
                }
            }
            break;
        case "textarea":
            Wu(e, t);
            break;
        case "select":
            n = t.value,
            n != null && dt(e, !!t.multiple, n, !1)
        }
    }
    ,
    eo = wu,
    no = ot;
    var Vd = {
        usingClientEntryPoint: !1,
        Events: [ur, St, qr, Ju, bu, wu]
    }
      , xr = {
        findFiberByHostInstance: bn,
        bundleType: 0,
        version: "18.3.1",
        rendererPackageName: "react-dom"
    }
      , Ad = {
        bundleType: xr.bundleType,
        version: xr.version,
        rendererPackageName: xr.rendererPackageName,
        rendererConfig: xr.rendererConfig,
        overrideHookState: null,
        overrideHookStateDeletePath: null,
        overrideHookStateRenamePath: null,
        overrideProps: null,
        overridePropsDeletePath: null,
        overridePropsRenamePath: null,
        setErrorHandler: null,
        setSuspenseHandler: null,
        scheduleUpdate: null,
        currentDispatcherRef: G.ReactCurrentDispatcher,
        findHostInstanceByFiber: function(e) {
            return e = io(e),
            e === null ? null : e.stateNode
        },
        findFiberByHostInstance: xr.findFiberByHostInstance || Fd,
        findHostInstancesForRefresh: null,
        scheduleRefresh: null,
        scheduleRoot: null,
        setRefreshHandler: null,
        getCurrentFiber: null,
        reconcilerVersion: "18.3.1-next-f1338f8080-20240426"
    };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
        var Dl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!Dl.isDisabled && Dl.supportsFiber)
            try {
                Mr = Dl.inject(Ad),
                xn = Dl
            } catch {}
    }
    return qe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Vd,
    qe.createPortal = function(e, n) {
        var t = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
        if (!Mu(n))
            throw Error(m(200));
        return Id(e, n, null, t)
    }
    ,
    qe.createRoot = function(e, n) {
        if (!Mu(e))
            throw Error(m(299));
        var t = !1
          , r = ""
          , l = Ra;
        return n != null && (n.unstable_strictMode === !0 && (t = !0),
        n.identifierPrefix !== void 0 && (r = n.identifierPrefix),
        n.onRecoverableError !== void 0 && (l = n.onRecoverableError)),
        n = Tu(e, 1, !1, null, null, t, !1, r, l),
        e[Nn] = n.current,
        rr(e.nodeType === 8 ? e.parentNode : e),
        new Lu(n)
    }
    ,
    qe.findDOMNode = function(e) {
        if (e == null)
            return null;
        if (e.nodeType === 1)
            return e;
        var n = e._reactInternals;
        if (n === void 0)
            throw typeof e.render == "function" ? Error(m(188)) : (e = Object.keys(e).join(","),
            Error(m(268, e)));
        return e = io(n),
        e = e === null ? null : e.stateNode,
        e
    }
    ,
    qe.flushSync = function(e) {
        return ot(e)
    }
    ,
    qe.hydrate = function(e, n, t) {
        if (!zl(n))
            throw Error(m(200));
        return Rl(null, e, n, !0, t)
    }
    ,
    qe.hydrateRoot = function(e, n, t) {
        if (!Mu(e))
            throw Error(m(405));
        var r = t != null && t.hydratedSources || null
          , l = !1
          , i = ""
          , u = Ra;
        if (t != null && (t.unstable_strictMode === !0 && (l = !0),
        t.identifierPrefix !== void 0 && (i = t.identifierPrefix),
        t.onRecoverableError !== void 0 && (u = t.onRecoverableError)),
        n = Ma(n, null, e, 1, t ?? null, l, !1, i, u),
        e[Nn] = n.current,
        rr(e),
        r)
            for (e = 0; e < r.length; e++)
                t = r[e],
                l = t._getVersion,
                l = l(t._source),
                n.mutableSourceEagerHydrationData == null ? n.mutableSourceEagerHydrationData = [t, l] : n.mutableSourceEagerHydrationData.push(t, l);
        return new Ml(n)
    }
    ,
    qe.render = function(e, n, t) {
        if (!zl(n))
            throw Error(m(200));
        return Rl(null, e, n, !1, t)
    }
    ,
    qe.unmountComponentAtNode = function(e) {
        if (!zl(e))
            throw Error(m(40));
        return e._reactRootContainer ? (ot(function() {
            Rl(null, null, e, !1, function() {
                e._reactRootContainer = null,
                e[Nn] = null
            })
        }),
        !0) : !1
    }
    ,
    qe.unstable_batchedUpdates = wu,
    qe.unstable_renderSubtreeIntoContainer = function(e, n, t, r) {
        if (!zl(t))
            throw Error(m(200));
        if (e == null || e._reactInternals === void 0)
            throw Error(m(38));
        return Rl(e, n, t, !1, r)
    }
    ,
    qe.version = "18.3.1-next-f1338f8080-20240426",
    qe
}
var Ha;
function qd() {
    if (Ha)
        return Du.exports;
    Ha = 1;
    function g() {
        if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
            try {
                __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(g)
            } catch (f) {
                console.error(f)
            }
    }
    return g(),
    Du.exports = Gd(),
    Du.exports
}
var $a;
function Zd() {
    if ($a)
        return Ol;
    $a = 1;
    var g = qd();
    return Ol.createRoot = g.createRoot,
    Ol.hydrateRoot = g.hydrateRoot,
    Ol
}
var Jd = Zd();
const Qa = {
    cancelled: 1,
    newCode: 2,
    notMain: 4,
    notRecommendedMain: 8,
    needSpecific: 16,
    deathOnly: 32,
    femaleOnly: 64,
    maleOnly: 128,
    dagger: 256,
    star: 512
}
  , Fl = [{
    key: "cancelled",
    label: "Mã bị hủy",
    color: "#dc2626",
    tip: "Có trong QĐ 4469 nhưng không còn trong TT06/2026"
}, {
    key: "newCode",
    label: "Mã mới TT06",
    color: "#2563eb",
    tip: "Mã bổ sung mới theo PL5"
}, {
    key: "notMain",
    label: "Không dùng bệnh chính",
    color: "#b91c1c",
    tip: "Không được dùng làm bệnh chính"
}, {
    key: "notRecommendedMain",
    label: "Không khuyến khích",
    color: "#d97706",
    tip: "Không khuyến khích dùng làm bệnh chính"
}, {
    key: "needSpecific",
    label: "Có mã cụ thể hơn",
    color: "#7c3aed",
    tip: "Cần chọn mã 4/5 ký tự cụ thể hơn"
}, {
    key: "deathOnly",
    label: "Chỉ tử vong",
    color: "#334155",
    tip: "Chỉ sử dụng mã hóa nguyên nhân tử vong"
}, {
    key: "femaleOnly",
    label: "Chỉ nữ",
    color: "#db2777",
    tip: "Lấy đúng từ cột nữ giới trong phụ lục TT06"
}, {
    key: "maleOnly",
    label: "Chỉ nam",
    color: "#0284c7",
    tip: "Lấy đúng từ cột nam giới trong phụ lục TT06"
}, {
    key: "dagger",
    label: "Căn nguyên †",
    color: "#059669",
    tip: "Mã có dấu găm †"
}, {
    key: "star",
    label: "Biểu hiện *",
    color: "#0891b2",
    tip: "Mã có dấu sao *"
}]
  , _e = (g, f) => !!(g[9] & Qa[f])
  , bd = g => String((g == null ? void 0 : g[0]) || "");
function Wa(g) {
    return String(g || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
}
function Ze(g) {
    return Wa(g).toLowerCase().replace(/\s+/g, " ").trim()
}
function dn(g) {
    return Wa(g).toUpperCase().replace(/[^A-Z0-9]/g, "")
}
function ef(g) {
    const f = String((g == null ? void 0 : g[0]) || "").toUpperCase()
      , m = Ze([g == null ? void 0 : g[2], g == null ? void 0 : g[3], g == null ? void 0 : g[4]].join(" "))
      , I = [];
    return (f === "I10" || m.includes("tang huyet ap")) && I.push("cao huyet ap tang xong tang ha tang ap"),
    (f.startsWith("R10") || m.includes("dau bung")) && I.push("dau bung dau vung bung abdominal pain"),
    (f.startsWith("E11") || m.includes("dai thao duong")) && I.push("tieu duong diabetes duong huyet"),
    (f.startsWith("J02") || f.startsWith("J03") || m.includes("viem hong") || m.includes("viem amidan")) && I.push("dau hong sore throat amidan"),
    (f.startsWith("J06") || m.includes("nhiem trung ho hap tren")) && I.push("cam cum viem mui hong ho sot"),
    (f.startsWith("A09") || m.includes("tieu chay")) && I.push("dau bung tieu chay roi loan tieu hoa"),
    I.join(" ")
}
function Vu(g, f=160) {
    const [m,I] = H.useState(g);
    return H.useEffect( () => {
        const w = setTimeout( () => I(g), f);
        return () => clearTimeout(w)
    }
    , [g, f]),
    m
}
async function wr(g) {
    const f = await fetch(g, {
        cache: "force-cache"
    });
    if (!f.ok)
        throw new Error(`Không tải được ${g}`);
    return f.json()
}
function Cr(g, f) {
    var m;
    (m = navigator.clipboard) == null || m.writeText(g).then( () => {
        f(g),
        setTimeout( () => f(""), 900)
    }
    )
}
function Ul(g) {
    return !_e(g, "cancelled") && !_e(g, "deathOnly") && !_e(g, "notMain")
}
function _r(g) {
    return Ul(g) && !_e(g, "needSpecific") && !_e(g, "notRecommendedMain")
}
function nf(g) {
    return _e(g, "cancelled") ? {
        level: "danger",
        label: "Mã bị hủy - không sử dụng",
        detail: "Mã này có trong QĐ 4469 nhưng không còn trong TT06/2026."
    } : _e(g, "deathOnly") ? {
        level: "danger",
        label: "Chỉ dùng mã hóa nguyên nhân tử vong",
        detail: "Không dùng để mã hóa bệnh tật trong khám chữa bệnh thông thường."
    } : _e(g, "notMain") ? {
        level: "danger",
        label: "Không dùng làm bệnh chính",
        detail: tf(g)
    } : _e(g, "needSpecific") ? {
        level: "warn",
        label: "Cần chọn mã cụ thể hơn",
        detail: "Không nên dùng mã nhóm nếu đã có mã 4/5 ký tự phù hợp với hồ sơ."
    } : _e(g, "notRecommendedMain") ? {
        level: "warn",
        label: "Không khuyến khích dùng làm bệnh chính",
        detail: "Nên xem lại chẩn đoán và chọn mã phù hợp hơn nếu có căn cứ."
    } : {
        level: "ok",
        label: "Có thể dùng làm bệnh chính",
        detail: "Vẫn cần đối chiếu chẩn đoán thực tế và hồ sơ bệnh án."
    }
}
function tf(g) {
    const f = bd(g);
    return /^B9[5-8]/.test(f) ? "Nhóm B95-B98 thường là mã bổ sung để ghi tác nhân gây bệnh. Hãy chọn bệnh/nhiễm khuẩn chính ở chương tương ứng, sau đó thêm B95-B98 nếu cần ghi tác nhân." : _e(g, "star") ? "Mã có dấu * thường là mã biểu hiện. Cần xem mã căn nguyên tương ứng trước khi dùng." : /^[VWXY]/.test(f) ? "Mã Chương XX thể hiện nguyên nhân bên ngoài, thường dùng bổ sung cho chấn thương/ngộ độc, không thay thế bệnh chính." : /^Z/.test(f) ? "Mã Z thường thể hiện yếu tố liên quan tình trạng sức khỏe/tiếp cận dịch vụ, cần cân nhắc ngữ cảnh trước khi dùng bệnh chính." : "Mã này không dùng làm bệnh chính. Hãy chọn bệnh/chẩn đoán chính phù hợp hơn, sau đó dùng mã này như mã bổ sung nếu hướng dẫn yêu cầu."
}
const Il = ({text: g}) => s.jsxs("section", {
    className: "icd-search-panel fast-loading-box",
    children: [s.jsx("div", {
        className: "fast-spinner"
    }), s.jsxs("div", {
        children: [s.jsx("b", {
            children: g
        }), s.jsx("p", {
            children: "Giao diện đã mở trước, dữ liệu đang được nạp nền. Lần sau trình duyệt sẽ cache nên nhanh hơn."
        })]
    })]
})
  , rf = ({row: g}) => {
    const f = nf(g);
    return s.jsxs("div", {
        className: `usage-banner ${f.level}`,
        children: [s.jsx("b", {
            children: f.label
        }), s.jsx("span", {
            children: f.detail
        })]
    })
}
;
function lf(g) {
    const f = []
      , m = []
      , I = [];
    for (const w of g)
        _r(w) ? f.push(w) : Ul(w) ? m.push(w) : I.push(w);
    return {
        usable: f,
        caution: m,
        notMain: I
    }
}
function Fu({title: g, rows: f, variant: m, onUseCode: I}) {
    return f != null && f.length ? s.jsxs("details", {
        className: `icd-children ${m}`,
        open: m === "usable",
        children: [s.jsxs("summary", {
            children: [g, " (", f.length, ")"]
        }), s.jsx("div", {
            className: "icd-child-list",
            children: f.slice(0, 80).map(w => s.jsxs("button", {
                onClick: () => I == null ? void 0 : I(w[0]),
                children: [s.jsx("code", {
                    children: w[0]
                }), s.jsx("span", {
                    children: w[2]
                })]
            }, w[0]))
        })]
    }) : null
}
const uf = H.memo(function({row: f, childMap: m, onUseCode: I}) {
    const [w,R] = H.useState("")
      , Y = Fl.filter(P => _e(f, P.key))
      , W = f[1].length === 3 ? m.get(f[1]) || [] : []
      , C = lf(W)
      , K = `${f[0]} - ${f[2]}`;
    return s.jsxs("article", {
        className: `icd-card ${_e(f, "cancelled") ? "is-cancelled" : ""}`,
        children: [s.jsxs("div", {
            className: "icd-card-top",
            children: [s.jsx("div", {
                className: "icd-code",
                children: f[0]
            }), s.jsxs("div", {
                className: "icd-card-actions",
                children: [s.jsx("button", {
                    className: w === f[0] ? "copy ok" : "copy",
                    onClick: () => Cr(f[0], R),
                    children: w === f[0] ? "Đã copy" : "Copy mã"
                }), s.jsx("button", {
                    className: w === K ? "copy ok" : "copy",
                    onClick: () => Cr(K, R),
                    children: w === K ? "Đã copy" : "Copy mã + tên"
                }), s.jsx("button", {
                    className: "copy",
                    onClick: () => I == null ? void 0 : I(f[0]),
                    children: "Dùng mã"
                })]
            })]
        }), s.jsx("h3", {
            children: f[2]
        }), f[3] ? s.jsx("div", {
            className: "icd-en",
            children: f[3]
        }) : null, s.jsx(rf, {
            row: f
        }), s.jsxs("div", {
            className: "icd-meta",
            children: [f[5] ? s.jsx("span", {
                children: f[5]
            }) : null, f[6] ? s.jsx("span", {
                children: f[6]
            }) : null, f[8] ? s.jsx("span", {
                children: f[8]
            }) : null]
        }), Y.length ? s.jsx("div", {
            className: "icd-badges",
            children: Y.map(P => s.jsx("span", {
                className: "icd-badge",
                style: {
                    "--c": P.color
                },
                title: P.tip,
                children: P.label
            }, P.key))
        }) : null, f[4] ? s.jsxs("details", {
            className: "icd-note",
            children: [s.jsx("summary", {
                children: "Hướng dẫn / ghi chú mã hóa"
            }), s.jsx("div", {
                children: f[4]
            })]
        }) : null, s.jsx(Fu, {
            title: "Gợi ý mã cụ thể hơn có thể dùng làm bệnh chính",
            rows: C.usable,
            variant: "usable",
            onUseCode: I
        }), s.jsx(Fu, {
            title: "Mã cụ thể hơn cần chú ý trước khi dùng bệnh chính",
            rows: C.caution,
            variant: "caution",
            onUseCode: I
        }), s.jsx(Fu, {
            title: "Mã con/bổ sung cùng nhóm - không dùng làm bệnh chính",
            rows: C.notMain,
            variant: "not-main",
            onUseCode: I
        })]
    })
})
  , of = H.memo(function({row: f}) {
    const [m,I] = H.useState("")
      , w = [["Ngộ độc - Chương XIX", f[2]], ["Vô tình", f[3]], ["Cố ý tự làm hại", f[4]], ["Không rõ ý định", f[5]], ["Tác dụng có hại khi dùng điều trị", f[6]]].filter(R => R[1]);
    return s.jsxs("article", {
        className: "icd-card drug-card",
        children: [s.jsxs("div", {
            className: "icd-card-top",
            children: [s.jsx("div", {
                className: "drug-name",
                children: f[0]
            }), s.jsx("button", {
                className: m === f[0] ? "copy ok" : "copy",
                onClick: () => Cr(f[0], I),
                children: m === f[0] ? "Đã copy" : "Copy tên"
            })]
        }), f[7] ? s.jsx("div", {
            className: "icd-meta",
            children: s.jsxs("span", {
                children: ["Nhóm ", f[7]]
            })
        }) : null, s.jsx("div", {
            className: "drug-code-grid",
            children: w.map( ([R,Y]) => s.jsxs("div", {
                className: "drug-code-row",
                children: [s.jsx("span", {
                    children: R
                }), s.jsx("code", {
                    children: Y
                })]
            }, R))
        })]
    })
});
function sf({rows: g, onUseCode: f, initialQuery: m="", initialMainMode: I=!1}) {
    var Ie, Qe, kn, Je, Fe;
    const [w,R] = H.useState(m || "")
      , [Y,W] = H.useState([])
      , [C,K] = H.useState(!!I)
      , [P,V] = H.useState("all")
      , [F,T] = H.useState("comfort")
      , [oe,le] = H.useState(40)
      , q = H.useRef(null)
      , ge = Vu(w)
      , he = H.useMemo( () => g.map( (j, Z) => ({
        r: j,
        i: Z,
        code: dn(j[0]),
        s: Ze([j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], ef(j)].join(" "))
    })), [g])
      , ue = H.useMemo( () => {
        const j = new Map;
        for (const Z of he) {
            const se = Z.r
              , ae = se[1];
            if (ae.length > 3 && !_e(se, "cancelled")) {
                const N = ae.slice(0, 3);
                j.has(N) || j.set(N, []);
                const U = j.get(N);
                U.length < 120 && U.push(se)
            }
        }
        return j
    }
    , [he])
      , G = H.useMemo( () => {
        const j = {};
        for (const Z of Fl)
            j[Z.key] = 0;
        j.safeMain = 0,
        j.usableMain = 0;
        for (const Z of he) {
            for (const se of Fl)
                _e(Z.r, se.key) && j[se.key]++;
            _r(Z.r) && j.safeMain++,
            Ul(Z.r) && j.usableMain++
        }
        return j
    }
    , [he])
      , xe = H.useMemo( () => Y.reduce( (j, Z) => j | Qa[Z], 0), [Y]);
    function Ce(j) {
        return P === "all" ? !0 : P === "safeMain" ? _r(j) : P === "usableMain" ? Ul(j) : P === "notMain" ? _e(j, "notMain") : P === "cancelled" ? _e(j, "cancelled") : P === "needSpecific" ? _e(j, "needSpecific") : P === "gender" ? _e(j, "femaleOnly") || _e(j, "maleOnly") : P === "deathOnly" ? _e(j, "deathOnly") : !0
    }
    const $ = H.useMemo( () => {
        const j = dn(ge)
          , Z = Ze(ge)
          , se = !!(j || Z);
        let ae = 0
          , N = []
          , U = [];
        for (const E of he) {
            const d = E.r;
            if (C && !_r(d) || !Ce(d) || xe && (d[9] & xe) !== xe)
                continue;
            if (!se) {
                ae++,
                U.length < oe && U.push(d);
                continue
            }
            let y = !1
              , Q = 0;
            if (j && (E.code === j ? (y = !0,
            Q += 1e3) : E.code.startsWith(j) ? (y = !0,
            Q += 650) : E.code.includes(j) && (y = !0,
            Q += 260)),
            Z) {
                const J = Ze(d[2])
                  , ne = Ze(d[3])
                  , te = Ze(d[4]);
                J.includes(Z) ? (y = !0,
                Q += 420) : E.s.includes(Z) ? (y = !0,
                Q += 180) : (ne.includes(Z) || te.includes(Z)) && (y = !0,
                Q += 90)
            }
            y && (_r(d) && (Q += 15),
            _e(d, "cancelled") && (Q -= 200),
            _e(d, "notMain") && (Q -= 80),
            ae++,
            N.length < 2500 && N.push([Q, E.i, d]))
        }
        return se && (N.sort( (E, d) => d[0] - E[0] || E[1] - d[1]),
        U = N.slice(0, oe).map(E => E[2])),
        {
            total: ae,
            visible: U
        }
    }
    , [he, ge, xe, oe, C, P]);
    H.useEffect( () => le(40), [ge, xe, C, P]);
    function ee(j) {
        W(Z => Z.includes(j) ? Z.filter(se => se !== j) : [...Z, j])
    }
    return H.useEffect( () => {
        const j = Z => {
            var se;
            Z.key === "/" && document.activeElement !== q.current && (Z.preventDefault(),
            (se = q.current) == null || se.focus()),
            Z.key === "Escape" && (R(""),
            W([]),
            V("all"))
        }
        ;
        return window.addEventListener("keydown", j),
        () => window.removeEventListener("keydown", j)
    }
    , []),
    s.jsxs(s.Fragment, {
        children: [s.jsxs("section", {
            className: "icd-search-panel sticky-search-panel",
            children: [s.jsxs("div", {
                className: "search-panel-top",
                children: [s.jsxs("div", {
                    className: "search-panel-title",
                    children: [s.jsx("b", {
                        children: "Tra cứu ICD-10"
                    }), s.jsx("span", {
                        children: "Nhập mã hoặc tên bệnh để tìm nhanh"
                    })]
                }), s.jsxs("label", {
                    className: C ? "main-mode compact on" : "main-mode compact",
                    title: "Bật để ẩn mã bị hủy, không dùng bệnh chính, chỉ tử vong",
                    children: [s.jsx("input", {
                        type: "checkbox",
                        checked: C,
                        onChange: j => K(j.target.checked)
                    }), s.jsx("span", {
                        children: "Bệnh chính"
                    })]
                })]
            }), s.jsxs("div", {
                className: "icd-search-row",
                children: [s.jsxs("div", {
                    className: "icd-search",
                    children: [s.jsx("span", {
                        children: "⌕"
                    }), s.jsx("input", {
                        ref: q,
                        value: w,
                        onChange: j => R(j.target.value),
                        placeholder: "Tìm mã ICD hoặc tên bệnh: A09, E11.9, tăng huyết áp...",
                        autoComplete: "off",
                        spellCheck: !1
                    }), w ? s.jsx("button", {
                        onClick: () => R(""),
                        children: "✕"
                    }) : null]
                }), s.jsxs("div", {
                    className: "view-toggle",
                    "aria-label": "Chế độ xem",
                    children: [s.jsx("button", {
                        className: F === "comfort" ? "active" : "",
                        onClick: () => T("comfort"),
                        children: "Dễ đọc"
                    }), s.jsx("button", {
                        className: F === "compact" ? "active" : "",
                        onClick: () => T("compact"),
                        children: "Gọn"
                    })]
                })]
            }), s.jsxs("div", {
                className: "quick-filter-chips",
                children: [s.jsx("button", {
                    className: P === "all" ? "on chip-all" : "chip-all",
                    onClick: () => V("all"),
                    children: "Tất cả"
                }), s.jsxs("button", {
                    className: P === "safeMain" ? "on chip-safe" : "chip-safe",
                    onClick: () => V("safeMain"),
                    children: ["Dùng được bệnh chính ", s.jsx("b", {
                        children: (Ie = G.safeMain) == null ? void 0 : Ie.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: P === "notMain" ? "on chip-danger" : "chip-danger",
                    onClick: () => V("notMain"),
                    children: ["Không dùng bệnh chính ", s.jsx("b", {
                        children: (Qe = G.notMain) == null ? void 0 : Qe.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: P === "cancelled" ? "on chip-cancel" : "chip-cancel",
                    onClick: () => V("cancelled"),
                    children: ["Mã bị hủy ", s.jsx("b", {
                        children: (kn = G.cancelled) == null ? void 0 : kn.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: P === "needSpecific" ? "on chip-purple" : "chip-purple",
                    onClick: () => V("needSpecific"),
                    children: ["Cần mã cụ thể hơn ", s.jsx("b", {
                        children: (Je = G.needSpecific) == null ? void 0 : Je.toLocaleString("vi-VN")
                    })]
                }), s.jsx("button", {
                    className: P === "gender" ? "on chip-gender" : "chip-gender",
                    onClick: () => V("gender"),
                    children: "Theo giới tính"
                }), s.jsxs("button", {
                    className: P === "deathOnly" ? "on chip-gray" : "chip-gray",
                    onClick: () => V("deathOnly"),
                    children: ["Mã tử vong ", s.jsx("b", {
                        children: (Fe = G.deathOnly) == null ? void 0 : Fe.toLocaleString("vi-VN")
                    })]
                })]
            }), s.jsxs("details", {
                className: "advanced-filters",
                children: [s.jsx("summary", {
                    children: "Bộ lọc chi tiết"
                }), s.jsx("div", {
                    className: "icd-filter-chips",
                    children: Fl.map(j => {
                        var Z;
                        return s.jsxs("button", {
                            className: Y.includes(j.key) ? "on" : "",
                            style: {
                                "--c": j.color
                            },
                            onClick: () => ee(j.key),
                            title: j.tip,
                            children: [j.label, s.jsx("b", {
                                children: (Z = G[j.key]) == null ? void 0 : Z.toLocaleString("vi-VN")
                            })]
                        }, j.key)
                    }
                    )
                })]
            })]
        }), s.jsx("div", {
            className: "icd-stats",
            children: ge || Y.length || P !== "all" || C ? s.jsxs(s.Fragment, {
                children: ["Tìm thấy ", s.jsx("b", {
                    children: $.total.toLocaleString("vi-VN")
                }), " kết quả", ge ? s.jsxs(s.Fragment, {
                    children: [" cho từ khóa ", s.jsxs("b", {
                        children: ["“", ge, "”"]
                    })]
                }) : null, $.total > $.visible.length ? `, đang hiển thị ${$.visible.length}` : ""]
            }) : s.jsxs(s.Fragment, {
                children: ["Gõ từ khóa hoặc chọn lọc nhanh để bắt đầu tra cứu. Nhấn ", s.jsx("kbd", {
                    children: "/"
                }), " để focus ô tìm kiếm."]
            })
        }), s.jsx("section", {
            className: `icd-results ${F === "compact" ? "compact-results" : ""}`,
            children: $.visible.map(j => s.jsx(uf, {
                row: j,
                childMap: ue,
                onUseCode: f
            }, `${j[1]}-${j[0]}`))
        }), $.total > $.visible.length ? s.jsxs("button", {
            className: "icd-more",
            onClick: () => le(j => j + 40),
            children: ["Xem thêm ", Math.min(40, $.total - $.visible.length), " kết quả"]
        }) : null]
    })
}
function af({rows: g}) {
    const [f,m] = H.useState("")
      , [I,w] = H.useState(50)
      , R = Vu(f)
      , Y = H.useMemo( () => g.map( (C, K) => ({
        r: C,
        i: K,
        s: Ze(C.join(" ")),
        substance: Ze(C[0]),
        codes: dn([C[2], C[3], C[4], C[5], C[6]].join(" "))
    })), [g])
      , W = H.useMemo( () => {
        const C = Ze(R)
          , K = dn(R);
        let P = []
          , V = 0;
        for (const F of Y) {
            if (!C && !K) {
                V++,
                P.length < I && P.push(F.r);
                continue
            }
            let T = 0;
            C && F.substance.includes(C) && (T += 300),
            C && F.s.includes(C) && (T += 100),
            K && F.codes.includes(K) && (T += 250),
            T > 0 && (V++,
            P.length < 1500 && P.push([T, F.i, F.r]))
        }
        return C || K ? (P.sort( (F, T) => T[0] - F[0] || F[1] - T[1]),
        {
            total: V,
            visible: P.slice(0, I).map(F => F[2])
        }) : {
            total: V,
            visible: P
        }
    }
    , [Y, R, I]);
    return H.useEffect( () => w(50), [R]),
    s.jsxs(s.Fragment, {
        children: [s.jsxs("section", {
            className: "icd-search-panel",
            children: [s.jsxs("div", {
                className: "icd-search",
                children: [s.jsx("span", {
                    children: "⌕"
                }), s.jsx("input", {
                    value: f,
                    onChange: C => m(C.target.value),
                    placeholder: "Nhập tên thuốc/hóa chất hoặc mã T/X/Y, ví dụ Paracetamol, Aspirin, T39.1, X40…",
                    autoComplete: "off",
                    spellCheck: !1
                }), f ? s.jsx("button", {
                    onClick: () => m(""),
                    children: "✕"
                }) : null]
            }), s.jsx("div", {
                className: "drug-help",
                children: "Tra cứu PL3 hỗ trợ mã hóa Chương XIX/XX: ngộ độc, vô tình, cố ý tự làm hại, không rõ ý định, tác dụng có hại khi dùng điều trị."
            })]
        }), s.jsxs("div", {
            className: "icd-stats",
            children: ["Tìm thấy ", s.jsx("b", {
                children: W.total.toLocaleString("vi-VN")
            }), " dòng thuốc/hóa chất", W.total > W.visible.length ? `, đang hiển thị ${W.visible.length}` : ""]
        }), s.jsx("section", {
            className: "icd-results",
            children: W.visible.map( (C, K) => s.jsx(of, {
                row: C
            }, `${C[0]}-${K}`))
        }), W.total > W.visible.length ? s.jsxs("button", {
            className: "icd-more",
            onClick: () => w(C => C + 50),
            children: ["Xem thêm ", Math.min(50, W.total - W.visible.length), " kết quả"]
        }) : null]
    })
}
const cf = H.memo(function({row: f}) {
    const [m,I] = H.useState("")
      , w = f.icd10_tt06 || f.icd10_qd7603 || ""
      , R = `${f.ma_yhct} - ${f.ten_yhct}${w ? " | ICD10 khuyến nghị: " + w : ""}`
      , Y = f.status === "not_used_tt06" || f.removed_tt06
      , W = f.status === "modified_tt06"
      , C = f.status === "added_tt06"
      , K = f.status === "cancelled_qd7603"
      , P = Y ? "Không sử dụng" : C ? "Mã bổ sung mới" : W ? "Sửa đổi theo TT06/2026" : K ? "Đã hủy theo QĐ7603" : "Đang dùng";
    return s.jsxs("article", {
        className: `icd-card yhct-card ${Y || K ? "is-cancelled" : ""} ${W || C ? "is-updated" : ""}`,
        children: [s.jsxs("div", {
            className: "icd-card-top",
            children: [s.jsx("div", {
                className: "icd-code yhct-code",
                children: f.ma_yhct
            }), s.jsxs("div", {
                className: "icd-card-actions",
                children: [s.jsx("button", {
                    className: m === f.ma_yhct ? "copy ok" : "copy",
                    onClick: () => Cr(f.ma_yhct, I),
                    children: m === f.ma_yhct ? "Đã copy" : "Copy mã"
                }), s.jsx("button", {
                    className: m === R ? "copy ok" : "copy",
                    onClick: () => Cr(R, I),
                    children: m === R ? "Đã copy" : "Copy mã + ICD"
                })]
            })]
        }), s.jsx("h3", {
            children: f.ten_yhct || "Chưa có tên YHCT"
        }), s.jsxs("div", {
            className: `usage-banner ${Y || K ? "danger" : W || C ? "warn" : "ok"}`,
            children: [s.jsx("b", {
                children: P
            }), s.jsx("span", {
                children: Y ? "Mã này thuộc Phụ lục 02 - Danh mục mã bệnh YHCT không sử dụng." : C ? "Mã YHCT bổ sung mới theo Phụ lục 01." : W ? `Khi lập hồ sơ, ưu tiên ICD-10 theo TT06/2026: ${f.icd10_tt06}.` : "Mã YHCT dùng ghi tại trường MA_BENH_YHCT khi hồ sơ có chẩn đoán y học cổ truyền."
            })]
        }), f.icd10_qd7603 || f.icd10_tt06 ? s.jsxs("div", {
            className: "yhct-icd-compare",
            children: [f.icd10_qd7603 ? s.jsxs("div", {
                children: [s.jsx("small", {
                    children: "ICD-10 theo QĐ7603"
                }), s.jsx("b", {
                    children: f.icd10_qd7603
                })]
            }) : null, f.icd10_tt06 ? s.jsxs("div", {
                className: "preferred",
                children: [s.jsx("small", {
                    children: "ICD-10 theo TT06/2026"
                }), s.jsx("b", {
                    children: f.icd10_tt06
                })]
            }) : null]
        }) : null, s.jsxs("div", {
            className: "icd-meta",
            children: [f.ten_benh_tt06 ? s.jsxs("span", {
                children: ["Tên TT06: ", f.ten_benh_tt06]
            }) : null, !f.ten_benh_tt06 && f.ten_benh_hien_dai ? s.jsx("span", {
                children: f.ten_benh_hien_dai
            }) : null, f.stt_qd7603 && f.stt_qd7603 !== "-" ? s.jsxs("span", {
                children: ["STT QĐ7603: ", f.stt_qd7603]
            }) : null, f.source_update ? s.jsx("span", {
                children: f.source_update
            }) : f.source_sheet ? s.jsx("span", {
                children: f.source_sheet
            }) : null]
        }), f.ten_bang_ke_tt06 ? s.jsxs("details", {
            className: "icd-note",
            open: !0,
            children: [s.jsx("summary", {
                children: "Tên trên bảng kê theo cập nhật mới"
            }), s.jsx("div", {
                children: f.ten_bang_ke_tt06
            })]
        }) : null, f.ten_bang_ke && !f.ten_bang_ke_tt06 ? s.jsxs("details", {
            className: "icd-note",
            children: [s.jsx("summary", {
                children: "Tên trên bảng kê chi phí"
            }), s.jsx("div", {
                children: f.ten_bang_ke
            })]
        }) : null, f.yhct_update_note && !Y ? s.jsxs("details", {
            className: "icd-note",
            children: [s.jsx("summary", {
                children: "Ghi chú cập nhật"
            }), s.jsx("div", {
                children: f.yhct_update_note
            })]
        }) : null, f.removed_note ? s.jsxs("details", {
            className: "icd-note",
            open: !0,
            children: [s.jsx("summary", {
                children: "Lý do cảnh báo"
            }), s.jsx("div", {
                children: f.removed_note
            })]
        }) : null]
    })
});
function df({data: g, initialQuery: f=""}) {
    const [m,I] = H.useState(f || "")
      , [w,R] = H.useState("all")
      , [Y,W] = H.useState(50)
      , C = Vu(m)
      , K = (g == null ? void 0 : g.rows) || []
      , P = H.useMemo( () => K.map( (T, oe) => ({
        r: T,
        i: oe,
        code: dn(T.ma_yhct),
        s: Ze([T.ma_yhct, T.ten_yhct, T.icd10_qd7603, T.icd10_tt06, T.ten_benh_hien_dai, T.ten_benh_tt06, T.ten_bang_ke, T.ten_bang_ke_tt06, T.source_sheet, T.source_update, T.status, T.yhct_update_note].join(" "))
    })), [K])
      , V = H.useMemo( () => ({
        total: K.length,
        notUsed: K.filter(T => T.status === "not_used_tt06" || T.removed_tt06).length,
        updated: K.filter(T => T.status === "modified_tt06" || T.status === "added_tt06").length,
        modified: K.filter(T => T.status === "modified_tt06").length,
        added: K.filter(T => T.status === "added_tt06").length,
        active: K.filter(T => !["not_used_tt06", "cancelled_qd7603"].includes(T.status) && !T.removed_tt06).length
    }), [K])
      , F = H.useMemo( () => {
        const T = dn(C)
          , oe = Ze(C)
          , le = !!(T || oe);
        let q = 0
          , ge = []
          , he = [];
        for (const ue of P) {
            const G = ue.r
              , xe = G.status === "not_used_tt06" || G.removed_tt06
              , Ce = G.status === "modified_tt06" || G.status === "added_tt06";
            if (w === "active" && (xe || G.status === "cancelled_qd7603") || w === "updated" && !Ce || w === "modified" && G.status !== "modified_tt06" || w === "added" && G.status !== "added_tt06" || w === "notUsed" && !xe)
                continue;
            if (!le) {
                q++,
                he.length < Y && he.push(G);
                continue
            }
            let $ = !1
              , ee = 0;
            T && (ue.code === T || dn(G.icd10_tt06) === T || dn(G.icd10_qd7603) === T ? ($ = !0,
            ee += 1e3) : ue.code.startsWith(T) || dn(G.icd10_tt06).startsWith(T) || dn(G.icd10_qd7603).startsWith(T) ? ($ = !0,
            ee += 650) : (ue.code.includes(T) || dn(G.icd10_tt06).includes(T) || dn(G.icd10_qd7603).includes(T)) && ($ = !0,
            ee += 260)),
            oe && (Ze(G.ten_yhct).includes(oe) ? ($ = !0,
            ee += 450) : ue.s.includes(oe) && ($ = !0,
            ee += 180)),
            $ && (q++,
            ge.length < 2500 && ge.push([ee, ue.i, G]))
        }
        return le && (ge.sort( (ue, G) => G[0] - ue[0] || ue[1] - G[1]),
        he = ge.slice(0, Y).map(ue => ue[2])),
        {
            total: q,
            visible: he
        }
    }
    , [P, C, w, Y]);
    return H.useEffect( () => W(50), [C, w]),
    s.jsxs(s.Fragment, {
        children: [s.jsxs("section", {
            className: "icd-search-panel",
            children: [s.jsx("div", {
                className: "search-panel-top",
                children: s.jsxs("div", {
                    className: "search-panel-title",
                    children: [s.jsx("b", {
                        children: "Tra cứu mã bệnh YHCT"
                    }), s.jsx("span", {
                        children: "PL01 = sửa đổi/bổ sung; PL02 = mã không sử dụng. Mã YHCT ghi tại MA_BENH_YHCT."
                    })]
                })
            }), s.jsxs("div", {
                className: "icd-search",
                children: [s.jsx("span", {
                    children: "⌕"
                }), s.jsx("input", {
                    value: m,
                    onChange: T => I(T.target.value),
                    placeholder: "Tìm U58.762, Hạ trĩ, K64, I84, Ôn bệnh, A97...",
                    autoComplete: "off",
                    spellCheck: !1
                }), m ? s.jsx("button", {
                    onClick: () => I(""),
                    children: "✕"
                }) : null]
            }), s.jsxs("div", {
                className: "quick-filter-chips",
                children: [s.jsxs("button", {
                    className: w === "all" ? "on chip-all" : "chip-all",
                    onClick: () => R("all"),
                    children: ["Tất cả ", s.jsx("b", {
                        children: V.total.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: w === "active" ? "on chip-safe" : "chip-safe",
                    onClick: () => R("active"),
                    children: ["Đang dùng ", s.jsx("b", {
                        children: V.active.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: w === "updated" ? "on chip-purple" : "chip-purple",
                    onClick: () => R("updated"),
                    children: ["Sửa đổi/bổ sung ", s.jsx("b", {
                        children: V.updated.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: w === "modified" ? "on chip-warn" : "chip-warn",
                    onClick: () => R("modified"),
                    children: ["Đổi ICD ", s.jsx("b", {
                        children: V.modified.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: w === "added" ? "on chip-gender" : "chip-gender",
                    onClick: () => R("added"),
                    children: ["Mã mới ", s.jsx("b", {
                        children: V.added.toLocaleString("vi-VN")
                    })]
                }), s.jsxs("button", {
                    className: w === "notUsed" ? "on chip-cancel" : "chip-cancel",
                    onClick: () => R("notUsed"),
                    children: ["Không sử dụng ", s.jsx("b", {
                        children: V.notUsed.toLocaleString("vi-VN")
                    })]
                })]
            }), s.jsxs("div", {
                className: "drug-help",
                children: ["Khi mã YHCT thuộc PL01, phần mềm hiển thị cả ", s.jsx("b", {
                    children: "ICD-10 theo QĐ7603"
                }), " và ", s.jsx("b", {
                    children: "ICD-10 theo TT06/2026"
                }), "; mã theo TT06/2026 là mã khuyến nghị để chuẩn hóa hồ sơ."]
            })]
        }), s.jsxs("div", {
            className: "icd-stats",
            children: ["Tìm thấy ", s.jsx("b", {
                children: F.total.toLocaleString("vi-VN")
            }), " mã YHCT", C ? s.jsxs(s.Fragment, {
                children: [" cho từ khóa ", s.jsxs("b", {
                    children: ["“", C, "”"]
                })]
            }) : null, F.total > F.visible.length ? `, đang hiển thị ${F.visible.length}` : ""]
        }), s.jsx("section", {
            className: "icd-results",
            children: F.visible.map(T => s.jsx(cf, {
                row: T
            }, T.ma_yhct))
        }), F.total > F.visible.length ? s.jsxs("button", {
            className: "icd-more",
            onClick: () => W(T => T + 50),
            children: ["Xem thêm ", Math.min(50, F.total - F.visible.length), " kết quả"]
        }) : null]
    })
}
function ff({section: g}) {
    return s.jsxs("article", {
        className: "icd-card guide-card",
        children: [s.jsxs("div", {
            className: "guide-card-head",
            children: [g.group ? s.jsx("span", {
                className: "guide-group",
                children: g.group
            }) : null, s.jsx("div", {
                className: "guide-title",
                children: g.title
            })]
        }), g.name ? s.jsx("h3", {
            children: g.name
        }) : null, g.range ? s.jsx("div", {
            className: "icd-meta",
            children: s.jsx("span", {
                children: g.range
            })
        }) : null, s.jsx("div", {
            className: "guide-content",
            children: g.content
        })]
    })
}
function pf({guides: g}) {
    const [f,m] = H.useState("pl1")
      , [I,w] = H.useState("")
      , [R,Y] = H.useState("all")
      , W = f === "pl1" ? g.pl1 : g.pl2
      , C = H.useMemo( () => f !== "pl2" ? [] : ["all", ...Array.from(new Set(W.sections.map(P => P.group).filter(Boolean)))], [W, f]);
    H.useEffect( () => {
        w(""),
        Y("all")
    }
    , [f]);
    const K = H.useMemo( () => {
        const P = Ze(I);
        return W.sections.filter(V => {
            const F = f !== "pl2" || R === "all" || V.group === R
              , T = !P || Ze([V.title, V.name, V.range, V.group, V.keywords, V.content].join(" ")).includes(P);
            return F && T
        }
        )
    }
    , [W, I, R, f]);
    return s.jsxs(s.Fragment, {
        children: [s.jsxs("section", {
            className: "icd-search-panel",
            children: [s.jsxs("div", {
                className: "guide-subtabs",
                children: [s.jsx("button", {
                    className: f === "pl1" ? "active" : "",
                    onClick: () => m("pl1"),
                    children: "PL1 - Chương & khối"
                }), s.jsx("button", {
                    className: f === "pl2" ? "active" : "",
                    onClick: () => m("pl2"),
                    children: "PL2 - Nguyên tắc mã hóa"
                })]
            }), f === "pl2" ? s.jsx("div", {
                className: "guide-topic-chips",
                children: C.map(P => s.jsx("button", {
                    className: R === P ? "active" : "",
                    onClick: () => Y(P),
                    children: P === "all" ? "Tất cả chủ đề" : P
                }, P))
            }) : null, s.jsxs("div", {
                className: "icd-search",
                children: [s.jsx("span", {
                    children: "⌕"
                }), s.jsx("input", {
                    value: I,
                    onChange: P => w(P.target.value),
                    placeholder: f === "pl2" ? "Tìm tình huống: bệnh chính, mã chi tiết, †, ngộ độc, ung thư, sản khoa…" : "Tìm Chương, khối, dải mã…",
                    autoComplete: "off",
                    spellCheck: !1
                }), I ? s.jsx("button", {
                    onClick: () => w(""),
                    children: "✕"
                }) : null]
            }), s.jsx("div", {
                className: "drug-help",
                children: f === "pl2" ? "PL2 đã được gom theo tình huống sử dụng để dễ tra cứu, tránh lặp lại đoạn dài trong tài liệu gốc." : "PL1 giúp hiểu Chương/Khối của mã bệnh. PL4/PL5 vẫn hiển thị trực tiếp trên từng mã ICD."
            })]
        }), s.jsxs("div", {
            className: "icd-stats",
            children: [s.jsx("b", {
                children: W.title
            }), " - đang hiển thị ", K.length.toLocaleString("vi-VN"), " mục."]
        }), s.jsx("section", {
            className: "icd-results",
            children: K.map( (P, V) => s.jsx(ff, {
                section: P
            }, `${f}-${V}`))
        })]
    })
}
function hf({onUseCode: g}) {
    var G, xe, Ce;
    const f = () => {
        const ee = (new URLSearchParams(window.location.search).get("tab") || "icd").toLowerCase();
        return ee === "yhct" || ee === "ma-benh-yhct" || ee === "ma_yhct" ? "yhct" : ee === "drug" || ee === "pl3" || ee === "thuoc" ? "drug" : ee === "guide" || ee === "pl1" || ee === "pl2" ? "guide" : "icd"
    }
      , m = () => {
        const $ = new URLSearchParams(window.location.search);
        return $.get("q") || $.get("code") || $.get("icd") || ""
    }
      , I = () => {
        const ee = (new URLSearchParams(window.location.search).get("mode") || "").toLowerCase();
        return ee === "main" || ee === "benhchinh" || ee === "primary"
    }
      , [w,R] = H.useState(f)
      , [Y] = H.useState(m)
      , [W] = H.useState(I)
      , [C,K] = H.useState(null)
      , [P,V] = H.useState(null)
      , [F,T] = H.useState(null)
      , [oe,le] = H.useState(null)
      , [q,ge] = H.useState(null)
      , [he,ue] = H.useState("");
    return H.useEffect( () => {
        let $ = !0;
        async function ee() {
            try {
                const Ie = await wr("/data/icd_meta.json");
                $ && K(Ie);
                const Qe = await wr("/data/icd_rows.json");
                $ && V(Qe)
            } catch (Ie) {
                $ && ue(Ie.message || String(Ie))
            }
        }
        return ee(),
        () => {
            $ = !1
        }
    }
    , []),
    H.useEffect( () => {
        w === "drug" && !F && wr("/data/pl3_drug_rows.json").then(T).catch($ => ue($.message || String($))),
        w === "guide" && !oe && wr("/data/pl1_pl2_guides.json").then(le).catch($ => ue($.message || String($))),
        w === "yhct" && !q && wr("/data/yhct_rows.json").then(ge).catch($ => ue($.message || String($)))
    }
    , [w, F, oe, q]),
    s.jsxs("div", {
        className: "icd-page",
        children: [s.jsxs("section", {
            className: "icd-hero pro-hero",
            children: [s.jsx("div", {
                className: "icd-hero-icon",
                children: "ICD"
            }), s.jsxs("div", {
                className: "hero-copy",
                children: [s.jsx("div", {
                    className: "hero-kicker",
                    children: "TT06/2026 + QĐ1849"
                }), s.jsxs("h1", {
                    children: ["Tra cứu ICD-10 ", s.jsx("span", {
                        children: "2026"
                    })]
                }), s.jsx("p", {
                    children: "Tra cứu mã bệnh, cảnh báo mã bị hủy, mã không dùng bệnh chính và nguyên tắc mã hóa."
                })]
            }), s.jsxs("div", {
                className: "hero-stats",
                children: [(G = C == null ? void 0 : C.counts) != null && G.official_catalog_records ? s.jsxs("div", {
                    children: [s.jsx("b", {
                        children: C.counts.official_catalog_records.toLocaleString("vi-VN")
                    }), s.jsx("span", {
                        children: "Mã ICD"
                    })]
                }) : null, (xe = C == null ? void 0 : C.counts) != null && xe.cancelled_pl4 ? s.jsxs("div", {
                    children: [s.jsx("b", {
                        children: C.counts.cancelled_pl4.toLocaleString("vi-VN")
                    }), s.jsx("span", {
                        children: "PL4 bị hủy"
                    })]
                }) : null, (Ce = C == null ? void 0 : C.counts) != null && Ce.pl3_drug_chemical ? s.jsxs("div", {
                    children: [s.jsx("b", {
                        children: C.counts.pl3_drug_chemical.toLocaleString("vi-VN")
                    }), s.jsx("span", {
                        children: "Dòng PL3"
                    })]
                }) : null]
            })]
        }), s.jsxs("div", {
            className: "icd-tabs",
            children: [s.jsx("button", {
                className: w === "icd" ? "active" : "",
                onClick: () => R("icd"),
                children: "ICD-10"
            }), s.jsx("button", {
                className: w === "drug" ? "active" : "",
                onClick: () => R("drug"),
                children: "PL3 Thuốc/Hóa chất"
            }), s.jsx("button", {
                className: w === "yhct" ? "active" : "",
                onClick: () => R("yhct"),
                children: "Mã bệnh YHCT"
            }), s.jsx("button", {
                className: w === "guide" ? "active" : "",
                onClick: () => R("guide"),
                children: "PL1/PL2 Hướng dẫn"
            })]
        }), he ? s.jsxs("section", {
            className: "icd-search-panel error-box",
            children: [s.jsx("b", {
                children: "Lỗi tải dữ liệu:"
            }), " ", he]
        }) : null, w === "icd" && !P ? s.jsx(Il, {
            text: "Đang nạp dữ liệu ICD-10..."
        }) : null, w === "icd" && P ? s.jsx(sf, {
            rows: P,
            onUseCode: g,
            initialQuery: Y,
            initialMainMode: W
        }) : null, w === "drug" && !F ? s.jsx(Il, {
            text: "Đang nạp PL3 Thuốc/Hóa chất..."
        }) : null, w === "drug" && F ? s.jsx(af, {
            rows: F
        }) : null, w === "guide" && !oe ? s.jsx(Il, {
            text: "Đang nạp PL1/PL2..."
        }) : null, w === "guide" && oe ? s.jsx(pf, {
            guides: oe
        }) : null, w === "yhct" && !q ? s.jsx(Il, {
            text: "Đang nạp mã bệnh YHCT..."
        }) : null, w === "yhct" && q ? s.jsx(df, {
            data: q,
            initialQuery: Y
        }) : null, s.jsxs("section", {
            className: "icd-disclaimer",
            children: [s.jsx("b", {
                children: "Lưu ý:"
            }), " Chế độ nhập bệnh chính giúp giảm nguy cơ chọn nhầm mã bị hủy, mã chỉ tử vong hoặc mã không dùng làm bệnh chính."]
        })]
    })
}
function mf() {
    return s.jsxs(s.Fragment, {
        children: [s.jsxs("nav", {
            className: "top-nav",
            children: [s.jsx("button", {
                className: "brand",
                onClick: () => window.location.href = "/",
                children: "Tra cứu ICD-10 2026"
            }), s.jsx("div", {
                children: s.jsx("button", {
                    className: "active",
                    children: "ICD-10 2026"
                })
            })]
        }), s.jsx(hf, {})]
    })
}
Jd.createRoot(document.getElementById("root")).render(s.jsx(Kd.StrictMode, {
    children: s.jsx(mf, {})
}));
