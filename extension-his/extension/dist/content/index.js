var $s=Object.defineProperty;var Ps=(N,U,et)=>U in N?$s(N,U,{enumerable:!0,configurable:!0,writable:!0,value:et}):N[U]=et;var r=(N,U,et)=>Ps(N,typeof U!="symbol"?U+"":U,et);(function(){"use strict";function N(o){return o instanceof HTMLInputElement?o.type==="checkbox"?o.checked:o.type==="number"?o.value?parseFloat(o.value):null:o.value:o instanceof HTMLTextAreaElement||o instanceof HTMLSelectElement?o.value:null}class U{constructor(){r(this,"fields",new Map);r(this,"elementMap",new WeakMap);r(this,"validationStates",new Map)}refreshValues(){let t=0;return this.fields.forEach(e=>{if(!e.element.isConnected)return;const s=N(e.element);s!==e.value&&(e.value=s,t++)}),t}register(t){if(this.elementMap.has(t.element)){const e=this.elementMap.get(t.element);this.fields.set(e,t)}else this.fields.set(t.id,t),this.elementMap.set(t.element,t.id)}unregister(t){this.fields.get(t)&&(this.fields.delete(t),this.validationStates.delete(t))}update(t,e){const s=this.fields.get(t);if(!s)throw new Error(`Field with id "${t}" not found`);const i={...s,...e,element:e.element??s.element};this.fields.set(t,i)}get(t){return this.fields.get(t)}getAll(){return Array.from(this.fields.values())}exists(t){return this.fields.has(t)}size(){return this.fields.size}clear(){this.fields.clear(),this.validationStates.clear()}setValidationState(t,e){if(!this.exists(t))throw new Error(`Field with id "${t}" not found`);this.validationStates.set(t,e)}getValidationState(t){return this.validationStates.get(t)}getAllValidationStates(){return new Map(this.validationStates)}}class et{constructor(){r(this,"FIELD_SELECTORS","input, textarea, select")}discoverFields(t){const e=t.querySelectorAll(this.FIELD_SELECTORS);return Array.from(e).filter(s=>s instanceof HTMLElement).filter(s=>this.isValidField(s))}isValidField(t){if(t.style.display==="none"||t.style.visibility==="hidden")return!1;if(t instanceof HTMLInputElement){const e=t.type.toLowerCase();if(["button","submit","reset","hidden","image"].includes(e))return!1}return!!document.contains(t)}}class pe{resolveLabel(t){let e=this.findLabelByFor(t);return e||(e=this.findNestedLabel(t),e)||(e=this.findAriaLabel(t),e)||(e=this.findPlaceholder(t),e)||(e=this.findTitle(t),e)||(e=this.findPreviousElementText(t),e)||(e=this.findTableCellText(t),e)||(e=this.findNearestText(t),e)?e:""}findLabelByFor(t){var i;const e=t.id;if(!e)return"";const s=document.querySelector(`label[for="${CSS.escape(e)}"]`);return s&&((i=s.textContent)==null?void 0:i.trim())||""}findNestedLabel(t){var s;const e=t.closest("label");return e&&((s=e.textContent)==null?void 0:s.trim())||""}findAriaLabel(t){const e=t.getAttribute("aria-label");return e?e.trim():""}findPlaceholder(t){const e=t.getAttribute("placeholder");return e?e.trim():""}findTitle(t){const e=t.getAttribute("title");return e?e.trim():""}findPreviousElementText(t){var s;const e=t.previousElementSibling;if(e&&(e.tagName==="LABEL"||e.tagName==="SPAN")){const i=(s=e.textContent)==null?void 0:s.trim();if(i&&i.length>0)return i}return""}findTableCellText(t){var a,l,c,h,u;const e=t.closest("td, th");if(!e)return"";const s=e.querySelector("span, label");if(s){const f=(a=s.textContent)==null?void 0:a.trim();if(f&&f.length>0&&f.length<100)return f}const i=e.previousElementSibling;if(i&&(i.tagName==="TD"||i.tagName==="TH")){const f=i.querySelector("span, label");if(f){const w=(l=f.textContent)==null?void 0:l.trim();if(w&&w.length>0&&w.length<100)return w}const g=(c=i.textContent)==null?void 0:c.trim();if(g&&g.length>0&&g.length<100)return g}const n=(h=e.textContent)==null?void 0:h.trim();if(n&&n.length>0){const f=((u=t.textContent)==null?void 0:u.trim())||"",g=n.replace(f,"").trim();if(g.length>0&&g.length<100)return g}return""}findNearestText(t){var a;const e=t.parentElement;if(!e)return"";const s=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,null);let i=s.nextNode(),n="";for(;i;){const l=(a=i.textContent)==null?void 0:a.trim();l&&l.length>0&&l.length<100&&(!n||l.length<n.length)&&(n=l),i=s.nextNode()}return n}}class fe{buildFieldInfo(t,e){const s=this.extractId(t),i=this.extractName(t),n=this.extractType(t),a=this.extractValue(t),l=this.extractPlaceholder(t),c=this.extractRequired(t),h=this.extractReadonly(t),u=this.extractDisabled(t);return{id:s,name:i,label:e||i||s,type:n,value:a,placeholder:l,required:c,readonly:h,disabled:u,element:t}}extractId(t){return t.id?t.id:`field_${this.generateUUID()}`}extractName(t){return t.getAttribute("name")||""}extractType(t){return t instanceof HTMLInputElement?t.type||"text":t instanceof HTMLTextAreaElement?"textarea":t instanceof HTMLSelectElement?"select":t.tagName.toLowerCase()}extractValue(t){return N(t)}extractPlaceholder(t){return t.getAttribute("placeholder")||void 0}extractRequired(t){return t.hasAttribute("required")}extractReadonly(t){return t.hasAttribute("readonly")}extractDisabled(t){return t.hasAttribute("disabled")}generateUUID(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,t=>{const e=Math.random()*16|0;return(t==="x"?e:e&3|8).toString(16)})}}class me{constructor(){r(this,"discovery",new et);r(this,"labelResolver",new pe);r(this,"metadataBuilder",new fe)}scan(t,e){return this.discovery.discoverFields(t).map(i=>this.processField(i,e)).filter(i=>i!==null)}scanNode(t,e){return t instanceof Element?this.discovery.discoverFields(t).map(i=>this.processField(i,e)).filter(i=>i!==null):[]}scanElement(t,e){return this.discovery.discoverFields(t.parentElement||document).includes(t)?this.processField(t,e):null}processField(t,e){const s=this.labelResolver.resolveLabel(t),i=this.metadataBuilder.buildFieldInfo(t,s);return e.register(i),i}}class be{constructor(t,e){r(this,"observer",null);r(this,"callback",null);r(this,"analyzer");r(this,"registry");this.analyzer=t,this.registry=e}start(t=document,e){this.callback=e||this.defaultCallback.bind(this);const s={childList:!0,subtree:!0,attributes:!1,characterData:!1};this.observer=new MutationObserver(i=>{this.handleMutations(i)}),this.observer.observe(t,s),console.log("[MutationWatcher] Started watching for DOM changes")}stop(){this.observer&&(this.observer.disconnect(),this.observer=null,console.log("[MutationWatcher] Stopped watching"))}handleMutations(t){const e=[];for(const s of t)s.type==="childList"&&s.addedNodes.forEach(i=>{if(i.nodeType===Node.ELEMENT_NODE){const n=i;this.isFormField(n)&&e.push(n);const a=this.findFieldsInElement(n);e.push(...a)}});if(e.length>0){const s=Array.from(new Set(e));console.log(`[MutationWatcher] Detected ${s.length} new field(s)`),this.callback(s)}}isFormField(t){return["INPUT","TEXTAREA","SELECT"].includes(t.tagName.toUpperCase())}findFieldsInElement(t){return Array.from(t.querySelectorAll("input, textarea, select"))}defaultCallback(t){for(const s of t)this.analyzer.scanElement(s,this.registry);const e=this.registry.size();console.log(`[MutationWatcher] Total fields now: ${e}`)}}class ye{constructor(t){r(this,"registry");r(this,"boundElements",new WeakMap);r(this,"changeCallbacks",[]);r(this,"blurCallbacks",[]);this.registry=t}onFieldChange(t){this.changeCallbacks.push(t)}onFieldBlur(t){this.blurCallbacks.push(t)}bindElement(t){if(this.boundElements.has(t))return;const e=this.findFieldInRegistry(t);if(!e){console.warn("[EventBinder] Field not found in registry for element:",t);return}const s=()=>{console.log(`[EventBinder] Change event fired on field: ${e.id}`),this.updateFieldValue(e.id,t)},i=()=>{console.log(`[EventBinder] Blur event fired on field: ${e.id}`),this.blurCallbacks.forEach(n=>{try{n(e.id,t)}catch(a){console.error("[EventBinder] Error in field blur callback:",a)}})};t.addEventListener("input",s),t.addEventListener("change",s),t.addEventListener("blur",i),this.boundElements.set(t,{change:s,blur:i}),console.log(`[EventBinder] Bound events to field: ${e.id}`)}unbindElement(t){if(!this.boundElements.has(t))return;const e=this.boundElements.get(t);t.removeEventListener("input",e.change),t.removeEventListener("change",e.change),t.removeEventListener("blur",e.blur),this.boundElements.delete(t),console.log("[EventBinder] Unbound events from element")}bindAll(){const e=this.registry.getAll().reduce((s,i)=>{try{return this.bindElement(i.element),s+1}catch{return s}},0);console.log(`[EventBinder] Bound events to ${e} field(s)`)}unbindAll(){this.registry.getAll().forEach(e=>{try{this.unbindElement(e.element)}catch{}}),console.log("[EventBinder] Unbound all events")}findFieldInRegistry(t){return this.registry.getAll().find(s=>s.element===t)}updateFieldValue(t,e){const s=N(e);try{this.registry.update(t,{value:s}),console.log(`[EventBinder] Updated field ${t}: ${s}`);const i=this.registry.get(t);i&&this.changeCallbacks.forEach(n=>{try{n(t,i)}catch(a){console.error("[EventBinder] Error in field change callback:",a)}})}catch(i){console.error(`[EventBinder] Failed to update field ${t}:`,i)}}}class we{constructor(t,e){r(this,"mutationWatcher");r(this,"eventBinder");r(this,"formAnalyzer");r(this,"fieldRegistry");r(this,"isActive",!1);this.formAnalyzer=t,this.fieldRegistry=e,this.mutationWatcher=new be(t,e),this.eventBinder=new ye(e)}onFieldChange(t){this.eventBinder.onFieldChange(t)}onFieldBlur(t){this.eventBinder.onFieldBlur(t)}start(t=document){if(this.isActive){console.warn("[ChangeTracker] Already active");return}this.isActive=!0,this.eventBinder.bindAll(),this.mutationWatcher.start(t,e=>{for(const s of e)this.formAnalyzer.scanElement(s,this.fieldRegistry),this.bindElement(s)}),console.log("[ChangeTracker] Started tracking form changes")}stop(){if(!this.isActive){console.warn("[ChangeTracker] Not active");return}this.isActive=!1,this.mutationWatcher.stop(),this.eventBinder.unbindAll(),console.log("[ChangeTracker] Stopped tracking form changes")}bindElement(t){if(!this.isActive){console.warn("[ChangeTracker] Not active, cannot bind element");return}this.eventBinder.bindElement(t)}unbindElement(t){this.eventBinder.unbindElement(t)}isTracking(){return this.isActive}getEventBinder(){return this.eventBinder}}class xe{constructor(){r(this,"highlightClass","ai-validation-highlight");r(this,"highlightedElements",new Map);this.injectStyles()}show(t,e){this.highlightedElements.has(t)&&this.clear(t),t.classList.add(this.highlightClass,`${this.highlightClass}--${e}`),this.highlightedElements.set(t,e),console.log(`[HighlightManager] Highlighted field with level: ${e}`)}clear(t){const e=this.highlightedElements.get(t);e&&(t.classList.remove(this.highlightClass,`${this.highlightClass}--${e}`),this.highlightedElements.delete(t),console.log("[HighlightManager] Cleared highlight"))}clearAll(){for(const t of this.highlightedElements.keys())this.clear(t);console.log("[HighlightManager] Cleared all highlights")}injectStyles(){if(document.getElementById("ai-validation-highlight-styles"))return;const t=document.createElement("style");t.id="ai-validation-highlight-styles",t.textContent=`
            .ai-validation-highlight {
                border: 2px solid !important;
                border-radius: 4px !important;
                box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
            }

            .ai-validation-highlight--error {
                border-color: #dc2626 !important;
                background-color: rgba(220, 38, 38, 0.02) !important;
            }

            .ai-validation-highlight--warning {
                border-color: #f59e0b !important;
                background-color: rgba(245, 158, 11, 0.02) !important;
            }

            .ai-validation-highlight--info {
                border-color: #3b82f6 !important;
                background-color: rgba(59, 130, 246, 0.02) !important;
            }

            .ai-validation-highlight--success {
                border-color: #10b981 !important;
                background-color: rgba(16, 185, 129, 0.02) !important;
            }
        `,document.head.appendChild(t),console.log("[HighlightManager] Styles injected")}}class ve{constructor(){r(this,"audioContext",null);r(this,"isMuted",!1);r(this,"lastPlayTime",0);r(this,"throttleDuration",500);try{const t=window.AudioContext||window.webkitAudioContext;t&&(this.audioContext=new t)}catch{console.warn("[SoundManager] AudioContext not available")}}playWarning(){this.playTone(1e3,.3)}playError(){this.playTone(600,.4)}playSuccess(){this.playTone(1200,.2)}mute(){this.isMuted=!0,console.log("[SoundManager] Muted")}unmute(){this.isMuted=!1,console.log("[SoundManager] Unmuted")}playTone(t,e){if(this.isMuted||!this.audioContext)return;const s=Date.now();if(!(s-this.lastPlayTime<this.throttleDuration)){this.lastPlayTime=s;try{const i=this.audioContext.createOscillator(),n=this.audioContext.createGain();i.connect(n),n.connect(this.audioContext.destination),i.frequency.value=t,i.type="sine",n.gain.setValueAtTime(.3,this.audioContext.currentTime),n.gain.exponentialRampToValueAtTime(.01,this.audioContext.currentTime+e),i.start(this.audioContext.currentTime),i.stop(this.audioContext.currentTime+e),console.log(`[SoundManager] Played tone: ${t}Hz`)}catch(i){console.warn("[SoundManager] Failed to play tone:",i)}}}}class ke{constructor(t,e){r(this,"highlightManager");r(this,"warningView");r(this,"soundManager");r(this,"activeNotification",null);r(this,"highlightedElements",new Set);this.highlightManager=new xe,this.warningView=t,this.soundManager=new ve,e&&this.warningView.onExplain(e),console.log("[NotificationManager] Initialized")}notify(t){this.activeNotification=t,this.highlightManager.show(t.field,t.level),this.highlightedElements.add(t.field),this.warningView.show(t),this.playSound(t.level),console.log(`[NotificationManager] Notification sent: ${t.title}`)}clear(t){var e;this.highlightManager.clear(t),this.highlightedElements.delete(t),this.warningView.clearField(t),((e=this.activeNotification)==null?void 0:e.field)===t&&(this.activeNotification=null),console.log("[NotificationManager] Cleared notification for field")}clearFieldError(t){this.highlightManager.clear(t),this.highlightedElements.delete(t),this.warningView.clearField(t),console.log("[NotificationManager] Cleared validation error for field")}clearAll(){this.highlightManager.clearAll(),this.highlightedElements.clear(),this.warningView.clearAll(),this.warningView.hide(),this.activeNotification=null,console.log("[NotificationManager] Cleared all notifications")}setExplainCallback(t){this.warningView.onExplain(t)}muteSound(){this.soundManager.mute()}unmuteSound(){this.soundManager.unmute()}playSound(t){switch(t){case"error":this.soundManager.playError();break;case"warning":this.soundManager.playWarning();break;case"success":this.soundManager.playSuccess();break}}}class Ee{constructor(t){r(this,"panel");r(this,"container");r(this,"activeErrors",new Map);r(this,"explainCallback",null);this.panel=t,this.container=t.getTabContainer("warnings"),this.container.classList.add("wl-container"),t.addStyles(this.getStyles()),this.render(),console.log("[WarningListView] UI created")}show(t){const e=this.resolveFieldId(t.field);this.activeErrors.set(e,t),this.render(),this.panel.setWarningCount(this.activeErrors.size),this.panel.flagNewWarning(),console.log(`[WarningListView] Notification displayed (Active errors: ${this.activeErrors.size})`)}clearField(t){const e=this.resolveFieldId(t);this.activeErrors.delete(e)&&(this.render(),this.panel.setWarningCount(this.activeErrors.size),console.log(`[WarningListView] Cleared error for field: ${e}`))}clearAll(){this.activeErrors.clear(),this.render(),this.panel.setWarningCount(0),console.log("[WarningListView] Cleared all errors")}hide(){this.panel.isPanelOpen()&&this.panel.getActiveTab()==="warnings"&&this.panel.close()}onExplain(t){this.explainCallback=t}render(){if(this.activeErrors.size===0){this.container.innerHTML='<div class="wl-empty">✅ Không có cảnh báo nào</div>';return}let t='<div class="wl-list">';this.activeErrors.forEach((e,s)=>{var a;const i=this.getLevelColor(e.level),n=((a=e.metadata)==null?void 0:a.fieldLabel)||s;t+=`
                <div class="wl-item" data-field="${s}">
                    <div class="wl-item-header">
                        <span class="wl-item-field">${n}</span>
                        <button class="wl-item-dismiss" title="Bỏ qua" data-field="${s}">✕</button>
                    </div>
                    <div class="wl-item-level" style="border-color: ${i}; color: ${i};">
                        ${this.getLevelText(e.level)}
                    </div>
                    <div class="wl-item-message">${e.message}</div>
                    ${e.suggestion?`<div class="wl-item-suggestion">💡 ${e.suggestion}</div>`:""}
                    ${e.canExplain?`<button class="wl-item-explain" data-field="${s}">📖 Giải thích</button>`:""}
                </div>
            `}),t+="</div>",this.container.innerHTML=t,this.attachItemHandlers()}attachItemHandlers(){this.container.querySelectorAll(".wl-item-dismiss").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.getAttribute("data-field");s&&(this.activeErrors.delete(s),this.render(),this.panel.setWarningCount(this.activeErrors.size))})}),this.container.querySelectorAll(".wl-item-explain").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.getAttribute("data-field"),i=s?this.activeErrors.get(s):void 0;i&&this.explainCallback&&this.explainCallback(i)})})}resolveFieldId(t){return t.id||t.className}getLevelColor(t){return{error:"#dc2626",warning:"#f59e0b",info:"#3b82f6",success:"#10b981"}[t]}getLevelText(t){return{error:"LỖI",warning:"CẢNH BÁO",info:"THÔNG TIN",success:"THÀNH CÔNG"}[t]}getStyles(){return`
            .wl-container {
                padding: 12px;
                overflow-y: auto;
                background: #f8fafc;
            }

            .wl-empty {
                padding: 24px 16px;
                text-align: center;
                color: #6b7280;
                font-size: 13px;
            }

            .wl-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .wl-item {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                background: #ffffff;
            }

            .wl-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .wl-item-field {
                font-weight: 600;
                color: #1f2937;
                font-size: 13px;
            }

            .wl-item-dismiss {
                background: transparent;
                border: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
            }

            .wl-item-dismiss:hover { color: #1f2937; }

            .wl-item-level {
                display: inline-block;
                border-left: 3px solid;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 8px;
            }

            .wl-item-message {
                color: #4b5563;
                font-size: 12px;
                line-height: 1.5;
                margin-bottom: 8px;
            }

            .wl-item-suggestion {
                background: #f0fdf4;
                border-left: 3px solid #10b981;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                color: #065f46;
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.6;
            }

            .wl-item-explain {
                margin-top: 8px;
                background: #3b82f6;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }

            .wl-item-explain:hover { background: #2563eb; }
        `}}const x={color:{vnptBlue:"#0068B3",vnptBlueDark:"#004E86",vnptBlueLight:"#3E9BE0",metal:"#DCE7F2",metalDark:"#B9CBDE",ink:"#173049",white:"#FFFFFF",happy:"#28C76F",sad:"#EA5455",think:"#FF9F43"},size:{width:96,height:108},home:{right:24,bottom:20},obstacle:{bandHeight:240,selector:'button, [role="button"], input[type="submit"], input[type="button"], .btn, .ui-button, .k-button, a.btn',minSize:16,minStandThickness:20,minFootShare:.45,maxCandidates:40,clickableName:/\b(btn|button|fab)\b/i,maxClimb:6,minStandRise:6,maxStandRise:220,dodgeGap:12,edgeGap:8,smallStep:20,settleMs:220},timing:{idleToLongIdle:12e3,longIdleToSleep:22e3,idleGestureMin:2600,idleGestureMax:6200},mouse:{hoverRadius:130,headMaxDeg:18,pupilMaxShift:3.4,lookUpThreshold:220,offBalanceMs:1500},storageKey:{enabled:"robotEnabled",reduceMotion:"robotReduceMotion"}},lt={robotSvg:"his-robot-host",robot3d:"his-robot3d-host",assistantPanel:"his-assistant-host",onboardingTour:"zc-onboarding-tour"},Pt=Object.values(lt).map(o=>`#${o}`).join(", "),Ht=12,Ft=x.home.bottom+x.size.height+Ht,Vt=76+Ht,Dt=32;class Ae{constructor(){r(this,"host");r(this,"shadowRoot");r(this,"panelEl",null);r(this,"badgeEl",null);r(this,"dotEl",null);r(this,"tabButtons",new Map);r(this,"tabPanes",new Map);r(this,"isOpen",!1);r(this,"isMaximized",!1);r(this,"activeTab","warnings");r(this,"warningCount",0);r(this,"tabChangeCallbacks",[]);r(this,"closeCallbacks",[]);r(this,"autoOpenOnWarning",!0);r(this,"autoMaximizeOnBatch",!1);r(this,"progressHideTimer",null);r(this,"checkingCount",0);this.host=document.createElement("div"),this.host.id=lt.assistantPanel,this.shadowRoot=this.host.attachShadow({mode:"open"}),this.createUI(),this.loadSettings(),document.body.appendChild(this.host),console.log("[UnifiedAssistantPanel] UI created")}getUiRect(t){const e={launcher:".ua-toggle","tab-warnings":'.ua-tab[data-tab="warnings"]',"tab-chat":'.ua-tab[data-tab="chat"]',plus:".chat-plus","plus-menu":".chat-plus-menu",attach:".chat-attach","bangke-all":'.chat-bangke-btn[data-act="all"]',"bangke-one":'.chat-bangke-btn[data-act="one"]',input:".chat-input-box",clear:".chat-clear"}[t],s=this.shadowRoot.querySelector(e);if(!s)return null;const i=s.getBoundingClientRect();return i.width>0&&i.height>0?i:null}clickPlusButton(){var t;(t=this.shadowRoot.querySelector(".chat-plus"))==null||t.click()}getTabContainer(t){const e=this.tabPanes.get(t);if(!e)throw new Error(`[UnifiedAssistantPanel] Không tìm thấy tab: ${t}`);return e}addStyles(t){const e=document.createElement("style");e.textContent=t,this.shadowRoot.appendChild(e)}onTabChange(t){this.tabChangeCallbacks.push(t)}onClose(t){this.closeCallbacks.push(t)}open(t){t&&this.activateTab(t),!this.isOpen&&this.panelEl&&(this.isOpen=!0,this.panelEl.classList.add("open"),this.emitTabChange(this.activeTab))}close(){this.isOpen&&this.panelEl&&(this.isOpen=!1,this.panelEl.classList.remove("open"),this.closeCallbacks.forEach(t=>t()))}toggle(){this.isOpen?this.close():this.open()}isPanelOpen(){return this.isOpen}useExternalLauncher(){this.setLauncherVisible(!1)}setLauncherVisible(t){var s;const e=this.shadowRoot.querySelector(".ua-toggle");e&&(e.style.display=t?"":"none"),(s=this.panelEl)==null||s.classList.toggle("above-button",t)}getActiveTab(){return this.activeTab}maximize(){this.isMaximized||this.toggleMaximize()}maximizeForBatchCheck(){this.autoMaximizeOnBatch&&this.maximize()}setBatchProgress(t,e=null){this.progressHideTimer!==null&&(clearTimeout(this.progressHideTimer),this.progressHideTimer=null);const s=this.shadowRoot.querySelector(".ua-progress"),i=this.shadowRoot.querySelector(".ua-header-bar"),n=this.shadowRoot.querySelector(".ua-header-bar-fill");if(!(!s||!i||!n)){if(t===null){s.hidden=!0,i.hidden=!0,n.style.width="0%";return}s.hidden=!1,s.textContent=t,e!==null&&(i.hidden=!1,n.style.width=`${Math.max(0,Math.min(100,e))}%`)}}completeBatchProgress(t){this.setBatchProgress(t,100),this.progressHideTimer=window.setTimeout(()=>this.setBatchProgress(null),5e3)}setWarningCount(t){this.warningCount=t,this.updateBadge()}beginChecking(){this.checkingCount++,this.updateCheckingIndicator()}endChecking(){this.checkingCount=Math.max(0,this.checkingCount-1),this.updateCheckingIndicator()}updateCheckingIndicator(){const t=this.shadowRoot.querySelector(".ua-toggle"),e=this.shadowRoot.querySelector(".ua-spinner");if(!t||!e)return;const s=this.checkingCount>0;e.hidden=!s,t.classList.toggle("ua-checking",s),t.title=s?"Đang kiểm tra dữ liệu...":"ZeroCheck AI"}flagNewWarning(){if(this.autoOpenOnWarning){this.activateTab("warnings"),this.open(),this.animateToggleButton();return}if(!this.isOpen){this.animateToggleButton();return}this.activeTab!=="warnings"&&this.setWarningDot(!0)}loadSettings(){var t,e,s,i;try{(e=(t=chrome.storage)==null?void 0:t.local)==null||e.get({autoOpenOnWarning:!0,autoMaximizeOnBatch:!1},n=>{this.autoOpenOnWarning=n.autoOpenOnWarning!==!1,this.autoMaximizeOnBatch=n.autoMaximizeOnBatch===!0}),(i=(s=chrome.storage)==null?void 0:s.onChanged)==null||i.addListener((n,a)=>{a==="local"&&(n.autoOpenOnWarning&&(this.autoOpenOnWarning=n.autoOpenOnWarning.newValue!==!1),n.autoMaximizeOnBatch&&(this.autoMaximizeOnBatch=n.autoMaximizeOnBatch.newValue===!0))})}catch(n){console.warn("[UnifiedAssistantPanel] Không đọc được cấu hình, dùng mặc định",n)}}createUI(){this.shadowRoot.innerHTML=`
            <style>${this.getStyles()}</style>
            <button class="ua-toggle" style="display:none" title="ZeroCheck AI" aria-label="Trợ lý y tế số">
                🤖
                <span class="ua-badge" hidden>0</span>
                <span class="ua-spinner" hidden></span>
            </button>
            <div class="ua-panel">
                <div class="ua-header">
                    <span class="ua-header-icon">🤖</span>
                    <span class="ua-header-title">ZeroCheck AI</span>
                    <span class="ua-progress" hidden></span>
                    <button class="ua-max" title="Phóng to" aria-label="Phóng to">⤢</button>
                    <button class="ua-close" title="Đóng" aria-label="Đóng">✕</button>
                </div>
                <div class="ua-header-bar" hidden><div class="ua-header-bar-fill" style="width:0%"></div></div>
                <div class="ua-tabs">
                    <button class="ua-tab" data-tab="warnings">
                        ⚠️ Cảnh báo
                        <span class="ua-dot" hidden></span>
                    </button>
                    <button class="ua-tab" data-tab="chat">💬 Trợ lý</button>
                </div>
                <div class="ua-body">
                    <div class="ua-pane" data-pane="warnings"></div>
                    <div class="ua-pane" data-pane="chat"></div>
                </div>
            </div>
        `,this.panelEl=this.shadowRoot.querySelector(".ua-panel"),this.badgeEl=this.shadowRoot.querySelector(".ua-badge"),this.dotEl=this.shadowRoot.querySelector(".ua-dot"),["warnings","chat"].forEach(n=>{const a=this.shadowRoot.querySelector(`.ua-tab[data-tab="${n}"]`),l=this.shadowRoot.querySelector(`.ua-pane[data-pane="${n}"]`);a&&l&&(this.tabButtons.set(n,a),this.tabPanes.set(n,l),a.addEventListener("click",()=>this.activateTab(n)))}),this.applyActiveTab();const e=this.shadowRoot.querySelector(".ua-toggle");e==null||e.addEventListener("click",()=>this.toggle());const s=this.shadowRoot.querySelector(".ua-close");s==null||s.addEventListener("click",()=>this.close());const i=this.shadowRoot.querySelector(".ua-max");i==null||i.addEventListener("click",()=>this.toggleMaximize()),document.addEventListener("keydown",n=>{n.key!=="Escape"||!this.isOpen||(this.isMaximized?this.toggleMaximize():this.close())})}activateTab(t){const e=this.activeTab!==t;this.activeTab=t,this.applyActiveTab(),t==="warnings"&&this.setWarningDot(!1),e&&this.emitTabChange(t)}applyActiveTab(){this.tabButtons.forEach((t,e)=>{t.classList.toggle("active",e===this.activeTab)}),this.tabPanes.forEach((t,e)=>{t.classList.toggle("active",e===this.activeTab)})}emitTabChange(t){this.tabChangeCallbacks.forEach(e=>e(t))}updateBadge(){this.badgeEl&&(this.badgeEl.textContent=String(this.warningCount),this.badgeEl.hidden=this.warningCount===0)}setWarningDot(t){this.dotEl&&(this.dotEl.hidden=!t)}toggleMaximize(){if(!this.panelEl)return;this.isMaximized=!this.isMaximized,this.panelEl.classList.toggle("maximized",this.isMaximized);const t=this.shadowRoot.querySelector(".ua-max");t&&(t.textContent=this.isMaximized?"⤡":"⤢",t.title=this.isMaximized?"Thu nhỏ":"Phóng to",t.setAttribute("aria-label",t.title))}animateToggleButton(){const t=this.shadowRoot.querySelector(".ua-toggle");t&&(t.classList.remove("ua-blink"),t.offsetWidth,t.classList.add("ua-blink"))}getStyles(){return`
            :host {
                all: initial;
            }

            * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* ---- Nút nổi duy nhất ---- */

            .ua-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2147483647;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--zc-accent, #667eea) 0%, var(--zc-accent-2, #764ba2) 100%);
                border: none;
                cursor: pointer;
                font-size: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }

            .ua-toggle:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            }

            .ua-toggle:active { transform: scale(0.95); }

            .ua-blink { animation: ua-blink 0.6s ease-in-out; }

            @keyframes ua-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            .ua-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 22px;
                height: 22px;
                padding: 0 5px;
                background: #dc2626;
                color: #ffffff;
                border-radius: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }

            .ua-badge[hidden] { display: none; }

            /* Vòng xoay "đang kiểm tra" quanh nút nổi */
            .ua-spinner {
                position: absolute;
                inset: -4px;
                border-radius: 50%;
                border: 3px solid rgba(255, 255, 255, 0.35);
                border-top-color: #ffffff;
                animation: ua-spin 0.8s linear infinite;
                pointer-events: none;
            }

            .ua-spinner[hidden] { display: none; }

            .ua-checking { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2); }

            @keyframes ua-spin {
                to { transform: rotate(360deg); }
            }

            /* ---- Panel chung ---- */

            /*
             * Đáy panel nằm TRÊN robot (mặc định) để không che robot, cũng không phải
             * đẩy robot lên che nút start/stop của trang HIS. Hình hài "Nút thường"
             * thì hạ xuống vừa đủ trên nút nổi — xem class .above-button.
             */
            .ua-panel {
                position: fixed;
                bottom: ${Ft}px;
                right: 20px;
                z-index: 2147483647;
                width: 400px;
                max-width: calc(100vw - 40px);
                height: 560px;
                max-height: calc(100vh - ${Ft+Dt}px);
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transform: translateY(12px);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .ua-panel.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            /* Không có robot: launcher là nút nổi 56px, panel chỉ cần vượt qua nút. */
            .ua-panel.above-button {
                bottom: ${Vt}px;
                max-height: calc(100vh - ${Vt+Dt}px);
            }

            /*
             * Chế độ phóng to: panel bung ra GIỮA màn hình để xem kết quả kiểm tra
             * nhiều file XML 130 cho rõ. Vẫn dùng right/bottom làm mốc nên CSS
             * transition (all 0.25s ở .ua-panel) tự tạo animation phóng to/thu nhỏ mượt.
             */
            .ua-panel.maximized {
                width: min(1200px, 94vw);
                max-width: none;
                height: min(820px, 92vh);
                max-height: none;
                right: calc((100vw - min(1200px, 94vw)) / 2);
                bottom: calc((100vh - min(820px, 92vh)) / 2);
            }

            .ua-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: linear-gradient(135deg, var(--zc-accent, #667eea) 0%, var(--zc-accent-2, #764ba2) 100%);
                color: #ffffff;
                flex-shrink: 0;
            }

            .ua-header-icon { font-size: 20px; }

            .ua-header-title {
                flex: 1;
                font-size: 14px;
                font-weight: 600;
            }

            .ua-close, .ua-max {
                background: none;
                border: none;
                color: #ffffff;
                font-size: 16px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 6px;
                transition: background 0.15s;
            }

            .ua-close:hover, .ua-max:hover { background: rgba(255, 255, 255, 0.18); }

            .ua-max { font-size: 15px; }

            /* ---- Tiến độ kiểm tra lô trên header ---- */

            .ua-progress {
                font-size: 11px;
                font-weight: 600;
                color: #ffffff;
                background: rgba(255, 255, 255, 0.22);
                border-radius: 10px;
                padding: 3px 10px;
                white-space: nowrap;
                max-width: 45%;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .ua-progress[hidden] { display: none; }

            /* Thanh chạy mảnh ngay dưới header */
            .ua-header-bar {
                height: 3px;
                background: #e5e7eb;
                flex-shrink: 0;
            }

            .ua-header-bar[hidden] { display: none; }

            .ua-header-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--zc-accent, #667eea), var(--zc-accent-2, #764ba2));
                transition: width 0.2s ease;
            }

            /* ---- Thanh tab ---- */

            .ua-tabs {
                display: flex;
                border-bottom: 1px solid #e5e7eb;
                background: #ffffff;
                flex-shrink: 0;
            }

            .ua-tab {
                position: relative;
                flex: 1;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                padding: 10px 8px;
                font-size: 13px;
                font-weight: 600;
                color: #6b7280;
                cursor: pointer;
                transition: color 0.15s, border-color 0.15s;
            }

            .ua-tab:hover { color: #374151; }

            .ua-tab.active {
                color: var(--zc-accent-deep, #4f46e5);
                border-bottom-color: var(--zc-accent-deep, #4f46e5);
            }

            .ua-dot {
                position: absolute;
                top: 8px;
                margin-left: 4px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #dc2626;
                display: inline-block;
            }

            .ua-dot[hidden] { display: none; }

            /* ---- Thân panel: các pane ---- */

            .ua-body {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .ua-pane {
                display: none;
                flex: 1;
                min-height: 0;
                flex-direction: column;
                overflow: hidden;
            }

            .ua-pane.active { display: flex; }
        `}}const L=class L{constructor(t){r(this,"host",null);r(this,"shadow",null);r(this,"stepIndex",0);r(this,"steps",[]);r(this,"onResize",()=>this.position());this.anchors=t}async showIfFirstRun(){await this.isDone()||this.show()}show(){this.host||(this.steps=L.STEPS.filter(t=>this.anchors.supports(t.anchor)),this.stepIndex=0,this.render(),this.applyStep())}async isDone(){var t,e;try{const s=await((e=(t=chrome.storage)==null?void 0:t.local)==null?void 0:e.get(L.STORAGE_KEY));if(s&&s[L.STORAGE_KEY]===!0)return!0}catch{}return localStorage.getItem(L.STORAGE_KEY)==="1"}markDone(){var t,e;try{(e=(t=chrome.storage)==null?void 0:t.local)==null||e.set({[L.STORAGE_KEY]:!0})}catch{}try{localStorage.setItem(L.STORAGE_KEY,"1")}catch{}}next(){if(this.stepIndex>=this.steps.length-1){this.closePlusMenuIfOpen(),this.finish();return}this.goTo(this.stepIndex+1)}prev(){this.stepIndex!==0&&this.goTo(this.stepIndex-1)}goTo(t){t===this.stepIndex||t<0||t>=this.steps.length||(this.closePlusMenuIfOpen(),this.stepIndex=t,this.applyStep())}closePlusMenuIfOpen(){const t=this.steps[this.stepIndex];t!=null&&t.needsPlusMenu&&this.anchors.getRect("plus-menu")&&this.anchors.clickPlus()}applyStep(){const t=this.steps[this.stepIndex];if(this.renderStepContent(t),!t.needsPanel){this.position();return}this.anchors.openChat(),window.setTimeout(()=>{t.needsPlusMenu&&!this.anchors.getRect("plus-menu")?(this.anchors.clickPlus(),window.setTimeout(()=>this.position(),L.MENU_OPEN_DELAY_MS)):this.position()},L.PANEL_OPEN_DELAY_MS)}finish(){var t;this.closePlusMenuIfOpen(),this.markDone(),window.removeEventListener("resize",this.onResize),(t=this.host)==null||t.remove(),this.host=null,this.shadow=null}render(){var e,s,i,n;this.host=document.createElement("div"),this.host.id=lt.onboardingTour,this.shadow=this.host.attachShadow({mode:"open"});const t=this.steps.map((a,l)=>`<button class="ob-dot" type="button" data-go="${l}" data-tip="Bước ${l+1}: ${this.escape(a.title)}" aria-label="Bước ${l+1}: ${this.escape(a.title)}"></button>`).join("");this.shadow.innerHTML=`
            <style>${this.getStyles()}</style>
            <div class="ob-spot"></div>
            <div class="ob-card" role="dialog" aria-label="Hướng dẫn sử dụng">
                <div class="ob-head">
                    <span class="ob-icon"></span>
                    <span class="ob-title"></span>
                </div>
                <p class="ob-body"></p>
                <div class="ob-foot">
                    <div class="ob-tip" hidden></div>
                    <div class="ob-dots">${t}</div>
                    <button class="ob-skip" type="button" data-tip="Bỏ qua hướng dẫn" aria-label="Bỏ qua hướng dẫn">✕</button>
                    <button class="ob-prev" type="button" data-tip="Quay lại bước trước" aria-label="Quay lại bước trước">←</button>
                    <button class="ob-next" type="button"></button>
                </div>
            </div>
        `,document.body.appendChild(this.host),(e=this.shadow.querySelector(".ob-skip"))==null||e.addEventListener("click",()=>this.finish()),(s=this.shadow.querySelector(".ob-prev"))==null||s.addEventListener("click",()=>this.prev()),(i=this.shadow.querySelector(".ob-next"))==null||i.addEventListener("click",()=>this.next()),(n=this.shadow.querySelector(".ob-dots"))==null||n.addEventListener("click",a=>{const l=a.target.closest("[data-go]");l&&this.goTo(Number(l.dataset.go))}),this.bindTooltip(),window.addEventListener("resize",this.onResize)}bindTooltip(){var n,a;const t=(n=this.shadow)==null?void 0:n.querySelector(".ob-foot"),e=(a=this.shadow)==null?void 0:a.querySelector(".ob-tip");if(!t||!e)return;const s=l=>{var h;const c=(h=l.target)==null?void 0:h.closest("[data-tip]");c&&(e.textContent=c.dataset.tip??"",e.hidden=!1)},i=()=>{e.hidden=!0};t.addEventListener("mouseover",s),t.addEventListener("focusin",s),t.addEventListener("mouseout",i),t.addEventListener("focusout",i)}escape(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}renderStepContent(t){if(!this.shadow)return;const e=this.stepIndex===this.steps.length-1,s=(a,l)=>{var h;const c=(h=this.shadow)==null?void 0:h.querySelector(a);c&&(c.textContent=l)};s(".ob-icon",t.icon),s(".ob-title",t.title),s(".ob-body",t.body);const i=this.shadow.querySelector(".ob-next");if(i){const a=e?"Bắt đầu dùng":"Bước tiếp theo";i.textContent=e?"🚀":"→",i.dataset.tip=a,i.setAttribute("aria-label",a)}const n=this.shadow.querySelector(".ob-prev");n&&(n.hidden=this.stepIndex===0),this.shadow.querySelectorAll(".ob-dot").forEach((a,l)=>{a.classList.toggle("on",l===this.stepIndex),a.setAttribute("aria-current",String(l===this.stepIndex))})}position(){if(!this.shadow)return;const t=this.shadow.querySelector(".ob-spot"),e=this.shadow.querySelector(".ob-card");if(!t||!e)return;const s=this.steps[this.stepIndex],i=this.anchors.getRect(s.anchor)??this.fallbackRect(),n=8;t.style.left=`${i.left-n}px`,t.style.top=`${i.top-n}px`,t.style.width=`${i.width+n*2}px`,t.style.height=`${i.height+n*2}px`;const a=e.offsetWidth||320,l=e.offsetHeight||190,c=16,h=12,u=i.left+i.width/2,f=i.top+i.height/2,g={left:{left:i.left-a-c,top:f-l/2},above:{left:u-a/2,top:i.top-l-c},below:{left:u-a/2,top:i.bottom+c},right:{left:i.right+c,top:f-l/2}},w=f>window.innerHeight*.55?[g.above,g.left,g.right,g.below]:[g.left,g.below,g.right,g.above],b={left:i.left-n-6,top:i.top-n-6,right:i.right+n+6,bottom:i.bottom+n+6},T=p=>p.left>=h&&p.top>=h&&p.left+a<=window.innerWidth-h&&p.top+l<=window.innerHeight-h&&(p.left+a<=b.left||p.left>=b.right||p.top+l<=b.top||p.top>=b.bottom);let M=w.find(T);M||(M={left:u-a/2,top:i.top-l-c>=h?i.top-l-c:h}),e.style.left=`${Math.min(Math.max(h,M.left),window.innerWidth-a-h)}px`,e.style.top=`${Math.min(Math.max(h,M.top),window.innerHeight-l-h)}px`}fallbackRect(){return new DOMRect(window.innerWidth-100,window.innerHeight-100,72,72)}getStyles(){return`
            :host { all: initial; }
            /* QUAN TRỌNG: width khai báo phải LÀ bề rộng thật (gồm padding) —
               thiếu dòng này thẻ rộng hơn tính toán ~36px, gây tràn màn/đè nút. */
            *, *::before, *::after { box-sizing: border-box; }
            /* Lớp phủ đen mờ che TOÀN BỘ trang lẫn panel (z ngang panel nhưng
               host tour gắn vào DOM sau nên vẽ đè lên) — chỉ vùng khoét quanh
               phần tử được chỉ là sáng; pointer-events:none nên nút trong vùng
               sáng vẫn bấm thử được ngay. */
            .ob-spot {
                position: fixed;
                z-index: 2147483647;
                border-radius: 14px;
                box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.62), 0 0 0 3px var(--zc-accent, #667eea);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            .ob-card {
                position: fixed;
                z-index: 2147483647;
                width: 320px;
                max-width: calc(100vw - 24px);
                padding: 16px 18px 14px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid var(--zc-pastel, #e3e9f4);
                box-shadow: 0 14px 44px rgba(0, 0, 0, 0.35);
                color: #1f2937;
                font-family: 'Segoe UI', system-ui, sans-serif;
                transition: left 0.3s ease, top 0.3s ease;
                animation: ob-in 0.3s ease;
            }
            @keyframes ob-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: none; }
            }
            .ob-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
            .ob-icon { font-size: 24px; }
            .ob-title { font-size: 15px; font-weight: 700; color: var(--zc-accent-deep, #4f46e5); }
            .ob-body { margin: 0 0 14px; font-size: 13px; line-height: 1.6; color: #4b5563; }
            /* Hàng chân thẻ: nút chỉ còn biểu tượng nên luôn đủ chỗ, không tràn
               ra ngoài thẻ dù tour có nhiều bước. Tên nút/tên bước hiện ở ô
               .ob-tip ngay phía trên khi rê chuột. */
            .ob-foot { position: relative; display: flex; align-items: center; gap: 6px; }
            .ob-tip {
                position: absolute;
                bottom: calc(100% + 8px);
                left: 0; right: 0;
                padding: 6px 10px;
                border-radius: 8px;
                background: #111827;
                color: #f9fafb;
                font-size: 11.5px; font-weight: 600; line-height: 1.45;
                text-align: center;
                box-shadow: 0 6px 18px rgba(2, 6, 23, 0.28);
                pointer-events: none;
            }
            .ob-tip[hidden] { display: none; }
            .ob-dots { display: flex; flex-wrap: wrap; gap: 2px; margin-right: auto; }
            /* Chấm tiến độ bấm được để xem lại bước bất kỳ — vùng bấm 13px cho dễ
               trúng, còn chấm nhìn thấy vẫn 7px như cũ (::before). Cỡ này đủ để 11
               bước nằm gọn một hàng cạnh 3 nút biểu tượng trong thẻ rộng 320px. */
            .ob-dot {
                width: 13px; height: 13px; padding: 0;
                border: none; background: transparent; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
            }
            .ob-dot::before {
                content: ''; width: 7px; height: 7px; border-radius: 50%;
                background: var(--zc-pastel, #d7dce8);
                transition: background 0.2s ease, transform 0.2s ease;
            }
            .ob-dot:hover::before { background: var(--zc-accent, #667eea); transform: scale(1.25); }
            .ob-dot.on::before { background: var(--zc-accent-deep, #4f46e5); transform: scale(1.35); }
            .ob-skip, .ob-prev, .ob-next {
                flex: none;
                width: 32px; height: 32px; padding: 0;
                display: flex; align-items: center; justify-content: center;
                border: none; border-radius: 999px; cursor: pointer;
                font-family: inherit; font-size: 15px; font-weight: 600; line-height: 1;
                transition: filter 0.15s ease, background 0.15s ease, color 0.15s ease;
            }
            .ob-skip { background: transparent; color: #9ca3af; }
            .ob-skip:hover { background: #f3f4f6; color: #1f2937; }
            .ob-prev {
                background: var(--zc-pastel, #eef1f8);
                color: var(--zc-accent-deep, #4f46e5);
            }
            .ob-prev:hover { filter: brightness(0.96); }
            .ob-prev[hidden] { display: none; }
            .ob-next {
                background: linear-gradient(100deg, var(--zc-accent, #667eea), var(--zc-accent-2, #764ba2));
                color: #fff;
            }
            .ob-next:hover { filter: brightness(1.1); }
        `}};r(L,"STORAGE_KEY","onboardingDone"),r(L,"PANEL_OPEN_DELAY_MS",350),r(L,"MENU_OPEN_DELAY_MS",140),r(L,"STEPS",[{anchor:"launcher",needsPanel:!1,icon:"🤖",title:"Đây là trợ lý ZeroCheck AI",body:"Robot luôn nằm ở góc này. Bấm vào robot để mở hoặc đóng bảng làm việc — không che form nhập liệu của bạn."},{anchor:"tab-warnings",needsPanel:!0,icon:"⚠️",title:"Tab Cảnh báo",body:"Nhập sai là trường được viền đỏ/vàng kèm gợi ý sửa, và tab này tự bật kèm số đếm. Sửa xong giá trị, cảnh báo tự biến mất."},{anchor:"tab-chat",needsPanel:!0,icon:"💬",title:"Tab Trợ lý",body:"Nơi làm việc chính: kiểm tra hồ sơ XML 130 trước khi gửi giám định và hỏi đáp nghiệp vụ BHYT có trích dẫn văn bản."},{anchor:"plus",needsPanel:!0,icon:"➕",title:"Nút chọn chế độ",body:'Đây là nút "+" — bấm để chọn chế độ nhập cho ô bên cạnh. Bấm "Tiếp theo", tour sẽ bấm thử nút này giúp bạn.'},{anchor:"plus-menu",needsPanel:!0,needsPlusMenu:!0,icon:"📋",title:"Hai chế độ nhập",body:'Menu vừa được mở: "Kiểm tra số vào viện" — gõ số vào viện là hệ thống tự tải XML 130 từ HIS về kiểm tra; "Hỏi thông tin y tế" — hỏi đáp nghiệp vụ BHYT. Chọn xong thì gõ vào ô nhập.'},{anchor:"attach",needsPanel:!0,icon:"📎",title:"Kiểm tra hồ sơ XML 130",body:"Bấm nút này để nạp file XML 130 (kéo thả cũng được). Nạp từ 2 file trở lên, hệ thống tự đối chiếu chéo giữa các hồ sơ."},{anchor:"bangke-all",needsPanel:!0,icon:"📋",title:"Kiểm tra cả lô từ bảng kê",body:"Chỉ có ở màn hình Kiểm tra bảng kê. Bấm Xem thông tin như thường lệ, nút này lấy đúng danh sách phiếu vừa tìm, tải XML 130 từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo — khỏi xuất file, khỏi gõ tay số vào viện. Số trong ngoặc là số hồ sơ sẽ kiểm tra."},{anchor:"bangke-all",needsPanel:!0,icon:"⏳",title:"Nếu danh sách quá nhiều hồ sơ",body:"Trước khi chạy, hộp xác nhận cho biết thời gian chờ dự kiến. Nếu danh sách vượt sức máy đang dùng, tôi báo ngay trong khung chat và DỪNG — không kiểm tra một phần, vì đối chiếu chéo chỉ so các hồ sơ trong cùng một lô nên phần bị cắt sẽ lọt lỗi. Cách xử lý: thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi bấm Xem thông tin lần nữa."},{anchor:"bangke-one",needsPanel:!0,icon:"🔎",title:"Kiểm tra hồ sơ đang chọn",body:"Bấm chọn một dòng trên bảng kê rồi bấm nút này — chỉ kiểm tra hồ sơ của bệnh nhân đó, chạy ngay không hỏi lại. Chưa chọn dòng nào thì nút còn khóa."},{anchor:"input",needsPanel:!0,icon:"💬",title:"Hỏi đáp nghiệp vụ BHYT",body:'Gõ câu hỏi vào ô này — trợ lý trả lời kèm nguồn văn bản trích dẫn, không có căn cứ sẽ nói thẳng "không tìm thấy".'},{anchor:"clear",needsPanel:!0,icon:"🧹",title:"Xóa lịch sử hội thoại",body:"Muốn panel gọn gàng lại từ đầu, bấm nút này — toàn bộ câu hỏi, kết quả kiểm tra và khay file được dọn sạch."}]);let pt=L;const Te=/^#?([0-9a-fA-F]{6})$/;function Ce(o){const t=Te.exec(o.trim());return t?`#${t[1].toLowerCase()}`:null}function Ot(o,t){const e=t?Ce(t):null,s=["--zc-accent","--zc-accent-2","--zc-accent-deep"];for(const i of s)e?o.style.setProperty(i,e):o.style.removeProperty(i);o.style.removeProperty("--zc-pastel")}class Me{constructor(){r(this,"rules",new Map);r(this,"disabledRules",new Set)}register(t){this.rules.set(t.id,t),console.log(`[RuleRegistry] Registered rule: ${t.name}`)}unregister(t){this.rules.delete(t),this.disabledRules.delete(t),console.log(`[RuleRegistry] Unregistered rule: ${t}`)}enable(t){this.disabledRules.delete(t)}disable(t){this.disabledRules.add(t)}get(t){return this.rules.get(t)}getAll(){return Array.from(this.rules.values()).filter(t=>!this.disabledRules.has(t.id))}getAllByPriority(){return this.getAll().sort((t,e)=>e.priority-t.priority)}isEnabled(t){return!this.disabledRules.has(t)}}class Se{constructor(t){this.registry=t}executeAll(t){const e=[],s=this.registry.getAllByPriority();console.log(`[RuleExecutor] Running validation with ${s.length} rules...`);for(const i of s)try{const n=i.validate(t);e.push(...n),console.log(`[Rule] ${i.name} - ${n.length>0?"FAIL":"PASS"}`)}catch(n){console.error(`[Rule] ${i.name} - ERROR:`,n)}return e}executeRule(t,e){const s=this.registry.get(t);if(!s)return console.warn(`[RuleExecutor] Rule not found: ${t}`),[];if(!this.registry.isEnabled(t))return console.warn(`[RuleExecutor] Rule is disabled: ${t}`),[];try{const i=s.validate(e);return console.log(`[Rule] ${s.name} - ${i.length>0?"FAIL":"PASS"}`),i}catch(i){return console.error(`[Rule] ${s.name} - ERROR:`,i),[]}}executeRulesByField(t,e){const i=this.registry.getAll().filter(a=>this.isRuleApplicableToField(a.id,t));console.log(`[RuleExecutor] Running ${i.length} rules for field: ${t}`);const n=[];for(const a of i)n.push(...this.executeRule(a.id,e));return n}isRuleApplicableToField(t,e){return!0}}class Ie{constructor(){r(this,"registry");r(this,"executor");this.registry=new Me,this.executor=new Se(this.registry)}registerRule(t){this.registry.register(t)}unregisterRule(t){this.registry.unregister(t)}enableRule(t){this.registry.enable(t)}disableRule(t){this.registry.disable(t)}validateField(t){console.log(`[ValidationEngine] Validating field: ${t.currentField.id}`);const e=this.executor.executeRulesByField(t.currentField.id,t);return console.log(`[ValidationEngine] Found ${e.length} issues`),e}validateForm(t){console.log("[ValidationEngine] Validating entire form");const e=this.executor.executeAll(t);return console.log(`[ValidationEngine] Found ${e.length} issues`),e}validate(t){return this.validateField(t)}getRegistry(){return this.registry}getRuleCount(){return this.registry.getAll().length}}class Re{constructor(){r(this,"id","required");r(this,"name","Required Rule");r(this,"priority",100);r(this,"requiredFields",new Set(["maBenhNhan","ngayKham","ngayVao","ngayRa"]))}validate(t){const e=[];if(!this.requiredFields.has(t.currentField.id))return e;const s=t.currentValue;return(s==null||s===""||s===0)&&e.push({ruleId:this.id,field:t.currentField,level:"error",title:"Trường bắt buộc",message:`Trường "${t.currentField.label}" không được để trống`,suggestion:`Vui lòng nhập giá trị cho "${t.currentField.label}"`,canExplain:!1,metadata:{fieldId:t.currentField.id,value:s}}),e}addRequiredField(t){this.requiredFields.add(t)}removeRequiredField(t){this.requiredFields.delete(t)}}class Le{constructor(){r(this,"id","dateCompare");r(this,"name","Date Compare Rule");r(this,"priority",90);r(this,"comparisons",[{fieldId:"ngayVao",compareWith:"ngayRa",operator:"<=",message:"Ngày vào phải nhỏ hơn hoặc bằng ngày ra"},{fieldId:"ngaySinh",compareWith:"ngayKham",operator:"<=",message:"Ngày sinh phải nhỏ hơn hoặc bằng ngày khám"}])}validate(t){const e=[],s=this.comparisons.find(c=>c.fieldId===t.currentField.id);if(!s)return e;const i=t.currentValue,n=t.formValues.get(s.compareWith);if(!i||!n)return e;const a=this.parseDate(i),l=this.parseDate(n);return!a||!l||this.compareWithOperator(a,l,s.operator)||e.push({ruleId:this.id,field:t.currentField,level:"warning",title:"Lỗi so sánh ngày",message:s.message||`Ngày không hợp lệ so với ${s.compareWith}`,suggestion:"Vui lòng kiểm tra lại ngày tháng",canExplain:!1,metadata:{fieldId:t.currentField.id,fieldValue:a.toISOString(),compareValue:l.toISOString(),operator:s.operator}}),e}addComparison(t){this.comparisons.push(t)}parseDate(t){try{const e=new Date(t);return isNaN(e.getTime())?null:e}catch{return null}}compareWithOperator(t,e,s){switch(s){case"<=":return t<=e;case">=":return t>=e;case"<":return t<e;case">":return t>e}}}class Be{constructor(){r(this,"id","regex");r(this,"name","Regex Rule");r(this,"priority",85);r(this,"patterns",[{fieldId:"soBhyt",pattern:/^([0-9]{15}|[0-9]{12})$/,message:"Mã BHYT phải có 12 hoặc 15 chữ số"},{fieldId:"cccd",pattern:/^[0-9]{12}$/,message:"CCCD phải có đúng 12 chữ số"},{fieldId:"maBenhNhan",pattern:/^[A-Z0-9]{1,20}$/,message:"Mã bệnh nhân chỉ chứa chữ in hoa và số"},{fieldId:"nhapsttbatso",pattern:/^[0-9]+$/,message:"Số STT bắt số phải chỉ chứa số"}])}validate(t){const e=[],s=this.patterns.find(n=>n.fieldId===t.currentField.id);if(!s||!t.currentValue)return e;const i=String(t.currentValue).trim();return s.pattern.test(i)||e.push({ruleId:this.id,field:t.currentField,level:"error",title:"Định dạng không hợp lệ",message:s.message||`Định dạng của "${t.currentField.label}" không hợp lệ`,suggestion:"Vui lòng nhập đúng định dạng",canExplain:!1,metadata:{fieldId:t.currentField.id,value:i,pattern:s.pattern.source}}),e}addPattern(t){this.patterns.push(t)}removePattern(t){this.patterns=this.patterns.filter(e=>e.fieldId!==t)}}class ze{constructor(){r(this,"id","icdInactive");r(this,"name","ICD Inactive Rule");r(this,"priority",80);r(this,"inactiveICDCodes",new Set(["C84.2","C83.4","C83.6","C85.0","C88.1"]))}validate(t){const e=[],s=t.currentField.name,i=t.currentField.id;if(console.log(`[ICDInactiveRule] Checking field: ${i} (${s}), value: "${t.currentValue}"`),!["icdVao","icdRa","icdChuan"].includes(s)&&!["icdVao","icdRa","icdChuan"].includes(i))return e;const n=String(t.currentValue).trim().toUpperCase();return console.log(`[ICDInactiveRule] Validating ICD code: "${n}"`),n?(this.inactiveICDCodes.has(n)?(console.log(`[ICDInactiveRule] Code "${n}" is INACTIVE - adding warning`),e.push({ruleId:this.id,field:t.currentField,level:"warning",title:"ICD đã ngừng sử dụng",message:`Mã ICD "${n}" đã không còn được sử dụng`,suggestion:"Vui lòng kiểm tra lại mã ICD phù hợp",canExplain:!0,metadata:{fieldId:t.currentField.id,icdCode:n,reason:"Inactive ICD code"}})):console.log(`[ICDInactiveRule] Code "${n}" is ACTIVE - no warning`),e):(console.log("[ICDInactiveRule] Code is empty, skipping"),e)}addInactiveICDCode(t){this.inactiveICDCodes.add(t.toUpperCase())}removeInactiveICDCode(t){this.inactiveICDCodes.delete(t.toUpperCase())}isICDInactive(t){return this.inactiveICDCodes.has(t.toUpperCase())}}class qt{constructor(t="https://cbyts.vnpt.vn",e=5e3,s=0,i=1e3){r(this,"baseUrl");r(this,"timeout");r(this,"retryCount");r(this,"retryDelay");r(this,"headers");this.baseUrl=t,this.timeout=e,this.retryCount=s,this.retryDelay=i,this.headers={"Content-Type":"application/json",Accept:"application/json"}}getValidationEndpoint(){return`${this.baseUrl}/api/validation`}}class Z extends Error{constructor(e,s="API_ERROR",i,n){super(e);r(this,"code");r(this,"statusCode");r(this,"details");this.name="ApiException",this.code=s,this.statusCode=i,this.details=n,Object.setPrototypeOf(this,Z.prototype)}isTimeout(){return this.code==="TIMEOUT"}isNetworkError(){return this.code==="NETWORK_ERROR"}isHttpError(){return this.code.startsWith("HTTP_")}toErrorDetails(){return{code:this.code,message:this.message,statusCode:this.statusCode,details:this.details}}}const ct="licenseKey",Nt="facilityCode",Ut="staffCode",Wt="X-License-Key",$e="X-Facility-Code",Pe="X-Staff-Code",He={licenseKey:"",facilityCode:"",staffCode:""};async function Yt(){try{const o=await chrome.storage.local.get({[ct]:"",[Nt]:"",[Ut]:""});return{licenseKey:String(o[ct]??"").trim(),facilityCode:String(o[Nt]??"").trim(),staffCode:String(o[Ut]??"").trim()}}catch{return He}}async function at(){const o=await Yt(),t={};return o.licenseKey&&(t[Wt]=o.licenseKey),o.facilityCode&&(t[$e]=o.facilityCode),o.staffCode&&(t[Pe]=o.staffCode),t}function Fe(o,t){return o===401?t||'Khóa bản quyền chưa khai hoặc không còn hiệu lực. Mở tiện ích (biểu tượng trên thanh trình duyệt) → mục "Khóa bản quyền" để nhập lại khóa đơn vị được cấp.':o===403?t||"Hồ sơ khai mã cơ sở KCB không thuộc phạm vi hợp đồng của đơn vị. Kiểm tra lại mã cơ sở trong file, hoặc liên hệ đơn vị cung cấp dịch vụ để mở rộng phạm vi.":null}class Ve{constructor(t){r(this,"config");r(this,"abortControllers",new Map);this.config=t||new qt}async validate(t,e){const s=this.config.getValidationEndpoint(),i=e||"form";this.abortExistingRequest(i);const n=new AbortController;this.abortControllers.set(i,n);try{console.log(`[ValidationApi] POST ${s}`),console.log("[ValidationApi] Request:",JSON.stringify(t,null,2));const a=setTimeout(()=>{n.abort()},this.config.timeout),l=await fetch(s,{method:"POST",headers:{...this.config.headers,...await at()},body:JSON.stringify(t),signal:n.signal});if(clearTimeout(a),!l.ok){const h=await this.parseErrorResponse(l);throw new Z(`HTTP ${l.status}: ${l.statusText}`,`HTTP_${l.status}`,l.status,h)}const c=await l.json();return console.log("[ValidationApi] Response:",JSON.stringify(c,null,2)),c}catch(a){if(clearTimeout(0),a instanceof Error&&a.name==="AbortError"){const c=new Z("Request timeout - exceeded "+this.config.timeout+"ms","TIMEOUT");throw console.log("[ValidationApi] ERROR:",c.message),c}if(a instanceof TypeError){const c=new Z("Network error: "+a.message,"NETWORK_ERROR",void 0,a);throw console.log("[ValidationApi] ERROR:",c.message),c}if(a instanceof Z)throw console.log("[ValidationApi] ERROR:",a.message),a;const l=new Z("Unknown error: "+(a instanceof Error?a.message:String(a)),"UNKNOWN_ERROR",void 0,a);throw console.log("[ValidationApi] ERROR:",l.message),l}finally{this.abortControllers.delete(i)}}abortExistingRequest(t){const e=this.abortControllers.get(t);e&&(console.log(`[ValidationApi] Aborting existing request for ${t}`),e.abort(),this.abortControllers.delete(t))}async parseErrorResponse(t){try{return await t.json()}catch{return{error:t.statusText}}}setConfiguration(t){this.config=t}getConfiguration(){return this.config}}class De{constructor(){r(this,"pageMapping",new Map)}registerPageMapping(t,e){this.pageMapping.set(t,e)}buildRequest(t,e,s,i="unknown"){const n=this.extractPageName(t.currentPage),a=this.pageMapping.get(n),l=(a==null?void 0:a.fields)||this.getAllFieldIds(t.fieldRegistry),c={};for(const u of l){const f=t.fieldRegistry.get(u);f&&(c[u]=f.value??null)}const h={page:n,trigger:{event:e.event,field:e.field},context:{timestamp:new Date().toISOString(),extensionVersion:"1.0.0",sessionId:s,userId:i},form:c};return console.log("[ValidationRequestBuilder] Built request for page:",n),h}extractPageName(t){try{const i=new URL(t).pathname.split("/").filter(n=>n.length>0);if(i.length>0){const n=i[i.length-1];return n.charAt(0).toUpperCase()+n.slice(1)}}catch{}return"Diagnosis"}getAllFieldIds(t){return t.getAll().map(e=>e.id)}}var ot=(o=>(o.LOCAL_ONLY="LOCAL_ONLY",o.LOCAL_FAILED="LOCAL_FAILED",o.REMOTE_REQUIRED="REMOTE_REQUIRED",o.REMOTE_SKIPPED="REMOTE_SKIPPED",o))(ot||{});class Oe{static mapToValidationResult(t,e){const s=e.get(t.field);if(!s)return console.warn(`[AIResponseMapper] Field not found: ${t.field}`),null;const i=this.mapSeverityToLevel(t.severity),n={aiCode:t.code,severity:t.severity,canAutoFix:t.canAutoFix};return t.explain&&(n.explain=t.explain),{ruleId:`AI_${t.code}`,field:s,level:i,title:`AI: ${t.code}`,message:t.message,suggestion:t.suggestion,canExplain:!!t.explain,metadata:n}}static mapSeverityToLevel(t){switch(t.toLowerCase()){case"error":return"error";case"warning":return"warning";case"info":return"info";case"hint":return"info";default:return console.warn(`[AIResponseMapper] Unknown severity: ${t}`),"warning"}}}class qe{process(t,e,s){console.log("[AI] Processing response...");const i=[];for(const a of t.issues){const l=Oe.mapToValidationResult(a,s);l&&i.push(l)}console.log(`[AI] ${i.length} issues found`);const n=this.mergeResults(e,i);return console.log("[AI] Merged with local results"),console.log("[AI] Done"),n}mergeResults(t,e){const s=[],i=new Set;for(const n of t)s.push(n),i.add(this.getResultKey(n));for(const n of e){const a=this.getResultKey(n);if(i.has(a)){console.log(`[AI] Duplicate detected for: ${n.field.id} - ${n.message}`);continue}if(t.find(c=>c.field.id===n.field.id&&c.level==="error")&&n.level!=="error"){console.log(`[AI] Skipping ${n.level} for ${n.field.id} - local error already present`);continue}s.push(n),i.add(a)}return s}getResultKey(t){return`${t.field.id}|${t.message}|${t.ruleId}`}}class Ne{constructor(t,e,s,i){r(this,"engine");r(this,"apiClient");r(this,"requestBuilder");r(this,"responseProcessor");r(this,"sessionId");r(this,"userId");this.engine=t,this.apiClient=new Ve(i),this.requestBuilder=new De,this.responseProcessor=new qe,this.sessionId=e||this.generateSessionId(),this.userId=s||"unknown"}async validateField(t){console.log(`[Pipeline] Starting validation for field: ${t.currentField.id}`),console.log("[Pipeline] Running local validation...");const e=this.engine.validateField(t);if(e.some(h=>h.level==="error"))return console.log("[Pipeline] Local validation FAILED - stopping pipeline"),{decision:ot.LOCAL_FAILED,localPassed:!1,localResults:e,remoteCalled:!1,remoteResult:null,requestBody:void 0};console.log("[Pipeline] Local validation PASSED - continuing to remote validation"),console.log("[Pipeline] Building validation request...");const i={event:"change",field:t.currentField.id},n=this.requestBuilder.buildRequest(t,i,this.sessionId,this.userId);console.log("[Pipeline] Calling Validation API...");const{result:a,error:l}=await this.callValidationApi(n,t.currentField.id);let c=e;if(a&&a.isValid!==void 0){const h=a;c=this.responseProcessor.process(h,e,t.fieldRegistry),console.log(`[Pipeline] Processed AI response - ${c.length} total results`)}return{decision:ot.REMOTE_REQUIRED,localPassed:!0,localResults:c,remoteCalled:!0,remoteResult:a,requestBody:n,remoteError:l}}async validateForm(t){console.log("[Pipeline] Starting form validation"),console.log("[Pipeline] Running local validation for entire form...");const e=this.engine.validateForm(t);if(e.some(h=>h.level==="error"))return console.log("[Pipeline] Local validation FAILED - stopping pipeline"),{decision:ot.LOCAL_FAILED,localPassed:!1,localResults:e,remoteCalled:!1,remoteResult:null,requestBody:void 0};console.log("[Pipeline] Local validation PASSED - continuing to remote validation"),console.log("[Pipeline] Building validation request...");const i={event:"FormSubmit",field:"form"},n=this.requestBuilder.buildRequest(t,i,this.sessionId,this.userId);console.log("[Pipeline] Calling Validation API...");const{result:a,error:l}=await this.callValidationApi(n,"form");let c=e;if(a&&a.isValid!==void 0){const h=a;c=this.responseProcessor.process(h,e,t.fieldRegistry),console.log(`[Pipeline] Processed AI response - ${c.length} total results`)}return{decision:ot.REMOTE_REQUIRED,localPassed:!0,localResults:c,remoteCalled:!0,remoteResult:a,requestBody:n,remoteError:l}}async callValidationApi(t,e){try{return{result:await this.apiClient.validate(t,e),error:null}}catch(s){return console.error("[Pipeline] API call failed:",s),{result:null,error:`Không kết nối được máy chủ kiểm tra (${s instanceof Error?s.message:String(s)}). Kết quả hiển thị chỉ gồm kiểm tra cục bộ — các kiểm tra ICD, danh mục, BHYT chưa được thực hiện.`}}}registerPageMapping(t,e){this.requestBuilder.registerPageMapping(t,{name:t,fields:e})}generateSessionId(){return`session_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}setApiConfiguration(t){this.apiClient.setConfiguration(t)}getApiConfiguration(){return this.apiClient.getConfiguration()}}const C=class C{measure(){const t=this.readMemoryGb(),e=this.readCores(),s=this.budgetOf(t);return{memoryGb:t,cores:e,budgetBytes:s,maxFiles:Math.max(C.MIN_FILES,Math.floor(s/C.BYTES_PER_FILE)),parallelDownloads:Math.min(8,Math.max(2,Math.round(e/2))),summary:`RAM khoảng ${t} GB, ${e} luồng CPU`}}estimateSeconds(t,e){const s=t*C.DOWNLOAD_SECONDS_PER_FILE/e.parallelDownloads,i=t*C.VALIDATE_SECONDS_PER_FILE;return Math.ceil(s+i)}estimateWait(t,e){const s=this.estimateSeconds(t,e);return s<C.SECONDS_PER_MINUTE?`khoảng ${s} giây`:`khoảng ${Math.round(s/C.SECONDS_PER_MINUTE)} phút`}budgetOf(t){const e=t*C.BYTES_PER_GB*C.MEMORY_SHARE,s=this.freeHeapBytes(),i=s===null?e:Math.min(e,s*C.HEAP_SHARE);return Math.min(i,C.HARD_MAX_BYTES)}freeHeapBytes(){const t=performance.memory;return!t||!t.jsHeapSizeLimit?null:Math.max(0,t.jsHeapSizeLimit-t.usedJSHeapSize)}readMemoryGb(){const t=navigator.deviceMemory;return typeof t=="number"&&t>0?t:C.DEFAULT_MEMORY_GB}readCores(){const t=navigator.hardwareConcurrency;return typeof t=="number"&&t>0?t:C.DEFAULT_CORES}};r(C,"DEFAULT_MEMORY_GB",4),r(C,"DEFAULT_CORES",4),r(C,"MEMORY_SHARE",.2),r(C,"HEAP_SHARE",.6),r(C,"HARD_MAX_BYTES",900*1024*1024),r(C,"BYTES_PER_FILE",256*1024),r(C,"MIN_FILES",50),r(C,"DOWNLOAD_SECONDS_PER_FILE",.8),r(C,"VALIDATE_SECONDS_PER_FILE",.15),r(C,"BYTES_PER_GB",1024*1024*1024),r(C,"SECONDS_PER_MINUTE",60);let ft=C;const H=class H{async validateXml130(t,e,s){const i=await this.getBaseUrl(),n=new FormData;n.append("file",t,e);const a=await this.fetchWithTimeout(`${i}/api/xml130/validate?useAi=false`,{method:"POST",body:n,headers:await at()},s);if(await H.throwIfLicenseError(a),!a.ok)throw new Error(`API kiểm tra XML trả về lỗi HTTP ${a.status}`);return await a.json()}async validateXml130Batch(t,e){const s=await this.getBaseUrl(),i=new FormData;for(const a of t)i.append("files",a.blob,a.name);const n=await this.fetchWithTimeout(`${s}/api/xml130/validate-batch`,{method:"POST",body:i,headers:await at()},e,H.BATCH_REQUEST_TIMEOUT);if(await H.throwIfLicenseError(n),n.status===413)throw new Error("Lô file quá lớn so với giới hạn máy chủ (HTTP 413). Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.");if(!n.ok)throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${n.status}`);return await n.json()}async validateXml130BatchStream(t,e,s){const i=await this.getBaseUrl(),n=new FormData;for(const f of t)n.append("files",f.blob,f.name);let a;try{a=await fetch(`${i}/api/xml130/validate-batch-stream`,{method:"POST",body:n,headers:await at(),signal:s})}catch(f){throw f instanceof DOMException&&f.name==="AbortError"?new DOMException("Đã dừng theo yêu cầu.","AbortError"):new Error("Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.")}if(await H.throwIfLicenseError(a),a.status===413)throw new Error("Lô file quá lớn so với giới hạn máy chủ (HTTP 413). Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.");if(!a.ok||!a.body)throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${a.status}`);const l=a.body.getReader(),c=new TextDecoder;let h="";for(;;){const{done:f,value:g}=await l.read();if(f)break;h+=c.decode(g,{stream:!0});let w;for(;(w=h.indexOf(`
`))>=0;){const b=h.slice(0,w).trim();h=h.slice(w+1),b&&e(JSON.parse(b))}}const u=h.trim();u&&e(JSON.parse(u))}async ask(t,e){const s=await this.getBaseUrl(),i=await this.fetchWithTimeout(`${s}/api/assistant/ask`,{method:"POST",headers:{"Content-Type":"application/json",...await at()},body:JSON.stringify({question:t})},e);if(await H.throwIfLicenseError(i),!i.ok)throw new Error(`API hỏi đáp trả về lỗi HTTP ${i.status}`);return await i.json()}static async throwIfLicenseError(t){if(t.status!==401&&t.status!==403)return;const e=await t.json().catch(()=>null),s=Fe(t.status,e==null?void 0:e.message);if(s)throw new Error(s)}async getConfiguredBaseUrl(){return this.getBaseUrl()}async getBaseUrl(){return H.BASE_URL}async fetchWithTimeout(t,e,s,i=H.REQUEST_TIMEOUT){const n=new AbortController;let a=!1;const l=setTimeout(()=>{a=!0,n.abort()},i),c=()=>n.abort();s&&(s.aborted?n.abort():s.addEventListener("abort",c,{once:!0}));try{return await fetch(t,{...e,signal:n.signal})}catch(h){throw h instanceof DOMException&&h.name==="AbortError"?a?new Error(`Máy chủ xử lý quá lâu (quá ${Math.round(i/1e3)} giây). Lô quá nhiều file thì chia nhỏ theo tuần rồi thử lại.`):new DOMException("Đã dừng theo yêu cầu.","AbortError"):new Error("Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.")}finally{clearTimeout(l),s==null||s.removeEventListener("abort",c)}}};r(H,"BASE_URL","https://cbyts.vnpt.vn"),r(H,"REQUEST_TIMEOUT",18e4),r(H,"BATCH_REQUEST_TIMEOUT",9e5);let mt=H;const it=class it{renderValidationResult(t){if(t.found===!1||t.hosoCount===0){const a=t.summary||"File XML 130 không đủ thông tin để kiểm tra.";return`<div class="chat-banner chat-banner-warn">⚠ XML 130 không đủ thông tin</div>
                <div class="chat-result-text">${this.escape(a)}</div>`}const e=t.xuatToanRisk?'<div class="chat-banner chat-banner-risk">⚠ Hồ sơ có nguy cơ xuất toán</div>':'<div class="chat-banner chat-banner-ok">✔ Hồ sơ đạt</div>',s=[];t.maCskcb&&s.push(`Mã CSKCB: <b>${this.escape(t.maCskcb)}</b>`),s.push(`Số hồ sơ: <b>${t.hosoCount}</b>`),s.push(`Tổng vấn đề: <b>${t.totalIssues}</b>`);let i=e;i+=`<div class="chat-result-summary">${s.join(" · ")}</div>`,t.summary&&(i+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`),t.aiAssessment&&(i+=`<div class="chat-result-ai">🧠 ${this.escape(t.aiAssessment)}</div>`),t.crossIssues&&t.crossIssues.length>0&&(i+=this.renderCrossIssues(t.crossIssues));const n=(t.results??[]).map(a=>this.renderHoso(a)).join("");return n&&(i+=this.wrapExpand(t.totalIssues>0?`Chi tiết ${t.totalIssues} vấn đề (${t.hosoCount} hồ sơ)`:`Chi tiết ${t.hosoCount} hồ sơ`,n,!0)),i}wrapExpand(t,e,s=!1){return`
            <details class="chat-expand"${s?" open":""}>
                <summary>${this.escape(t)}</summary>
                <div class="chat-expand-body">${e}</div>
            </details>`}renderBatchValidationResult(t){var s,i,n,a;let e=`<div class="chat-result-summary">Số file: <b>${t.fileCount}</b> · Số hồ sơ: <b>${t.hosoCount}</b> · Tổng vấn đề: <b>${t.totalIssues}</b></div>`;t.summary&&(e+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`),e+=this.renderConflictMap(t.files??[]),e+=this.renderCrossIssues(t.crossIssues??[]);for(const l of t.files??[]){const c=l.error?`<div class="chat-issue chat-issue-error">❌ ${this.escape(l.error)}</div>`:l.result?this.renderValidationResult(l.result):"",h=l.error?"Không đọc được":((s=l.result)==null?void 0:s.found)===!1||((i=l.result)==null?void 0:i.hosoCount)===0?"Không đủ thông tin":(n=l.result)!=null&&n.xuatToanRisk?`${l.result.totalIssues} vấn đề — nguy cơ xuất toán`:`${((a=l.result)==null?void 0:a.totalIssues)??0} vấn đề`;e+=`
                <details class="chat-batch-file" open>
                    <summary>
                        <span class="chat-batch-file-name">📄 ${this.escape(l.fileName)}</span>
                        ${this.buildFileHosoLabel(l)}
                        <span class="chat-batch-note">${this.escape(h)}</span>
                    </summary>
                    <div class="chat-batch-file-body">${c}</div>
                </details>`}return e}buildFileHosoLabel(t){var a;const e=((a=t.result)==null?void 0:a.results)??[];if(e.length===0)return"";const s=e[0],i=[];if(s.hoTen&&i.push(s.hoTen),s.maLk&&i.push(`MA_LK ${s.maLk}`),i.length===0)return"";const n=e.length>1?` +${e.length-1} hồ sơ khác`:"";return`<span class="chat-batch-who">👤 ${this.escape(i.join(" · "))}${this.escape(n)}</span>`}renderConflictMap(t){const e=t.filter(a=>{var l;return(((l=a.conflictWith)==null?void 0:l.length)??0)>0});if(e.length===0)return"";const s=new Set,i=[];for(const a of e){const l=(a.conflictWith??[]).filter(c=>{const h=[a.fileName,c].sort().join("|");return s.has(h)?!1:(s.add(h),!0)});l.length!==0&&i.push(`
                <div class="chat-conflict-row">
                    <span class="chat-conflict-file">📄 ${this.escape(a.fileName)}</span>
                    <span class="chat-conflict-arrow">⇄</span>
                    <span class="chat-conflict-others">${l.map(c=>this.escape(c)).join(" · ")}</span>
                </div>`)}const n=i.join("");return`
            <div class="chat-conflict-map">
                <div class="chat-conflict-title">⚠ ${e.length} file có hồ sơ xung đột/chồng chéo với nhau:</div>
                ${n}
            </div>`}renderCrossIssues(t){if(t.length===0)return'<div class="chat-cross-clean">🔗 Đối chiếu chéo giữa các hồ sơ: không phát hiện trùng giường, trùng giờ bác sĩ hay trùng đợt điều trị.</div>';const e=t.map(s=>{const i=this.getSeverityIcon(s.severity),n=s.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",a=s.suggestion?`<div class="chat-issue-suggestion">💡 ${this.escape(s.suggestion)}</div>`:"",l=this.renderCrossHosoRefs(s);return`
                    <div class="chat-issue chat-issue-${s.severity}">
                        <div class="chat-issue-line">
                            ${i}
                            <span class="chat-issue-message">${this.escape(s.message)}</span>
                            ${n}
                        </div>
                        ${l}
                        ${a}
                    </div>`}).join("");return this.wrapExpand(`🔗 Đối chiếu chéo giữa các hồ sơ — ${t.length} vấn đề`,`<div class="chat-issue-group chat-cross-group">${e}</div>`,!0)}renderCrossHosoRefs(t){const e=t.hosos??[];return e.length===0?"":`<div class="chat-ref-list">${e.map(i=>{const n=this.escape(i.hoTen||i.maLk||"(không rõ)"),a=i.thoiDiem?` · ${this.escape(i.thoiDiem)}`:"",l=i.phatSinhTruoc?'<span class="chat-ref-badge chat-ref-first">✔ Phát sinh trước — hợp lệ</span>':'<span class="chat-ref-badge chat-ref-review">Cần rà soát</span>';return`
                    <div class="chat-ref-row">
                        <span class="chat-ref-name">${n}</span>
                        <span class="chat-ref-file">📄 ${this.escape(i.fileName)}${a}</span>
                        ${l}
                    </div>`}).join("")}</div>`}renderAnswer(t){let e=`<div class="chat-answer">${this.escape(t.answer)}</div>`;const s=t.citations??[];if(s.length>0){const i=s.map(n=>{const a=n.docNumber?` (${this.escape(n.docNumber)})`:"",l=n.excerpt?`<div class="chat-citation-excerpt">${this.escape(n.excerpt)}</div>`:"";return`<li class="chat-citation"><b>${this.escape(n.title)}</b>${a}${l}</li>`}).join("");e+=`
                <details class="chat-citations">
                    <summary>📚 Nguồn tham khảo (${s.length})</summary>
                    <ul>${i}</ul>
                </details>
            `}return e}renderStreamCross(t,e){return this.renderConflictMap(e)+this.renderCrossIssues(t)}renderStreamSummary(t,e,s){let i=`<div class="chat-result-summary">✅ Đã kiểm tra xong <b>${t.hosoCount??0}</b> hồ sơ · ⚠ <b>${t.riskCount??0}</b> hồ sơ nguy cơ xuất toán · tổng <b>${t.issueCount??0}</b> vấn đề · đối chiếu chéo <b>${t.crossCount??0}</b> vấn đề (đã hiện ở trên)</div>`;t.summary&&(i+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`);for(const[n,a]of s)i+=`
                <details class="chat-batch-file" open>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(n)}</span>
                        <span class="chat-batch-note">Không đọc được</span></summary>
                    <div class="chat-batch-file-body"><div class="chat-issue chat-issue-error">❌ ${this.escape(a)}</div></div>
                </details>`;for(const[n,a]of e){if(s.has(n))continue;const l=a.hosoCount===0?"Không đủ thông tin":a.riskCount>0?`${a.riskCount}/${a.hosoCount} hồ sơ nguy cơ xuất toán · ${a.issueCount} vấn đề`:`${a.hosoCount} hồ sơ · ${a.issueCount} vấn đề`,c=a.hosoCount-a.results.length,h=a.results.map(u=>this.renderHoso(u)).join("")+(c>0?`<div class="chat-hoso-clean">✔ ${c} hồ sơ còn lại không phát hiện vấn đề.</div>`:"");i+=`
                <details class="chat-batch-file"${a.results.length>0?" open":""}>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(n)}</span>
                        <span class="chat-batch-note">${this.escape(l)}</span></summary>
                    <div class="chat-batch-file-body">${h}</div>
                </details>`}return i}renderHoso(t){const e=t.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",s=`
            <div class="chat-hoso-header">
                <span class="chat-hoso-name">${this.escape(t.hoTen||t.maLk)}</span>
                ${e}
            </div>
            <div class="chat-hoso-meta">Mã LK: ${this.escape(t.maLk)} · Mã thẻ: ${this.escape(t.maThe)} · ${t.issueCount} vấn đề</div>
        `;if(!t.issues||t.issues.length===0)return`<div class="chat-hoso">${s}<div class="chat-hoso-clean">Không phát hiện vấn đề</div></div>`;let i="";for(const n of it.GROUP_ORDER){const a=t.issues.filter(h=>h.group===n);if(a.length===0)continue;const l=it.GROUP_TITLES[n],c=this.renderDedupedIssues(a);i+=`
                <div class="chat-issue-group">
                    <div class="chat-issue-group-title">${l} (${a.length})</div>
                    ${c}
                </div>
            `}return`<div class="chat-hoso">${s}${i}</div>`}renderDedupedIssues(t){const e=new Map;for(const s of t){const i=`${s.severity}|${s.table??""}|${s.field??""}|${s.message}`,n=e.get(i);n?(n.count++,s.rowIndex!==void 0&&s.rowIndex!==null&&n.rows.push(s.rowIndex)):e.set(i,{issue:s,rows:s.rowIndex!==void 0&&s.rowIndex!==null?[s.rowIndex]:[],count:1})}return[...e.values()].map(s=>this.renderIssue(s.issue,s.count,s.rows)).join("")}renderIssue(t,e=1,s=[]){const i=this.getSeverityIcon(t.severity),n=e>1?`<span class="chat-issue-count">×${e}</span>`:"",a=t.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",l=this.buildIssueLocation(t,s),c=t.suggestion?`<div class="chat-issue-suggestion">💡 ${this.escape(t.suggestion)}</div>`:"";return`
            <div class="chat-issue chat-issue-${t.severity}">
                <div class="chat-issue-line">
                    ${i}
                    <span class="chat-issue-message">${this.escape(t.message)}</span>
                    ${n}
                    ${a}
                </div>
                ${l}
                ${c}
            </div>
        `}buildIssueLocation(t,e=[]){const s=[];if(t.table&&s.push(`Bảng: ${this.escape(t.table)}`),t.field&&s.push(`Trường: ${this.escape(t.field)}`),e.length>1){const i=e.slice(0,10).join(", "),n=e.length>10?` (+${e.length-10} dòng nữa)`:"";s.push(`Dòng: ${i}${n}`)}else t.rowIndex!==void 0&&t.rowIndex!==null&&s.push(`Dòng: ${t.rowIndex}`);return t.value&&s.push(`Giá trị: "${this.escape(t.value)}"`),s.length>0?`<div class="chat-issue-location">${s.join(" · ")}</div>`:""}getSeverityIcon(t){return`<span class="chat-sev chat-sev-${t}">●</span>`}escape(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}};r(it,"GROUP_TITLES",{PatientInfo:"Thông tin bệnh nhân",Diagnosis:"Chẩn đoán",Service:"Dịch vụ kỹ thuật",Drug:"Thuốc",Time:"Thời gian",Finance:"Tài chính",Link:"Liên kết bảng",Admin:"Hành chính/Giấy tờ"}),r(it,"GROUP_ORDER",["PatientInfo","Diagnosis","Service","Drug","Time","Finance","Link","Admin"]);let bt=it;const Q=class Q{static title(t){return t===""?Q.TITLE:`${Q.TITLE} - ${t}`}static fileBase(t,e){const s=[Q.stamp(t),Q.FILE_TITLE];return e!==""&&s.push(e),s.join(" ")}static stamp(t){const e=n=>String(n).padStart(2,"0"),s=`${t.getFullYear()}${e(t.getMonth()+1)}${e(t.getDate())}`,i=`${e(t.getHours())}-${e(t.getMinutes())}-${e(t.getSeconds())}`;return`${s} ${i}`}static fromXmlFile(t){return t.replace(/\.xml$/i,"").trim()}static fromPatient(t,e){return[t.trim(),e.trim().replace(/[/\\]/g,"-")].filter(s=>s!=="").join(" ")}};r(Q,"TITLE","Kết quả kiểm tra XML 130"),r(Q,"FILE_TITLE","Kết quả kiểm tra XML130");let G=Q;const Xt={error:"LỖI",warning:"CẢNH BÁO",info:"THÔNG TIN"},Ue={PatientInfo:"Thông tin bệnh nhân",Diagnosis:"Chẩn đoán",Service:"Dịch vụ kỹ thuật",Drug:"Thuốc",Time:"Thời gian",Finance:"Tài chính",Link:"Liên kết bảng",Admin:"Hành chính/Giấy tờ"};class D{static fromValidation(t,e,s){const i=t.results??[],n=i.flatMap(l=>D.issueRows(l,s)),a=new Date;return{title:G.title(e),fileBase:G.fileBase(a,e),createdAt:D.now(a),stats:[{label:"Mã CSKCB",value:t.maCskcb||"-"},{label:"Số hồ sơ",value:String(t.hosoCount??0)},{label:"Tổng vấn đề",value:String(t.totalIssues??0)},{label:"Nguy cơ xuất toán",value:t.xuatToanRisk?"Có":"Không"}],summary:[t.summary,t.aiAssessment].filter(Boolean).join(`
`),crossIssues:D.crossRows(t.crossIssues??[]),issues:n,fileErrors:[],cleanHosoCount:i.filter(l=>{var c;return(((c=l.issues)==null?void 0:c.length)??0)===0}).length}}static fromStream(t,e,s,i,n){const a=[];let l=0;for(const[h,u]of e){l+=Math.max(0,u.hosoCount-u.results.length);for(const f of u.results)a.push(...D.issueRows(f,h))}const c=new Date;return{title:G.title(n),fileBase:G.fileBase(c,n),createdAt:D.now(c),stats:[{label:"Số file",value:String(e.size)},{label:"Số hồ sơ đã kiểm tra",value:String(t.hosoCount??0)},{label:"Hồ sơ nguy cơ xuất toán",value:String(t.riskCount??0)},{label:"Tổng vấn đề",value:String(t.issueCount??0)},{label:"Vấn đề đối chiếu chéo",value:String(t.crossCount??i.length)}],summary:t.summary??"",crossIssues:D.crossRows(i),issues:a,fileErrors:[...s].map(([h,u])=>({fileName:h,error:u})),cleanHosoCount:l}}static issueRows(t,e){return(t.issues??[]).map(s=>({fileName:e,hoTen:t.hoTen||"",maLk:t.maLk||"",maThe:t.maThe||"",severity:Xt[s.severity]??s.severity,group:Ue[s.group]??s.group,table:s.table??"",field:s.field??"",rowIndex:s.rowIndex===void 0||s.rowIndex===null?"":String(s.rowIndex),value:s.value??"",message:s.message,suggestion:s.suggestion??"",xuatToanRisk:s.xuatToanRisk?"Có":""}))}static crossRows(t){return t.map(e=>({severity:Xt[e.severity]??e.severity,message:e.message,suggestion:e.suggestion??"",xuatToanRisk:e.xuatToanRisk?"Có":"",hosos:(e.hosos??[]).map(s=>{const i=[s.hoTen||s.maLk||"(không rõ)",s.fileName];return s.thoiDiem&&i.push(s.thoiDiem),i.push(s.phatSinhTruoc?"phát sinh trước - hợp lệ":"cần rà soát"),i.join(" · ")}).join(`
`)}))}static now(t){const e=s=>String(s).padStart(2,"0");return`${e(t.getDate())}/${e(t.getMonth()+1)}/${t.getFullYear()} ${e(t.getHours())}:${e(t.getMinutes())}`}}const dt=class dt{constructor(t){r(this,"kept",[]);this.exporters=t}attach(t,e){const s=document.createElement("div");for(s.className="chat-download",s.innerHTML='<span class="chat-download-label">Tải kết quả</span>'+this.exporters.map(i=>`<button class="chat-download-btn" type="button" data-format="${i.id}" title="${this.escapeAttr(i.label)}" aria-label="${this.escapeAttr(i.label)}">${i.icon}</button>`).join(""),s.addEventListener("click",i=>{const n=i.target.closest("[data-format]");n&&this.run(n,s,e)}),t.appendChild(s),this.kept.push({bar:s,report:e});this.kept.length>dt.MAX_KEPT;)this.expire(this.kept.shift())}clear(){this.kept.length=0}async run(t,e,s){var a;const i=this.exporters.find(l=>l.id===t.dataset.format);if(!i)return;const n=e.querySelectorAll("[data-format]");n.forEach(l=>l.disabled=!0),e.classList.add("chat-download-busy");try{await i.export(s)}catch(l){const c=document.createElement("span");c.className="chat-download-error",c.textContent=`Không tạo được file: ${l instanceof Error?l.message:"lỗi không rõ"}`,(a=e.querySelector(".chat-download-error"))==null||a.remove(),e.appendChild(c)}finally{n.forEach(l=>l.disabled=!1),e.classList.remove("chat-download-busy")}}expire(t){t&&(t.bar.classList.add("chat-download-expired"),t.bar.innerHTML='<span class="chat-download-note">Đã qua nhiều lượt kiểm tra nên bản tải của lượt này không còn được giữ. Kiểm tra lại để tải bản mới.</span>')}escapeAttr(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}};r(dt,"MAX_KEPT",10);let yt=dt;function wt(o,t,e){return`<svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true"><path d="M6 2h8l6 6v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 21V4.5A2.5 2.5 0 0 1 6.5 2z" fill="${o}"/><path d="M14 2l6 6h-4.5A1.5 1.5 0 0 1 14 6.5z" fill="#ffffff" opacity="0.4"/><text x="12" y="18.5" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${e}" font-weight="700" letter-spacing="-0.3">${t}</text></svg>`}function O(o){return String(o??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Gt(o){return(o.replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g," ").trim()||"Ket qua kiem tra").slice(0,80)}function Qt(o,t){const e=URL.createObjectURL(o),s=document.createElement("a");s.href=e,s.download=t,s.style.display="none",document.body.appendChild(s),s.click(),s.remove(),window.setTimeout(()=>URL.revokeObjectURL(e),1e4)}const Kt=500;function xt(o,t=null){const e=[];if(e.push({title:"Tổng quan",headers:["Mục","Giá trị"],rows:[["Thời điểm kiểm tra",o.createdAt],...o.stats.map(s=>[s.label,s.value]),["Hồ sơ không phát hiện vấn đề",String(o.cleanHosoCount)],...o.summary?[["Nhận xét",o.summary]]:[]]}),o.crossIssues.length>0&&e.push({title:"Đối chiếu chéo",headers:["Mức độ","Vấn đề","Hồ sơ liên quan","Hướng xử lý","Nguy cơ xuất toán"],rows:o.crossIssues.map(s=>[s.severity,s.message,s.hosos,s.suggestion,s.xuatToanRisk])}),o.issues.length>0){const s=o.issues.map(n=>[n.fileName,n.hoTen,n.maLk,n.maThe,n.severity,n.group,n.table,n.field,n.rowIndex,n.value,n.message,n.suggestion,n.xuatToanRisk]),i=t!==null&&s.length>t;e.push({title:"Vấn đề theo hồ sơ",headers:["File","Họ tên","Mã LK","Mã thẻ","Mức độ","Nhóm","Bảng","Trường","Dòng","Giá trị","Vấn đề","Hướng xử lý","Nguy cơ xuất toán"],rows:i?s.slice(0,t):s,note:i?`Bản này chỉ in ${t}/${s.length} dòng cho dễ đọc. Tải bản Excel để có đủ toàn bộ.`:void 0})}return o.fileErrors.length>0&&e.push({title:"File không đọc được",headers:["File","Lý do"],rows:o.fileErrors.map(s=>[s.fileName,s.error])}),e}const ut=class ut{constructor(){r(this,"id","pdf");r(this,"icon",wt("#e2453b","PDF",7));r(this,"label",'Tải bản PDF (mở hộp in → chọn "Lưu thành PDF")')}async export(t){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;";const s=new Promise(a=>{e.addEventListener("load",()=>a(),{once:!0})});e.srcdoc=this.buildHtml(t),document.body.appendChild(e),await s;const i=e.contentWindow;if(!i){e.remove();return}const n=()=>e.remove();i.addEventListener("afterprint",n,{once:!0}),window.setTimeout(n,ut.CLEANUP_MS),i.focus(),i.print()}buildHtml(t){const s=xt(t,Kt).map(i=>this.section(i)).join("");return`<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>${O(t.fileBase)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 10.5px; margin: 0; }
    h1 { font-size: 17px; margin: 0 0 4px; color: #4f46e5; }
    h2 { font-size: 13px; margin: 16px 0 6px; color: #4f46e5; page-break-after: avoid; }
    .meta { color: #6b7280; font-size: 10px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 5px; vertical-align: top; word-wrap: break-word; }
    th { background: #eef1f8; text-align: left; font-weight: 700; }
    tr { page-break-inside: avoid; }
    .note { color: #6b7280; font-style: italic; margin-top: 4px; }
</style></head><body>
<h1>${O(t.title)}</h1>
<div class="meta">Xuất lúc ${O(t.createdAt)} từ extension ZeroCheck AI</div>
${s}
</body></html>`}section(t){const e=t.headers.map(n=>`<th>${O(n)}</th>`).join(""),s=t.rows.map(n=>`<tr>${n.map(a=>`<td>${O(String(a??"")).replace(/\n/g,"<br>")}</td>`).join("")}</tr>`).join(""),i=t.note?`<div class="note">${O(t.note)}</div>`:"";return`<h2>${O(t.title)}</h2><table><thead><tr>${e}</tr></thead><tbody>${s}</tbody></table>${i}`}};r(ut,"CLEANUP_MS",12e4);let vt=ut;const Y=class Y{static build(t,e){const s=new TextEncoder,i=[],n=[],a=Y.dosStamp(new Date);let l=0;for(const f of t){const g=s.encode(f.name),w=Y.crc32(f.data),b=f.data.length,T=new Uint8Array(30+g.length),M=new DataView(T.buffer);M.setUint32(0,67324752,!0),M.setUint16(4,20,!0),M.setUint16(6,2048,!0),M.setUint16(8,0,!0),M.setUint16(10,a.time,!0),M.setUint16(12,a.date,!0),M.setUint32(14,w,!0),M.setUint32(18,b,!0),M.setUint32(22,b,!0),M.setUint16(26,g.length,!0),T.set(g,30),i.push(T,f.data);const p=new Uint8Array(46+g.length),k=new DataView(p.buffer);k.setUint32(0,33639248,!0),k.setUint16(4,20,!0),k.setUint16(6,20,!0),k.setUint16(8,2048,!0),k.setUint16(10,0,!0),k.setUint16(12,a.time,!0),k.setUint16(14,a.date,!0),k.setUint32(16,w,!0),k.setUint32(20,b,!0),k.setUint32(24,b,!0),k.setUint16(28,g.length,!0),k.setUint32(42,l,!0),p.set(g,46),n.push(p),l+=T.length+b}const c=n.reduce((f,g)=>f+g.length,0),h=new Uint8Array(22),u=new DataView(h.buffer);return u.setUint32(0,101010256,!0),u.setUint16(8,t.length,!0),u.setUint16(10,t.length,!0),u.setUint32(12,c,!0),u.setUint32(16,l,!0),new Blob([...i,...n,h],{type:e})}static text(t){return new TextEncoder().encode(t)}static crc32(t){const e=Y.crcTable??(Y.crcTable=Y.buildCrcTable());let s=4294967295;for(let i=0;i<t.length;i++)s=s>>>8^e[(s^t[i])&255];return(s^4294967295)>>>0}static buildCrcTable(){const t=new Uint32Array(256);for(let e=0;e<256;e++){let s=e;for(let i=0;i<8;i++)s=s&1?3988292384^s>>>1:s>>>1;t[e]=s>>>0}return t}static dosStamp(t){const e=t.getFullYear()-1980<<9|t.getMonth()+1<<5|t.getDate(),s=t.getHours()<<11|t.getMinutes()<<5|Math.floor(t.getSeconds()/2);return{date:e,time:s}}};r(Y,"crcTable",null);let P=Y;const K=class K{constructor(){r(this,"id","word");r(this,"icon",wt("#2b579a","W",10));r(this,"label","Tải bản Word (.docx)")}async export(t){const e=xt(t,Kt),i=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${this.heading(t.title,1)+this.paragraph(`Xuất lúc ${t.createdAt} từ extension ZeroCheck AI`,{italic:!0})+e.map(a=>this.section(a)).join("")+this.sectionProperties()}</w:body></w:document>`,n=[{name:"[Content_Types].xml",data:P.text(K.CONTENT_TYPES)},{name:"_rels/.rels",data:P.text(K.ROOT_RELS)},{name:"word/document.xml",data:P.text(i)}];Qt(P.build(n,"application/vnd.openxmlformats-officedocument.wordprocessingml.document"),`${Gt(t.fileBase)}.docx`)}section(t){const e=Math.floor(K.USABLE_WIDTH/t.headers.length),s=this.row(t.headers,e,!0),i=t.rows.map(a=>this.row(a,e,!1)).join(""),n=t.note?this.paragraph(t.note,{italic:!0}):"";return this.heading(t.title,2)+'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+["top","left","bottom","right","insideH","insideV"].map(a=>`<w:${a} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`).join("")+`</w:tblBorders></w:tblPr>${s}${i}</w:tbl>`+n}row(t,e,s){return`<w:tr>${t.map(n=>`<w:tc><w:tcPr><w:tcW w:w="${e}" w:type="dxa"/>`+(s?'<w:shd w:val="clear" w:color="auto" w:fill="EEF1F8"/>':"")+`</w:tcPr>${this.paragraph(n,{bold:s})}</w:tc>`).join("")}</w:tr>`}heading(t,e){return this.paragraph(t,{bold:!0,size:e===1?32:26,spaceBefore:240})}paragraph(t,e={}){const s="<w:rPr>"+(e.bold?"<w:b/>":"")+(e.italic?"<w:i/>":"")+(e.size?`<w:sz w:val="${e.size}"/>`:'<w:sz w:val="20"/>')+"</w:rPr>",i=String(t??"").split(`
`).map((a,l)=>{const c=l>0?"<w:br/>":"";return`<w:r>${s}${c}<w:t xml:space="preserve">${O(a)}</w:t></w:r>`}).join("");return`<w:p>${e.spaceBefore?`<w:pPr><w:spacing w:before="${e.spaceBefore}"/></w:pPr>`:""}${i}</w:p>`}sectionProperties(){return'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1440" w:bottom="1134" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'}};r(K,"USABLE_WIDTH",16838-1440*2),r(K,"CONTENT_TYPES",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),r(K,"ROOT_RELS",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');let kt=K;const z=class z{constructor(){r(this,"id","excel");r(this,"icon",wt("#217346","X",10));r(this,"label","Tải bản Excel (.xlsx) - đầy đủ, lọc được")}async export(t){const e=xt(t),s=this.uniqueSheetNames(e),i=[{name:"[Content_Types].xml",data:P.text(this.contentTypes(e.length))},{name:"_rels/.rels",data:P.text(z.ROOT_RELS)},{name:"xl/workbook.xml",data:P.text(this.workbook(s))},{name:"xl/_rels/workbook.xml.rels",data:P.text(this.workbookRels(e.length))},...e.map((n,a)=>({name:`xl/worksheets/sheet${a+1}.xml`,data:P.text(this.sheet(n))}))];Qt(P.build(i,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),`${Gt(t.fileBase)}.xlsx`)}sheet(t){const s=[t.headers,...t.rows,...t.note?[[t.note]]:[]].map((n,a)=>{const l=n.map((c,h)=>{const u=`${this.columnName(h)}${a+1}`,f=String(c??"").replace(/\n/g," | ");return`<c r="${u}" t="inlineStr"><is><t xml:space="preserve">${O(f)}</t></is></c>`}).join("");return`<row r="${a+1}">${l}</row>`}).join(""),i=`<cols><col min="1" max="${Math.max(1,t.headers.length)}" width="26" customWidth="1"/></cols>`;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${z.NS}">${i}<sheetData>${s}</sheetData></worksheet>`}columnName(t){let e="",s=t;do e=String.fromCharCode(65+s%26)+e,s=Math.floor(s/26)-1;while(s>=0);return e}uniqueSheetNames(t){const e=new Set;return t.map((s,i)=>{const n=s.title.replace(/[:\\/?*[\]]/g," ").slice(0,z.SHEET_NAME_MAX)||`Phần ${i+1}`;let a=n,l=2;for(;e.has(a);)a=`${n.slice(0,z.SHEET_NAME_MAX-2)} ${l++}`;return e.add(a),a})}workbook(t){const e=t.map((s,i)=>`<sheet name="${O(s)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${z.NS}" xmlns:r="${z.NS_REL}"><sheets>${e}</sheets></workbook>`}workbookRels(t){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({length:t},(s,i)=>`<Relationship Id="rId${i+1}" Type="${z.NS_REL}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}</Relationships>`}contentTypes(t){return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+Array.from({length:t},(s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")+"</Types>"}};r(z,"NS","http://schemas.openxmlformats.org/spreadsheetml/2006/main"),r(z,"NS_REL","http://schemas.openxmlformats.org/officeDocument/2006/relationships"),r(z,"SHEET_NAME_MAX",31),r(z,"ROOT_RELS",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');let Et=z;const J=class J{async downloadXml130(t,e){const s=await this.getEndpointTemplate()??J.DEFAULT_ENDPOINT;if(!s)return console.log("[HisXmlDownloader] Chưa cấu hình hisXmlEndpoint"),null;const i=typeof location<"u"?location.origin:"",n=encodeURIComponent(t),a=s.replace("{origin}",i).replace("{soVaoVien}",n).replace("{patientCode}",n);console.log(`[HisXmlDownloader] GET ${a}`);const l=await fetch(a,{credentials:"include",signal:e});if(l.status===401||l.status===403)throw new Error("HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào HIS trên trình duyệt rồi thử lại.");if(!l.ok)throw new Error(`HIS trả về lỗi HTTP ${l.status} khi tải XML 130.`);const c=await l.text(),h=c.trimStart().slice(0,200).toLowerCase();if(!h.startsWith("<?xml")&&(h.includes("<!doctype html")||h.includes("dangnhap")||h.includes("loginform")))throw new Error("Chưa đăng nhập HIS hoặc không có quyền tải hồ sơ này. Hãy đăng nhập vào HIS trên trình duyệt rồi thử lại.");if(c.trim()==="")throw new Error("Không tìm thấy hồ sơ cho số vào viện này. Kiểm tra lại số vào viện.");return c}async getEndpointTemplate(){var t;try{if(typeof chrome<"u"&&((t=chrome.storage)!=null&&t.local)){const s=(await chrome.storage.local.get(J.STORAGE_KEY_ENDPOINT))[J.STORAGE_KEY_ENDPOINT];if(typeof s=="string"&&s.trim()!=="")return s.trim()}}catch(e){console.warn("[HisXmlDownloader] Không đọc được cấu hình endpoint:",e)}return null}};r(J,"STORAGE_KEY_ENDPOINT","hisXmlEndpoint"),r(J,"DEFAULT_ENDPOINT","{origin}/web_his/api/xuatFileXmlCV130?loaiKcb=1&coBaoHiem=1&maHoa=0&soVaoVien={soVaoVien}");let At=J;const We="__zcPaymentList__",Ye="__zcPaymentListRequest__",Xe="__zcPaymentRow__",Ge="kiemtrabangke";class st{constructor(){r(this,"snapshot",null);r(this,"selectedRow",null);r(this,"listeners",[]);document.addEventListener(We,t=>this.onSnapshot(t)),document.addEventListener(Xe,t=>this.onRow(t));try{document.dispatchEvent(new CustomEvent(Ye))}catch{}}static isSupportedPage(){return typeof location<"u"&&location.pathname.toLowerCase().includes(Ge)}hasSearched(){return this.snapshot!==null}getTickets(){var t;return((t=this.snapshot)==null?void 0:t.items)??[]}getAdmissionNumbers(){const t=new Set,e=[];for(const s of this.getTickets())t.has(s.soVaoVien)||(t.add(s.soVaoVien),e.push(s.soVaoVien));return e}findTicket(t){return this.getTickets().find(e=>e.soVaoVien===t)??null}getSelectedAdmission(){var t;return((t=this.selectedRow)==null?void 0:t.soVaoVien)??null}getSelectedPatientName(){const t=this.selectedRow;if(!t)return null;if(t.tenBenhNhan!=="")return t.tenBenhNhan;const e=this.findTicket(t.soVaoVien);return e&&e.tenBenhNhan!==""?e.tenBenhNhan:null}onChange(t){this.listeners.push(t)}onSnapshot(t){const e=st.parse(t);!e||!Array.isArray(e.items)||(this.snapshot=e,this.selectedRow=null,console.log(`[PaymentListStore] Đã nhớ ${e.items.length} phiếu thanh toán`),this.notify())}onRow(t){const e=st.parse(t);!e||typeof e.soVaoVien!="string"||e.soVaoVien===""||(this.selectedRow=e,this.notify())}notify(){this.listeners.forEach(t=>t())}static parse(t){const e=t.detail;if(typeof e!="string")return null;try{return JSON.parse(e)}catch(s){return console.warn("[PaymentListStore] Không đọc được dữ liệu bảng kê:",s),null}}}class jt{constructor(t){r(this,"host");r(this,"overlay",null);r(this,"settle",null);r(this,"onKeyDown",t=>{t.key==="Escape"?(t.preventDefault(),this.close(!1)):t.key==="Enter"&&(t.preventDefault(),this.close(!0))});this.host=t}ask(t){return this.close(!1),new Promise(e=>{this.settle=e;const s=document.createElement("div");s.className="zc-confirm",s.innerHTML=`
                <div class="zc-confirm-box" role="dialog" aria-modal="true">
                    <div class="zc-confirm-head">
                        <span class="zc-confirm-icon">${t.icon??"❓"}</span>
                        <span class="zc-confirm-title"></span>
                    </div>
                    <div class="zc-confirm-text">${t.messageHtml}</div>
                    <div class="zc-confirm-actions">
                        <button class="zc-confirm-btn cancel"></button>
                        <button class="zc-confirm-btn ok"></button>
                    </div>
                </div>`;const i=s.querySelector(".zc-confirm-title");i&&(i.textContent=t.title);const n=s.querySelector(".zc-confirm-btn.cancel"),a=s.querySelector(".zc-confirm-btn.ok");n&&(n.textContent=t.cancelLabel??"Hủy"),a&&(a.textContent=t.confirmLabel??"Đồng ý"),n==null||n.addEventListener("click",()=>this.close(!1)),a==null||a.addEventListener("click",()=>this.close(!0)),s.addEventListener("click",l=>{l.target===s&&this.close(!1)}),s.addEventListener("keydown",this.onKeyDown),this.host.appendChild(s),this.overlay=s,requestAnimationFrame(()=>s.classList.add("open")),a==null||a.focus()})}close(t){var s;(s=this.overlay)==null||s.remove(),this.overlay=null;const e=this.settle;this.settle=null,e==null||e(t)}static styles(){return`
            .zc-confirm {
                position: absolute;
                inset: 0;
                z-index: 30;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(15, 23, 42, 0.45);
                opacity: 0;
                transition: opacity 0.15s ease;
            }
            .zc-confirm.open { opacity: 1; }

            .zc-confirm-box {
                width: 100%;
                max-width: 340px;
                background: #ffffff;
                border-radius: 14px;
                box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
                padding: 16px;
                transform: translateY(8px) scale(0.97);
                transition: transform 0.15s ease;
            }
            .zc-confirm.open .zc-confirm-box { transform: none; }

            .zc-confirm-head {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            .zc-confirm-icon { font-size: 18px; }
            .zc-confirm-title {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
            }
            .zc-confirm-text {
                font-size: 13px;
                line-height: 1.55;
                color: #334155;
            }
            .zc-confirm-text b { color: var(--zc-accent-deep, #2563eb); }

            .zc-confirm-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 16px;
            }
            .zc-confirm-btn {
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                color: #475569;
            }
            .zc-confirm-btn.cancel:hover { background: #f1f5f9; }
            .zc-confirm-btn.ok {
                border-color: var(--zc-accent-deep, #2563eb);
                background: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
            }
            .zc-confirm-btn.ok:hover { filter: brightness(1.08); }
            .zc-confirm-btn:focus-visible { outline: 2px solid var(--zc-accent-deep, #2563eb); outline-offset: 2px; }
        `}}const gt=class gt{constructor(t,e,s,i,n){r(this,"apiClient");r(this,"xmlDownloader");r(this,"renderer");r(this,"container");r(this,"panel");r(this,"paymentList");r(this,"confirmDialog");r(this,"capacity",new ft);r(this,"downloads",new yt([new vt,new kt,new Et]));r(this,"mode","hoi");r(this,"messagesEl",null);r(this,"inputEl",null);r(this,"fileInputEl",null);r(this,"sendBtnEl",null);r(this,"isBusy",!1);r(this,"abortController",null);r(this,"welcomeEl",null);r(this,"welcomeCollapsed",!1);r(this,"welcomeUserDecided",!1);r(this,"robot",null);r(this,"fileQueue",[]);r(this,"fileSeq",0);r(this,"trayEl",null);r(this,"plusMenuEl",null);this.apiClient=e??new mt,this.xmlDownloader=s??new At,this.renderer=i??new bt,this.paymentList=n??new st,this.panel=t,this.container=t.getTabContainer("chat"),this.container.classList.add("chat-root"),this.confirmDialog=new jt(this.container),t.addStyles(this.getStyles()),t.addStyles(jt.styles()),this.createUI(),this.paymentList.onChange(()=>this.renderPaymentBar())}setBusy(t){var i,n;this.isBusy=t,t?this.panel.beginChecking():this.panel.endChecking(),(i=this.robot)==null||i.notifyThinking(t),this.container.classList.toggle("chat-busy",t),this.inputEl&&(this.inputEl.disabled=t,this.inputEl.placeholder=t?"Đang xử lý — bấm ■ để dừng...":this.placeholderFor(this.mode));const e=this.container.querySelector(".chat-attach");e&&(e.disabled=t);const s=this.container.querySelector(".chat-plus");s&&(s.disabled=t),t&&this.hidePlusMenu(),this.sendBtnEl&&(this.sendBtnEl.disabled=!1,this.sendBtnEl.classList.toggle("chat-stop",t),this.sendBtnEl.textContent=t?"■":"➤",this.sendBtnEl.title=t?"Dừng":"Gửi"),t||(n=this.inputEl)==null||n.focus(),this.renderTray(),this.renderPaymentBar()}abortCurrent(){var t;(t=this.abortController)==null||t.abort()}isAbort(t){return t instanceof DOMException&&t.name==="AbortError"}addLoadingMessage(t){return this.addBotHtml(`<span class="chat-spinner"></span><span class="chat-loading-text">${t}</span>`)}focusInput(){var t;(t=this.inputEl)==null||t.focus()}attachRobot(t){this.robot=t}createUI(){this.container.innerHTML=`
            <div class="chat-messages"></div>
            <div class="chat-drop-hint">📄 Thả file XML vào đây để kiểm tra</div>
            <div class="chat-bangke" hidden></div>
            <div class="chat-tray" hidden></div>
            <div class="chat-input-wrap">
                <div class="chat-plus-menu" hidden></div>
                <div class="chat-input-row">
                    <button class="chat-clear" title="Xóa lịch sử hội thoại">🧹</button>
                    <button class="chat-attach" title="Đính kèm file XML 130">📎</button>
                    <div class="chat-input-box">
                        <button class="chat-plus" title="Chọn lựa chọn">+</button>
                        <input class="chat-input" type="text" />
                        <button class="chat-send" title="Gửi">➤</button>
                    </div>
                </div>
            </div>
            <input class="chat-file" type="file" accept=".xml" multiple hidden />
        `,this.messagesEl=this.container.querySelector(".chat-messages"),this.inputEl=this.container.querySelector(".chat-input"),this.fileInputEl=this.container.querySelector(".chat-file"),this.sendBtnEl=this.container.querySelector(".chat-send"),this.trayEl=this.container.querySelector(".chat-tray"),this.plusMenuEl=this.container.querySelector(".chat-plus-menu"),this.inputEl&&(this.inputEl.placeholder=this.placeholderFor(this.mode)),this.attachEvents(),this.showWelcome(),this.renderPaymentBar(),console.log("[ChatPanel] UI created")}showWelcome(){var e;this.welcomeEl=null;const t=this.addBotHtml('<button class="chat-welcome-toggle" type="button">💡</button><div class="chat-welcome-body">Xin chào! Bạn gõ câu hỏi nghiệp vụ BHYT vào ô bên dưới là tôi trả lời ngay.<br/>Bấm nút <b>+</b> để đổi chế độ:<br/>• <b>Hỏi thông tin y tế</b> — hỏi nghiệp vụ BHYT (đang chọn sẵn).<br/>• <b>Kiểm tra số vào viện</b> — tải hồ sơ XML 130 từ HIS và kiểm tra xuất toán.<br/>Hoặc bấm 📎 để đính kèm nhiều file <b>XML 130</b> kiểm tra hàng loạt — từ 2 file trở lên sẽ tự động <b>đối chiếu chéo</b> giữa các hồ sơ (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị).<br/>Riêng ở màn hình <b>Kiểm tra bảng kê</b>, sau khi bấm <b>Xem thông tin</b> sẽ có thêm hai nút ngay trên ô nhập, khỏi phải xuất file hay gõ tay số vào viện:<br/>• <b>📋 Kiểm tra (n) file XML130</b> — lấy trọn danh sách phiếu vừa tìm, tải hồ sơ từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo.<br/>• <b>🔎 Kiểm tra XML130 cho BN</b> — chỉ hồ sơ của dòng bảng kê bạn đang chọn (chưa chọn dòng nào thì nút còn khóa).</div>');t.classList.add("chat-msg-wide","chat-welcome"),(e=t.querySelector(".chat-welcome-toggle"))==null||e.addEventListener("click",()=>this.setWelcomeCollapsed(!this.welcomeCollapsed,!0)),this.welcomeEl=t,this.welcomeCollapsed=!1,this.welcomeUserDecided=!1,this.syncWelcomeToggle()}collapseWelcomeOnFirstUse(){!this.welcomeEl||this.welcomeCollapsed||this.welcomeUserDecided||this.setWelcomeCollapsed(!0,!1)}setWelcomeCollapsed(t,e){this.welcomeEl&&(this.welcomeCollapsed=t,e&&(this.welcomeUserDecided=!0),this.welcomeEl.classList.toggle("chat-welcome-collapsed",t),this.syncWelcomeToggle())}syncWelcomeToggle(){var s;const t=(s=this.welcomeEl)==null?void 0:s.querySelector(".chat-welcome-toggle");if(!t)return;const e=this.welcomeCollapsed?"Mở lại hướng dẫn nhanh":"Thu gọn hướng dẫn nhanh";t.title=e,t.setAttribute("aria-label",e),t.setAttribute("aria-expanded",String(!this.welcomeCollapsed))}clearHistory(){this.isBusy||(this.fileQueue=[],this.renderTray(),this.messagesEl&&(this.messagesEl.innerHTML=""),this.downloads.clear(),this.showWelcome())}attachDownload(t,e,s,i){this.downloads.attach(t,D.fromValidation(e,s,i))}patientSubject(t,e){var l;const s=this.paymentList.findTicket(t),i=(l=e.results)==null?void 0:l[0],n=(s==null?void 0:s.tenBenhNhan)||(i==null?void 0:i.hoTen)||"",a=G.fromPatient(n,(s==null?void 0:s.ngayKham)||(i==null?void 0:i.ngayVao)||"");return a===""?`số vào viện ${t}`:a}attachEvents(){var n,a,l,c;const t=this.container.querySelector(".chat-clear");t==null||t.addEventListener("click",()=>this.clearHistory());const e=this.container.querySelector(".chat-send");e==null||e.addEventListener("click",()=>{this.isBusy?this.abortCurrent():this.handleSend()}),(n=this.inputEl)==null||n.addEventListener("keydown",h=>{h.key==="Enter"&&!h.shiftKey&&(h.preventDefault(),this.isBusy||this.handleSend())}),(a=this.inputEl)==null||a.addEventListener("input",()=>{var h;this.isBusy||(h=this.robot)==null||h.notifyTyping()});const s=this.container.querySelector(".chat-plus");s==null||s.addEventListener("click",h=>{h.stopPropagation(),this.togglePlusMenu()}),this.container.addEventListener("click",h=>{const u=h.target;!u.closest(".chat-plus")&&!u.closest(".chat-plus-menu")&&this.hidePlusMenu()});const i=this.container.querySelector(".chat-attach");i==null||i.addEventListener("click",()=>{var h;return(h=this.fileInputEl)==null?void 0:h.click()}),(l=this.fileInputEl)==null||l.addEventListener("change",()=>{var h,u;(u=(h=this.fileInputEl)==null?void 0:h.files)!=null&&u.length&&this.addFilesToQueue(this.fileInputEl.files),this.fileInputEl&&(this.fileInputEl.value="")}),(c=this.messagesEl)==null||c.addEventListener("toggle",h=>{const u=h.target;u instanceof HTMLDetailsElement&&u.open&&u.scrollIntoView({block:"nearest",behavior:"smooth"})},!0),this.container.addEventListener("dragover",h=>{h.preventDefault(),h.stopPropagation(),this.container.classList.add("dragging")}),this.container.addEventListener("dragleave",h=>{h.preventDefault(),h.stopPropagation(),this.container.classList.remove("dragging")}),this.container.addEventListener("drop",h=>{var u,f;h.preventDefault(),h.stopPropagation(),this.container.classList.remove("dragging"),(f=(u=h.dataTransfer)==null?void 0:u.files)!=null&&f.length&&this.addFilesToQueue(h.dataTransfer.files)})}placeholderFor(t){return t==="svv"?"Nhập số vào viện để kiểm tra XML 130...":"Nhập câu hỏi nghiệp vụ BHYT..."}setMode(t){var e;this.mode=t,this.inputEl&&!this.isBusy&&(this.inputEl.placeholder=this.placeholderFor(t)),(e=this.inputEl)==null||e.focus()}togglePlusMenu(){if(this.plusMenuEl){if(!this.plusMenuEl.hidden){this.hidePlusMenu();return}this.plusMenuEl.innerHTML=gt.MODE_OPTIONS.map(t=>`
                <div class="chat-menu-item${t.mode===this.mode?" active":""}" data-mode="${t.mode}">
                    <span class="chat-menu-icon">${t.icon}</span>
                    <span class="chat-menu-label">${t.label}</span>
                    ${t.mode===this.mode?'<span class="chat-menu-check">✓</span>':""}
                </div>`).join(""),this.plusMenuEl.hidden=!1,this.plusMenuEl.querySelectorAll(".chat-menu-item").forEach(t=>{t.addEventListener("click",()=>{this.setMode(t.dataset.mode),this.hidePlusMenu()})})}}hidePlusMenu(){this.plusMenuEl&&(this.plusMenuEl.hidden=!0,this.plusMenuEl.innerHTML="")}handleSend(){var e;if(!this.inputEl||this.isBusy)return;const t=this.inputEl.value.trim();if(t){if(this.mode==="svv"){const s=(e=t.match(/\d+/))==null?void 0:e[0];if(!s){this.addBotHtml("Đang ở chế độ <b>Số vào viện</b> — hãy nhập một số vào viện (dãy số). Muốn hỏi nghiệp vụ thì bấm nút <b>Hỏi</b> phía trên.");return}this.inputEl.value="",this.addUserMessage(t),this.handleAdmissionCheck(s);return}if(this.isTooVague(t)){this.inputEl.value="",this.addUserMessage(t),this.addBotHtml("Câu hỏi hơi ngắn nên tôi chưa rõ ý. Bạn nêu cụ thể hơn giúp tôi nhé.");return}this.inputEl.value="",this.addUserMessage(t),this.handleQuestion(t)}}isTooVague(t){const s=t.trim().replace(/[^\p{L}]/gu,"");return!!(s.length<3||new RegExp("^(\\p{L})\\1*$","u").test(s))}addFilesToQueue(t){if(this.isBusy){this.addBotHtml("⏳ Đang xử lý lượt kiểm tra hiện tại — chờ xong rồi thêm file nhé.");return}const e=Array.from(t),s=e.filter(n=>n.name.toLowerCase().endsWith(".xml")),i=e.length-s.length;i>0&&this.addBotHtml(`⚠ Đã bỏ qua ${i} file không phải <b>.xml</b> (chỉ nhận hồ sơ XML 130).`);for(const n of s)this.fileQueue.push({id:++this.fileSeq,file:n,status:"pending",abort:null,note:""});this.renderTray()}renderTray(){if(!this.trayEl)return;if(this.fileQueue.length===0){this.trayEl.hidden=!0,this.trayEl.innerHTML="";return}this.trayEl.hidden=!1;const t=this.fileQueue.filter(a=>a.status==="pending").length,e=this.fileQueue.some(a=>a.status==="checking"),s=this.isBusy?"disabled":"",i=this.fileQueue.map(a=>{const l=a.status==="checking"?`<button class="chat-file-btn stop" data-act="stop" data-id="${a.id}" title="Dừng">■</button>`:`<button class="chat-file-btn go" data-act="check" data-id="${a.id}" title="Kiểm tra file này" ${s}>▶</button>
                           <button class="chat-file-btn" data-act="remove" data-id="${a.id}" title="Xóa" ${s}>✕</button>`,c=a.status==="checking"?'<span class="chat-spinner"></span>':'<span class="chat-file-ic">📄</span>',h=a.note?`<span class="chat-file-note">${this.escape(a.note)}</span>`:"";return`
                    <div class="chat-file-chip ${a.status}">
                        ${c}
                        <span class="chat-file-name" title="${this.escape(a.file.name)}">${this.escape(a.file.name)}</span>
                        ${h}
                        <span class="chat-file-actions">${l}</span>
                    </div>`}).join(""),n=`
            <div class="chat-tray-toolbar">
                <button class="chat-tray-btn primary" data-act="check-all" ${t===0||e||this.isBusy?"disabled":""}
                    title="Kiểm tra kèm đối chiếu chéo giữa các hồ sơ (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị)">
                    Kiểm tra tất cả${t>0?` (${t})`:""}
                </button>
                ${e?'<button class="chat-tray-btn danger" data-act="stop-all">Dừng tất cả</button>':""}
                <button class="chat-tray-btn" data-act="clear-all" ${s}>Xóa hết</button>
            </div>`;this.trayEl.innerHTML=`<div class="chat-tray-list">${i}</div>${n}`,this.bindTrayEvents()}bindTrayEvents(){var t;(t=this.trayEl)==null||t.querySelectorAll("[data-act]").forEach(e=>{e.addEventListener("click",()=>{const s=e.dataset.act,i=e.dataset.id?Number(e.dataset.id):null;s==="check"&&i?this.checkOne(i):s==="stop"&&i?this.stopOne(i):s==="remove"&&i?this.removeQueued(i):s==="check-all"?this.checkAll():s==="stop-all"?this.stopAll():s==="clear-all"&&this.clearAll()})})}async checkOne(t){var i;const e=this.fileQueue.find(n=>n.id===t);if(!e||e.status==="checking"||this.isBusy)return;e.status="checking",e.note="",e.abort=new AbortController,this.abortController=e.abort,this.setBusy(!0);let s=!1;try{const n=await this.apiClient.validateXml130(e.file,e.file.name,e.abort.signal);s=!0;const a=this.addBotHtml(`<div class="chat-file-result-head">📄 ${this.escape(e.file.name)}</div>`+this.renderer.renderValidationResult(n));a.classList.add("chat-msg-wide"),this.attachDownload(a,n,G.fromXmlFile(e.file.name),e.file.name),(i=this.robot)==null||i.notifyResult(this.resultFor(n.xuatToanRisk===!0,n.found===!1||n.hosoCount===0))}catch(n){const a=this.isAbort(n);e.status="pending",e.note=a?"Đã dừng, bấm ▶ để kiểm tra lại":"Chưa kiểm tra được, bấm ▶ để thử lại",this.addBotHtml(`<div class="chat-file-result-head">📄 ${this.escape(e.file.name)}</div>`+(a?"⏹ Đã dừng theo yêu cầu.":this.renderEndOrError(n)))}finally{e.abort=null,s&&this.releaseFiles([e]),this.setBusy(!1)}}async checkAll(){if(this.isBusy)return;const t=this.fileQueue.filter(e=>e.status==="pending");t.length!==0&&await this.checkBatch(t)}async checkBatch(t,e=""){var M;const s=this.capacity.measure(),i=t.reduce((p,k)=>p+k.file.size,0);if(i>s.budgetBytes){this.addBotHtml(`⚠ Lô đang chọn nặng ${this.mb(i)}MB — vượt mức máy này kham được (${s.summary} → tối đa ${this.mb(s.budgetBytes)}MB mỗi lượt). Hãy chia nhỏ theo tuần (bấm ✕ bớt file rồi "Kiểm tra tất cả" từng đợt). Lưu ý: đối chiếu chéo chỉ so các file trong cùng một đợt.`);return}this.panel.maximizeForBatchCheck();const n=new AbortController;for(const p of t)p.status="checking",p.note="Trong lô",p.abort=n;this.abortController=n,this.setBusy(!0);const a=this.addBotHtml(`<div class="chat-stream-status"><span class="chat-spinner"></span><span class="chat-stream-text">Đang tải ${t.length} file lên máy chủ...</span></div><div class="chat-progress"><div class="chat-progress-bar" style="width:0%"></div></div><div class="chat-stream-stats"></div>`);a.classList.add("chat-msg-wide");const l=a.querySelector(".chat-stream-text"),c=a.querySelector(".chat-progress-bar"),h=a.querySelector(".chat-stream-stats"),u=new Map;for(const p of t)u.set(p.file.name,{results:[],hosoCount:0,issueCount:0,riskCount:0});const f=new Map;let g=[],w=null,b=0,T=!1;this.panel.setBatchProgress("Đang tải file lên...");try{if(await this.apiClient.validateXml130BatchStream(t.map(p=>({blob:p.file,name:p.file.name})),p=>{if(p.type==="start")b=p.hosoCount??0,l&&(l.innerHTML=`Đã nhận <b>${p.fileCount}</b> file (<b>${p.hosoCount}</b> hồ sơ). Đang đối chiếu chéo giữa các hồ sơ...`),this.panel.setBatchProgress(`Đối chiếu chéo ${p.hosoCount??0} hồ sơ...`);else if(p.type==="fileError"&&p.fileName)f.set(p.fileName,p.error??"Không đọc được");else if(p.type==="cross")g=p.crossIssues??[],(g.length>0||b>1)&&this.addBotHtml(this.renderer.renderStreamCross(g,p.conflicts??[])).classList.add("chat-msg-wide"),l&&(l.innerHTML=b>1?"Đối chiếu chéo xong (kết quả ở trên). Đang kiểm tra từng hồ sơ...":"Đang kiểm tra hồ sơ...");else if(p.type==="hoso"){const k=u.get(p.fileName??"");k&&p.result&&(k.hosoCount++,k.issueCount+=p.result.issueCount,p.result.xuatToanRisk&&k.riskCount++,p.result.issueCount>0&&k.results.push(p.result));const $=p.index??0,I=p.total??0;l&&(l.innerHTML=`Đang kiểm tra hồ sơ <b>${$}/${I}</b>...`),c&&I>0&&(c.style.width=`${Math.round($/I*100)}%`),h&&(h.innerHTML=`⚠ <b>${p.riskCount??0}</b> hồ sơ nguy cơ xuất toán · ✔ <b>${$-(p.riskCount??0)}</b> không · tổng <b>${p.issueCount??0}</b> vấn đề`),this.panel.setBatchProgress(`${$}/${I} · ⚠ ${p.riskCount??0}`,I>0?$/I*100:null)}else p.type==="done"&&(w=p)},n.signal),T=!0,w){this.setMessageHtml(a,this.renderer.renderStreamSummary(w,u,f));const p=w;this.downloads.attach(a,D.fromStream(p,u,f,g,e));const k=p.riskCount??0,$=p.hosoCount??0;this.panel.completeBatchProgress(`✔ Xong ${$} hồ sơ · ⚠ ${k}`),(M=this.robot)==null||M.notifyResult(k>0?"aiError":$>0?"allValid":"warning")}else this.panel.setBatchProgress(null)}catch(p){const k=this.isAbort(p);for(const I of t)I.status="pending",I.note=k?"Đã dừng, kiểm tra lại được":"Chưa kiểm tra được, thử lại được";this.panel.setBatchProgress(null);const $=[...u.values()].reduce((I,F)=>I+F.hosoCount,0);if(k&&$>0){const I={type:"done",hosoCount:$,riskCount:[...u.values()].reduce((F,m)=>F+m.riskCount,0),issueCount:[...u.values()].reduce((F,m)=>F+m.issueCount,0),summary:"Đã dừng theo yêu cầu — bên dưới là kết quả của phần hồ sơ ĐÃ kiểm tra (kiểm tra lại bất cứ lúc nào, mỗi lần chạy độc lập, không lưu dở dang trên máy chủ)."};this.setMessageHtml(a,'<div class="chat-banner chat-banner-warn">⏹ Đã dừng theo yêu cầu</div>'+this.renderer.renderStreamSummary(I,u,f)),this.downloads.attach(a,D.fromStream(I,u,f,g,[e,"đã dừng giữa chừng"].filter(F=>F!=="").join(" ")))}else this.setMessageHtml(a,this.renderEndOrError(p))}finally{for(const p of t)p.abort=null;T&&this.releaseFiles(t),this.setBusy(!1)}}releaseFiles(t){const e=new Set(t.map(s=>s.id));this.fileQueue=this.fileQueue.filter(s=>!e.has(s.id))}stopOne(t){var e,s;(s=(e=this.fileQueue.find(i=>i.id===t))==null?void 0:e.abort)==null||s.abort()}stopAll(){this.fileQueue.forEach(t=>{var e;return(e=t.abort)==null?void 0:e.abort()})}removeQueued(t){var s;const e=this.fileQueue.find(i=>i.id===t);(s=e==null?void 0:e.abort)==null||s.abort(),this.fileQueue=this.fileQueue.filter(i=>i.id!==t),this.renderTray()}clearAll(){this.stopAll(),this.fileQueue=[],this.renderTray()}renderPaymentBar(){var c,h;const t=this.container.querySelector(".chat-bangke");if(!t)return;if(!st.isSupportedPage()){t.hidden=!0,t.innerHTML="";return}const e=this.paymentList.getAdmissionNumbers().length,s=this.paymentList.getSelectedAdmission(),i=this.paymentList.getSelectedPatientName(),n=this.isBusy?"disabled":"",a=this.isBusy||s===null?"disabled":"",l=s===null?"":i??"Bệnh nhân đang chọn";t.hidden=!1,t.innerHTML=`
            <div class="chat-bangke-row">
                <button class="chat-bangke-btn" data-act="all" ${n}
                    title="Lấy số vào viện từ danh sách phiếu thanh toán vừa tìm được, tải toàn bộ XML 130 rồi kiểm tra một lượt kèm đối chiếu chéo">
                    📋 Kiểm tra${e>0?` (${e})`:""} file XML130
                </button>
                <button class="chat-bangke-btn" data-act="one" ${a}
                    title="${s===null?"Hãy bấm chọn một dòng trên bảng kê trước":`Kiểm tra XML130 cho BN: ${this.escape(l)}`}">
                    🔎 Kiểm tra XML130 cho BN:${l===""?"":`<span class="chat-bangke-sub">${this.escape(l)}</span>`}
                </button>
            </div>`,(c=t.querySelector('[data-act="all"]'))==null||c.addEventListener("click",()=>void this.checkFromPaymentList()),(h=t.querySelector('[data-act="one"]'))==null||h.addEventListener("click",()=>void this.checkSelectedRow())}async checkSelectedRow(){if(this.isBusy)return;const t=this.paymentList.getSelectedAdmission();if(t===null){this.addBotHtml("⚠ Hãy bấm chọn một dòng trên bảng kê trước, rồi bấm lại nút này.");return}await this.handleAdmissionCheck(t)}async checkFromPaymentList(){if(this.isBusy)return;if(!this.paymentList.hasSearched()){this.addBotHtml("⚠ Chưa có danh sách phiếu thanh toán nào.<br/>Hãy bấm <b>Xem thông tin</b> trên màn hình <b>Kiểm tra bảng kê</b> trước — tôi sẽ lấy số vào viện từ đúng danh sách bạn vừa tìm, không tìm lại lần nữa.");return}const t=this.paymentList.getAdmissionNumbers();if(t.length===0){this.addBotHtml("⚠ Danh sách phiếu thanh toán vừa tìm <b>không có phiếu nào</b> nên chưa có gì để kiểm tra.<br/>Hãy đổi điều kiện tìm kiếm (ngày, đơn vị, trạng thái) rồi tìm lại.");return}const e=this.capacity.measure();if(t.length>e.maxFiles){this.addBotHtml(`⚠ Danh sách có <b>${this.num(t.length)}</b> hồ sơ, vượt sức bộ nhớ cho một lượt (<b>${this.num(e.maxFiles)}</b> hồ sơ).<br/>Máy đang dùng: ${e.summary} — tải chừng đó hồ sơ vào bộ nhớ tab sẽ làm treo trình duyệt.<br/>Tôi <b>không cắt bớt danh sách</b> để chạy một phần, vì đối chiếu chéo sẽ bỏ sót những hồ sơ nằm ngoài phần được kiểm tra.<br/>Hãy thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi tìm lại.`);return}const s=t,i=this.capacity.estimateWait(s.length,e);if(!await this.confirmDialog.ask({icon:"📋",title:"Kiểm tra hàng loạt",messageHtml:`Bạn muốn kiểm tra <b>${this.num(s.length)}</b> file XML130 lấy từ danh sách phiếu thanh toán vừa tìm?<br/>Hồ sơ sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>Thời gian chờ dự kiến: <b>${i}</b> (máy đang dùng: ${e.summary}).<br/>Trong lúc chạy vẫn xem được tiến độ từng hồ sơ và bấm <b>Dừng</b> bất cứ lúc nào.`,confirmLabel:`Kiểm tra ${this.num(s.length)} file`,cancelLabel:"Để sau"}))return;const a=new AbortController;this.abortController=a,this.setBusy(!0);const l=this.addLoadingMessage(`Đang tải <b>0/${s.length}</b> hồ sơ XML 130 từ HIS...`),c=l.querySelector(".chat-loading-text");let h=[],u=[],f=!1;try{const b=await this.downloadAdmissionFiles(s,e,a.signal,T=>{c&&(c.innerHTML=`Đang tải <b>${T}/${s.length}</b> hồ sơ XML 130 từ HIS...`),this.panel.setBatchProgress(`Tải hồ sơ ${T}/${s.length}`,T/s.length*100)});h=b.files,u=b.errors,f=b.outOfMemory}finally{this.panel.setBatchProgress(null),this.setBusy(!1)}const g=a.signal.aborted;if(this.setMessageHtml(l,`${g?"⏹ Đã dừng khi tải — ":""}Đã tải <b>${h.length}/${s.length}</b> hồ sơ từ HIS.`+(u.length>0?` <span class="chat-file-note error">${u.length} hồ sơ không tải được</span>`:"")),f){this.addBotHtml(`⚠ Đã dừng ở <b>${h.length}/${s.length}</b> hồ sơ vì chạm ngưỡng bộ nhớ của máy này (${e.summary} → tối đa ${this.mb(e.budgetBytes)}MB mỗi lượt) — lô này nặng hơn dự tính.<br/>Tôi <b>chưa kiểm tra</b> phần đã tải, vì lô thiếu hồ sơ sẽ làm đối chiếu chéo bỏ sót.<br/>Hãy thu hẹp điều kiện tìm kiếm cho danh sách ngắn lại rồi tìm lại.`);return}if(u.length>0){const b=u.slice(0,10);this.addBotHtml(`⚠ <b>${u.length}</b> hồ sơ không tải được từ HIS (đã bỏ qua, phần còn lại vẫn kiểm tra):<br/>`+b.map(T=>`• Số vào viện <b>${this.escape(T.soVaoVien)}</b>: ${this.escape(T.message)}`).join("<br/>")+(u.length>b.length?`<br/>• ... và ${u.length-b.length} hồ sơ khác`:"")).classList.add("chat-msg-wide")}if(h.length===0){g||this.addBotHtml("Không tải được hồ sơ nào nên chưa kiểm tra được. Kiểm tra lại phiên đăng nhập HIS rồi thử lại.");return}const w=h.map(b=>({id:++this.fileSeq,file:b,status:"pending",abort:null,note:""}));this.fileQueue.push(...w),this.renderTray(),await this.checkBatch(w)}async downloadAdmissionFiles(t,e,s,i){const n=new Array(t.length).fill(null),a=[];let l=0,c=0,h=0,u=!1;const f=async()=>{for(;!s.aborted&&!u;){const w=l++;if(w>=t.length)return;const b=t[w];try{const T=await this.xmlDownloader.downloadXml130(b,s);if(T===null)throw new Error("Chưa cấu hình kết nối HIS trong extension");const M=new File([T],`xml130_${b}.xml`,{type:"text/xml"});n[w]=M,h+=M.size,h>e.budgetBytes&&(u=!0)}catch(T){if(this.isAbort(T))return;a.push({soVaoVien:b,message:T instanceof Error?T.message:"Lỗi tải hồ sơ"})}i(++c)}},g=Math.min(e.parallelDownloads,t.length);return await Promise.all(Array.from({length:g},()=>f())),{files:n.filter(w=>w!==null),errors:a,outOfMemory:u}}async handleAdmissionCheck(t){var i;const e=this.addLoadingMessage(`Đang tải hồ sơ XML 130 của số vào viện <b>${this.escape(t)}</b> từ HIS...`);this.abortController=new AbortController;const s=this.abortController.signal;this.setBusy(!0);try{const n=await this.xmlDownloader.downloadXml130(t,s);if(n===null){this.setMessageHtml(e,"Chưa cấu hình kết nối HIS nên tôi không tự tải được hồ sơ theo số vào viện.<br/>Bạn hãy xuất file <b>XML 130</b> từ HIS rồi đính kèm (nút 📎) hoặc kéo-thả vào đây để kiểm tra.");return}this.setMessageHtml(e,'<span class="chat-spinner"></span><span class="chat-loading-text">Đã tải xong, đang kiểm tra khả năng xuất toán...</span>');const a=new Blob([n],{type:"text/xml"}),l=await this.apiClient.validateXml130(a,`xml130_${t}.xml`,s);e.classList.add("chat-msg-wide"),this.setMessageHtml(e,this.renderer.renderValidationResult(l)),this.attachDownload(e,l,this.patientSubject(t,l),`xml130_${t}.xml`),(i=this.robot)==null||i.notifyResult(this.resultFor(l.xuatToanRisk===!0,l.found===!1||l.hosoCount===0))}catch(n){this.setMessageHtml(e,this.renderEndOrError(n))}finally{this.setBusy(!1)}}async handleQuestion(t){const e=this.addLoadingMessage("Đang tìm câu trả lời...");this.abortController=new AbortController,this.setBusy(!0);try{const s=await this.apiClient.ask(t,this.abortController.signal);this.setMessageHtml(e,this.renderer.renderAnswer(s))}catch(s){this.setMessageHtml(e,this.renderEndOrError(s))}finally{this.setBusy(!1)}}addUserMessage(t){this.appendMessage("user",this.escape(t))}addBotHtml(t){return this.appendMessage("bot",t)}appendMessage(t,e){var i;this.collapseWelcomeOnFirstUse();const s=document.createElement("div");return s.className=`chat-msg chat-msg-${t}`,s.innerHTML=e,(i=this.messagesEl)==null||i.appendChild(s),this.scrollToBottom(),s}setMessageHtml(t,e){t.innerHTML=e,this.scrollToBottom()}scrollToBottom(){this.messagesEl&&(this.messagesEl.scrollTop=this.messagesEl.scrollHeight)}resultFor(t,e){return t?"aiError":e?"warning":"success"}renderEndOrError(t){return this.isAbort(t)?'<span class="chat-loading-text">⏹ Đã dừng theo yêu cầu.</span>':this.buildErrorHtml(t)}buildErrorHtml(t){const e=t instanceof Error?t.message:String(t);return`❌ ${this.escape(e)}`}num(t){return t.toLocaleString("vi-VN")}mb(t){return this.num(Math.round(t/1024/1024))}escape(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}getStyles(){return`
            .chat-root {
                background: #f8fafc;
                /* Mốc định vị cho hộp thoại xác nhận (.zc-confirm phủ đúng vùng khung chat) */
                position: relative;
            }

            .chat-root.dragging {
                outline: 3px dashed var(--zc-accent-deep, #2563eb);
                outline-offset: -6px;
            }

            .chat-root.dragging .chat-drop-hint { display: block; }

            .chat-drop-hint {
                display: none;
                text-align: center;
                padding: 6px;
                font-size: 12px;
                color: var(--zc-accent-deep, #2563eb);
                background: var(--zc-pastel, #eff6ff);
            }

            .chat-messages {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #f8fafc;
            }

            .chat-msg {
                max-width: 92%;
                padding: 10px 12px;
                border-radius: 12px;
                font-size: 13px;
                line-height: 1.55;
                color: #1f2937;
                word-wrap: break-word;
            }

            .chat-msg-user {
                align-self: flex-end;
                background: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
                border-bottom-right-radius: 4px;
            }

            .chat-msg-bot {
                align-self: flex-start;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-bottom-left-radius: 4px;
            }

            /* Tin nhắn kết quả kiểm tra: chiếm hết chiều ngang để nội dung bung ra đủ rộng */
            .chat-msg-wide {
                max-width: 100%;
                align-self: stretch;
            }

            /* Thanh "Tải kết quả" dưới mỗi lượt kiểm tra: chữ nhỏ + 3 biểu tượng,
               không lấn phần kết quả ở trên. */
            .chat-download {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px dashed #e5e7eb;
            }

            .chat-download-label {
                font-size: 11.5px;
                font-weight: 600;
                color: #6b7280;
            }

            .chat-download-btn {
                width: 28px;
                height: 28px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #f9fafb;
                cursor: pointer;
                line-height: 1;
                transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
            }

            .chat-download-btn svg {
                display: block;
            }

            .chat-download-btn:hover:not(:disabled) {
                background: #eef2ff;
                border-color: var(--zc-accent, #667eea);
                transform: translateY(-1px);
            }

            .chat-download-btn:disabled {
                opacity: 0.5;
                cursor: default;
            }

            .chat-download-busy .chat-download-label::after {
                content: ' - đang tạo file...';
                font-weight: 500;
            }

            .chat-download-error {
                flex: 1 1 100%;
                font-size: 11.5px;
                color: #b91c1c;
            }

            .chat-download-note {
                font-size: 11.5px;
                font-style: italic;
                color: #9ca3af;
            }

            /* Lời chào: mở sẵn lúc chưa hỏi gì, thu về đúng một biểu tượng 💡 khi
               bắt đầu làm việc — bấm biểu tượng là mở lại. */
            .chat-welcome { position: relative; }
            .chat-welcome-body { padding-right: 22px; }
            .chat-welcome-toggle {
                position: absolute;
                top: 6px;
                right: 8px;
                border: none;
                background: transparent;
                cursor: pointer;
                font-size: 15px;
                line-height: 1;
                padding: 2px 4px;
                border-radius: 6px;
                opacity: 0.5;
                transition: opacity 0.15s ease, background 0.15s ease;
            }
            .chat-welcome-toggle:hover { opacity: 1; background: rgba(15, 23, 42, 0.07); }
            /* Thu gọn: giữ biểu tượng 💡 đúng chỗ cũ (mép phải) để mắt không phải
               đi tìm — chỉ có phần nội dung biến mất, nút thì không nhảy chỗ. */
            .chat-welcome-collapsed {
                max-width: max-content;
                align-self: flex-end;
                padding: 4px 6px;
                border-radius: 999px;
            }
            .chat-welcome-collapsed .chat-welcome-body { display: none; }
            .chat-welcome-collapsed .chat-welcome-toggle { position: static; opacity: 0.85; }

            .chat-input-row {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 10px;
                border-top: 1px solid #e5e7eb;
                background: #ffffff;
                flex-shrink: 0;
            }

            /* Khung nhập bo tròn — chứa input + nút "+" + nút gửi. 📎 nằm NGOÀI khung. */
            .chat-input-box {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 2px;
                border: 1px solid #d1d5db;
                border-radius: 22px;
                padding: 2px 6px;
                background: #ffffff;
                transition: border-color 0.15s;
            }
            .chat-input-box:focus-within { border-color: var(--zc-accent-deep, #2563eb); }

            /* Nút icon: ô vuông căn giữa cả 2 chiều để glyph luôn ở giữa */
            .chat-attach, .chat-clear, .chat-send, .chat-plus {
                display: grid;
                place-items: center;
                width: 32px;
                height: 32px;
                padding: 0;
                background: none;
                border: none;
                cursor: pointer;
                border-radius: 50%;
                transition: background 0.15s;
                flex-shrink: 0;
            }
            .chat-attach { font-size: 17px; }
            .chat-clear { font-size: 15px; }
            .chat-send { font-size: 16px; color: var(--zc-accent-deep, #2563eb); }
            .chat-plus { font-size: 21px; color: var(--zc-accent-deep, #2563eb); place-items: normal; }
            .chat-attach:hover, .chat-clear:hover, .chat-send:hover, .chat-plus:hover { background: #f1f5f9; }
            .chat-busy .chat-clear { opacity: 0.4; cursor: not-allowed; }
            .chat-busy .chat-clear:hover { background: none; }
            .chat-plus:disabled { opacity: 0.4; cursor: not-allowed; }
            .chat-plus:disabled:hover { background: none; }

            /* Nút gửi khi đang bận trở thành nút Dừng (đỏ), vẫn bấm được */
            .chat-send.chat-stop {
                color: #dc2626;
                font-size: 15px;
            }
            .chat-send.chat-stop:hover { background: #fef2f2; }

            .chat-input {
                flex: 1;
                min-width: 0;
                border: none;
                background: transparent;
                padding: 8px 6px;
                font-size: 13px;
                outline: none;
                color: #1f2937;
            }

            /* ---- Menu chọn chế độ (bật từ nút "+") ---- */
            .chat-input-wrap { position: relative; }

            .chat-plus-menu {
                position: absolute;
                left: 44px;
                bottom: calc(100% + 4px);
                min-width: 210px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
                overflow: hidden;
                z-index: 10;
            }
            .chat-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 12px;
                cursor: pointer;
                font-size: 13px;
                color: #1f2937;
            }
            .chat-menu-item:hover { background: var(--zc-pastel, #eff6ff); }
            .chat-menu-item.active { background: #f8fafc; font-weight: 600; }
            .chat-menu-icon { font-size: 15px; }
            .chat-menu-label { flex: 1; }
            .chat-menu-check { color: var(--zc-accent-deep, #2563eb); font-weight: 700; }

            /* ---- Khay file đính kèm ---- */
            /* Thanh nút lấy hồ sơ từ bảng kê — chỉ hiện trên màn hình Kiểm tra bảng kê */
            .chat-bangke {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-bangke[hidden] { display: none; }
            /* Hai nút chia đôi chiều ngang, cao bằng nhau dù chữ dài ngắn khác nhau */
            .chat-bangke-row { display: flex; gap: 8px; }
            .chat-bangke-btn {
                flex: 1 1 0;
                min-width: 0;
                padding: 9px 8px;
                border: 1px solid var(--zc-accent-deep, #2563eb);
                border-radius: 8px;
                background: #ffffff;
                color: var(--zc-accent-deep, #2563eb);
                font-size: 12.5px;
                font-weight: 600;
                line-height: 1.35;
                text-align: center;
                cursor: pointer;
            }
            /* Tên bệnh nhân của dòng đang chọn — dòng phụ dưới nhãn nút */
            .chat-bangke-sub {
                display: block;
                margin-top: 2px;
                font-size: 11.5px;
                font-weight: 700;
                color: #1f2937;
            }
            .chat-bangke-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-bangke-btn:disabled { opacity: 0.55; cursor: default; }

            .chat-tray {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                max-height: 190px;
                overflow-y: auto;
                flex-shrink: 0;
            }
            .chat-tray-list { display: flex; flex-direction: column; gap: 6px; }
            .chat-file-chip {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-left: 3px solid #cbd5e1;
                border-radius: 8px;
            }
            .chat-file-chip.checking { border-left-color: var(--zc-accent-deep, #2563eb); }
            .chat-file-ic { flex-shrink: 0; font-size: 13px; }
            .chat-file-name {
                flex: 1;
                min-width: 0;
                font-size: 12px;
                color: #1f2937;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .chat-file-note {
                font-size: 11px;
                flex-shrink: 0;
                color: #6b7280;
            }
            /* Dùng trong tin nhắn tổng kết tải hồ sơ: số hồ sơ không tải được */
            .chat-file-note.error { color: #dc2626; }
            .chat-file-actions { display: flex; gap: 2px; flex-shrink: 0; }
            .chat-file-btn {
                border: none;
                background: none;
                cursor: pointer;
                font-size: 12px;
                padding: 3px 6px;
                border-radius: 6px;
                color: #64748b;
            }
            .chat-file-btn:hover:not(:disabled) { background: #f1f5f9; }
            .chat-file-btn.go { color: var(--zc-accent-deep, #2563eb); }
            .chat-file-btn.stop { color: #dc2626; }
            .chat-file-btn:disabled { opacity: 0.35; cursor: not-allowed; }

            .chat-tray-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }
            .chat-tray-btn {
                border: 1px solid #d1d5db;
                background: #ffffff;
                cursor: pointer;
                font-size: 12px;
                padding: 5px 10px;
                border-radius: 8px;
                color: #374151;
            }
            .chat-tray-btn:hover:not(:disabled) { background: #f1f5f9; }
            .chat-tray-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .chat-tray-btn.primary {
                background: var(--zc-accent-deep, #2563eb);
                border-color: var(--zc-accent-deep, #2563eb);
                color: #ffffff;
            }
            .chat-tray-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
            .chat-tray-btn.danger {
                background: #fef2f2;
                border-color: #fecaca;
                color: #dc2626;
            }

            /* ---- Tiến độ kiểm tra lô (streaming) ---- */

            .chat-stream-status {
                display: flex;
                align-items: center;
                font-size: 13px;
                color: #1f2937;
            }

            .chat-progress {
                margin-top: 8px;
                height: 8px;
                border-radius: 4px;
                background: #e2e8f0;
                overflow: hidden;
            }

            .chat-progress-bar {
                height: 100%;
                border-radius: 4px;
                background: linear-gradient(90deg, var(--zc-accent-deep, #2563eb), #7c3aed);
                transition: width 0.2s ease;
            }

            .chat-stream-stats {
                margin-top: 6px;
                font-size: 12px;
                color: #475569;
            }

            /* ---- Khối sổ dọc (accordion): tóm tắt trước, bấm để xem chi tiết ---- */

            .chat-expand {
                margin-top: 8px;
                border: 1px solid #dbeafe;
                border-radius: 8px;
                background: #f8fafc;
            }

            .chat-expand > summary {
                cursor: pointer;
                list-style: none;
                padding: 8px 10px;
                font-size: 12px;
                font-weight: 600;
                color: var(--zc-accent-deep, #2563eb);
                user-select: none;
            }

            .chat-expand > summary::-webkit-details-marker { display: none; }

            /* Chevron "›" xoay xuống khi mở — tránh dùng tam giác ▸ vì dễ nhầm nút ▶ Kiểm tra */
            .chat-expand > summary::before {
                content: '\\203A';
                display: inline-block;
                width: 12px;
                margin-right: 4px;
                font-size: 14px;
                line-height: 1;
                transition: transform 0.2s ease;
            }

            .chat-expand[open] > summary::before { transform: rotate(90deg); }

            .chat-expand > summary:hover { background: var(--zc-pastel, #eff6ff); border-radius: 8px; }

            .chat-expand-body {
                padding: 4px 10px 10px;
            }

            .chat-expand[open] .chat-expand-body {
                animation: chat-slide-down 0.22s ease;
            }

            @keyframes chat-slide-down {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: none; }
            }

            /* ---- Sơ đồ xung đột giữa các file ---- */

            .chat-conflict-map {
                margin-top: 8px;
                border: 1px solid #fde68a;
                background: #fffbeb;
                border-radius: 8px;
                padding: 8px 10px;
            }

            .chat-conflict-title {
                font-size: 12px;
                font-weight: 700;
                color: #92400e;
                margin-bottom: 6px;
            }

            .chat-conflict-row {
                display: flex;
                align-items: baseline;
                gap: 6px;
                flex-wrap: wrap;
                font-size: 12px;
                padding: 2px 0;
            }

            .chat-conflict-file { font-weight: 600; color: #1f2937; }
            .chat-conflict-arrow { color: #d97706; font-weight: 700; }
            .chat-conflict-others { color: #4b5563; }

            /* ---- Hồ sơ liên quan một vấn đề chéo: ai trước (hợp lệ) / ai cần rà soát ---- */

            .chat-ref-list {
                margin: 4px 0 0 17px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .chat-ref-row {
                display: flex;
                align-items: baseline;
                gap: 8px;
                flex-wrap: wrap;
                font-size: 11px;
            }

            .chat-ref-name { font-weight: 600; color: #1f2937; }
            .chat-ref-file { color: #6b7280; }

            .chat-ref-badge {
                font-size: 10px;
                font-weight: 700;
                padding: 1px 7px;
                border-radius: 9px;
                white-space: nowrap;
            }

            .chat-ref-first {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .chat-ref-review {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }

            /* ---- Kết quả kiểm tra lô + đối chiếu chéo ---- */

            .chat-cross-group {
                border: 1px solid #c7d2fe;
                background: #eef2ff;
                border-radius: 8px;
                padding: 8px;
            }

            .chat-cross-clean {
                font-size: 12px;
                color: #15803d;
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 8px 10px;
                margin-top: 6px;
            }

            .chat-batch-file {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #ffffff;
                margin-top: 8px;
                padding: 0;
            }

            .chat-batch-file summary {
                cursor: pointer;
                list-style: none;
                display: flex;
                align-items: baseline;
                flex-wrap: wrap;
                gap: 4px 8px;
                padding: 8px 10px;
                font-size: 12px;
                color: #334155;
                user-select: none;
            }

            .chat-batch-file summary::-webkit-details-marker { display: none; }

            /* Chevron "›" xoay xuống khi mở (không dùng tam giác ▶ mặc định — giống nút Kiểm tra) */
            .chat-batch-file summary::before {
                content: '\\203A';
                display: inline-block;
                width: 10px;
                flex-shrink: 0;
                font-size: 14px;
                line-height: 1;
                color: #64748b;
                transition: transform 0.2s ease;
                align-self: center;
            }

            .chat-batch-file[open] > summary::before { transform: rotate(90deg); }

            .chat-batch-file summary:hover { background: #f8fafc; }

            .chat-batch-file-name {
                font-weight: 600;
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .chat-batch-who {
                font-weight: 400;
                color: #334155;
                background: #f1f5f9;
                border-radius: 8px;
                padding: 1px 8px;
                font-size: 11px;
            }

            .chat-batch-note {
                font-weight: 400;
                color: #6b7280;
                margin-left: auto;
                font-size: 11px;
                flex-shrink: 0;
            }

            .chat-batch-file-body {
                padding: 8px 10px;
                border-top: 1px dashed #e5e7eb;
            }

            .chat-file-result-head {
                font-weight: 600;
                font-size: 12px;
                color: #334155;
                margin-bottom: 6px;
                padding-bottom: 4px;
                border-bottom: 1px dashed #e5e7eb;
            }

            /* ---- Trạng thái đang xử lý ---- */

            /* Vòng xoay trong bong bóng chat, đồng bộ với vòng xoay trên nút nổi */
            .chat-spinner {
                display: inline-block;
                width: 12px;
                height: 12px;
                margin-right: 8px;
                vertical-align: -1px;
                border: 2px solid #cbd5e1;
                border-top-color: var(--zc-accent-deep, #2563eb);
                border-radius: 50%;
                animation: chat-spin 0.7s linear infinite;
            }

            @keyframes chat-spin {
                to { transform: rotate(360deg); }
            }

            .chat-loading-text { color: #64748b; }

            /* Khóa thao tác khi đang chờ kết quả để không gửi chồng yêu cầu */
            .chat-busy .chat-input {
                background: #f8fafc;
                color: #94a3b8;
                cursor: not-allowed;
            }

            /* Khi bận chỉ khóa nút đính kèm; nút gửi thành nút Dừng vẫn bấm được */
            .chat-busy .chat-attach {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .chat-busy .chat-attach:hover { background: none; }

            /* ---- Kết quả kiểm tra XML 130 ---- */

            .chat-banner {
                padding: 10px 12px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 8px;
            }

            .chat-banner-risk {
                background: #fee2e2;
                color: #b91c1c;
                border: 1px solid #fecaca;
            }

            .chat-banner-ok {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .chat-banner-warn {
                background: #fef9c3;
                color: #854d0e;
                border: 1px solid #fde68a;
            }

            .chat-result-summary {
                font-size: 12px;
                color: #4b5563;
                margin-bottom: 6px;
            }

            .chat-result-text {
                font-size: 12px;
                color: #374151;
                margin-bottom: 6px;
            }

            .chat-result-ai {
                font-size: 12px;
                color: #4338ca;
                background: #eef2ff;
                border-radius: 6px;
                padding: 6px 8px;
                margin-bottom: 6px;
            }

            .chat-hoso {
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                padding: 10px;
                margin-top: 8px;
                background: #ffffff;
            }

            .chat-hoso-header {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .chat-hoso-name {
                font-weight: 600;
                font-size: 13px;
                color: #111827;
            }

            .chat-hoso-meta {
                font-size: 11px;
                color: #6b7280;
                margin: 2px 0 6px;
            }

            .chat-hoso-clean {
                font-size: 12px;
                color: #15803d;
            }

            .chat-badge-risk {
                display: inline-block;
                background: #dc2626;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                white-space: nowrap;
            }

            .chat-issue-group { margin-top: 8px; }

            .chat-issue-group-title {
                font-size: 12px;
                font-weight: 700;
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 3px;
                margin-bottom: 6px;
            }

            .chat-issue {
                padding: 6px 8px;
                border-radius: 6px;
                margin-bottom: 4px;
                background: #f9fafb;
            }

            .chat-issue-line {
                display: flex;
                align-items: baseline;
                gap: 6px;
                flex-wrap: wrap;
            }

            .chat-issue-message {
                font-size: 12px;
                color: #1f2937;
                flex: 1;
                min-width: 0;
            }

            /* Badge số lần lặp của một lỗi đã được gộp (vd ×22) */
            .chat-issue-count {
                font-size: 10px;
                font-weight: 700;
                color: #475569;
                background: #e2e8f0;
                border-radius: 9px;
                padding: 1px 7px;
                white-space: nowrap;
            }

            .chat-sev { font-size: 11px; }
            .chat-sev-error { color: #dc2626; }
            .chat-sev-warning { color: #f59e0b; }
            .chat-sev-info { color: #3b82f6; }

            .chat-issue-location {
                font-size: 11px;
                color: #6b7280;
                margin-top: 2px;
                margin-left: 17px;
            }

            .chat-issue-suggestion {
                font-size: 11px;
                color: #92400e;
                background: #fffbeb;
                border-left: 3px solid #f59e0b;
                border-radius: 4px;
                padding: 4px 8px;
                margin-top: 4px;
                margin-left: 17px;
                white-space: pre-wrap;
            }

            /* ---- Hỏi đáp RAG ---- */

            .chat-answer { white-space: pre-wrap; }

            .chat-citations {
                margin-top: 8px;
                font-size: 12px;
            }

            .chat-citations summary {
                cursor: pointer;
                color: var(--zc-accent-deep, #2563eb);
                font-weight: 600;
            }

            .chat-citations ul {
                margin: 6px 0 0;
                padding-left: 16px;
            }

            .chat-citation { margin-bottom: 6px; }

            .chat-citation-excerpt {
                color: #6b7280;
                font-style: italic;
                margin-top: 2px;
            }
        `}};r(gt,"MODE_OPTIONS",[{mode:"hoi",icon:"💬",label:"Hỏi thông tin y tế"},{mode:"svv",icon:"🔢",label:"Kiểm tra số vào viện"}]);let Tt=gt;var d=(o=>(o.Boot="Boot",o.Idle="Idle",o.LongIdle="LongIdle",o.Watching="Watching",o.Hover="Hover",o.Listening="Listening",o.Typing="Typing",o.Thinking="Thinking",o.Explaining="Explaining",o.Happy="Happy",o.Celebrate="Celebrate",o.Sad="Sad",o.Confused="Confused",o.PointError="PointError",o.Sleeping="Sleeping",o.WakeUp="WakeUp",o.Flying="Flying",o.Falling="Falling",o.Landing="Landing",o.Fell="Fell",o.Disabled="Disabled",o))(d||{}),v=(o=>(o.Neutral="Neutral",o.Happy="Happy",o.Curious="Curious",o.Focused="Focused",o.Sleepy="Sleepy",o.Proud="Proud",o.Embarrassed="Embarrassed",o.Sad="Sad",o.Surprised="Surprised",o))(v||{}),y=(o=>(o[o.Idle=0]="Idle",o[o.Mouse=1]="Mouse",o[o.Validation=2]="Validation",o[o.UserClick=3]="UserClick",o[o.Critical=4]="Critical",o))(y||{});const Qe="data:image/png;base64,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",E=x.color;function Ke(){const{width:o,height:t}=x.size;return`
<svg class="robot-svg" viewBox="0 0 96 108" width="${o}" height="${t}"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="robotBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${E.vnptBlueLight}"/>
      <stop offset="0.5" stop-color="${E.vnptBlue}"/>
      <stop offset="1" stop-color="${E.vnptBlueDark}"/>
    </linearGradient>
    <linearGradient id="robotHead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${E.white}"/>
      <stop offset="1" stop-color="${E.metal}"/>
    </linearGradient>
    <radialGradient id="robotTip" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#BFF3FF"/>
      <stop offset="1" stop-color="${E.vnptBlueLight}"/>
    </radialGradient>
  </defs>

  <!-- Bóng đổ dưới chân -->
  <ellipse id="robot-shadow" cx="48" cy="104" rx="26" ry="4.5" fill="rgba(10,40,70,0.18)"/>

  <g id="robot-float">
    <!-- Chân -->
    <g id="robot-legs">
      <rect x="36" y="92" width="9" height="12" rx="4.5" fill="${E.vnptBlueDark}"/>
      <rect x="51" y="92" width="9" height="12" rx="4.5" fill="${E.vnptBlueDark}"/>
      <ellipse cx="40.5" cy="104" rx="7" ry="3.4" fill="${E.ink}"/>
      <ellipse cx="55.5" cy="104" rx="7" ry="3.4" fill="${E.ink}"/>
    </g>

    <!-- Tay trái (nhìn từ người xem là bên trái) -->
    <g id="robot-arm-l">
      <rect x="17" y="70" width="9" height="24" rx="4.5" fill="url(#robotBody)"/>
      <circle cx="21.5" cy="94" r="5.5" fill="${E.metal}"/>
    </g>
    <!-- Tay phải -->
    <g id="robot-arm-r">
      <rect x="70" y="70" width="9" height="24" rx="4.5" fill="url(#robotBody)"/>
      <circle cx="74.5" cy="94" r="5.5" fill="${E.metal}"/>
      <!-- Ngón cái (ẩn, dùng khi giơ thumbs up) -->
      <rect id="robot-thumb" x="72" y="62" width="5" height="8" rx="2.5" fill="${E.metal}" opacity="0"/>
    </g>

    <!-- Thân + ngực gắn logo VNPT chính thức (ảnh, KHÔNG phải chữ) -->
    <g id="robot-body">
      <rect x="26" y="64" width="44" height="34" rx="15" fill="url(#robotBody)"/>
      <circle cx="48" cy="80" r="12" fill="${E.white}" opacity="0.96"/>
      <image id="robot-chest-logo" href="${Qe}"
             x="37" y="70" width="22" height="22" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Đầu -->
    <g id="robot-head">
      <!-- Ăng-ten -->
      <line x1="48" y1="20" x2="48" y2="12" stroke="${E.metalDark}" stroke-width="2.4" stroke-linecap="round"/>
      <circle id="robot-antenna-tip" cx="48" cy="9" r="3.4" fill="url(#robotTip)"/>

      <!-- Vỏ đầu -->
      <rect x="20" y="20" width="56" height="42" rx="16" fill="url(#robotHead)" stroke="${E.metalDark}" stroke-width="1.2"/>
      <!-- Tai -->
      <rect x="16" y="34" width="5" height="14" rx="2.5" fill="${E.metalDark}"/>
      <rect x="75" y="34" width="5" height="14" rx="2.5" fill="${E.metalDark}"/>
      <!-- Màn hình mặt -->
      <rect x="25" y="26" width="46" height="30" rx="12" fill="${E.ink}"/>

      <!-- Má hồng (ẩn mặc định) -->
      <g id="robot-cheeks" opacity="0">
        <ellipse cx="34" cy="48" rx="4" ry="2.4" fill="#FF6B8B"/>
        <ellipse cx="62" cy="48" rx="4" ry="2.4" fill="#FF6B8B"/>
      </g>

      <!-- Mắt: bộ MỞ (mặc định) -->
      <g id="robot-eyes-open">
        <circle cx="40" cy="41" r="6.2" fill="${E.white}"/>
        <circle cx="56" cy="41" r="6.2" fill="${E.white}"/>
        <g id="robot-pupils">
          <circle cx="40" cy="41" r="3.1" fill="${E.vnptBlueDark}"/>
          <circle cx="56" cy="41" r="3.1" fill="${E.vnptBlueDark}"/>
          <circle cx="41.2" cy="39.8" r="1" fill="${E.white}"/>
          <circle cx="57.2" cy="39.8" r="1" fill="${E.white}"/>
        </g>
      </g>
      <!-- Mắt: bộ VUI (cong ^^) -->
      <g id="robot-eyes-happy" opacity="0" fill="none" stroke="${E.vnptBlueLight}" stroke-width="2.6" stroke-linecap="round">
        <path d="M34 43 Q40 36 46 43"/>
        <path d="M50 43 Q56 36 62 43"/>
      </g>
      <!-- Mắt: bộ NHẮM (lim dim/ngủ) -->
      <g id="robot-eyes-closed" opacity="0" stroke="${E.vnptBlueLight}" stroke-width="2.6" stroke-linecap="round">
        <line x1="34" y1="42" x2="46" y2="42"/>
        <line x1="50" y1="42" x2="62" y2="42"/>
      </g>

      <!-- Miệng -->
      <path id="robot-mouth" d="M42 51 Q48 55 54 51" fill="none"
            stroke="${E.vnptBlueLight}" stroke-width="2.4" stroke-linecap="round"/>

      <!-- Giọt mồ hôi (ẩn) -->
      <path id="robot-sweat" opacity="0" d="M66 30 q-3 4 0 6 a3 3 0 0 0 0 -6 z" fill="#7FD3FF"/>
    </g>

    <!-- Zzz khi ngủ (ẩn) -->
    <g id="robot-zzz" opacity="0" fill="${E.vnptBlue}" font-family="Arial" font-weight="800">
      <text x="70" y="24" font-size="8">z</text>
      <text x="76" y="18" font-size="10">z</text>
      <text x="83" y="11" font-size="13">Z</text>
    </g>
  </g>
</svg>`.trim()}class Zt{constructor(t){r(this,"svg");r(this,"float");r(this,"head");r(this,"pupils");r(this,"armLeft");r(this,"armRight");r(this,"mouth");r(this,"antennaTip");r(this,"eyeSets");r(this,"cheeks");r(this,"sweat");r(this,"zzz");r(this,"thumb");t.innerHTML=Ke();const e=s=>{const i=t.querySelector(`#${s}`);if(!i)throw new Error(`[RobotView] Thiếu phần tử SVG #${s}`);return i};this.svg=t.querySelector("svg"),this.float=e("robot-float"),this.head=e("robot-head"),this.pupils=e("robot-pupils"),this.armLeft=e("robot-arm-l"),this.armRight=e("robot-arm-r"),this.mouth=e("robot-mouth"),this.antennaTip=e("robot-antenna-tip"),this.eyeSets={open:e("robot-eyes-open"),happy:e("robot-eyes-happy"),closed:e("robot-eyes-closed")},this.cheeks=e("robot-cheeks"),this.sweat=e("robot-sweat"),this.zzz=e("robot-zzz"),this.thumb=e("robot-thumb")}setPupilOffset(t,e){const s=x.mouse.pupilMaxShift,i=Math.max(-s,Math.min(s,t)),n=Math.max(-s,Math.min(s,e));this.pupils.style.transform=`translate(${i}px, ${n}px)`}setHeadTilt(t){this.head.style.transform=`rotate(${t}deg)`}setEyeMode(t){Object.keys(this.eyeSets).forEach(e=>{this.eyeSets[e].style.opacity=e===t?"1":"0"})}setMouthPath(t){this.mouth.setAttribute("d",t)}setCheeksVisible(t){this.cheeks.style.opacity=t?"1":"0"}setSweatVisible(t){this.sweat.style.opacity=t?"1":"0"}setZzzVisible(t){this.zzz.style.opacity=t?"1":"0"}setThumbVisible(t){this.thumb.style.opacity=t?"1":"0"}static partOriginCss(){return`
            #robot-head { transform-box: fill-box; transform-origin: 50% 92%; }
            #robot-pupils { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-eyes-open { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-arm-l { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-arm-r { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-float { transform-box: fill-box; transform-origin: 50% 100%; }
            #robot-antenna-tip { transform-box: fill-box; transform-origin: 50% 50%; }
        `}get openEyes(){return this.eyeSets.open}get zzzGroup(){return this.zzz}}const W={neutral:"M42 51 Q48 54 54 51",smile:"M41 50 Q48 58 55 50",grin:"M40 49 Q48 60 56 49 Q48 55 40 49",sad:"M42 54 Q48 49 54 54",flat:"M43 52 L53 52",open:"M44 50 Q48 57 52 50 Q48 53 44 50",small:"M45 51 Q48 55 51 51"};class je{constructor(t){r(this,"current",v.Neutral);this.view=t}get emotion(){return this.current}set(t){this.current=t;const e=this.view;switch(e.setCheeksVisible(!1),e.setSweatVisible(!1),t){case v.Happy:e.setEyeMode("happy"),e.setMouthPath(W.smile);break;case v.Proud:e.setEyeMode("happy"),e.setMouthPath(W.grin),e.setCheeksVisible(!0);break;case v.Curious:e.setEyeMode("open"),e.setMouthPath(W.small);break;case v.Focused:e.setEyeMode("open"),e.setMouthPath(W.flat);break;case v.Sleepy:e.setEyeMode("closed"),e.setMouthPath(W.small);break;case v.Embarrassed:e.setEyeMode("open"),e.setMouthPath(W.flat),e.setCheeksVisible(!0),e.setSweatVisible(!0);break;case v.Sad:e.setEyeMode("open"),e.setMouthPath(W.sad);break;case v.Surprised:e.setEyeMode("open"),e.setMouthPath(W.open);break;case v.Neutral:default:e.setEyeMode("open"),e.setMouthPath(W.neutral);break}}}const Ct="cubic-bezier(0.34, 1.56, 0.64, 1)";function A(o,t,e,s={}){return o.animate(t,{duration:e,easing:"ease-in-out",fill:"none",...s})}const Jt={breathe:{loop:!0,build:o=>[A(o.float,[{transform:"translateY(0)"},{transform:"translateY(-2px)"},{transform:"translateY(0)"}],3200,{iterations:1/0})]},blink:{build:o=>[A(o.openEyes,[{transform:"scaleY(1)"},{transform:"scaleY(0.08)"},{transform:"scaleY(1)"}],170)]},lookAround:{build:o=>[A(o.pupils,[{transform:"translate(0,0)"},{transform:"translate(-3px,0)"},{transform:"translate(-3px,0)"},{transform:"translate(3px,0)"},{transform:"translate(3px,0)"},{transform:"translate(0,0)"}],2200)]},scratchHead:{build:o=>[A(o.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-120deg)"},{transform:"rotate(-110deg)"},{transform:"rotate(-120deg)"},{transform:"rotate(0deg)"}],1400),A(o.head,[{transform:"rotate(0deg)"},{transform:"rotate(-5deg)"},{transform:"rotate(-4deg)"},{transform:"rotate(-6deg)"},{transform:"rotate(0deg)"}],1400)]},yawn:{build:o=>[A(o.head,[{transform:"rotate(0deg)"},{transform:"rotate(0deg) translateY(-1px)"},{transform:"rotate(0deg)"}],1600),A(o.float,[{transform:"scale(1,1)"},{transform:"scale(1.03,0.98)"},{transform:"scale(1,1)"}],1600)]},wave:{build:o=>[A(o.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-40deg)"},{transform:"rotate(-10deg)"},{transform:"rotate(-40deg)"},{transform:"rotate(0deg)"}],1100,{easing:Ct})]},nod:{build:o=>[A(o.head,[{transform:"rotate(0deg) translateY(0)"},{transform:"rotate(0deg) translateY(3px)"},{transform:"rotate(0deg) translateY(0)"},{transform:"rotate(0deg) translateY(3px)"},{transform:"rotate(0deg) translateY(0)"}],900)]},think:{loop:!0,build:o=>[A(o.head,[{transform:"rotate(-4deg)"},{transform:"rotate(4deg)"},{transform:"rotate(-4deg)"}],2400,{iterations:1/0}),A(o.armRight,[{transform:"rotate(-118deg)"},{transform:"rotate(-124deg)"},{transform:"rotate(-118deg)"}],2400,{iterations:1/0}),A(o.antennaTip,[{opacity:1},{opacity:.4},{opacity:1}],1200,{iterations:1/0})]},tiltCurious:{build:o=>[A(o.head,[{transform:"rotate(0deg)"},{transform:"rotate(12deg)"}],400,{fill:"forwards"})]},thumbsUp:{build:o=>(o.setThumbVisible(!0),[A(o.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-18deg)"},{transform:"rotate(-10deg)"}],600,{fill:"forwards",easing:Ct}),A(o.float,[{transform:"translateY(0)"},{transform:"translateY(-5px)"},{transform:"translateY(0)"}],600)])},celebrate:{build:o=>[A(o.float,[{transform:"translateY(0)"},{transform:"translateY(-16px)"},{transform:"translateY(0)"},{transform:"translateY(-12px)"},{transform:"translateY(0)"}],1200,{easing:Ct}),A(o.armLeft,[{transform:"rotate(0deg)"},{transform:"rotate(38deg)"},{transform:"rotate(0deg)"},{transform:"rotate(38deg)"},{transform:"rotate(0deg)"}],1200),A(o.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-38deg)"},{transform:"rotate(0deg)"},{transform:"rotate(-38deg)"},{transform:"rotate(0deg)"}],1200)]},sad:{build:o=>[A(o.head,[{transform:"rotate(0deg)"},{transform:"rotate(0deg) translateY(3px)"}],500,{fill:"forwards"}),A(o.float,[{transform:"translateY(0)"},{transform:"translateY(3px)"}],500,{fill:"forwards"})]},pointError:{build:o=>[A(o.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(52deg)"},{transform:"rotate(44deg)"},{transform:"rotate(52deg)"},{transform:"rotate(44deg)"}],1400,{fill:"forwards"})]},dizzy:{build:o=>[A(o.head,[{transform:"rotate(-8deg)"},{transform:"rotate(8deg)"},{transform:"rotate(-6deg)"},{transform:"rotate(6deg)"},{transform:"rotate(0deg)"}],900)]},wake:{build:o=>[A(o.head,[{transform:"rotate(-6deg)"},{transform:"rotate(6deg)"},{transform:"rotate(-4deg)"},{transform:"rotate(0deg)"}],700),A(o.openEyes,[{transform:"scaleY(0.1)"},{transform:"scaleY(1)"}],500)]},sleepBob:{loop:!0,build:o=>(o.setZzzVisible(!0),[A(o.float,[{transform:"translateY(0)"},{transform:"translateY(-1.5px)"},{transform:"translateY(0)"}],4200,{iterations:1/0}),A(o.zzzGroup,[{opacity:.3,transform:"translateY(0)"},{opacity:1,transform:"translateY(-4px)"},{opacity:.3,transform:"translateY(0)"}],4200,{iterations:1/0})])}};class Ze{constructor(t){r(this,"baseAnims",[]);r(this,"gestureAnims",[]);r(this,"reduceMotion",!1);this.view=t}setReduceMotion(t){this.reduceMotion=t,t&&this.cancelAll()}setBase(t){this.cancelList(this.baseAnims),this.baseAnims=[],!(!t||this.reduceMotion)&&(this.baseAnims=Jt[t].build(this.view))}playGesture(t){if(this.cancelList(this.gestureAnims),this.gestureAnims=[],this.reduceMotion)return Promise.resolve();const e=Jt[t].build(this.view);return this.gestureAnims=e,e.length===0?Promise.resolve():Promise.all(e.map(s=>s.finished.catch(()=>{}))).then(()=>{})}cancelGestures(){this.cancelList(this.gestureAnims),this.gestureAnims=[]}cancelAll(){this.cancelList(this.baseAnims),this.cancelList(this.gestureAnims),this.baseAnims=[],this.gestureAnims=[]}cancelList(t){for(const e of t)try{e.cancel()}catch{}}}const Je={[d.Boot]:y.UserClick,[d.Idle]:y.Idle,[d.LongIdle]:y.Idle,[d.Watching]:y.Idle,[d.Hover]:y.Idle,[d.Sleeping]:y.Idle,[d.Listening]:y.Validation,[d.Typing]:y.Validation,[d.Thinking]:y.Validation,[d.Explaining]:y.Validation,[d.Happy]:y.Validation,[d.Celebrate]:y.Validation,[d.Sad]:y.Validation,[d.Confused]:y.Validation,[d.PointError]:y.Validation,[d.WakeUp]:y.UserClick,[d.Landing]:y.UserClick,[d.Flying]:y.Critical,[d.Falling]:y.Critical,[d.Fell]:y.Critical,[d.Disabled]:y.Critical};class _e{constructor(t,e){r(this,"currentState");this.onEnter=e,this.currentState=t}get state(){return this.currentState}is(...t){return t.includes(this.currentState)}dispatch(t,e=y.Idle){return t===this.currentState||e<Je[this.currentState]?!1:(this.transition(t),!0)}force(t){t!==this.currentState&&this.transition(t)}transition(t){const e=this.currentState;this.currentState=t,this.onEnter(t,e)}}class ts{constructor(t,e,s){r(this,"applyGaze",!0);r(this,"started",!1);r(this,"hovering",!1);r(this,"offBalanceTimer",null);r(this,"onMove",t=>this.handleMove(t));this.host=t,this.view=e,this.cb=s}start(){this.started||(this.started=!0,window.addEventListener("mousemove",this.onMove,{passive:!0}))}stop(){this.started&&(this.started=!1,window.removeEventListener("mousemove",this.onMove),this.clearOffBalance())}setApplyGaze(t){this.applyGaze=t,t||(this.view.setPupilOffset(0,0),this.view.setHeadTilt(0),this.clearOffBalance())}center(){const t=this.host.getBoundingClientRect();return{x:t.left+t.width/2,y:t.top+t.height*.34}}handleMove(t){this.cb.onActivity();const e=this.center(),s=t.clientX-e.x,i=t.clientY-e.y,a=Math.hypot(s,i)<x.mouse.hoverRadius;if(a!==this.hovering&&(this.hovering=a,this.cb.onHoverChange(a)),!this.applyGaze)return;this.view.setPupilOffset(s/42,i/42);const l=Math.max(-18,Math.min(x.mouse.headMaxDeg,s/12));this.view.setHeadTilt(l),i<-220?this.offBalanceTimer===null&&(this.offBalanceTimer=window.setTimeout(()=>{this.offBalanceTimer=null,this.applyGaze&&this.cb.onOffBalance()},x.mouse.offBalanceMs)):this.clearOffBalance()}clearOffBalance(){this.offBalanceTimer!==null&&(clearTimeout(this.offBalanceTimer),this.offBalanceTimer=null)}}class es{constructor(t){r(this,"current",null);this.host=t}fall(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"rotate(0deg) translateY(0)",easing:"ease-in-out"},{transform:"rotate(-7deg) translateY(0)",offset:.12,easing:"ease-out"},{transform:"rotate(-4deg) translateY(0)",offset:.2,easing:"ease-in"},{transform:"rotate(22deg) translateY(7px)",offset:.44,easing:"cubic-bezier(0.6,0,0.9,0.4)"},{transform:"rotate(19deg) translateY(4px)",offset:.52,easing:"ease-out"},{transform:"rotate(21deg) translateY(6px)",offset:.6,easing:"ease-in-out"},{transform:"rotate(20deg) translateY(6px)",offset:.72,easing:"ease-in-out"},{transform:"rotate(9deg) translateY(2px)",offset:.86,easing:"ease-out"},{transform:"rotate(-3deg) translateY(0)",offset:.94,easing:"ease-in-out"},{transform:"rotate(0deg) translateY(0)",easing:"ease-out"}],1700)}landingSquash(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"scale(1, 1)"},{transform:"scale(1.18, 0.82)",offset:.35},{transform:"scale(0.94, 1.06)",offset:.62},{transform:"scale(1, 1)"}],520)}flyToPopup(){const t=window.innerHeight+160;return this.host.style.transformOrigin="50% 50%",this.animate([{transform:"translateY(0)",opacity:1},{transform:"translateY(12px)",opacity:1,offset:.16},{transform:`translateY(-${t*.5}px)`,opacity:1,offset:.6},{transform:`translateY(-${t}px)`,opacity:0}],1e3,"cubic-bezier(0.5, 0, 0.7, 0.2)")}dropIn(){const t=window.innerHeight+160;return this.host.style.transformOrigin="50% 100%",this.animate([{transform:`translateY(-${t}px)`,opacity:0},{transform:`translateY(-${t*.4}px)`,opacity:1,offset:.3},{transform:"translateY(0)",offset:.66},{transform:"translateY(-16px)",offset:.78},{transform:"translateY(0)",offset:.88},{transform:"translateY(-6px)",offset:.95},{transform:"translateY(0)"}],1150,"cubic-bezier(0.45, 0, 0.9, 0.5)")}leapFrom(t,e){const s=Math.hypot(t,e),i=Math.min(e,0)-Math.max(18,s*.32);return this.host.style.transformOrigin="50% 100%",this.animate([{transform:`translate(${t}px, ${e}px) scale(1, 1)`},{transform:`translate(${t}px, ${e+5}px) scale(1.1, 0.9)`,offset:.14,easing:"ease-out"},{transform:`translate(${t*.55}px, ${i}px) scale(0.92, 1.1)`,offset:.5,easing:"ease-out"},{transform:"translate(0, 0) scale(1, 1)",offset:.76,easing:"cubic-bezier(0.6,0,0.9,0.5)"},{transform:"translate(0, 4px) scale(1.14, 0.86)",offset:.85,easing:"ease-out"},{transform:"translate(0, -3px) scale(0.97, 1.04)",offset:.93,easing:"ease-in-out"},{transform:"translate(0, 0) scale(1, 1)"}],Math.round(620+Math.min(320,s*1.2)))}hop(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"translateY(0)"},{transform:"translateY(-18px)",offset:.5},{transform:"translateY(0)"}],500)}reset(){this.cancel(),this.host.style.transform="",this.host.style.opacity=""}cancel(){if(this.current){try{this.current.cancel()}catch{}this.current=null}}animate(t,e,s="ease-in-out"){this.cancel();const i=this.host.animate(t,{duration:e,easing:s,fill:"forwards"});return this.current=i,i.finished.then(()=>{try{i.commitStyles()}catch{}try{i.cancel()}catch{}this.current===i&&(this.current=null)}).catch(()=>{})}}const R=class R{constructor(t,e){r(this,"observer",null);r(this,"settleTimer",null);r(this,"frame",0);r(this,"lastKey","");r(this,"started",!1);r(this,"onDomChange",t=>{this.isOwnChange(t)||this.schedule()});r(this,"onViewportChange",()=>this.schedule());this.homeBox=t,this.onChange=e}start(){this.started||(this.started=!0,this.observer=new MutationObserver(this.onDomChange),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["style","class","hidden","disabled"]}),window.addEventListener("resize",this.onViewportChange,{passive:!0}),window.addEventListener("scroll",this.onViewportChange,{passive:!0,capture:!0}),this.schedule())}stop(){var t;this.started&&(this.started=!1,(t=this.observer)==null||t.disconnect(),this.observer=null,window.removeEventListener("resize",this.onViewportChange),window.removeEventListener("scroll",this.onViewportChange,!0),this.clearPending())}refresh(){this.schedule()}schedule(){this.started&&(this.settleTimer!==null&&clearTimeout(this.settleTimer),this.settleTimer=window.setTimeout(()=>{this.settleTimer=null,cancelAnimationFrame(this.frame),this.frame=requestAnimationFrame(()=>this.scan())},x.obstacle.settleMs))}clearPending(){this.settleTimer!==null&&(clearTimeout(this.settleTimer),this.settleTimer=null),cancelAnimationFrame(this.frame),this.frame=0}scan(){if(!this.started)return;const t=this.findObstacle(this.homeBox()),e=(t==null?void 0:t.key)??"";e!==this.lastKey&&(this.lastKey=e,this.onChange(t))}findObstacle(t){const e=x.obstacle,s=window.innerHeight-e.bandHeight;let i=null;for(const n of R.samplePoints(t)){const a=this.topElementAt(n.x,n.y);if(a)for(const l of R.buttonsAt(a,e.selector)){const c=l.getBoundingClientRect();c.width<e.minSize||c.height<e.minSize||c.height>e.bandHeight||c.top<s||R.overlaps(c,t)&&(!l.matches(e.selector)&&!R.isPinned(l)||(i===null||c.top<i.top)&&(i=R.describe(l,c)))}}return i}static buttonsAt(t,e){const s=R.clickableAncestor(t,e);return s?[s]:t===document.body||t===document.documentElement?[]:Array.from(t.querySelectorAll(e)).slice(0,x.obstacle.maxCandidates)}static clickableAncestor(t,e){let s=t,i=null;for(let n=0;s!==null&&n<x.obstacle.maxClimb&&!(s===document.body||s===document.documentElement);n++){if(R.isClickable(s,e))i=s;else if(i!==null)break;s=s.parentElement}return i}static isPinned(t){let e=t;for(let s=0;e!==null&&s<x.obstacle.maxClimb;s++){const i=window.getComputedStyle(e).position;if(i==="fixed"||i==="sticky")return!0;e=e.parentElement}return!1}static isClickable(t,e){if(t.matches(e)||t.hasAttribute("onclick"))return!0;const s=typeof t.className=="string"?t.className:"";return x.obstacle.clickableName.test(`${t.id} ${s}`)?!0:window.getComputedStyle(t).cursor==="pointer"}topElementAt(t,e){if(t<0||e<0||t>=window.innerWidth||e>=window.innerHeight)return null;for(const s of document.elementsFromPoint(t,e))if(!s.closest(Pt))return s;return null}static samplePoints(t){const e=[t.left+4,t.left+t.width/2,t.left+t.width-4],s=[t.top+t.height-6,t.top+t.height*.78,t.top+t.height*.55];return e.flatMap(i=>s.map(n=>({x:i,y:n})))}static overlaps(t,e){return t.left<e.left+e.width&&t.right>e.left&&t.top<e.top+e.height&&t.bottom>e.top}static describe(t,e){const i=([t.textContent,t.getAttribute("title"),t.getAttribute("aria-label")].find(l=>(l??"").trim()!=="")??"").replace(/\s+/g," ").trim().slice(0,40),n=l=>Math.round(l/4)*4,a=R.identify(t);return{left:e.left,top:e.top,width:e.width,height:e.height,label:i,id:a,key:`${a}|${n(e.left)},${n(e.top)},${n(e.width)},${n(e.height)}`}}static identify(t){const e=R.ids.get(t);if(e!==void 0)return e;const s=`${t.tagName}#${R.idSeed+=1}`;return R.ids.set(t,s),s}isOwnChange(t){return t.every(e=>{const s=e.target,i=s instanceof Element?s:s.parentElement;return(i==null?void 0:i.closest(Pt))!=null})}};r(R,"ids",new WeakMap),r(R,"idSeed",0);let Mt=R;class ss{constructor(t,e){r(this,"spot");r(this,"footInset",0);this.host=t,this.layout=e,this.spot={mode:"home",right:e.home.right,bottom:e.home.bottom}}get current(){return this.spot}setFootInset(t){this.footInset=Math.max(0,Math.round(t))}homeBox(){const{home:t,size:e}=this.layout,s=Math.max(1,e.height-this.footInset);return{left:window.innerWidth-t.right-e.width,top:window.innerHeight-t.bottom-e.height,width:e.width,height:s}}plan(t){const{home:e,size:s}=this.layout;if(!t)return{mode:"home",right:e.right,bottom:e.bottom};const i=x.obstacle,n=Math.round(window.innerHeight-t.top-this.footInset),a=n-e.bottom,l=this.homeBox(),c=Math.min(t.left+t.width,l.left+l.width)-Math.max(t.left,l.left);if(a>=i.minStandRise&&a<=i.maxStandRise&&t.height>=i.minStandThickness&&c>=s.width*i.minFootShare&&n+s.height<=window.innerHeight-i.edgeGap)return{mode:"stand",right:e.right,bottom:n};const u=Math.round(window.innerWidth-t.left+i.dodgeGap);if(u+s.width<=window.innerWidth-i.edgeGap)return{mode:"dodge",right:u,bottom:e.bottom};const f=window.innerHeight-s.height-i.edgeGap;return{mode:"lift",right:e.right,bottom:Math.max(e.bottom,Math.min(n,f))}}apply(t){this.spot=t,this.host.style.right=`${t.right}px`,this.host.style.bottom=`${t.bottom}px`}}class St{constructor(t,e){r(this,"parking");r(this,"watcher");r(this,"enabled",!0);r(this,"moving",!1);r(this,"queued",null);r(this,"bumpedId",null);this.options=e,this.parking=new ss(t,e),this.watcher=new Mt(()=>this.parking.homeBox(),s=>this.onObstacle(s))}start(){this.watcher.start()}setFootInset(t){this.parking.setFootInset(t),this.watcher.refresh()}setEnabled(t){this.enabled=t,t&&this.watcher.refresh()}destroy(){this.watcher.stop()}onObstacle(t){const e=this.parking.plan(t),s=t!==null&&t.id!==this.bumpedId;this.bumpedId=(t==null?void 0:t.id)??null,this.moveTo(e,s&&e.mode!=="home"&&this.parking.current.mode==="home")}async moveTo(t,e){var a,l,c,h,u,f;const s=this.parking.current,i=t.right-s.right,n=t.bottom-s.bottom;if(!(i===0&&n===0)){if(!this.enabled){this.parking.apply(t);return}if(this.moving){this.queued=t;return}this.moving=!0;try{const g=!St.reduceMotion();e&&g&&((l=(a=this.options).onReact)==null||l.call(a,"bump"),await this.options.mover.fall()),this.parking.apply(t);const w=Math.abs(i)<x.obstacle.smallStep&&Math.abs(n)<x.obstacle.smallStep;g&&!w&&((h=(c=this.options).onReact)==null||h.call(c,t.mode==="home"?"home":"stand"),await this.options.mover.leapFrom(i,n)),(f=(u=this.options).onReact)==null||f.call(u,"settled")}finally{this.moving=!1;const g=this.queued;this.queued=null,g&&this.moveTo(g,!1)}}}static reduceMotion(){var t;try{return((t=window.matchMedia)==null?void 0:t.call(window,"(prefers-reduced-motion: reduce)").matches)===!0}catch{return!1}}}class It{constructor(t){r(this,"enabled",!0);this.onChange=t}init(){var e,s,i,n;const t=x.storageKey.enabled;try{(s=(e=chrome.storage)==null?void 0:e.local)==null||s.get({[t]:!0},a=>{this.enabled=a[t]!==!1,this.onChange(this.enabled)}),(n=(i=chrome.storage)==null?void 0:i.onChanged)==null||n.addListener((a,l)=>{if(l!=="local"||!a[t])return;const c=a[t].newValue!==!1;c!==this.enabled&&(this.enabled=c,this.onChange(c))})}catch(a){console.warn("[Robot][PopupController] Không đọc được cấu hình, mặc định BẬT",a),this.onChange(!0)}}isEnabled(){return this.enabled}setEnabled(t){var e,s;this.enabled=t;try{(s=(e=chrome.storage)==null?void 0:e.local)==null||s.set({[x.storageKey.enabled]:t})}catch(i){console.warn("[Robot][PopupController] Không ghi được cấu hình",i)}}}const _t=[x.color.vnptBlue,x.color.vnptBlueLight,x.color.happy,x.color.think,"#FF6B8B"];function is(o,t=16){const e=x.size.width/2;for(let s=0;s<t;s++){const i=document.createElement("span"),n=_t[s%_t.length],a=5+s%3*2;i.style.cssText=`
            position:absolute; left:${e}px; top:8px; width:${a}px; height:${a*1.4}px;
            background:${n}; border-radius:1px; pointer-events:none; z-index:5; opacity:0;`,o.appendChild(i);const l=(s/t-.5)*140+(s%2?8:-8),c=60+s%4*26,h=(s%2?1:-1)*(180+s%3*120);i.animate([{transform:"translate(0,0) rotate(0deg)",opacity:1,offset:0},{transform:`translate(${l*.5}px, -18px) rotate(${h*.3}deg)`,opacity:1,offset:.25},{transform:`translate(${l}px, ${c}px) rotate(${h}deg)`,opacity:0,offset:1}],{duration:1100+s%5*120,easing:"cubic-bezier(0.2, 0.6, 0.4, 1)",fill:"forwards"}).finished.then(()=>i.remove()).catch(()=>i.remove())}}const Rt={petals:{glyphs:["🌸","🌷","🌼"],size:[10,14],fallMs:[2600,4200],sway:22,spin:!0,opacity:.95,perTick:2},leaves:{glyphs:["🍂","🍁"],size:[12,16],fallMs:[2400,3800],sway:28,spin:!0,opacity:.95,perTick:2},snow:{glyphs:["❄️","❅","·"],size:[8,13],fallMs:[3e3,5200],sway:16,spin:!1,opacity:.9,perTick:3},sun:{glyphs:["✨","☀️"],size:[9,13],fallMs:[2200,3400],sway:12,spin:!1,opacity:.85,perTick:1}},te="season-particle";function ns(o){return o in Rt}function as(o){var t;return((t=Rt[o])==null?void 0:t.perTick)??0}function os(o,t,e){const s=Rt[t];if(!s)return;const{width:i,height:n}=x.size,a=e??s.perTick;for(let l=0;l<a;l++){const c=document.createElement("span");c.className=te,c.textContent=s.glyphs[Math.floor(Math.random()*s.glyphs.length)];const h=s.size[0]+Math.random()*(s.size[1]-s.size[0]),u=Math.random()*(i+20)-10;c.style.cssText=`position:absolute; left:${u}px; top:-16px; font-size:${h}px;
            line-height:1; pointer-events:none; z-index:4; opacity:0; will-change:transform,opacity;`,o.appendChild(c);const f=(Math.random()<.5?-1:1)*s.sway,g=s.spin?(Math.random()<.5?-1:1)*(120+Math.random()*240):0,w=s.fallMs[0]+Math.random()*(s.fallMs[1]-s.fallMs[0]);c.animate([{transform:"translate(0,0) rotate(0deg)",opacity:0,offset:0},{transform:`translate(${f*.5}px, ${n*.45}px) rotate(${g*.5}deg)`,opacity:s.opacity,offset:.5},{transform:`translate(${f}px, ${n+20}px) rotate(${g}deg)`,opacity:0,offset:1}],{duration:w,easing:"ease-in",fill:"forwards"}).finished.then(()=>c.remove()).catch(()=>c.remove())}}function rs(o){o.querySelectorAll(`.${te}`).forEach(t=>t.remove())}const q={schedule:{wakeUp:6*60,napStart:11*60,napEnd:14*60,sleepStart:17*60,sleepEnd:6*60,dailyJitterMinutes:60},waitEscalation:[{atMs:0,id:"think",label:"suy nghĩ"},{atMs:3e3,id:"sit",label:"ngồi xuống"},{atMs:1e4,id:"magnifier",label:"lấy kính lúp"},{atMs:2e4,id:"tea",label:"uống trà"},{atMs:4e4,id:"read",label:"đọc sách"},{atMs:6e4,id:"meditate",label:"ngồi thiền"},{atMs:12e4,id:"fishing",label:"câu cá"},{atMs:3e5,id:"camp",label:"dựng lều"},{atMs:6e5,id:"campfire",label:"đốt lửa"},{atMs:12e5,id:"buildHouse",label:"dựng nhà"},{atMs:18e5,id:"aged",label:"già đi"}],seasons:[{atMs:0,id:"spring",label:"Mùa xuân",effects:["petals","butterfly"]},{atMs:45e3,id:"summer",label:"Mùa hè",effects:["sun","cicada"]},{atMs:9e4,id:"autumn",label:"Mùa thu",effects:["leaves","wind"]},{atMs:135e3,id:"winter",label:"Mùa đông",effects:["snow","coat"]}],aging:[{atMs:1e4,id:"dust",label:"bám bụi"},{atMs:3e4,id:"dustMore",label:"bụi nhiều hơn"},{atMs:45e3,id:"rust",label:"rỉ sét"},{atMs:6e4,id:"loose",label:"ốc vít lỏng"},{atMs:9e4,id:"grayHair",label:"đầu bạc"},{atMs:12e4,id:"cane",label:"chống gậy"},{atMs:15e4,id:"slow",label:"đi rất chậm"},{atMs:18e4,id:"elder",label:"thành ông lão"}],waitRandom:{minMs:4e3,maxMs:12e3,avoidImmediateRepeat:!0}};var S=(o=>(o.Working="working",o.Napping="napping",o.Sleeping="sleeping",o))(S||{});class ls{constructor(t=q.schedule){this.cfg=t}phaseAt(t){const e=t.getHours()*60+t.getMinutes(),s=this.dailyJitter(t),i=this.cfg.sleepStart+s;return e>=this.cfg.napStart&&e<this.cfg.napEnd?S.Napping:e>=i||e<this.cfg.wakeUp?S.Sleeping:S.Working}dailyJitter(t){const e=t.getFullYear()*366+this.dayOfYear(t),s=Math.sin(e*12.9898)*43758.5453,i=s-Math.floor(s),n=this.cfg.dailyJitterMinutes;return Math.round((i*2-1)*n)}dayOfYear(t){const e=new Date(t.getFullYear(),0,0),s=t.getTime()-e.getTime();return Math.floor(s/864e5)}}class cs{constructor(){r(this,"items",new Map)}register(t){return this.items.has(t.id)&&console.warn(`[ActivityRegistry] Trùng id "${t.id}", ghi đè bản cũ.`),this.items.set(t.id,t),this}registerAll(t){for(const e of t)this.register(e);return this}get(t){return this.items.get(t)}all(){return[...this.items.values()]}candidates(t){return this.all().filter(e=>!e.phases||e.phases.includes(t))}}class ee{constructor(t=Math.random){this.rng=t}pickWeighted(t,e){const s=e&&t.length>1?t.filter(a=>a.id!==e):t,i=s.reduce((a,l)=>a+Math.max(0,l.weight),0);if(s.length===0||i<=0)return null;let n=this.rng()*i;for(const a of s)if(n-=Math.max(0,a.weight),n<=0)return a;return s[s.length-1]}pick(t,e){const s=e&&t.length>1?t.filter(i=>i.id!==e):t;return s.length===0?null:s[Math.min(s.length-1,Math.floor(this.rng()*s.length))]}intBetween(t,e){return Math.floor(t+this.rng()*(e-t+1))}}class hs{constructor(t,e){r(this,"lastId");this.registry=t,this.random=e}next(t){const e=this.registry.candidates(t),s=this.lastId,i=this.random.pickWeighted(e,s);if(!i)return null;this.lastId=i.id;const n=this.random.intBetween(i.minMs,i.maxMs);return{activity:i,durationMs:n}}reset(){this.lastId=void 0}}class Lt{constructor(t){r(this,"stages");this.stages=[...t].sort((e,s)=>e.atMs-s.atMs)}at(t){let e=null;for(const s of this.stages)if(t>=s.atMs)e=s;else break;return e}crossed(t,e){const s=this.at(t),i=this.at(e);return i&&i.id!==(s==null?void 0:s.id)?i:null}all(){return this.stages}}class ds{constructor(t,e,s,i,n){r(this,"points",[]);r(this,"coveredMs",0);this.stages=t,this.rng=e,this.minMs=s,this.maxMs=i,this.avoidRepeat=n}at(t){this.ensureCovered(t);let e=null;for(const s of this.points)if(t>=s.atMs)e=s.stage;else break;return e}crossed(t,e){const s=this.at(t),i=this.at(e);return i&&i.id!==(s==null?void 0:s.id)?i:null}reset(){this.points.length=0,this.coveredMs=0}ensureCovered(t){var e;if(this.stages.length!==0){if(this.points.length===0){const s=this.rng.pick(this.stages);if(!s)return;this.points.push({atMs:0,stage:s})}for(;this.coveredMs<=t;){const s=Math.max(1,this.rng.intBetween(this.minMs,this.maxMs));this.coveredMs+=s;const i=(e=this.points[this.points.length-1])==null?void 0:e.stage.id,n=this.rng.pick(this.stages,this.avoidRepeat?i:void 0);if(!n)break;this.points.push({atMs:this.coveredMs,stage:n})}}}}class us{constructor(t=q.waitEscalation,e){r(this,"timeline");r(this,"sequencer");this.timeline=new Lt(t),this.sequencer=e!=null&&e.random?new ds(t,e.rng??new ee,q.waitRandom.minMs,q.waitRandom.maxMs,q.waitRandom.avoidImmediateRepeat):null}stageAt(t){return this.sequencer?this.sequencer.at(t):this.timeline.at(t)}stageCrossed(t,e){return this.sequencer?this.sequencer.crossed(t,e):this.timeline.crossed(t,e)}reset(){var t;(t=this.sequencer)==null||t.reset()}}class gs{constructor(t=q.seasons){r(this,"timeline");this.timeline=new Lt(t)}seasonAt(t){return this.timeline.at(t)}seasonCrossed(t,e){return this.timeline.crossed(t,e)}}class ps{constructor(t=q.aging){r(this,"timeline");this.timeline=new Lt(t)}stageAt(t){return this.timeline.at(t)}stageCrossed(t,e){return this.timeline.crossed(t,e)}}const fs=[{id:"sleep",label:"ngủ",category:"rest",weight:5,minMs:15e3,maxMs:4e4,isPrivate:!0,phases:[S.Sleeping,S.Napping]},{id:"meditate",label:"ngồi thiền",category:"rest",weight:2,minMs:1e4,maxMs:2e4},{id:"stargaze",label:"ngắm sao",category:"rest",weight:1,minMs:1e4,maxMs:18e3,phases:[S.Sleeping]},{id:"readBook",label:"đọc sách",category:"hobby",weight:4,minMs:12e3,maxMs:24e3,phases:[S.Working]},{id:"drinkCoffee",label:"uống cà phê",category:"hobby",weight:3,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"drinkTea",label:"uống trà",category:"hobby",weight:3,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"playRubik",label:"chơi Rubik",category:"hobby",weight:2,minMs:1e4,maxMs:2e4,phases:[S.Working]},{id:"playGame",label:"chơi game",category:"hobby",weight:2,minMs:12e3,maxMs:22e3,phases:[S.Working]},{id:"listenMusic",label:"nghe nhạc",category:"hobby",weight:3,minMs:1e4,maxMs:2e4},{id:"writeDiary",label:"viết nhật ký",category:"hobby",weight:1,minMs:1e4,maxMs:16e3,phases:[S.Sleeping]},{id:"shower",label:"tắm",category:"chore",weight:1,minMs:8e3,maxMs:14e3,isPrivate:!0},{id:"brushTeeth",label:"đánh răng",category:"chore",weight:2,minMs:6e3,maxMs:1e4},{id:"wateringPlant",label:"tưới cây",category:"chore",weight:2,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"gym",label:"tập gym",category:"exercise",weight:2,minMs:1e4,maxMs:18e3,phases:[S.Working]},{id:"pushUp",label:"chống đẩy",category:"exercise",weight:2,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"martialArts",label:"tập võ",category:"exercise",weight:1,minMs:1e4,maxMs:16e3,phases:[S.Working]},{id:"chargeBattery",label:"sạc pin",category:"work",weight:3,minMs:12e3,maxMs:22e3},{id:"oiling",label:"tra dầu",category:"work",weight:2,minMs:8e3,maxMs:14e3},{id:"selfRepair",label:"sửa chính mình",category:"work",weight:1,minMs:1e4,maxMs:18e3},{id:"learnCoding",label:"học lập trình",category:"work",weight:2,minMs:12e3,maxMs:22e3,phases:[S.Working]}];class Bt{constructor(t){r(this,"scheduler");r(this,"idle");r(this,"wait");r(this,"season");r(this,"aging");var i,n,a,l;const e=(t==null?void 0:t.registry)??new cs().registerAll(fs),s=(t==null?void 0:t.random)??new ee;this.scheduler=(t==null?void 0:t.scheduler)??new ls,this.idle=new hs(e,s),this.wait=new us((i=t==null?void 0:t.thresholds)==null?void 0:i.waitEscalation,{random:((n=t==null?void 0:t.thresholds)==null?void 0:n.waitEscalationRandom)===!0}),this.season=new gs((a=t==null?void 0:t.thresholds)==null?void 0:a.seasons),this.aging=new ps((l=t==null?void 0:t.thresholds)==null?void 0:l.aging)}currentPhase(t){return this.scheduler.phaseAt(t)}nextActivity(t){return this.idle.next(this.scheduler.phaseAt(t))}waitSnapshot(t){return{stage:this.wait.stageAt(t),season:this.season.seasonAt(t),aging:this.aging.stageAt(t)}}waitCrossings(t,e){return{stage:this.wait.stageCrossed(t,e),season:this.season.seasonCrossed(t,e),aging:this.aging.stageCrossed(t,e)}}resetActivity(){this.idle.reset()}resetWait(){this.wait.reset()}}const ms={dust:"grayscale(0.15)",dustMore:"grayscale(0.3)",rust:"grayscale(0.4) sepia(0.25)",loose:"grayscale(0.5) sepia(0.3)",grayHair:"grayscale(0.65) sepia(0.3)",cane:"grayscale(0.75) sepia(0.35)",slow:"grayscale(0.85) sepia(0.4)",elder:"grayscale(1) sepia(0.5) opacity(0.9)"},se=["lookAround","scratchHead","wave","nod","tiltCurious","yawn"],bs={spring:"",summer:"saturate(1.2) brightness(1.05)",autumn:"sepia(0.35)",winter:"brightness(1.08) saturate(0.85)"};class ys{constructor(t={}){r(this,"host");r(this,"stage");r(this,"view");r(this,"emotion");r(this,"anim");r(this,"sm");r(this,"tracker");r(this,"physics");r(this,"avoidance");r(this,"popup");r(this,"life");r(this,"activateCb",null);r(this,"booted",!1);r(this,"seq",0);r(this,"idleGestureTimer",null);r(this,"idleToLongTimer",null);r(this,"longToSleepTimer",null);r(this,"autoReturnTimer",null);r(this,"typingTimer",null);r(this,"waitTimer",null);r(this,"waitStart",0);r(this,"waitPrev",0);r(this,"waitRandom");r(this,"reduceMotion",!1);var n;this.options=t,this.life=new Bt({thresholds:t.thresholds}),this.waitRandom=((n=t.thresholds)==null?void 0:n.waitEscalationRandom)===!0,this.host=document.createElement("div"),this.host.id=lt.robotSvg,this.host.style.cssText=`position:fixed; right:${x.home.right}px; bottom:${x.home.bottom}px;
            width:${x.size.width}px; height:${x.size.height}px; z-index:2147483647;
            cursor:pointer; overflow:visible; user-select:none;`;const e=this.host.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=this.getStyles();const i=document.createElement("div");i.className="robot-stage",e.append(s,i),this.stage=i,this.view=new Zt(i),this.emotion=new je(this.view),this.anim=new Ze(this.view),this.physics=new es(this.host),this.sm=new _e(d.Boot,(a,l)=>this.onEnter(a,l)),this.tracker=new ts(this.host,this.view,{onActivity:()=>this.onActivity(),onHoverChange:a=>this.onHoverChange(a),onOffBalance:()=>this.sm.dispatch(d.Fell,y.Mouse)}),this.popup=new It(a=>this.onEnabledChange(a)),this.avoidance=new St(this.host,{home:x.home,size:x.size,mover:this.physics,onReact:a=>this.onAvoidanceReact(a)}),this.host.addEventListener("click",()=>this.onClick()),this.host.title="ZeroCheck AI",document.body.appendChild(this.host),this.applyReduceMotion(),this.tracker.start(),this.avoidance.start(),this.popup.init()}onActivate(t){this.activateCb=t}notifyChatOpened(){this.sm.dispatch(d.Listening,y.UserClick)}notifyChatClosed(){this.sm.is(d.Flying,d.Falling,d.Disabled,d.Landing)||this.sm.dispatch(d.Idle,y.UserClick)}notifyTyping(){this.sm.dispatch(d.Typing,y.UserClick),this.typingTimer!==null&&clearTimeout(this.typingTimer),this.typingTimer=window.setTimeout(()=>{this.sm.is(d.Typing)&&this.sm.dispatch(d.Listening,y.UserClick)},1600)}notifyThinking(t){t?this.sm.dispatch(d.Thinking,y.UserClick):this.sm.is(d.Thinking)&&this.sm.dispatch(d.Listening,y.UserClick)}notifyResult(t){const e={success:d.Happy,allValid:d.Celebrate,warning:d.Confused,localError:d.PointError,aiError:d.Sad};this.sm.dispatch(e[t],y.Validation)}destroy(){this.clearAllTimers(),this.tracker.stop(),this.avoidance.destroy(),this.anim.cancelAll(),this.physics.cancel(),this.host.remove()}onClick(){var t;this.sm.is(d.Disabled)||((t=this.activateCb)==null||t.call(this),this.sm.is(d.Sleeping,d.LongIdle)&&this.onActivity())}onActivity(){this.sm.is(d.Sleeping)?this.sm.dispatch(d.WakeUp,y.Mouse):this.sm.is(d.LongIdle)?this.sm.dispatch(d.Idle,y.Mouse):this.sm.is(d.Idle)&&this.armIdleTimers()}onHoverChange(t){t?this.sm.dispatch(d.Hover,y.Mouse):this.sm.is(d.Hover)&&this.sm.dispatch(d.Idle,y.Mouse)}onEnabledChange(t){if(!this.booted){this.booted=!0,t?this.sm.force(d.Idle):this.sm.force(d.Disabled);return}this.sm.force(t?d.Falling:d.Flying)}onEnter(t,e){const s=++this.seq;switch(this.anim.cancelGestures(),this.clearAutoReturn(),this.clearIdleTimers(),this.stopWaitEscalation(),t){case d.Idle:this.enterIdle();break;case d.LongIdle:this.tracker.setApplyGaze(!0),this.emotion.set(v.Sleepy),this.anim.setBase("breathe"),this.host.style.transform="translateY(6px)",this.longToSleepTimer=window.setTimeout(()=>this.sm.dispatch(d.Sleeping,y.Idle),x.timing.longIdleToSleep);break;case d.Sleeping:this.tracker.setApplyGaze(!1),this.emotion.set(v.Sleepy),this.anim.setBase("sleepBob"),this.host.style.transform="translateY(6px)";break;case d.WakeUp:this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.host.style.transform="",this.anim.setBase("breathe"),this.anim.playGesture("wake").then(()=>this.thenIf(s,()=>this.sm.force(d.Idle)));break;case d.Hover:this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!0),this.emotion.set(v.Happy),this.anim.setBase("breathe"),this.host.style.transform="",this.anim.playGesture("wave");break;case d.Listening:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("nod");break;case d.Typing:this.gazeOffPose(v.Curious),this.anim.setBase("breathe"),this.anim.playGesture("tiltCurious");break;case d.Thinking:this.gazeOffPose(v.Focused),this.anim.setBase("think"),this.startWaitEscalation(s);break;case d.Explaining:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("nod"),this.autoReturn(s,d.Listening,1800);break;case d.Happy:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("thumbsUp"),this.autoReturn(s,d.Idle,2200);break;case d.Celebrate:this.gazeOffPose(v.Proud),this.anim.setBase("breathe"),this.anim.playGesture("celebrate"),this.physics.hop(),is(this.stage),this.autoReturn(s,d.Idle,2600);break;case d.Confused:this.gazeOffPose(v.Embarrassed),this.anim.setBase("breathe"),this.anim.playGesture("scratchHead"),this.autoReturn(s,d.Idle,2600);break;case d.Sad:this.gazeOffPose(v.Sad),this.anim.setBase("breathe"),this.anim.playGesture("sad"),this.host.style.transform="translateY(5px)",this.autoReturn(s,d.Idle,3e3);break;case d.PointError:this.gazeOffPose(v.Sad),this.anim.setBase("breathe"),this.anim.playGesture("pointError"),this.autoReturn(s,d.Idle,3200);break;case d.Flying:this.enterFlying(s);break;case d.Disabled:this.clearAllTimers(),this.avoidance.setEnabled(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Sleepy),this.anim.setBase(null),this.host.style.pointerEvents="none";break;case d.Falling:this.enterFalling(s);break;case d.Landing:this.enterLanding(s);break;case d.Fell:this.enterFell(s);break;case d.Boot:}}gazeOffPose(t){this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.view.setHeadTilt(0),this.view.setPupilOffset(0,0),this.emotion.set(t),this.host.style.transform=""}onAvoidanceReact(t){if(this.sm.is(d.Idle,d.LongIdle,d.Sleeping,d.Hover,d.Watching))switch(t){case"bump":this.emotion.set(v.Surprised);break;case"stand":this.emotion.set(v.Happy);break;case"home":this.emotion.set(v.Happy);break;case"settled":this.emotion.set(this.sm.is(d.LongIdle,d.Sleeping)?v.Sleepy:v.Neutral);break}}enterIdle(){this.view.setZzzVisible(!1),this.view.setThumbVisible(!1),this.host.style.pointerEvents="auto",this.host.style.transform="",this.host.style.opacity="",this.emotion.set(v.Neutral),this.tracker.setApplyGaze(!0),this.avoidance.setEnabled(!0),this.anim.setBase("breathe"),this.armIdleTimers()}enterFlying(t){this.clearAllTimers(),this.avoidance.setEnabled(!1),this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.anim.setBase(null),this.physics.flyToPopup().then(()=>this.thenIf(t,()=>this.sm.force(d.Disabled)))}enterFalling(t){this.clearAllTimers(),this.host.style.pointerEvents="auto",this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.anim.setBase(null),this.physics.dropIn().then(()=>this.thenIf(t,()=>this.sm.force(d.Landing)))}enterLanding(t){this.emotion.set(v.Embarrassed),this.anim.setBase("breathe"),this.physics.landingSquash().then(()=>this.thenIf(t,()=>{this.emotion.set(v.Happy),this.anim.playGesture("thumbsUp"),window.setTimeout(()=>this.thenIf(t,()=>this.sm.force(d.Idle)),800)}))}enterFell(t){this.tracker.setApplyGaze(!1),this.emotion.set(v.Embarrassed),this.anim.setBase(null),this.physics.fall().then(()=>this.thenIf(t,()=>{this.anim.playGesture("dizzy"),window.setTimeout(()=>this.thenIf(t,()=>this.sm.force(d.Idle)),700)}))}startWaitEscalation(t){this.waitStart=Date.now(),this.waitPrev=0,this.life.resetWait();const e=()=>{if(t!==this.seq)return;const s=Date.now()-this.waitStart,i=this.life.waitCrossings(this.waitPrev,s);i.stage&&this.playWaitStage(i.stage.id);const n=this.life.waitSnapshot(s);this.applyThinkingVisual(n),this.emitSeasonParticles(n),this.waitPrev=s,this.waitTimer=window.setTimeout(e,1e3)};this.waitTimer=window.setTimeout(e,1e3)}stopWaitEscalation(){this.waitTimer!==null&&(clearTimeout(this.waitTimer),this.waitTimer=null),this.stage.style.filter="",rs(this.stage)}emitSeasonParticles(t){if(this.reduceMotion||!t.season)return;const e=t.season.effects.find(s=>ns(s));e&&os(this.stage,e,as(e))}playWaitStage(t){if(this.waitRandom){const e=se[Math.floor(Math.random()*se.length)];this.anim.playGesture(e);return}t!=="think"&&(this.host.style.transform="translateY(6px)")}applyThinkingVisual(t){const e=[];t.aging&&e.push(ms[t.aging.id]??""),t.season&&e.push(bs[t.season.id]??""),this.stage.style.filter=e.filter(Boolean).join(" ")}armIdleTimers(){this.clearIdleTimers(),this.scheduleIdleGesture(),this.idleToLongTimer=window.setTimeout(()=>this.sm.dispatch(d.LongIdle,y.Idle),x.timing.idleToLongIdle)}scheduleIdleGesture(){const{idleGestureMin:t,idleGestureMax:e}=x.timing,s=this.options.lively?.5:1,i=(t+Math.random()*(e-t))*s;this.idleGestureTimer=window.setTimeout(()=>{if(this.sm.is(d.Idle)){const n=this.options.lively?["blink","lookAround","scratchHead","yawn","wave","nod"]:["blink","blink","lookAround","scratchHead","yawn"],a=n[Math.floor(Math.random()*n.length)];this.anim.playGesture(a)}this.scheduleIdleGesture()},i)}autoReturn(t,e,s){this.autoReturnTimer=window.setTimeout(()=>this.thenIf(t,()=>this.sm.dispatch(e,y.Validation)),s)}thenIf(t,e){t===this.seq&&e()}clearIdleTimers(){this.clearTimer("idleGestureTimer"),this.clearTimer("idleToLongTimer"),this.clearTimer("longToSleepTimer")}clearAutoReturn(){this.clearTimer("autoReturnTimer")}clearAllTimers(){this.clearIdleTimers(),this.clearAutoReturn(),this.clearTimer("typingTimer"),this.stopWaitEscalation()}clearTimer(t){const e=this[t];e!==null&&(clearTimeout(e),this[t]=null)}applyReduceMotion(){var t,e,s;try{const i=(t=window.matchMedia)==null?void 0:t.call(window,"(prefers-reduced-motion: reduce)");let n=(i==null?void 0:i.matches)===!0;this.reduceMotion=n,(s=(e=chrome.storage)==null?void 0:e.local)==null||s.get({[x.storageKey.reduceMotion]:!1},a=>{n=n||a[x.storageKey.reduceMotion]===!0,this.reduceMotion=n,this.anim.setReduceMotion(n)})}catch{}}getStyles(){return`
            :host { all: initial; }
            .robot-stage { position: relative; width: 100%; height: 100%; }
            .robot-svg { display: block; overflow: visible; filter: drop-shadow(0 4px 8px rgba(0,60,110,0.20)); }
            /* Gaze mượt: đầu & con ngươi có transition nhẹ; WAAPI vẫn ghi đè khi có gesture. */
            #robot-head { transition: transform 0.18s ease-out; }
            #robot-pupils { transition: transform 0.14s ease-out; }
            ${Zt.partOriginCss()}
        `}}const ie="svg";function ws(o){return o==="svg"||o==="svgAnim"||o==="three"}const xs="his-robot3d:cmd",ne="his-robot3d:activate",ae="his-robot3d:ready",oe="his-robot3d:failed";class re{constructor(t,e,s="demo"){r(this,"activateCb",null);r(this,"fallback",null);r(this,"script",null);r(this,"ready",!1);r(this,"destroyed",!1);r(this,"lastEnabled",!0);r(this,"life",new Bt({thresholds:this.thresholds}));r(this,"waitStart",0);r(this,"lifeTimer",0);r(this,"lastAging",null);r(this,"lastSeason",null);r(this,"popup",new It(t=>{this.lastEnabled=t,this.send({type:"enabled",value:t})}));r(this,"onActivateEvt",()=>{var t;return(t=this.activateCb)==null?void 0:t.call(this)});r(this,"onReadyEvt",()=>{this.ready=!0,this.appearance&&this.send({type:"appearance",color:this.appearance.color,scale:this.appearance.scale,showLogo:this.appearance.showLogo,logoDataUrl:this.appearance.logoDataUrl}),this.send({type:"enabled",value:this.lastEnabled})});r(this,"onFailedEvt",()=>this.useFallback());this.thresholds=t,this.appearance=e,this.variant=s,document.addEventListener(ne,this.onActivateEvt),document.addEventListener(ae,this.onReadyEvt,{once:!0}),document.addEventListener(oe,this.onFailedEvt,{once:!0}),this.inject(),this.popup.init()}inject(){try{const t=chrome.runtime.getURL("robot3d/index.js")+(this.variant==="cute"?"?variant=cute":""),e=document.createElement("script");e.type="module",e.src=t,e.addEventListener("error",()=>this.useFallback()),(document.head||document.documentElement).appendChild(e),this.script=e,window.setTimeout(()=>{!this.ready&&!this.destroyed&&this.useFallback()},4e3)}catch{this.useFallback()}}useFallback(){var t;this.fallback||this.destroyed||((t=this.script)==null||t.remove(),this.script=null,this.fallback=new ys({lively:this.variant==="cute",thresholds:this.thresholds}),this.activateCb&&this.fallback.onActivate(this.activateCb))}send(t){this.fallback||document.dispatchEvent(new CustomEvent(xs,{detail:t}))}onActivate(t){var e;this.activateCb=t,(e=this.fallback)==null||e.onActivate(t)}notifyChatOpened(){var t;this.send({type:"chatOpened"}),(t=this.fallback)==null||t.notifyChatOpened()}notifyChatClosed(){var t;this.send({type:"chatClosed"}),(t=this.fallback)==null||t.notifyChatClosed()}notifyTyping(){var t;this.send({type:"typing"}),(t=this.fallback)==null||t.notifyTyping()}notifyThinking(t){var e,s;this.send({type:"thinking",active:t,random:((e=this.thresholds)==null?void 0:e.waitEscalationRandom)===!0}),(s=this.fallback)==null||s.notifyThinking(t),t?this.startWaitClock():this.stopWaitClock()}notifyResult(t){var e;this.send({type:"result",result:t}),(e=this.fallback)==null||e.notifyResult(t),this.stopWaitClock()}startWaitClock(){if(this.waitStart)return;this.life.resetWait(),this.waitStart=Date.now(),this.lastAging=null,this.lastSeason=null;const t=()=>{var n,a;if(this.destroyed||!this.waitStart)return;const e=this.life.waitSnapshot(Date.now()-this.waitStart),s=((n=e.aging)==null?void 0:n.id)??null,i=((a=e.season)==null?void 0:a.id)??null;(s!==this.lastAging||i!==this.lastSeason)&&(this.lastAging=s,this.lastSeason=i,this.send({type:"life",aging:s,season:i})),this.lifeTimer=window.setTimeout(t,1e3)};t()}stopWaitClock(){!this.waitStart&&!this.lifeTimer||(window.clearTimeout(this.lifeTimer),this.lifeTimer=0,this.waitStart=0,(this.lastAging!==null||this.lastSeason!==null)&&(this.lastAging=null,this.lastSeason=null,this.send({type:"life",aging:null,season:null})))}destroy(){var t,e;this.destroyed=!0,this.stopWaitClock(),this.send({type:"destroy"}),document.removeEventListener(ne,this.onActivateEvt),document.removeEventListener(ae,this.onReadyEvt),document.removeEventListener(oe,this.onFailedEvt),(t=this.script)==null||t.remove(),(e=this.fallback)==null||e.destroy()}}class vs{constructor(){r(this,"providesLauncher",!1)}onActivate(t){}notifyChatOpened(){}notifyChatClosed(){}notifyTyping(){}notifyThinking(t){}notifyResult(t){}destroy(){}}function ks(o,t,e){switch(o){case"three":return new re(t,e);case"svgAnim":return new re(t,e,"cute");case"svg":default:return new vs}}const Es=/^#[0-9a-fA-F]{6}$/,As="/api/extension-config",Ts=4e3,ht="extensionConfigCache",Cs=5*60*1e3;function Ms(){return{color:null,scale:100,showLogo:!1,logoDataUrl:null}}function le(){return{robotRenderer:ie,thresholds:{},appearance:Ms()}}async function ce(o=new qt().baseUrl){const{licenseKey:t}=await Yt(),e=await Rs(t);if(e&&Date.now()-e.fetchedAt<Cs)return rt(e.raw);const s=new AbortController,i=setTimeout(()=>s.abort(),Ts);try{const n={Accept:"application/json"};t&&(n[Wt]=t),e!=null&&e.etag&&(n["If-None-Match"]=e.etag);const a=await fetch(`${o}${As}`,{method:"GET",headers:n,signal:s.signal});if(a.status===304&&e)return await he({...e,fetchedAt:Date.now()}),rt(e.raw);if(!a.ok)return e?rt(e.raw):le();const l=await a.json();return await he({licenseKey:t,etag:a.headers.get("ETag")??"",fetchedAt:Date.now(),raw:l}),rt(l)}catch{return e?rt(e.raw):le()}finally{clearTimeout(i)}}function Ss(o){const t=(e,s)=>{if(s!=="local"||!(ct in e))return;const{oldValue:i,newValue:n}=e[ct];i!==n&&Is().then(()=>o==null?void 0:o())};try{chrome.storage.onChanged.addListener(t)}catch{return()=>{}}return()=>{try{chrome.storage.onChanged.removeListener(t)}catch{}}}async function Is(){try{await chrome.storage.local.remove(ht)}catch{}}async function Rs(o){try{const e=(await chrome.storage.local.get({[ht]:null}))[ht];return!e||typeof e!="object"||!e.raw||e.licenseKey!==o||typeof e.fetchedAt!="number"?null:e}catch{return null}}async function he(o){try{await chrome.storage.local.set({[ht]:o})}catch{}}function rt(o){var s,i,n,a;const t=ws(o.robotRenderer)?o.robotRenderer:ie,e={waitEscalation:zt(q.waitEscalation,(s=o.life)==null?void 0:s.waitEscalation),seasons:zt(q.seasons,(i=o.life)==null?void 0:i.seasons),aging:zt(q.aging,(n=o.life)==null?void 0:n.aging),waitEscalationRandom:((a=o.life)==null?void 0:a.waitEscalationRandom)===!0};return{robotRenderer:t,thresholds:e,appearance:Ls(o.appearance)}}function Ls(o){const t=typeof(o==null?void 0:o.color)=="string"&&Es.test(o.color)?o.color:null,e=typeof(o==null?void 0:o.scale)=="number"&&Number.isFinite(o.scale)?Math.round(o.scale):100,s=Math.min(200,Math.max(40,e||100)),i=(o==null?void 0:o.showLogo)===!0,n=typeof(o==null?void 0:o.logoDataUrl)=="string"&&o.logoDataUrl.startsWith("data:image/")?o.logoDataUrl:null;return{color:t,scale:s,showLogo:i,logoDataUrl:n}}function zt(o,t){if(!t||t.length===0)return o;const e=new Map(t.map(s=>[s.id,s.atMs]));return o.map(s=>e.has(s.id)?{...s,atMs:e.get(s.id)}:s)}console.log("ZeroCheck AI Loaded");async function Bs(){console.log("Content script initialization started");const o=new U;console.log("[FieldRegistry] Initialized");const t=new me;console.log("[FormAnalyzer] Initialized");const e=new we(t,o);console.log("[ChangeTracker] Initialized");const s=new Ie;s.registerRule(new Re),s.registerRule(new Le),s.registerRule(new Be),s.registerRule(new ze),console.log("[ValidationEngine] Initialized with",s.getRuleCount(),"rules");const i=new Ne(s);i.registerPageMapping("Diagnosis",["maBenhNhan","ngaySinh","gioiTinh","icdVao","icdRa","icdChuan","chanDoan","tenBacSi"]),i.registerPageMapping("PatientIntake",["maBenhNhan","hoTen","ngaySinh","gioiTinh","danToc","quocGia","soBhyt","cccd","soDienThoai","diaChi"]),i.registerPageMapping("MedicalEncounter",["maBenhNhan","ngayKham","ngayVao","ngayRa","khoa","phong","giuong","trieuChung","chanDoanBan","chanDoanPhu"]),console.log("[ValidationPipeline] Initialized");const n={},a=new Set,l=300,c={gioitinh:["icdVao","icdRa"],cbgioitinh:["icdVao","icdRa"],gender:["icdVao","icdRa"],ngaysinh:["icdVao","icdRa"],dateofbirth:["icdVao","icdRa"]},h=m=>c[m.toLowerCase()]??[];let u=0;const f=3e4,g=new Ae;console.log("[UnifiedAssistantPanel] Initialized");const w=await ce();console.log("[ExtensionConfig] robotRenderer =",w.robotRenderer),Ot(document.documentElement,w.appearance.color),Ss(()=>{ce().then(m=>{Ot(document.documentElement,m.appearance.color),m.robotRenderer!==w.robotRenderer&&console.log("[ExtensionConfig] Đổi khóa bản quyền: hình hài robot mới áp dụng ở lần tải trang sau.")})});const b=ks(w.robotRenderer,w.thresholds,w.appearance);b.providesLauncher!==!1?g.useExternalLauncher():new It(m=>{g.setLauncherVisible(m),m||g.close()}).init(),b.onActivate(()=>{g.isPanelOpen()?g.close():(g.open("chat"),b.notifyChatOpened())}),g.onClose(()=>b.notifyChatClosed()),console.log("[RobotMascot] Initialized");const T=new pt({openChat:()=>{g.isPanelOpen()?g.open("chat"):(g.open("chat"),b.notifyChatOpened())},clickPlus:()=>g.clickPlusButton(),getRect:m=>g.getUiRect(m),supports:m=>m==="bangke-all"||m==="bangke-one"?st.isSupportedPage():!0});T.showIfFirstRun(),chrome.runtime.onMessage.addListener((m,V,nt)=>{(m==null?void 0:m.type)==="zc-show-onboarding"&&(T.show(),nt({ok:!0}))});const M=new Ee(g),p=new ke(M,m=>{console.log("[NotificationManager] Explain button clicked:",m)});console.log("[NotificationManager] Initialized"),e.onFieldChange(m=>{if(console.log(`[Validation] Field changed: ${m}`),["textIcdVao","textIcdRa","textIcdChuan"].includes(m)){console.log(`[Validation] Skipping search field: ${m}`);return}const V=o.get(m);V&&!V.element.hasAttribute("data-has-focus-listener")&&(V.element.addEventListener("focus",()=>{a.add(m),console.log(`[Focus] Field ${m} focused`)}),V.element.setAttribute("data-has-focus-listener","true")),a.add(m);const nt=[m,...h(m)];n[m]&&clearTimeout(n[m]),n[m]=setTimeout(async()=>{delete n[m];const _=o.refreshValues();_>0&&console.log(`[Validation] Đã đồng bộ ${_} trường với giá trị thật trên form`);for(const X of nt){const de=X!==m,tt=o.get(X);if(!tt){de||console.warn(`[Validation] Field ${X} not found in registry`);continue}const ue=tt.value??"";if(de){if(ue==="")continue;console.log(`[Validation] Re-checking dependent field ${X} (triggered by ${m})`)}else if(!a.has(X)){console.log(`[Validation] Field ${X} not focused, skipping result display`);continue}console.log(`[Validation] Validating field: ${X}, value: "${tt.value}"`);const ge=new Map;o.getAll().forEach(B=>{ge.set(B.id,B.value)});const zs={currentPage:window.location.href,currentField:tt,currentValue:ue,formValues:ge,fieldRegistry:o,metadata:{}};g.beginChecking();let j;try{j=await i.validateField(zs)}finally{g.endChecking()}if(console.log(`[Pipeline] Decision: ${j.decision}, Local Passed: ${j.localPassed}, Remote Called: ${j.remoteCalled}`),j.remoteError){const B=Date.now();B-u>f&&(u=B,p.notify({field:tt.element,level:"warning",title:"Mất kết nối máy chủ kiểm tra",message:j.remoteError,suggestion:"Kiểm tra Backend API đang chạy; các cảnh báo hiển thị hiện tại chỉ là kiểm tra cục bộ.",canExplain:!1,metadata:{fieldLabel:tt.label},timestamp:Date.now()}))}const $t=j.localResults;$t.length>0?(console.log(`[ValidationResults] ${X}:`,$t),$t.forEach(B=>{p.notify({field:B.field.element,level:B.level,title:B.title,message:B.message,suggestion:B.suggestion,canExplain:B.canExplain,metadata:{...B.metadata,fieldLabel:B.field.label},timestamp:Date.now()})})):j.remoteError||(console.log(`[Validation] Field ${X}: PASS`),p.clearFieldError(tt.element))}},l)}),e.onFieldBlur((m,V)=>{console.log(`[Blur] Field ${m} - user left field`),a.delete(m),n[m]&&(clearTimeout(n[m]),delete n[m])}),e.start(document),console.log("[ChangeTracker] Started monitoring for form changes");let k=0;const $=5,I=()=>{k++,console.log(`[Scan] Attempt ${k} - Starting form analysis on page...`);const m=o.size();t.scan(document,o);const V=o.size(),nt=V-m;if(console.log(`[Scan Complete] Found ${V} total field(s) on page (${nt} new)`),nt>0){const _=e.getEventBinder();_&&_.bindAll()}if(V===0&&k<$)console.log("[Scan] No fields found, retrying in 500ms..."),setTimeout(I,500);else if(V===0)console.warn("[Warning] No form fields detected after multiple attempts");else{const _=o.getAll();console.log("[Fields]",_)}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{requestAnimationFrame(I)}):requestAnimationFrame(I);const F=new Tt(g);F.attachRobot(b),console.log("[ChatPanel] Initialized"),g.onTabChange(m=>{m==="chat"&&(F.focusInput(),b.notifyChatOpened())}),window.hisAssistantPanel=g,window.hisChatPanel=F,window.aiValidationNotifier=p,window.validationEngine=s,window.validationPipeline=i,window.fieldRegistry=o,window.hisRobot=b,window.hisRobotLife=new Bt}Bs()})();
