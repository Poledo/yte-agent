var Xi=Object.defineProperty;var Ki=(q,U,et)=>U in q?Xi(q,U,{enumerable:!0,configurable:!0,writable:!0,value:et}):q[U]=et;var o=(q,U,et)=>Ki(q,typeof U!="symbol"?U+"":U,et);(function(){"use strict";function q(r){return r instanceof HTMLInputElement?r.type==="checkbox"?r.checked:r.type==="number"?r.value?parseFloat(r.value):null:r.value:r instanceof HTMLTextAreaElement||r instanceof HTMLSelectElement?r.value:null}class U{constructor(){o(this,"fields",new Map);o(this,"elementMap",new WeakMap);o(this,"validationStates",new Map)}refreshValues(){let t=0;return this.fields.forEach(e=>{if(!e.element.isConnected)return;const i=q(e.element);i!==e.value&&(e.value=i,t++)}),t}register(t){if(this.elementMap.has(t.element)){const e=this.elementMap.get(t.element);this.fields.set(e,t)}else this.fields.set(t.id,t),this.elementMap.set(t.element,t.id)}unregister(t){this.fields.get(t)&&(this.fields.delete(t),this.validationStates.delete(t))}update(t,e){const i=this.fields.get(t);if(!i)throw new Error(`Field with id "${t}" not found`);const s={...i,...e,element:e.element??i.element};this.fields.set(t,s)}get(t){return this.fields.get(t)}getAll(){return Array.from(this.fields.values())}exists(t){return this.fields.has(t)}size(){return this.fields.size}clear(){this.fields.clear(),this.validationStates.clear()}setValidationState(t,e){if(!this.exists(t))throw new Error(`Field with id "${t}" not found`);this.validationStates.set(t,e)}getValidationState(t){return this.validationStates.get(t)}getAllValidationStates(){return new Map(this.validationStates)}}class et{constructor(){o(this,"FIELD_SELECTORS","input, textarea, select")}discoverFields(t){const e=t.querySelectorAll(this.FIELD_SELECTORS);return Array.from(e).filter(i=>i instanceof HTMLElement).filter(i=>this.isValidField(i))}isValidField(t){if(t.style.display==="none"||t.style.visibility==="hidden")return!1;if(t instanceof HTMLInputElement){const e=t.type.toLowerCase();if(["button","submit","reset","hidden","image"].includes(e))return!1}return!!document.contains(t)}}class me{resolveLabel(t){let e=this.findLabelByFor(t);return e||(e=this.findNestedLabel(t),e)||(e=this.findAriaLabel(t),e)||(e=this.findPlaceholder(t),e)||(e=this.findTitle(t),e)||(e=this.findPreviousElementText(t),e)||(e=this.findTableCellText(t),e)||(e=this.findNearestText(t),e)?e:""}findLabelByFor(t){var s;const e=t.id;if(!e)return"";const i=document.querySelector(`label[for="${CSS.escape(e)}"]`);return i&&((s=i.textContent)==null?void 0:s.trim())||""}findNestedLabel(t){var i;const e=t.closest("label");return e&&((i=e.textContent)==null?void 0:i.trim())||""}findAriaLabel(t){const e=t.getAttribute("aria-label");return e?e.trim():""}findPlaceholder(t){const e=t.getAttribute("placeholder");return e?e.trim():""}findTitle(t){const e=t.getAttribute("title");return e?e.trim():""}findPreviousElementText(t){var i;const e=t.previousElementSibling;if(e&&(e.tagName==="LABEL"||e.tagName==="SPAN")){const s=(i=e.textContent)==null?void 0:i.trim();if(s&&s.length>0)return s}return""}findTableCellText(t){var a,l,c,h,u;const e=t.closest("td, th");if(!e)return"";const i=e.querySelector("span, label");if(i){const p=(a=i.textContent)==null?void 0:a.trim();if(p&&p.length>0&&p.length<100)return p}const s=e.previousElementSibling;if(s&&(s.tagName==="TD"||s.tagName==="TH")){const p=s.querySelector("span, label");if(p){const y=(l=p.textContent)==null?void 0:l.trim();if(y&&y.length>0&&y.length<100)return y}const g=(c=s.textContent)==null?void 0:c.trim();if(g&&g.length>0&&g.length<100)return g}const n=(h=e.textContent)==null?void 0:h.trim();if(n&&n.length>0){const p=((u=t.textContent)==null?void 0:u.trim())||"",g=n.replace(p,"").trim();if(g.length>0&&g.length<100)return g}return""}findNearestText(t){var a;const e=t.parentElement;if(!e)return"";const i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,null);let s=i.nextNode(),n="";for(;s;){const l=(a=s.textContent)==null?void 0:a.trim();l&&l.length>0&&l.length<100&&(!n||l.length<n.length)&&(n=l),s=i.nextNode()}return n}}class be{buildFieldInfo(t,e){const i=this.extractId(t),s=this.extractName(t),n=this.extractType(t),a=this.extractValue(t),l=this.extractPlaceholder(t),c=this.extractRequired(t),h=this.extractReadonly(t),u=this.extractDisabled(t);return{id:i,name:s,label:e||s||i,type:n,value:a,placeholder:l,required:c,readonly:h,disabled:u,element:t}}extractId(t){return t.id?t.id:`field_${this.generateUUID()}`}extractName(t){return t.getAttribute("name")||""}extractType(t){return t instanceof HTMLInputElement?t.type||"text":t instanceof HTMLTextAreaElement?"textarea":t instanceof HTMLSelectElement?"select":t.tagName.toLowerCase()}extractValue(t){return q(t)}extractPlaceholder(t){return t.getAttribute("placeholder")||void 0}extractRequired(t){return t.hasAttribute("required")}extractReadonly(t){return t.hasAttribute("readonly")}extractDisabled(t){return t.hasAttribute("disabled")}generateUUID(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,t=>{const e=Math.random()*16|0;return(t==="x"?e:e&3|8).toString(16)})}}class ye{constructor(){o(this,"discovery",new et);o(this,"labelResolver",new me);o(this,"metadataBuilder",new be)}scan(t,e){return this.discovery.discoverFields(t).map(s=>this.processField(s,e)).filter(s=>s!==null)}scanNode(t,e){return t instanceof Element?this.discovery.discoverFields(t).map(s=>this.processField(s,e)).filter(s=>s!==null):[]}scanElement(t,e){return this.discovery.discoverFields(t.parentElement||document).includes(t)?this.processField(t,e):null}processField(t,e){const i=this.labelResolver.resolveLabel(t),s=this.metadataBuilder.buildFieldInfo(t,i);return e.register(s),s}}class xe{constructor(t,e){o(this,"observer",null);o(this,"callback",null);o(this,"analyzer");o(this,"registry");this.analyzer=t,this.registry=e}start(t=document,e){this.callback=e||this.defaultCallback.bind(this);const i={childList:!0,subtree:!0,attributes:!1,characterData:!1};this.observer=new MutationObserver(s=>{this.handleMutations(s)}),this.observer.observe(t,i),console.log("[MutationWatcher] Started watching for DOM changes")}stop(){this.observer&&(this.observer.disconnect(),this.observer=null,console.log("[MutationWatcher] Stopped watching"))}handleMutations(t){const e=[];for(const i of t)i.type==="childList"&&i.addedNodes.forEach(s=>{if(s.nodeType===Node.ELEMENT_NODE){const n=s;this.isFormField(n)&&e.push(n);const a=this.findFieldsInElement(n);e.push(...a)}});if(e.length>0){const i=Array.from(new Set(e));console.log(`[MutationWatcher] Detected ${i.length} new field(s)`),this.callback(i)}}isFormField(t){return["INPUT","TEXTAREA","SELECT"].includes(t.tagName.toUpperCase())}findFieldsInElement(t){return Array.from(t.querySelectorAll("input, textarea, select"))}defaultCallback(t){for(const i of t)this.analyzer.scanElement(i,this.registry);const e=this.registry.size();console.log(`[MutationWatcher] Total fields now: ${e}`)}}class we{constructor(t){o(this,"registry");o(this,"boundElements",new WeakMap);o(this,"changeCallbacks",[]);o(this,"blurCallbacks",[]);this.registry=t}onFieldChange(t){this.changeCallbacks.push(t)}onFieldBlur(t){this.blurCallbacks.push(t)}bindElement(t){if(this.boundElements.has(t))return;const e=this.findFieldInRegistry(t);if(!e){console.warn("[EventBinder] Field not found in registry for element:",t);return}const i=()=>{console.log(`[EventBinder] Change event fired on field: ${e.id}`),this.updateFieldValue(e.id,t)},s=()=>{console.log(`[EventBinder] Blur event fired on field: ${e.id}`),this.blurCallbacks.forEach(n=>{try{n(e.id,t)}catch(a){console.error("[EventBinder] Error in field blur callback:",a)}})};t.addEventListener("input",i),t.addEventListener("change",i),t.addEventListener("blur",s),this.boundElements.set(t,{change:i,blur:s}),console.log(`[EventBinder] Bound events to field: ${e.id}`)}unbindElement(t){if(!this.boundElements.has(t))return;const e=this.boundElements.get(t);t.removeEventListener("input",e.change),t.removeEventListener("change",e.change),t.removeEventListener("blur",e.blur),this.boundElements.delete(t),console.log("[EventBinder] Unbound events from element")}bindAll(){const e=this.registry.getAll().reduce((i,s)=>{try{return this.bindElement(s.element),i+1}catch{return i}},0);console.log(`[EventBinder] Bound events to ${e} field(s)`)}unbindAll(){this.registry.getAll().forEach(e=>{try{this.unbindElement(e.element)}catch{}}),console.log("[EventBinder] Unbound all events")}findFieldInRegistry(t){return this.registry.getAll().find(i=>i.element===t)}updateFieldValue(t,e){const i=q(e);try{this.registry.update(t,{value:i}),console.log(`[EventBinder] Updated field ${t}: ${i}`);const s=this.registry.get(t);s&&this.changeCallbacks.forEach(n=>{try{n(t,s)}catch(a){console.error("[EventBinder] Error in field change callback:",a)}})}catch(s){console.error(`[EventBinder] Failed to update field ${t}:`,s)}}}class ve{constructor(t,e){o(this,"mutationWatcher");o(this,"eventBinder");o(this,"formAnalyzer");o(this,"fieldRegistry");o(this,"isActive",!1);this.formAnalyzer=t,this.fieldRegistry=e,this.mutationWatcher=new xe(t,e),this.eventBinder=new we(e)}onFieldChange(t){this.eventBinder.onFieldChange(t)}onFieldBlur(t){this.eventBinder.onFieldBlur(t)}start(t=document){if(this.isActive){console.warn("[ChangeTracker] Already active");return}this.isActive=!0,this.eventBinder.bindAll(),this.mutationWatcher.start(t,e=>{for(const i of e)this.formAnalyzer.scanElement(i,this.fieldRegistry),this.bindElement(i)}),console.log("[ChangeTracker] Started tracking form changes")}stop(){if(!this.isActive){console.warn("[ChangeTracker] Not active");return}this.isActive=!1,this.mutationWatcher.stop(),this.eventBinder.unbindAll(),console.log("[ChangeTracker] Stopped tracking form changes")}bindElement(t){if(!this.isActive){console.warn("[ChangeTracker] Not active, cannot bind element");return}this.eventBinder.bindElement(t)}unbindElement(t){this.eventBinder.unbindElement(t)}isTracking(){return this.isActive}getEventBinder(){return this.eventBinder}}class ke{constructor(){o(this,"highlightClass","ai-validation-highlight");o(this,"highlightedElements",new Map);this.injectStyles()}show(t,e){this.highlightedElements.has(t)&&this.clear(t),t.classList.add(this.highlightClass,`${this.highlightClass}--${e}`),this.highlightedElements.set(t,e),console.log(`[HighlightManager] Highlighted field with level: ${e}`)}clear(t){const e=this.highlightedElements.get(t);e&&(t.classList.remove(this.highlightClass,`${this.highlightClass}--${e}`),this.highlightedElements.delete(t),console.log("[HighlightManager] Cleared highlight"))}clearAll(){for(const t of this.highlightedElements.keys())this.clear(t);console.log("[HighlightManager] Cleared all highlights")}injectStyles(){if(document.getElementById("ai-validation-highlight-styles"))return;const t=document.createElement("style");t.id="ai-validation-highlight-styles",t.textContent=`
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
        `,document.head.appendChild(t),console.log("[HighlightManager] Styles injected")}}class Ee{constructor(){o(this,"audioContext",null);o(this,"isMuted",!1);o(this,"lastPlayTime",0);o(this,"throttleDuration",500);try{const t=window.AudioContext||window.webkitAudioContext;t&&(this.audioContext=new t)}catch{console.warn("[SoundManager] AudioContext not available")}}playWarning(){this.playTone(1e3,.3)}playError(){this.playTone(600,.4)}playSuccess(){this.playTone(1200,.2)}mute(){this.isMuted=!0,console.log("[SoundManager] Muted")}unmute(){this.isMuted=!1,console.log("[SoundManager] Unmuted")}playTone(t,e){if(this.isMuted||!this.audioContext)return;const i=Date.now();if(!(i-this.lastPlayTime<this.throttleDuration)){this.lastPlayTime=i;try{const s=this.audioContext.createOscillator(),n=this.audioContext.createGain();s.connect(n),n.connect(this.audioContext.destination),s.frequency.value=t,s.type="sine",n.gain.setValueAtTime(.3,this.audioContext.currentTime),n.gain.exponentialRampToValueAtTime(.01,this.audioContext.currentTime+e),s.start(this.audioContext.currentTime),s.stop(this.audioContext.currentTime+e),console.log(`[SoundManager] Played tone: ${t}Hz`)}catch(s){console.warn("[SoundManager] Failed to play tone:",s)}}}}class Ae{constructor(t,e){o(this,"highlightManager");o(this,"warningView");o(this,"soundManager");o(this,"activeNotification",null);o(this,"highlightedElements",new Set);this.highlightManager=new ke,this.warningView=t,this.soundManager=new Ee,e&&this.warningView.onExplain(e),console.log("[NotificationManager] Initialized")}notify(t){this.activeNotification=t,this.highlightManager.show(t.field,t.level),this.highlightedElements.add(t.field),this.warningView.show(t),this.playSound(t.level),console.log(`[NotificationManager] Notification sent: ${t.title}`)}clear(t){var e;this.highlightManager.clear(t),this.highlightedElements.delete(t),this.warningView.clearField(t),((e=this.activeNotification)==null?void 0:e.field)===t&&(this.activeNotification=null),console.log("[NotificationManager] Cleared notification for field")}clearFieldError(t){this.highlightManager.clear(t),this.highlightedElements.delete(t),this.warningView.clearField(t),console.log("[NotificationManager] Cleared validation error for field")}clearAll(){this.highlightManager.clearAll(),this.highlightedElements.clear(),this.warningView.clearAll(),this.warningView.hide(),this.activeNotification=null,console.log("[NotificationManager] Cleared all notifications")}setExplainCallback(t){this.warningView.onExplain(t)}muteSound(){this.soundManager.mute()}unmuteSound(){this.soundManager.unmute()}playSound(t){switch(t){case"error":this.soundManager.playError();break;case"warning":this.soundManager.playWarning();break;case"success":this.soundManager.playSuccess();break}}}class Te{constructor(t){o(this,"panel");o(this,"container");o(this,"activeErrors",new Map);o(this,"explainCallback",null);this.panel=t,this.container=t.getTabContainer("warnings"),this.container.classList.add("wl-container"),t.addStyles(this.getStyles()),this.render(),console.log("[WarningListView] UI created")}show(t){const e=this.resolveFieldId(t.field);this.activeErrors.set(e,t),this.render(),this.panel.setWarningCount(this.activeErrors.size),this.panel.flagNewWarning(),console.log(`[WarningListView] Notification displayed (Active errors: ${this.activeErrors.size})`)}clearField(t){const e=this.resolveFieldId(t);this.activeErrors.delete(e)&&(this.render(),this.panel.setWarningCount(this.activeErrors.size),console.log(`[WarningListView] Cleared error for field: ${e}`))}clearAll(){this.activeErrors.clear(),this.render(),this.panel.setWarningCount(0),console.log("[WarningListView] Cleared all errors")}hide(){this.panel.isPanelOpen()&&this.panel.getActiveTab()==="warnings"&&this.panel.close()}onExplain(t){this.explainCallback=t}render(){if(this.activeErrors.size===0){this.container.innerHTML='<div class="wl-empty">✅ Không có cảnh báo nào</div>';return}let t='<div class="wl-list">';this.activeErrors.forEach((e,i)=>{var a;const s=this.getLevelColor(e.level),n=((a=e.metadata)==null?void 0:a.fieldLabel)||i;t+=`
                <div class="wl-item" data-field="${i}">
                    <div class="wl-item-header">
                        <span class="wl-item-field">${n}</span>
                        <button class="wl-item-dismiss" title="Bỏ qua" data-field="${i}">✕</button>
                    </div>
                    <div class="wl-item-level" style="border-color: ${s}; color: ${s};">
                        ${this.getLevelText(e.level)}
                    </div>
                    <div class="wl-item-message">${e.message}</div>
                    ${e.suggestion?`<div class="wl-item-suggestion">💡 ${e.suggestion}</div>`:""}
                    ${e.canExplain?`<button class="wl-item-explain" data-field="${i}">📖 Giải thích</button>`:""}
                </div>
            `}),t+="</div>",this.container.innerHTML=t,this.attachItemHandlers()}attachItemHandlers(){this.container.querySelectorAll(".wl-item-dismiss").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const i=t.getAttribute("data-field");i&&(this.activeErrors.delete(i),this.render(),this.panel.setWarningCount(this.activeErrors.size))})}),this.container.querySelectorAll(".wl-item-explain").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const i=t.getAttribute("data-field"),s=i?this.activeErrors.get(i):void 0;s&&this.explainCallback&&this.explainCallback(s)})})}resolveFieldId(t){return t.id||t.className}getLevelColor(t){return{error:"#dc2626",warning:"#f59e0b",info:"#3b82f6",success:"#10b981"}[t]}getLevelText(t){return{error:"LỖI",warning:"CẢNH BÁO",info:"THÔNG TIN",success:"THÀNH CÔNG"}[t]}getStyles(){return`
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
        `}}const w={color:{vnptBlue:"#0068B3",vnptBlueDark:"#004E86",vnptBlueLight:"#3E9BE0",metal:"#DCE7F2",metalDark:"#B9CBDE",ink:"#173049",white:"#FFFFFF",happy:"#28C76F",sad:"#EA5455",think:"#FF9F43"},size:{width:96,height:108},home:{right:24,bottom:20},obstacle:{bandHeight:240,selector:'button, [role="button"], input[type="submit"], input[type="button"], .btn, .ui-button, .k-button, a.btn',minSize:16,minStandThickness:20,minFootShare:.45,maxCandidates:40,clickableName:/\b(btn|button|fab)\b/i,maxClimb:6,minStandRise:6,maxStandRise:220,dodgeGap:12,edgeGap:8,smallStep:20,settleMs:220},timing:{idleToLongIdle:12e3,longIdleToSleep:22e3,idleGestureMin:2600,idleGestureMax:6200},mouse:{hoverRadius:130,headMaxDeg:18,pupilMaxShift:3.4,lookUpThreshold:220,offBalanceMs:1500},storageKey:{enabled:"robotEnabled",reduceMotion:"robotReduceMotion"}},lt={robotSvg:"his-robot-host",robot3d:"his-robot3d-host",assistantPanel:"his-assistant-host",onboardingTour:"zc-onboarding-tour"},zt=Object.values(lt).map(r=>`#${r}`).join(", "),Pt=12,Ft=w.home.bottom+w.size.height+Pt,Vt=76+Pt,Dt=32;class Ce{constructor(){o(this,"host");o(this,"shadowRoot");o(this,"panelEl",null);o(this,"badgeEl",null);o(this,"dotEl",null);o(this,"tabButtons",new Map);o(this,"tabPanes",new Map);o(this,"isOpen",!1);o(this,"isMaximized",!1);o(this,"activeTab","warnings");o(this,"warningCount",0);o(this,"tabChangeCallbacks",[]);o(this,"closeCallbacks",[]);o(this,"autoOpenOnWarning",!0);o(this,"autoMaximizeOnBatch",!1);o(this,"progressHideTimer",null);o(this,"checkingCount",0);this.host=document.createElement("div"),this.host.id=lt.assistantPanel,this.shadowRoot=this.host.attachShadow({mode:"open"}),this.createUI(),this.loadSettings(),document.body.appendChild(this.host),console.log("[UnifiedAssistantPanel] UI created")}getUiRect(t){const e={launcher:".ua-toggle","tab-warnings":'.ua-tab[data-tab="warnings"]',"tab-chat":'.ua-tab[data-tab="chat"]',plus:".chat-plus","plus-menu":".chat-plus-menu",attach:".chat-attach","bangke-all":'.chat-bangke-btn[data-act="all"]',"bangke-one":'.chat-bangke-btn[data-act="one"]',input:".chat-input-box",clear:".chat-clear"}[t],i=this.shadowRoot.querySelector(e);if(!i)return null;const s=i.getBoundingClientRect();return s.width>0&&s.height>0?s:null}clickPlusButton(){var t;(t=this.shadowRoot.querySelector(".chat-plus"))==null||t.click()}getTabContainer(t){const e=this.tabPanes.get(t);if(!e)throw new Error(`[UnifiedAssistantPanel] Không tìm thấy tab: ${t}`);return e}addStyles(t){const e=document.createElement("style");e.textContent=t,this.shadowRoot.appendChild(e)}onTabChange(t){this.tabChangeCallbacks.push(t)}onClose(t){this.closeCallbacks.push(t)}open(t){t&&this.activateTab(t),!this.isOpen&&this.panelEl&&(this.isOpen=!0,this.panelEl.classList.add("open"),this.emitTabChange(this.activeTab))}close(){this.isOpen&&this.panelEl&&(this.isOpen=!1,this.panelEl.classList.remove("open"),this.closeCallbacks.forEach(t=>t()))}toggle(){this.isOpen?this.close():this.open()}isPanelOpen(){return this.isOpen}useExternalLauncher(){this.setLauncherVisible(!1)}setLauncherVisible(t){var i;const e=this.shadowRoot.querySelector(".ua-toggle");e&&(e.style.display=t?"":"none"),(i=this.panelEl)==null||i.classList.toggle("above-button",t)}getActiveTab(){return this.activeTab}maximize(){this.isMaximized||this.toggleMaximize()}maximizeForBatchCheck(){this.autoMaximizeOnBatch&&this.maximize()}setBatchProgress(t,e=null){this.progressHideTimer!==null&&(clearTimeout(this.progressHideTimer),this.progressHideTimer=null);const i=this.shadowRoot.querySelector(".ua-progress"),s=this.shadowRoot.querySelector(".ua-header-bar"),n=this.shadowRoot.querySelector(".ua-header-bar-fill");if(!(!i||!s||!n)){if(t===null){i.hidden=!0,s.hidden=!0,n.style.width="0%";return}i.hidden=!1,i.textContent=t,e!==null&&(s.hidden=!1,n.style.width=`${Math.max(0,Math.min(100,e))}%`)}}completeBatchProgress(t){this.setBatchProgress(t,100),this.progressHideTimer=window.setTimeout(()=>this.setBatchProgress(null),5e3)}setWarningCount(t){this.warningCount=t,this.updateBadge()}beginChecking(){this.checkingCount++,this.updateCheckingIndicator()}endChecking(){this.checkingCount=Math.max(0,this.checkingCount-1),this.updateCheckingIndicator()}updateCheckingIndicator(){const t=this.shadowRoot.querySelector(".ua-toggle"),e=this.shadowRoot.querySelector(".ua-spinner");if(!t||!e)return;const i=this.checkingCount>0;e.hidden=!i,t.classList.toggle("ua-checking",i),t.title=i?"Đang kiểm tra dữ liệu...":"ZeroCheck AI"}flagNewWarning(){if(this.autoOpenOnWarning){this.activateTab("warnings"),this.open(),this.animateToggleButton();return}if(!this.isOpen){this.animateToggleButton();return}this.activeTab!=="warnings"&&this.setWarningDot(!0)}loadSettings(){var t,e,i,s;try{(e=(t=chrome.storage)==null?void 0:t.local)==null||e.get({autoOpenOnWarning:!0,autoMaximizeOnBatch:!1},n=>{this.autoOpenOnWarning=n.autoOpenOnWarning!==!1,this.autoMaximizeOnBatch=n.autoMaximizeOnBatch===!0}),(s=(i=chrome.storage)==null?void 0:i.onChanged)==null||s.addListener((n,a)=>{a==="local"&&(n.autoOpenOnWarning&&(this.autoOpenOnWarning=n.autoOpenOnWarning.newValue!==!1),n.autoMaximizeOnBatch&&(this.autoMaximizeOnBatch=n.autoMaximizeOnBatch.newValue===!0))})}catch(n){console.warn("[UnifiedAssistantPanel] Không đọc được cấu hình, dùng mặc định",n)}}createUI(){this.shadowRoot.innerHTML=`
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
        `,this.panelEl=this.shadowRoot.querySelector(".ua-panel"),this.badgeEl=this.shadowRoot.querySelector(".ua-badge"),this.dotEl=this.shadowRoot.querySelector(".ua-dot"),["warnings","chat"].forEach(n=>{const a=this.shadowRoot.querySelector(`.ua-tab[data-tab="${n}"]`),l=this.shadowRoot.querySelector(`.ua-pane[data-pane="${n}"]`);a&&l&&(this.tabButtons.set(n,a),this.tabPanes.set(n,l),a.addEventListener("click",()=>this.activateTab(n)))}),this.applyActiveTab();const e=this.shadowRoot.querySelector(".ua-toggle");e==null||e.addEventListener("click",()=>this.toggle());const i=this.shadowRoot.querySelector(".ua-close");i==null||i.addEventListener("click",()=>this.close());const s=this.shadowRoot.querySelector(".ua-max");s==null||s.addEventListener("click",()=>this.toggleMaximize()),document.addEventListener("keydown",n=>{n.key!=="Escape"||!this.isOpen||(this.isMaximized?this.toggleMaximize():this.close())})}activateTab(t){const e=this.activeTab!==t;this.activeTab=t,this.applyActiveTab(),t==="warnings"&&this.setWarningDot(!1),e&&this.emitTabChange(t)}applyActiveTab(){this.tabButtons.forEach((t,e)=>{t.classList.toggle("active",e===this.activeTab)}),this.tabPanes.forEach((t,e)=>{t.classList.toggle("active",e===this.activeTab)})}emitTabChange(t){this.tabChangeCallbacks.forEach(e=>e(t))}updateBadge(){this.badgeEl&&(this.badgeEl.textContent=String(this.warningCount),this.badgeEl.hidden=this.warningCount===0)}setWarningDot(t){this.dotEl&&(this.dotEl.hidden=!t)}toggleMaximize(){if(!this.panelEl)return;this.isMaximized=!this.isMaximized,this.panelEl.classList.toggle("maximized",this.isMaximized);const t=this.shadowRoot.querySelector(".ua-max");t&&(t.textContent=this.isMaximized?"⤡":"⤢",t.title=this.isMaximized?"Thu nhỏ":"Phóng to",t.setAttribute("aria-label",t.title))}animateToggleButton(){const t=this.shadowRoot.querySelector(".ua-toggle");t&&(t.classList.remove("ua-blink"),t.offsetWidth,t.classList.add("ua-blink"))}getStyles(){return`
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
        `}}const R=class R{constructor(t){o(this,"host",null);o(this,"shadow",null);o(this,"stepIndex",0);o(this,"steps",[]);o(this,"onResize",()=>this.position());this.anchors=t}async showIfFirstRun(){await this.isDone()||this.show()}show(){this.host||(this.steps=R.STEPS.filter(t=>this.anchors.supports(t.anchor)),this.stepIndex=0,this.render(),this.applyStep())}async isDone(){var t,e;try{const i=await((e=(t=chrome.storage)==null?void 0:t.local)==null?void 0:e.get(R.STORAGE_KEY));if(i&&i[R.STORAGE_KEY]===!0)return!0}catch{}return localStorage.getItem(R.STORAGE_KEY)==="1"}markDone(){var t,e;try{(e=(t=chrome.storage)==null?void 0:t.local)==null||e.set({[R.STORAGE_KEY]:!0})}catch{}try{localStorage.setItem(R.STORAGE_KEY,"1")}catch{}}next(){if(this.stepIndex>=this.steps.length-1){this.closePlusMenuIfOpen(),this.finish();return}this.goTo(this.stepIndex+1)}prev(){this.stepIndex!==0&&this.goTo(this.stepIndex-1)}goTo(t){t===this.stepIndex||t<0||t>=this.steps.length||(this.closePlusMenuIfOpen(),this.stepIndex=t,this.applyStep())}closePlusMenuIfOpen(){const t=this.steps[this.stepIndex];t!=null&&t.needsPlusMenu&&this.anchors.getRect("plus-menu")&&this.anchors.clickPlus()}applyStep(){const t=this.steps[this.stepIndex];if(this.renderStepContent(t),!t.needsPanel){this.position();return}this.anchors.openChat(),window.setTimeout(()=>{t.needsPlusMenu&&!this.anchors.getRect("plus-menu")?(this.anchors.clickPlus(),window.setTimeout(()=>this.position(),R.MENU_OPEN_DELAY_MS)):this.position()},R.PANEL_OPEN_DELAY_MS)}finish(){var t;this.closePlusMenuIfOpen(),this.markDone(),window.removeEventListener("resize",this.onResize),(t=this.host)==null||t.remove(),this.host=null,this.shadow=null}render(){var e,i,s,n;this.host=document.createElement("div"),this.host.id=lt.onboardingTour,this.shadow=this.host.attachShadow({mode:"open"});const t=this.steps.map((a,l)=>`<button class="ob-dot" type="button" data-go="${l}" data-tip="Bước ${l+1}: ${this.escape(a.title)}" aria-label="Bước ${l+1}: ${this.escape(a.title)}"></button>`).join("");this.shadow.innerHTML=`
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
        `,document.body.appendChild(this.host),(e=this.shadow.querySelector(".ob-skip"))==null||e.addEventListener("click",()=>this.finish()),(i=this.shadow.querySelector(".ob-prev"))==null||i.addEventListener("click",()=>this.prev()),(s=this.shadow.querySelector(".ob-next"))==null||s.addEventListener("click",()=>this.next()),(n=this.shadow.querySelector(".ob-dots"))==null||n.addEventListener("click",a=>{const l=a.target.closest("[data-go]");l&&this.goTo(Number(l.dataset.go))}),this.bindTooltip(),window.addEventListener("resize",this.onResize)}bindTooltip(){var n,a;const t=(n=this.shadow)==null?void 0:n.querySelector(".ob-foot"),e=(a=this.shadow)==null?void 0:a.querySelector(".ob-tip");if(!t||!e)return;const i=l=>{var h;const c=(h=l.target)==null?void 0:h.closest("[data-tip]");c&&(e.textContent=c.dataset.tip??"",e.hidden=!1)},s=()=>{e.hidden=!0};t.addEventListener("mouseover",i),t.addEventListener("focusin",i),t.addEventListener("mouseout",s),t.addEventListener("focusout",s)}escape(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}renderStepContent(t){if(!this.shadow)return;const e=this.stepIndex===this.steps.length-1,i=(a,l)=>{var h;const c=(h=this.shadow)==null?void 0:h.querySelector(a);c&&(c.textContent=l)};i(".ob-icon",t.icon),i(".ob-title",t.title),i(".ob-body",t.body);const s=this.shadow.querySelector(".ob-next");if(s){const a=e?"Bắt đầu dùng":"Bước tiếp theo";s.textContent=e?"🚀":"→",s.dataset.tip=a,s.setAttribute("aria-label",a)}const n=this.shadow.querySelector(".ob-prev");n&&(n.hidden=this.stepIndex===0),this.shadow.querySelectorAll(".ob-dot").forEach((a,l)=>{a.classList.toggle("on",l===this.stepIndex),a.setAttribute("aria-current",String(l===this.stepIndex))})}position(){if(!this.shadow)return;const t=this.shadow.querySelector(".ob-spot"),e=this.shadow.querySelector(".ob-card");if(!t||!e)return;const i=this.steps[this.stepIndex],s=this.anchors.getRect(i.anchor)??this.fallbackRect(),n=8;t.style.left=`${s.left-n}px`,t.style.top=`${s.top-n}px`,t.style.width=`${s.width+n*2}px`,t.style.height=`${s.height+n*2}px`;const a=e.offsetWidth||320,l=e.offsetHeight||190,c=16,h=12,u=s.left+s.width/2,p=s.top+s.height/2,g={left:{left:s.left-a-c,top:p-l/2},above:{left:u-a/2,top:s.top-l-c},below:{left:u-a/2,top:s.bottom+c},right:{left:s.right+c,top:p-l/2}},y=p>window.innerHeight*.55?[g.above,g.left,g.right,g.below]:[g.left,g.below,g.right,g.above],b={left:s.left-n-6,top:s.top-n-6,right:s.right+n+6,bottom:s.bottom+n+6},T=f=>f.left>=h&&f.top>=h&&f.left+a<=window.innerWidth-h&&f.top+l<=window.innerHeight-h&&(f.left+a<=b.left||f.left>=b.right||f.top+l<=b.top||f.top>=b.bottom);let M=y.find(T);M||(M={left:u-a/2,top:s.top-l-c>=h?s.top-l-c:h}),e.style.left=`${Math.min(Math.max(h,M.left),window.innerWidth-a-h)}px`,e.style.top=`${Math.min(Math.max(h,M.top),window.innerHeight-l-h)}px`}fallbackRect(){return new DOMRect(window.innerWidth-100,window.innerHeight-100,72,72)}getStyles(){return`
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
        `}};o(R,"STORAGE_KEY","onboardingDone"),o(R,"PANEL_OPEN_DELAY_MS",350),o(R,"MENU_OPEN_DELAY_MS",140),o(R,"STEPS",[{anchor:"launcher",needsPanel:!1,icon:"🤖",title:"Đây là trợ lý ZeroCheck AI",body:"Robot luôn nằm ở góc này. Bấm vào robot để mở hoặc đóng bảng làm việc — không che form nhập liệu của bạn."},{anchor:"tab-warnings",needsPanel:!0,icon:"⚠️",title:"Tab Cảnh báo",body:"Nhập sai là trường được viền đỏ/vàng kèm gợi ý sửa, và tab này tự bật kèm số đếm. Sửa xong giá trị, cảnh báo tự biến mất."},{anchor:"tab-chat",needsPanel:!0,icon:"💬",title:"Tab Trợ lý",body:"Nơi làm việc chính: kiểm tra hồ sơ XML 130 trước khi gửi giám định và hỏi đáp nghiệp vụ BHYT có trích dẫn văn bản."},{anchor:"plus",needsPanel:!0,icon:"➕",title:"Nút chọn chế độ",body:'Đây là nút "+" — bấm để chọn chế độ nhập cho ô bên cạnh. Bấm "Tiếp theo", tour sẽ bấm thử nút này giúp bạn.'},{anchor:"plus-menu",needsPanel:!0,needsPlusMenu:!0,icon:"📋",title:"Hai chế độ nhập",body:'Menu vừa được mở: "Kiểm tra số vào viện" — gõ số vào viện là hệ thống tự tải XML 130 từ HIS về kiểm tra; "Hỏi thông tin y tế" — hỏi đáp nghiệp vụ BHYT. Chọn xong thì gõ vào ô nhập.'},{anchor:"attach",needsPanel:!0,icon:"📎",title:"Kiểm tra hồ sơ XML 130",body:"Bấm nút này để nạp file XML 130 (kéo thả cũng được). Nạp từ 2 file trở lên, hệ thống tự đối chiếu chéo giữa các hồ sơ."},{anchor:"bangke-all",needsPanel:!0,icon:"📋",title:"Kiểm tra cả lô từ bảng kê",body:"Chỉ có ở màn hình Kiểm tra bảng kê. Bấm Xem thông tin như thường lệ, nút này lấy đúng danh sách phiếu vừa tìm, tải XML 130 từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo — khỏi xuất file, khỏi gõ tay số vào viện. Số trong ngoặc là số hồ sơ sẽ kiểm tra."},{anchor:"bangke-all",needsPanel:!0,icon:"⏳",title:"Nếu danh sách quá nhiều hồ sơ",body:"Trước khi chạy, hộp xác nhận cho biết thời gian chờ dự kiến. Nếu danh sách vượt sức máy đang dùng, tôi báo ngay trong khung chat và DỪNG — không kiểm tra một phần, vì đối chiếu chéo chỉ so các hồ sơ trong cùng một lô nên phần bị cắt sẽ lọt lỗi. Cách xử lý: thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi bấm Xem thông tin lần nữa."},{anchor:"bangke-one",needsPanel:!0,icon:"🔎",title:"Kiểm tra hồ sơ đang chọn",body:"Bấm chọn một dòng trên bảng kê rồi bấm nút này — chỉ kiểm tra hồ sơ của bệnh nhân đó, chạy ngay không hỏi lại. Chưa chọn dòng nào thì nút còn khóa."},{anchor:"input",needsPanel:!0,icon:"💬",title:"Hỏi đáp nghiệp vụ BHYT",body:'Gõ câu hỏi vào ô này — trợ lý trả lời kèm nguồn văn bản trích dẫn, không có căn cứ sẽ nói thẳng "không tìm thấy".'},{anchor:"clear",needsPanel:!0,icon:"🧹",title:"Xóa lịch sử hội thoại",body:"Muốn panel gọn gàng lại từ đầu, bấm nút này — toàn bộ câu hỏi, kết quả kiểm tra và khay file được dọn sạch."}]);let pt=R;const Me=/^#?([0-9a-fA-F]{6})$/;function Se(r){const t=Me.exec(r.trim());return t?`#${t[1].toLowerCase()}`:null}function Ot(r,t){const e=t?Se(t):null,i=["--zc-accent","--zc-accent-2","--zc-accent-deep"];for(const s of i)e?r.style.setProperty(s,e):r.style.removeProperty(s);r.style.removeProperty("--zc-pastel")}class Le{constructor(){o(this,"rules",new Map);o(this,"disabledRules",new Set)}register(t){this.rules.set(t.id,t),console.log(`[RuleRegistry] Registered rule: ${t.name}`)}unregister(t){this.rules.delete(t),this.disabledRules.delete(t),console.log(`[RuleRegistry] Unregistered rule: ${t}`)}enable(t){this.disabledRules.delete(t)}disable(t){this.disabledRules.add(t)}get(t){return this.rules.get(t)}getAll(){return Array.from(this.rules.values()).filter(t=>!this.disabledRules.has(t.id))}getAllByPriority(){return this.getAll().sort((t,e)=>e.priority-t.priority)}isEnabled(t){return!this.disabledRules.has(t)}}class Ie{constructor(t){this.registry=t}executeAll(t){const e=[],i=this.registry.getAllByPriority();console.log(`[RuleExecutor] Running validation with ${i.length} rules...`);for(const s of i)try{const n=s.validate(t);e.push(...n),console.log(`[Rule] ${s.name} - ${n.length>0?"FAIL":"PASS"}`)}catch(n){console.error(`[Rule] ${s.name} - ERROR:`,n)}return e}executeRule(t,e){const i=this.registry.get(t);if(!i)return console.warn(`[RuleExecutor] Rule not found: ${t}`),[];if(!this.registry.isEnabled(t))return console.warn(`[RuleExecutor] Rule is disabled: ${t}`),[];try{const s=i.validate(e);return console.log(`[Rule] ${i.name} - ${s.length>0?"FAIL":"PASS"}`),s}catch(s){return console.error(`[Rule] ${i.name} - ERROR:`,s),[]}}executeRulesByField(t,e){const s=this.registry.getAll().filter(a=>this.isRuleApplicableToField(a.id,t));console.log(`[RuleExecutor] Running ${s.length} rules for field: ${t}`);const n=[];for(const a of s)n.push(...this.executeRule(a.id,e));return n}isRuleApplicableToField(t,e){return!0}}class Re{constructor(){o(this,"registry");o(this,"executor");this.registry=new Le,this.executor=new Ie(this.registry)}registerRule(t){this.registry.register(t)}unregisterRule(t){this.registry.unregister(t)}enableRule(t){this.registry.enable(t)}disableRule(t){this.registry.disable(t)}validateField(t){console.log(`[ValidationEngine] Validating field: ${t.currentField.id}`);const e=this.executor.executeRulesByField(t.currentField.id,t);return console.log(`[ValidationEngine] Found ${e.length} issues`),e}validateForm(t){console.log("[ValidationEngine] Validating entire form");const e=this.executor.executeAll(t);return console.log(`[ValidationEngine] Found ${e.length} issues`),e}validate(t){return this.validateField(t)}getRegistry(){return this.registry}getRuleCount(){return this.registry.getAll().length}}class Be{constructor(){o(this,"id","required");o(this,"name","Required Rule");o(this,"priority",100);o(this,"requiredFields",new Set(["maBenhNhan","ngayKham","ngayVao","ngayRa"]))}validate(t){const e=[];if(!this.requiredFields.has(t.currentField.id))return e;const i=t.currentValue;return(i==null||i===""||i===0)&&e.push({ruleId:this.id,field:t.currentField,level:"error",title:"Trường bắt buộc",message:`Trường "${t.currentField.label}" không được để trống`,suggestion:`Vui lòng nhập giá trị cho "${t.currentField.label}"`,canExplain:!1,metadata:{fieldId:t.currentField.id,value:i}}),e}addRequiredField(t){this.requiredFields.add(t)}removeRequiredField(t){this.requiredFields.delete(t)}}class $e{constructor(){o(this,"id","dateCompare");o(this,"name","Date Compare Rule");o(this,"priority",90);o(this,"comparisons",[{fieldId:"ngayVao",compareWith:"ngayRa",operator:"<=",message:"Ngày vào phải nhỏ hơn hoặc bằng ngày ra"},{fieldId:"ngaySinh",compareWith:"ngayKham",operator:"<=",message:"Ngày sinh phải nhỏ hơn hoặc bằng ngày khám"}])}validate(t){const e=[],i=this.comparisons.find(c=>c.fieldId===t.currentField.id);if(!i)return e;const s=t.currentValue,n=t.formValues.get(i.compareWith);if(!s||!n)return e;const a=this.parseDate(s),l=this.parseDate(n);return!a||!l||this.compareWithOperator(a,l,i.operator)||e.push({ruleId:this.id,field:t.currentField,level:"warning",title:"Lỗi so sánh ngày",message:i.message||`Ngày không hợp lệ so với ${i.compareWith}`,suggestion:"Vui lòng kiểm tra lại ngày tháng",canExplain:!1,metadata:{fieldId:t.currentField.id,fieldValue:a.toISOString(),compareValue:l.toISOString(),operator:i.operator}}),e}addComparison(t){this.comparisons.push(t)}parseDate(t){try{const e=new Date(t);return isNaN(e.getTime())?null:e}catch{return null}}compareWithOperator(t,e,i){switch(i){case"<=":return t<=e;case">=":return t>=e;case"<":return t<e;case">":return t>e}}}class He{constructor(){o(this,"id","regex");o(this,"name","Regex Rule");o(this,"priority",85);o(this,"patterns",[{fieldId:"soBhyt",pattern:/^([0-9]{15}|[0-9]{12})$/,message:"Mã BHYT phải có 12 hoặc 15 chữ số"},{fieldId:"cccd",pattern:/^[0-9]{12}$/,message:"CCCD phải có đúng 12 chữ số"},{fieldId:"maBenhNhan",pattern:/^[A-Z0-9]{1,20}$/,message:"Mã bệnh nhân chỉ chứa chữ in hoa và số"},{fieldId:"nhapsttbatso",pattern:/^[0-9]+$/,message:"Số STT bắt số phải chỉ chứa số"}])}validate(t){const e=[],i=this.patterns.find(n=>n.fieldId===t.currentField.id);if(!i||!t.currentValue)return e;const s=String(t.currentValue).trim();return i.pattern.test(s)||e.push({ruleId:this.id,field:t.currentField,level:"error",title:"Định dạng không hợp lệ",message:i.message||`Định dạng của "${t.currentField.label}" không hợp lệ`,suggestion:"Vui lòng nhập đúng định dạng",canExplain:!1,metadata:{fieldId:t.currentField.id,value:s,pattern:i.pattern.source}}),e}addPattern(t){this.patterns.push(t)}removePattern(t){this.patterns=this.patterns.filter(e=>e.fieldId!==t)}}class ze{constructor(){o(this,"id","icdInactive");o(this,"name","ICD Inactive Rule");o(this,"priority",80);o(this,"inactiveICDCodes",new Set(["C84.2","C83.4","C83.6","C85.0","C88.1"]))}validate(t){const e=[],i=t.currentField.name,s=t.currentField.id;if(console.log(`[ICDInactiveRule] Checking field: ${s} (${i}), value: "${t.currentValue}"`),!["icdVao","icdRa","icdChuan"].includes(i)&&!["icdVao","icdRa","icdChuan"].includes(s))return e;const n=String(t.currentValue).trim().toUpperCase();return console.log(`[ICDInactiveRule] Validating ICD code: "${n}"`),n?(this.inactiveICDCodes.has(n)?(console.log(`[ICDInactiveRule] Code "${n}" is INACTIVE - adding warning`),e.push({ruleId:this.id,field:t.currentField,level:"warning",title:"ICD đã ngừng sử dụng",message:`Mã ICD "${n}" đã không còn được sử dụng`,suggestion:"Vui lòng kiểm tra lại mã ICD phù hợp",canExplain:!0,metadata:{fieldId:t.currentField.id,icdCode:n,reason:"Inactive ICD code"}})):console.log(`[ICDInactiveRule] Code "${n}" is ACTIVE - no warning`),e):(console.log("[ICDInactiveRule] Code is empty, skipping"),e)}addInactiveICDCode(t){this.inactiveICDCodes.add(t.toUpperCase())}removeInactiveICDCode(t){this.inactiveICDCodes.delete(t.toUpperCase())}isICDInactive(t){return this.inactiveICDCodes.has(t.toUpperCase())}}class Nt{constructor(t="https://cbyts.vnpt.vn",e=5e3,i=0,s=1e3){o(this,"baseUrl");o(this,"timeout");o(this,"retryCount");o(this,"retryDelay");o(this,"headers");this.baseUrl=t,this.timeout=e,this.retryCount=i,this.retryDelay=s,this.headers={"Content-Type":"application/json",Accept:"application/json"}}getValidationEndpoint(){return`${this.baseUrl}/api/validation`}}class _ extends Error{constructor(e,i="API_ERROR",s,n){super(e);o(this,"code");o(this,"statusCode");o(this,"details");this.name="ApiException",this.code=i,this.statusCode=s,this.details=n,Object.setPrototypeOf(this,_.prototype)}isTimeout(){return this.code==="TIMEOUT"}isNetworkError(){return this.code==="NETWORK_ERROR"}isHttpError(){return this.code.startsWith("HTTP_")}toErrorDetails(){return{code:this.code,message:this.message,statusCode:this.statusCode,details:this.details}}}const ct="licenseKey",qt="facilityCode",Ut="staffCode",Xt="X-License-Key",Pe="X-Facility-Code",Fe="X-Staff-Code",Ve={licenseKey:"",facilityCode:"",staffCode:""};async function Kt(){try{const r=await chrome.storage.local.get({[ct]:"",[qt]:"",[Ut]:""});return{licenseKey:String(r[ct]??"").trim(),facilityCode:String(r[qt]??"").trim(),staffCode:String(r[Ut]??"").trim()}}catch{return Ve}}async function at(){const r=await Kt(),t={};return r.licenseKey&&(t[Xt]=r.licenseKey),r.facilityCode&&(t[Pe]=r.facilityCode),r.staffCode&&(t[Fe]=r.staffCode),t}function De(r,t){return r===401?t||'Khóa bản quyền chưa khai hoặc không còn hiệu lực. Mở tiện ích (biểu tượng trên thanh trình duyệt) → mục "Khóa bản quyền" để nhập lại khóa đơn vị được cấp.':r===403?t||"Hồ sơ khai mã cơ sở KCB không thuộc phạm vi hợp đồng của đơn vị. Kiểm tra lại mã cơ sở trong file, hoặc liên hệ đơn vị cung cấp dịch vụ để mở rộng phạm vi.":null}class Oe{constructor(t){o(this,"config");o(this,"abortControllers",new Map);this.config=t||new Nt}async validate(t,e){const i=this.config.getValidationEndpoint(),s=e||"form";this.abortExistingRequest(s);const n=new AbortController;this.abortControllers.set(s,n);try{console.log(`[ValidationApi] POST ${i}`),console.log("[ValidationApi] Request:",JSON.stringify(t,null,2));const a=setTimeout(()=>{n.abort()},this.config.timeout),l=await fetch(i,{method:"POST",headers:{...this.config.headers,...await at()},body:JSON.stringify(t),signal:n.signal});if(clearTimeout(a),!l.ok){const h=await this.parseErrorResponse(l);throw new _(`HTTP ${l.status}: ${l.statusText}`,`HTTP_${l.status}`,l.status,h)}const c=await l.json();return console.log("[ValidationApi] Response:",JSON.stringify(c,null,2)),c}catch(a){if(clearTimeout(0),a instanceof Error&&a.name==="AbortError"){const c=new _("Request timeout - exceeded "+this.config.timeout+"ms","TIMEOUT");throw console.log("[ValidationApi] ERROR:",c.message),c}if(a instanceof TypeError){const c=new _("Network error: "+a.message,"NETWORK_ERROR",void 0,a);throw console.log("[ValidationApi] ERROR:",c.message),c}if(a instanceof _)throw console.log("[ValidationApi] ERROR:",a.message),a;const l=new _("Unknown error: "+(a instanceof Error?a.message:String(a)),"UNKNOWN_ERROR",void 0,a);throw console.log("[ValidationApi] ERROR:",l.message),l}finally{this.abortControllers.delete(s)}}abortExistingRequest(t){const e=this.abortControllers.get(t);e&&(console.log(`[ValidationApi] Aborting existing request for ${t}`),e.abort(),this.abortControllers.delete(t))}async parseErrorResponse(t){try{return await t.json()}catch{return{error:t.statusText}}}setConfiguration(t){this.config=t}getConfiguration(){return this.config}}class Ne{constructor(){o(this,"pageMapping",new Map)}registerPageMapping(t,e){this.pageMapping.set(t,e)}buildRequest(t,e,i,s="unknown"){const n=this.extractPageName(t.currentPage),a=this.pageMapping.get(n),l=(a==null?void 0:a.fields)||this.getAllFieldIds(t.fieldRegistry),c={};for(const u of l){const p=t.fieldRegistry.get(u);p&&(c[u]=p.value??null)}const h={page:n,trigger:{event:e.event,field:e.field},context:{timestamp:new Date().toISOString(),extensionVersion:"1.0.0",sessionId:i,userId:s},form:c};return console.log("[ValidationRequestBuilder] Built request for page:",n),h}extractPageName(t){try{const s=new URL(t).pathname.split("/").filter(n=>n.length>0);if(s.length>0){const n=s[s.length-1];return n.charAt(0).toUpperCase()+n.slice(1)}}catch{}return"Diagnosis"}getAllFieldIds(t){return t.getAll().map(e=>e.id)}}var rt=(r=>(r.LOCAL_ONLY="LOCAL_ONLY",r.LOCAL_FAILED="LOCAL_FAILED",r.REMOTE_REQUIRED="REMOTE_REQUIRED",r.REMOTE_SKIPPED="REMOTE_SKIPPED",r))(rt||{});class qe{static mapToValidationResult(t,e){const i=e.get(t.field);if(!i)return console.warn(`[AIResponseMapper] Field not found: ${t.field}`),null;const s=this.mapSeverityToLevel(t.severity),n={aiCode:t.code,severity:t.severity,canAutoFix:t.canAutoFix};return t.explain&&(n.explain=t.explain),{ruleId:`AI_${t.code}`,field:i,level:s,title:`AI: ${t.code}`,message:t.message,suggestion:t.suggestion,canExplain:!!t.explain,metadata:n}}static mapSeverityToLevel(t){switch(t.toLowerCase()){case"error":return"error";case"warning":return"warning";case"info":return"info";case"hint":return"info";default:return console.warn(`[AIResponseMapper] Unknown severity: ${t}`),"warning"}}}class Ue{process(t,e,i){console.log("[AI] Processing response...");const s=[];for(const a of t.issues){const l=qe.mapToValidationResult(a,i);l&&s.push(l)}console.log(`[AI] ${s.length} issues found`);const n=this.mergeResults(e,s);return console.log("[AI] Merged with local results"),console.log("[AI] Done"),n}mergeResults(t,e){const i=[],s=new Set;for(const n of t)i.push(n),s.add(this.getResultKey(n));for(const n of e){const a=this.getResultKey(n);if(s.has(a)){console.log(`[AI] Duplicate detected for: ${n.field.id} - ${n.message}`);continue}if(t.find(c=>c.field.id===n.field.id&&c.level==="error")&&n.level!=="error"){console.log(`[AI] Skipping ${n.level} for ${n.field.id} - local error already present`);continue}i.push(n),s.add(a)}return i}getResultKey(t){return`${t.field.id}|${t.message}|${t.ruleId}`}}class Xe{constructor(t,e,i,s){o(this,"engine");o(this,"apiClient");o(this,"requestBuilder");o(this,"responseProcessor");o(this,"sessionId");o(this,"userId");this.engine=t,this.apiClient=new Oe(s),this.requestBuilder=new Ne,this.responseProcessor=new Ue,this.sessionId=e||this.generateSessionId(),this.userId=i||"unknown"}async validateField(t){console.log(`[Pipeline] Starting validation for field: ${t.currentField.id}`),console.log("[Pipeline] Running local validation...");const e=this.engine.validateField(t);if(e.some(h=>h.level==="error"))return console.log("[Pipeline] Local validation FAILED - stopping pipeline"),{decision:rt.LOCAL_FAILED,localPassed:!1,localResults:e,remoteCalled:!1,remoteResult:null,requestBody:void 0};console.log("[Pipeline] Local validation PASSED - continuing to remote validation"),console.log("[Pipeline] Building validation request...");const s={event:"change",field:t.currentField.id},n=this.requestBuilder.buildRequest(t,s,this.sessionId,this.userId);console.log("[Pipeline] Calling Validation API...");const{result:a,error:l}=await this.callValidationApi(n,t.currentField.id);let c=e;if(a&&a.isValid!==void 0){const h=a;c=this.responseProcessor.process(h,e,t.fieldRegistry),console.log(`[Pipeline] Processed AI response - ${c.length} total results`)}return{decision:rt.REMOTE_REQUIRED,localPassed:!0,localResults:c,remoteCalled:!0,remoteResult:a,requestBody:n,remoteError:l}}async validateForm(t){console.log("[Pipeline] Starting form validation"),console.log("[Pipeline] Running local validation for entire form...");const e=this.engine.validateForm(t);if(e.some(h=>h.level==="error"))return console.log("[Pipeline] Local validation FAILED - stopping pipeline"),{decision:rt.LOCAL_FAILED,localPassed:!1,localResults:e,remoteCalled:!1,remoteResult:null,requestBody:void 0};console.log("[Pipeline] Local validation PASSED - continuing to remote validation"),console.log("[Pipeline] Building validation request...");const s={event:"FormSubmit",field:"form"},n=this.requestBuilder.buildRequest(t,s,this.sessionId,this.userId);console.log("[Pipeline] Calling Validation API...");const{result:a,error:l}=await this.callValidationApi(n,"form");let c=e;if(a&&a.isValid!==void 0){const h=a;c=this.responseProcessor.process(h,e,t.fieldRegistry),console.log(`[Pipeline] Processed AI response - ${c.length} total results`)}return{decision:rt.REMOTE_REQUIRED,localPassed:!0,localResults:c,remoteCalled:!0,remoteResult:a,requestBody:n,remoteError:l}}async callValidationApi(t,e){try{return{result:await this.apiClient.validate(t,e),error:null}}catch(i){return console.error("[Pipeline] API call failed:",i),{result:null,error:`Không kết nối được máy chủ kiểm tra (${i instanceof Error?i.message:String(i)}). Kết quả hiển thị chỉ gồm kiểm tra cục bộ — các kiểm tra ICD, danh mục, BHYT chưa được thực hiện.`}}}registerPageMapping(t,e){this.requestBuilder.registerPageMapping(t,{name:t,fields:e})}generateSessionId(){return`session_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}setApiConfiguration(t){this.apiClient.setConfiguration(t)}getApiConfiguration(){return this.apiClient.getConfiguration()}}const C=class C{measure(){const t=this.readMemoryGb(),e=this.readCores(),i=this.budgetOf(t);return{memoryGb:t,cores:e,budgetBytes:i,maxFiles:Math.max(C.MIN_FILES,Math.floor(i/C.BYTES_PER_FILE)),parallelDownloads:Math.min(8,Math.max(2,Math.round(e/2))),summary:`RAM khoảng ${t} GB, ${e} luồng CPU`}}estimateSeconds(t,e){const i=t*C.DOWNLOAD_SECONDS_PER_FILE/e.parallelDownloads,s=t*C.VALIDATE_SECONDS_PER_FILE;return Math.ceil(i+s)}estimateWait(t,e){const i=this.estimateSeconds(t,e);return i<C.SECONDS_PER_MINUTE?`khoảng ${i} giây`:`khoảng ${Math.round(i/C.SECONDS_PER_MINUTE)} phút`}budgetOf(t){const e=t*C.BYTES_PER_GB*C.MEMORY_SHARE,i=this.freeHeapBytes(),s=i===null?e:Math.min(e,i*C.HEAP_SHARE);return Math.min(s,C.HARD_MAX_BYTES)}freeHeapBytes(){const t=performance.memory;return!t||!t.jsHeapSizeLimit?null:Math.max(0,t.jsHeapSizeLimit-t.usedJSHeapSize)}readMemoryGb(){const t=navigator.deviceMemory;return typeof t=="number"&&t>0?t:C.DEFAULT_MEMORY_GB}readCores(){const t=navigator.hardwareConcurrency;return typeof t=="number"&&t>0?t:C.DEFAULT_CORES}};o(C,"DEFAULT_MEMORY_GB",4),o(C,"DEFAULT_CORES",4),o(C,"MEMORY_SHARE",.2),o(C,"HEAP_SHARE",.6),o(C,"HARD_MAX_BYTES",900*1024*1024),o(C,"BYTES_PER_FILE",256*1024),o(C,"MIN_FILES",50),o(C,"DOWNLOAD_SECONDS_PER_FILE",.8),o(C,"VALIDATE_SECONDS_PER_FILE",.15),o(C,"BYTES_PER_GB",1024*1024*1024),o(C,"SECONDS_PER_MINUTE",60);let ft=C;const P=class P{async validateXml130(t,e,i){const s=await this.getBaseUrl(),n=new FormData;n.append("file",t,e);const a=await this.fetchWithTimeout(`${s}/api/xml130/validate?useAi=false`,{method:"POST",body:n,headers:await at()},i);if(await P.throwIfLicenseError(a),!a.ok)throw new Error(`API kiểm tra XML trả về lỗi HTTP ${a.status}`);return await a.json()}async validateXml130Batch(t,e){const i=await this.getBaseUrl(),s=new FormData;for(const a of t)s.append("files",a.blob,a.name);const n=await this.fetchWithTimeout(`${i}/api/xml130/validate-batch`,{method:"POST",body:s,headers:await at()},e,P.BATCH_REQUEST_TIMEOUT);if(await P.throwIfLicenseError(n),n.status===413)throw new Error("Lô file quá lớn so với giới hạn máy chủ (HTTP 413). Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.");if(!n.ok)throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${n.status}`);return await n.json()}async validateXml130BatchStream(t,e,i){const s=await this.getBaseUrl(),n=new FormData;for(const p of t)n.append("files",p.blob,p.name);let a;try{a=await fetch(`${s}/api/xml130/validate-batch-stream`,{method:"POST",body:n,headers:await at(),signal:i})}catch(p){throw p instanceof DOMException&&p.name==="AbortError"?new DOMException("Đã dừng theo yêu cầu.","AbortError"):new Error("Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.")}if(await P.throwIfLicenseError(a),a.status===413)throw new Error("Lô file quá lớn so với giới hạn máy chủ (HTTP 413). Hãy chia nhỏ theo tuần rồi kiểm tra từng đợt, hoặc nhờ quản trị nới giới hạn upload của API.");if(!a.ok||!a.body)throw new Error(`API kiểm tra lô XML trả về lỗi HTTP ${a.status}`);const l=a.body.getReader(),c=new TextDecoder;let h="";for(;;){const{done:p,value:g}=await l.read();if(p)break;h+=c.decode(g,{stream:!0});let y;for(;(y=h.indexOf(`
`))>=0;){const b=h.slice(0,y).trim();h=h.slice(y+1),b&&e(JSON.parse(b))}}const u=h.trim();u&&e(JSON.parse(u))}async ask(t,e){const i=await this.getBaseUrl(),s=await this.fetchWithTimeout(`${i}/api/assistant/ask`,{method:"POST",headers:{"Content-Type":"application/json",...await at()},body:JSON.stringify({question:t})},e);if(await P.throwIfLicenseError(s),!s.ok)throw new Error(`API hỏi đáp trả về lỗi HTTP ${s.status}`);return await s.json()}static async throwIfLicenseError(t){if(t.status!==401&&t.status!==403)return;const e=await t.json().catch(()=>null),i=De(t.status,e==null?void 0:e.message);if(i)throw new Error(i)}async getConfiguredBaseUrl(){return this.getBaseUrl()}async getBaseUrl(){return P.BASE_URL}async fetchWithTimeout(t,e,i,s=P.REQUEST_TIMEOUT){const n=new AbortController;let a=!1;const l=setTimeout(()=>{a=!0,n.abort()},s),c=()=>n.abort();i&&(i.aborted?n.abort():i.addEventListener("abort",c,{once:!0}));try{return await fetch(t,{...e,signal:n.signal})}catch(h){throw h instanceof DOMException&&h.name==="AbortError"?a?new Error(`Máy chủ xử lý quá lâu (quá ${Math.round(s/1e3)} giây). Lô quá nhiều file thì chia nhỏ theo tuần rồi thử lại.`):new DOMException("Đã dừng theo yêu cầu.","AbortError"):new Error("Không kết nối được máy chủ. Kiểm tra Backend API đang chạy rồi thử lại.")}finally{clearTimeout(l),i==null||i.removeEventListener("abort",c)}}};o(P,"BASE_URL","https://cbyts.vnpt.vn"),o(P,"REQUEST_TIMEOUT",18e4),o(P,"BATCH_REQUEST_TIMEOUT",9e5);let mt=P;const st=class st{renderValidationResult(t){if(t.found===!1||t.hosoCount===0){const a=t.summary||"File XML 130 không đủ thông tin để kiểm tra.";return`<div class="chat-banner chat-banner-warn">⚠ XML 130 không đủ thông tin</div>
                <div class="chat-result-text">${this.escape(a)}</div>`}const e=t.xuatToanRisk?'<div class="chat-banner chat-banner-risk">⚠ Hồ sơ có nguy cơ xuất toán</div>':'<div class="chat-banner chat-banner-ok">✔ Hồ sơ đạt</div>',i=[];t.maCskcb&&i.push(`Mã CSKCB: <b>${this.escape(t.maCskcb)}</b>`),i.push(`Số hồ sơ: <b>${t.hosoCount}</b>`),i.push(`Tổng vấn đề: <b>${t.totalIssues}</b>`);let s=e;s+=`<div class="chat-result-summary">${i.join(" · ")}</div>`,t.summary&&(s+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`),t.aiAssessment&&(s+=`<div class="chat-result-ai">🧠 ${this.escape(t.aiAssessment)}</div>`),t.crossIssues&&t.crossIssues.length>0&&(s+=this.renderCrossIssues(t.crossIssues));const n=(t.results??[]).map(a=>this.renderHoso(a)).join("");return n&&(s+=this.wrapExpand(t.totalIssues>0?`Chi tiết ${t.totalIssues} vấn đề (${t.hosoCount} hồ sơ)`:`Chi tiết ${t.hosoCount} hồ sơ`,n,!0)),s}wrapExpand(t,e,i=!1){return`
            <details class="chat-expand"${i?" open":""}>
                <summary>${this.escape(t)}</summary>
                <div class="chat-expand-body">${e}</div>
            </details>`}renderBatchValidationResult(t){var i,s,n,a;let e=`<div class="chat-result-summary">Số file: <b>${t.fileCount}</b> · Số hồ sơ: <b>${t.hosoCount}</b> · Tổng vấn đề: <b>${t.totalIssues}</b></div>`;t.summary&&(e+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`),e+=this.renderConflictMap(t.files??[]),e+=this.renderCrossIssues(t.crossIssues??[]);for(const l of t.files??[]){const c=l.error?`<div class="chat-issue chat-issue-error">❌ ${this.escape(l.error)}</div>`:l.result?this.renderValidationResult(l.result):"",h=l.error?"Không đọc được":((i=l.result)==null?void 0:i.found)===!1||((s=l.result)==null?void 0:s.hosoCount)===0?"Không đủ thông tin":(n=l.result)!=null&&n.xuatToanRisk?`${l.result.totalIssues} vấn đề — nguy cơ xuất toán`:`${((a=l.result)==null?void 0:a.totalIssues)??0} vấn đề`;e+=`
                <details class="chat-batch-file" open>
                    <summary>
                        <span class="chat-batch-file-name">📄 ${this.escape(l.fileName)}</span>
                        ${this.buildFileHosoLabel(l)}
                        <span class="chat-batch-note">${this.escape(h)}</span>
                    </summary>
                    <div class="chat-batch-file-body">${c}</div>
                </details>`}return e}buildFileHosoLabel(t){var a;const e=((a=t.result)==null?void 0:a.results)??[];if(e.length===0)return"";const i=e[0],s=[];if(i.hoTen&&s.push(i.hoTen),i.maLk&&s.push(`MA_LK ${i.maLk}`),s.length===0)return"";const n=e.length>1?` +${e.length-1} hồ sơ khác`:"";return`<span class="chat-batch-who">👤 ${this.escape(s.join(" · "))}${this.escape(n)}</span>`}renderConflictMap(t){const e=t.filter(a=>{var l;return(((l=a.conflictWith)==null?void 0:l.length)??0)>0});if(e.length===0)return"";const i=new Set,s=[];for(const a of e){const l=(a.conflictWith??[]).filter(c=>{const h=[a.fileName,c].sort().join("|");return i.has(h)?!1:(i.add(h),!0)});l.length!==0&&s.push(`
                <div class="chat-conflict-row">
                    <span class="chat-conflict-file">📄 ${this.escape(a.fileName)}</span>
                    <span class="chat-conflict-arrow">⇄</span>
                    <span class="chat-conflict-others">${l.map(c=>this.escape(c)).join(" · ")}</span>
                </div>`)}const n=s.join("");return`
            <div class="chat-conflict-map">
                <div class="chat-conflict-title">⚠ ${e.length} file có hồ sơ xung đột/chồng chéo với nhau:</div>
                ${n}
            </div>`}renderCrossIssues(t){if(t.length===0)return'<div class="chat-cross-clean">🔗 Đối chiếu chéo giữa các hồ sơ: không phát hiện trùng giường, trùng giờ bác sĩ hay trùng đợt điều trị.</div>';const e=t.map(i=>{const s=this.getSeverityIcon(i.severity),n=i.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",a=i.suggestion?`<div class="chat-issue-suggestion">💡 ${this.escape(i.suggestion)}</div>`:"",l=this.renderCrossHosoRefs(i);return`
                    <div class="chat-issue chat-issue-${i.severity}">
                        <div class="chat-issue-line">
                            ${s}
                            <span class="chat-issue-message">${this.escape(i.message)}</span>
                            ${n}
                        </div>
                        ${l}
                        ${a}
                    </div>`}).join("");return this.wrapExpand(`🔗 Đối chiếu chéo giữa các hồ sơ — ${t.length} vấn đề`,`<div class="chat-issue-group chat-cross-group">${e}</div>`,!0)}renderCrossHosoRefs(t){const e=t.hosos??[];return e.length===0?"":`<div class="chat-ref-list">${e.map(s=>{const n=this.escape(s.hoTen||s.maLk||"(không rõ)"),a=s.thoiDiem?` · ${this.escape(s.thoiDiem)}`:"",l=s.phatSinhTruoc?'<span class="chat-ref-badge chat-ref-first">✔ Phát sinh trước — hợp lệ</span>':'<span class="chat-ref-badge chat-ref-review">Cần rà soát</span>';return`
                    <div class="chat-ref-row">
                        <span class="chat-ref-name">${n}</span>
                        <span class="chat-ref-file">📄 ${this.escape(s.fileName)}${a}</span>
                        ${l}
                    </div>`}).join("")}</div>`}renderAnswer(t){let e=`<div class="chat-answer">${this.escape(t.answer)}</div>`;const i=t.citations??[];if(i.length>0){const s=i.map(n=>{const a=n.docNumber?` (${this.escape(n.docNumber)})`:"",l=n.excerpt?`<div class="chat-citation-excerpt">${this.escape(n.excerpt)}</div>`:"";return`<li class="chat-citation"><b>${this.escape(n.title)}</b>${a}${l}</li>`}).join("");e+=`
                <details class="chat-citations">
                    <summary>📚 Nguồn tham khảo (${i.length})</summary>
                    <ul>${s}</ul>
                </details>
            `}return e}renderStreamCross(t,e){return this.renderConflictMap(e)+this.renderCrossIssues(t)}renderStreamSummary(t,e,i){let s=`<div class="chat-result-summary">✅ Đã kiểm tra xong <b>${t.hosoCount??0}</b> hồ sơ · ⚠ <b>${t.riskCount??0}</b> hồ sơ nguy cơ xuất toán · tổng <b>${t.issueCount??0}</b> vấn đề · đối chiếu chéo <b>${t.crossCount??0}</b> vấn đề (đã hiện ở trên)</div>`;t.summary&&(s+=`<div class="chat-result-text">${this.escape(t.summary)}</div>`);for(const[n,a]of i)s+=`
                <details class="chat-batch-file" open>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(n)}</span>
                        <span class="chat-batch-note">Không đọc được</span></summary>
                    <div class="chat-batch-file-body"><div class="chat-issue chat-issue-error">❌ ${this.escape(a)}</div></div>
                </details>`;for(const[n,a]of e){if(i.has(n))continue;const l=a.hosoCount===0?"Không đủ thông tin":a.riskCount>0?`${a.riskCount}/${a.hosoCount} hồ sơ nguy cơ xuất toán · ${a.issueCount} vấn đề`:`${a.hosoCount} hồ sơ · ${a.issueCount} vấn đề`,c=a.hosoCount-a.results.length,h=a.results.map(u=>this.renderHoso(u)).join("")+(c>0?`<div class="chat-hoso-clean">✔ ${c} hồ sơ còn lại không phát hiện vấn đề.</div>`:"");s+=`
                <details class="chat-batch-file"${a.results.length>0?" open":""}>
                    <summary><span class="chat-batch-file-name">📄 ${this.escape(n)}</span>
                        <span class="chat-batch-note">${this.escape(l)}</span></summary>
                    <div class="chat-batch-file-body">${h}</div>
                </details>`}return s}renderHoso(t){const e=t.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",i=`
            <div class="chat-hoso-header">
                <span class="chat-hoso-name">${this.escape(t.hoTen||t.maLk)}</span>
                ${e}
            </div>
            <div class="chat-hoso-meta">Mã LK: ${this.escape(t.maLk)} · Mã thẻ: ${this.escape(t.maThe)} · ${t.issueCount} vấn đề</div>
        `;if(!t.issues||t.issues.length===0)return`<div class="chat-hoso">${i}<div class="chat-hoso-clean">Không phát hiện vấn đề</div></div>`;let s="";for(const n of st.GROUP_ORDER){const a=t.issues.filter(h=>h.group===n);if(a.length===0)continue;const l=st.GROUP_TITLES[n],c=this.renderDedupedIssues(a);s+=`
                <div class="chat-issue-group">
                    <div class="chat-issue-group-title">${l} (${a.length})</div>
                    ${c}
                </div>
            `}return`<div class="chat-hoso">${i}${s}</div>`}renderDedupedIssues(t){const e=new Map;for(const i of t){const s=`${i.severity}|${i.table??""}|${i.field??""}|${i.message}`,n=e.get(s);n?(n.count++,i.rowIndex!==void 0&&i.rowIndex!==null&&n.rows.push(i.rowIndex)):e.set(s,{issue:i,rows:i.rowIndex!==void 0&&i.rowIndex!==null?[i.rowIndex]:[],count:1})}return[...e.values()].map(i=>this.renderIssue(i.issue,i.count,i.rows)).join("")}renderIssue(t,e=1,i=[]){const s=this.getSeverityIcon(t.severity),n=e>1?`<span class="chat-issue-count">×${e}</span>`:"",a=t.xuatToanRisk?'<span class="chat-badge-risk">Nguy cơ xuất toán</span>':"",l=this.buildIssueLocation(t,i),c=t.suggestion?`<div class="chat-issue-suggestion">💡 ${this.escape(t.suggestion)}</div>`:"";return`
            <div class="chat-issue chat-issue-${t.severity}">
                <div class="chat-issue-line">
                    ${s}
                    <span class="chat-issue-message">${this.escape(t.message)}</span>
                    ${n}
                    ${a}
                </div>
                ${l}
                ${c}
            </div>
        `}buildIssueLocation(t,e=[]){const i=[];if(t.table&&i.push(`Bảng: ${this.escape(t.table)}`),t.field&&i.push(`Trường: ${this.escape(t.field)}`),e.length>1){const s=e.slice(0,10).join(", "),n=e.length>10?` (+${e.length-10} dòng nữa)`:"";i.push(`Dòng: ${s}${n}`)}else t.rowIndex!==void 0&&t.rowIndex!==null&&i.push(`Dòng: ${t.rowIndex}`);return t.value&&i.push(`Giá trị: "${this.escape(t.value)}"`),i.length>0?`<div class="chat-issue-location">${i.join(" · ")}</div>`:""}getSeverityIcon(t){return`<span class="chat-sev chat-sev-${t}">●</span>`}escape(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}};o(st,"GROUP_TITLES",{PatientInfo:"Thông tin bệnh nhân",Diagnosis:"Chẩn đoán",Service:"Dịch vụ kỹ thuật",Drug:"Thuốc",Time:"Thời gian",Finance:"Tài chính",Link:"Liên kết bảng",Admin:"Hành chính/Giấy tờ"}),o(st,"GROUP_ORDER",["PatientInfo","Diagnosis","Service","Drug","Time","Finance","Link","Admin"]);let bt=st;const Y=class Y{static title(t){return t===""?Y.TITLE:`${Y.TITLE} - ${t}`}static fileBase(t,e){const i=[Y.stamp(t),Y.FILE_TITLE];return e!==""&&i.push(e),i.join(" ")}static stamp(t){const e=n=>String(n).padStart(2,"0"),i=`${t.getFullYear()}${e(t.getMonth()+1)}${e(t.getDate())}`,s=`${e(t.getHours())}-${e(t.getMinutes())}-${e(t.getSeconds())}`;return`${i} ${s}`}static fromXmlFile(t){return t.replace(/\.xml$/i,"").trim()}static fromPatient(t,e){return[t.trim(),e.trim().replace(/[/\\]/g,"-")].filter(i=>i!=="").join(" ")}};o(Y,"TITLE","Kết quả kiểm tra XML 130"),o(Y,"FILE_TITLE","Kết quả kiểm tra XML130");let W=Y;const Gt={error:"LỖI",warning:"CẢNH BÁO",info:"THÔNG TIN"},Ke={PatientInfo:"Thông tin bệnh nhân",Diagnosis:"Chẩn đoán",Service:"Dịch vụ kỹ thuật",Drug:"Thuốc",Time:"Thời gian",Finance:"Tài chính",Link:"Liên kết bảng",Admin:"Hành chính/Giấy tờ"};class D{static fromValidation(t,e,i){const s=t.results??[],n=s.flatMap(l=>D.issueRows(l,i)),a=new Date;return{title:W.title(e),fileBase:W.fileBase(a,e),createdAt:D.now(a),stats:[{label:"Mã CSKCB",value:t.maCskcb||"-"},{label:"Số hồ sơ",value:String(t.hosoCount??0)},{label:"Tổng vấn đề",value:String(t.totalIssues??0)},{label:"Nguy cơ xuất toán",value:t.xuatToanRisk?"Có":"Không"}],summary:[t.summary,t.aiAssessment].filter(Boolean).join(`
`),crossIssues:D.crossRows(t.crossIssues??[]),issues:n,fileErrors:[],cleanHosoCount:s.filter(l=>{var c;return(((c=l.issues)==null?void 0:c.length)??0)===0}).length}}static fromStream(t,e,i,s,n){const a=[];let l=0;for(const[h,u]of e){l+=Math.max(0,u.hosoCount-u.results.length);for(const p of u.results)a.push(...D.issueRows(p,h))}const c=new Date;return{title:W.title(n),fileBase:W.fileBase(c,n),createdAt:D.now(c),stats:[{label:"Số file",value:String(e.size)},{label:"Số hồ sơ đã kiểm tra",value:String(t.hosoCount??0)},{label:"Hồ sơ nguy cơ xuất toán",value:String(t.riskCount??0)},{label:"Tổng vấn đề",value:String(t.issueCount??0)},{label:"Vấn đề đối chiếu chéo",value:String(t.crossCount??s.length)}],summary:t.summary??"",crossIssues:D.crossRows(s),issues:a,fileErrors:[...i].map(([h,u])=>({fileName:h,error:u})),cleanHosoCount:l}}static issueRows(t,e){return(t.issues??[]).map(i=>({fileName:e,hoTen:t.hoTen||"",maLk:t.maLk||"",maThe:t.maThe||"",severity:Gt[i.severity]??i.severity,group:Ke[i.group]??i.group,table:i.table??"",field:i.field??"",rowIndex:i.rowIndex===void 0||i.rowIndex===null?"":String(i.rowIndex),value:i.value??"",message:i.message,suggestion:i.suggestion??"",xuatToanRisk:i.xuatToanRisk?"Có":""}))}static crossRows(t){return t.map(e=>({severity:Gt[e.severity]??e.severity,message:e.message,suggestion:e.suggestion??"",xuatToanRisk:e.xuatToanRisk?"Có":"",hosos:(e.hosos??[]).map(i=>{const s=[i.hoTen||i.maLk||"(không rõ)",i.fileName];return i.thoiDiem&&s.push(i.thoiDiem),s.push(i.phatSinhTruoc?"phát sinh trước - hợp lệ":"cần rà soát"),s.join(" · ")}).join(`
`)}))}static now(t){const e=i=>String(i).padStart(2,"0");return`${e(t.getDate())}/${e(t.getMonth()+1)}/${t.getFullYear()} ${e(t.getHours())}:${e(t.getMinutes())}`}}const dt=class dt{constructor(t){o(this,"kept",[]);this.exporters=t}attach(t,e){const i=document.createElement("div");for(i.className="chat-download",i.innerHTML='<span class="chat-download-label">Tải kết quả</span>'+this.exporters.map(s=>`<button class="chat-download-btn" type="button" data-format="${s.id}" title="${this.escapeAttr(s.label)}" aria-label="${this.escapeAttr(s.label)}">${s.icon}</button>`).join(""),i.addEventListener("click",s=>{const n=s.target.closest("[data-format]");n&&this.run(n,i,e)}),t.appendChild(i),this.kept.push({bar:i,report:e});this.kept.length>dt.MAX_KEPT;)this.expire(this.kept.shift())}clear(){this.kept.length=0}async run(t,e,i){var a;const s=this.exporters.find(l=>l.id===t.dataset.format);if(!s)return;const n=e.querySelectorAll("[data-format]");n.forEach(l=>l.disabled=!0),e.classList.add("chat-download-busy");try{await s.export(i)}catch(l){const c=document.createElement("span");c.className="chat-download-error",c.textContent=`Không tạo được file: ${l instanceof Error?l.message:"lỗi không rõ"}`,(a=e.querySelector(".chat-download-error"))==null||a.remove(),e.appendChild(c)}finally{n.forEach(l=>l.disabled=!1),e.classList.remove("chat-download-busy")}}expire(t){t&&(t.bar.classList.add("chat-download-expired"),t.bar.innerHTML='<span class="chat-download-note">Đã qua nhiều lượt kiểm tra nên bản tải của lượt này không còn được giữ. Kiểm tra lại để tải bản mới.</span>')}escapeAttr(t){return t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}};o(dt,"MAX_KEPT",10);let yt=dt;function xt(r,t,e){return`<svg viewBox="0 0 24 24" width="18" height="18" focusable="false" aria-hidden="true"><path d="M6 2h8l6 6v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 21V4.5A2.5 2.5 0 0 1 6.5 2z" fill="${r}"/><path d="M14 2l6 6h-4.5A1.5 1.5 0 0 1 14 6.5z" fill="#ffffff" opacity="0.4"/><text x="12" y="18.5" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${e}" font-weight="700" letter-spacing="-0.3">${t}</text></svg>`}function O(r){return String(r??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Wt(r){return(r.replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g," ").trim()||"Ket qua kiem tra").slice(0,80)}function Yt(r,t){const e=URL.createObjectURL(r),i=document.createElement("a");i.href=e,i.download=t,i.style.display="none",document.body.appendChild(i),i.click(),i.remove(),window.setTimeout(()=>URL.revokeObjectURL(e),1e4)}const Qt=500;function wt(r,t=null){const e=[];if(e.push({title:"Tổng quan",headers:["Mục","Giá trị"],rows:[["Thời điểm kiểm tra",r.createdAt],...r.stats.map(i=>[i.label,i.value]),["Hồ sơ không phát hiện vấn đề",String(r.cleanHosoCount)],...r.summary?[["Nhận xét",r.summary]]:[]]}),r.crossIssues.length>0&&e.push({title:"Đối chiếu chéo",headers:["Mức độ","Vấn đề","Hồ sơ liên quan","Hướng xử lý","Nguy cơ xuất toán"],rows:r.crossIssues.map(i=>[i.severity,i.message,i.hosos,i.suggestion,i.xuatToanRisk])}),r.issues.length>0){const i=r.issues.map(n=>[n.fileName,n.hoTen,n.maLk,n.maThe,n.severity,n.group,n.table,n.field,n.rowIndex,n.value,n.message,n.suggestion,n.xuatToanRisk]),s=t!==null&&i.length>t;e.push({title:"Vấn đề theo hồ sơ",headers:["File","Họ tên","Mã LK","Mã thẻ","Mức độ","Nhóm","Bảng","Trường","Dòng","Giá trị","Vấn đề","Hướng xử lý","Nguy cơ xuất toán"],rows:s?i.slice(0,t):i,note:s?`Bản này chỉ in ${t}/${i.length} dòng cho dễ đọc. Tải bản Excel để có đủ toàn bộ.`:void 0})}return r.fileErrors.length>0&&e.push({title:"File không đọc được",headers:["File","Lý do"],rows:r.fileErrors.map(i=>[i.fileName,i.error])}),e}const ut=class ut{constructor(){o(this,"id","pdf");o(this,"icon",xt("#e2453b","PDF",7));o(this,"label",'Tải bản PDF (mở hộp in → chọn "Lưu thành PDF")')}async export(t){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;";const i=new Promise(a=>{e.addEventListener("load",()=>a(),{once:!0})});e.srcdoc=this.buildHtml(t),document.body.appendChild(e),await i;const s=e.contentWindow;if(!s){e.remove();return}const n=()=>e.remove();s.addEventListener("afterprint",n,{once:!0}),window.setTimeout(n,ut.CLEANUP_MS),s.focus(),s.print()}buildHtml(t){const i=wt(t,Qt).map(s=>this.section(s)).join("");return`<!doctype html><html lang="vi"><head><meta charset="utf-8">
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
${i}
</body></html>`}section(t){const e=t.headers.map(n=>`<th>${O(n)}</th>`).join(""),i=t.rows.map(n=>`<tr>${n.map(a=>`<td>${O(String(a??"")).replace(/\n/g,"<br>")}</td>`).join("")}</tr>`).join(""),s=t.note?`<div class="note">${O(t.note)}</div>`:"";return`<h2>${O(t.title)}</h2><table><thead><tr>${e}</tr></thead><tbody>${i}</tbody></table>${s}`}};o(ut,"CLEANUP_MS",12e4);let vt=ut;const K=class K{static build(t,e){const i=new TextEncoder,s=[],n=[],a=K.dosStamp(new Date);let l=0;for(const p of t){const g=i.encode(p.name),y=K.crc32(p.data),b=p.data.length,T=new Uint8Array(30+g.length),M=new DataView(T.buffer);M.setUint32(0,67324752,!0),M.setUint16(4,20,!0),M.setUint16(6,2048,!0),M.setUint16(8,0,!0),M.setUint16(10,a.time,!0),M.setUint16(12,a.date,!0),M.setUint32(14,y,!0),M.setUint32(18,b,!0),M.setUint32(22,b,!0),M.setUint16(26,g.length,!0),T.set(g,30),s.push(T,p.data);const f=new Uint8Array(46+g.length),k=new DataView(f.buffer);k.setUint32(0,33639248,!0),k.setUint16(4,20,!0),k.setUint16(6,20,!0),k.setUint16(8,2048,!0),k.setUint16(10,0,!0),k.setUint16(12,a.time,!0),k.setUint16(14,a.date,!0),k.setUint32(16,y,!0),k.setUint32(20,b,!0),k.setUint32(24,b,!0),k.setUint16(28,g.length,!0),k.setUint32(42,l,!0),f.set(g,46),n.push(f),l+=T.length+b}const c=n.reduce((p,g)=>p+g.length,0),h=new Uint8Array(22),u=new DataView(h.buffer);return u.setUint32(0,101010256,!0),u.setUint16(8,t.length,!0),u.setUint16(10,t.length,!0),u.setUint32(12,c,!0),u.setUint32(16,l,!0),new Blob([...s,...n,h],{type:e})}static text(t){return new TextEncoder().encode(t)}static crc32(t){const e=K.crcTable??(K.crcTable=K.buildCrcTable());let i=4294967295;for(let s=0;s<t.length;s++)i=i>>>8^e[(i^t[s])&255];return(i^4294967295)>>>0}static buildCrcTable(){const t=new Uint32Array(256);for(let e=0;e<256;e++){let i=e;for(let s=0;s<8;s++)i=i&1?3988292384^i>>>1:i>>>1;t[e]=i>>>0}return t}static dosStamp(t){const e=t.getFullYear()-1980<<9|t.getMonth()+1<<5|t.getDate(),i=t.getHours()<<11|t.getMinutes()<<5|Math.floor(t.getSeconds()/2);return{date:e,time:i}}};o(K,"crcTable",null);let z=K;const Q=class Q{constructor(){o(this,"id","word");o(this,"icon",xt("#2b579a","W",10));o(this,"label","Tải bản Word (.docx)")}async export(t){const e=wt(t,Qt),s=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${this.heading(t.title,1)+this.paragraph(`Xuất lúc ${t.createdAt} từ extension ZeroCheck AI`,{italic:!0})+e.map(a=>this.section(a)).join("")+this.sectionProperties()}</w:body></w:document>`,n=[{name:"[Content_Types].xml",data:z.text(Q.CONTENT_TYPES)},{name:"_rels/.rels",data:z.text(Q.ROOT_RELS)},{name:"word/document.xml",data:z.text(s)}];Yt(z.build(n,"application/vnd.openxmlformats-officedocument.wordprocessingml.document"),`${Wt(t.fileBase)}.docx`)}section(t){const e=Math.floor(Q.USABLE_WIDTH/t.headers.length),i=this.row(t.headers,e,!0),s=t.rows.map(a=>this.row(a,e,!1)).join(""),n=t.note?this.paragraph(t.note,{italic:!0}):"";return this.heading(t.title,2)+'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+["top","left","bottom","right","insideH","insideV"].map(a=>`<w:${a} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`).join("")+`</w:tblBorders></w:tblPr>${i}${s}</w:tbl>`+n}row(t,e,i){return`<w:tr>${t.map(n=>`<w:tc><w:tcPr><w:tcW w:w="${e}" w:type="dxa"/>`+(i?'<w:shd w:val="clear" w:color="auto" w:fill="EEF1F8"/>':"")+`</w:tcPr>${this.paragraph(n,{bold:i})}</w:tc>`).join("")}</w:tr>`}heading(t,e){return this.paragraph(t,{bold:!0,size:e===1?32:26,spaceBefore:240})}paragraph(t,e={}){const i="<w:rPr>"+(e.bold?"<w:b/>":"")+(e.italic?"<w:i/>":"")+(e.size?`<w:sz w:val="${e.size}"/>`:'<w:sz w:val="20"/>')+"</w:rPr>",s=String(t??"").split(`
`).map((a,l)=>{const c=l>0?"<w:br/>":"";return`<w:r>${i}${c}<w:t xml:space="preserve">${O(a)}</w:t></w:r>`}).join("");return`<w:p>${e.spaceBefore?`<w:pPr><w:spacing w:before="${e.spaceBefore}"/></w:pPr>`:""}${s}</w:p>`}sectionProperties(){return'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1440" w:bottom="1134" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'}};o(Q,"USABLE_WIDTH",16838-1440*2),o(Q,"CONTENT_TYPES",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),o(Q,"ROOT_RELS",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');let kt=Q;const $=class ${constructor(){o(this,"id","excel");o(this,"icon",xt("#217346","X",10));o(this,"label","Tải bản Excel (.xlsx) - đầy đủ, lọc được")}async export(t){const e=wt(t),i=this.uniqueSheetNames(e),s=[{name:"[Content_Types].xml",data:z.text(this.contentTypes(e.length))},{name:"_rels/.rels",data:z.text($.ROOT_RELS)},{name:"xl/workbook.xml",data:z.text(this.workbook(i))},{name:"xl/_rels/workbook.xml.rels",data:z.text(this.workbookRels(e.length))},...e.map((n,a)=>({name:`xl/worksheets/sheet${a+1}.xml`,data:z.text(this.sheet(n))}))];Yt(z.build(s,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),`${Wt(t.fileBase)}.xlsx`)}sheet(t){const i=[t.headers,...t.rows,...t.note?[[t.note]]:[]].map((n,a)=>{const l=n.map((c,h)=>{const u=`${this.columnName(h)}${a+1}`,p=String(c??"").replace(/\n/g," | ");return`<c r="${u}" t="inlineStr"><is><t xml:space="preserve">${O(p)}</t></is></c>`}).join("");return`<row r="${a+1}">${l}</row>`}).join(""),s=`<cols><col min="1" max="${Math.max(1,t.headers.length)}" width="26" customWidth="1"/></cols>`;return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${$.NS}">${s}<sheetData>${i}</sheetData></worksheet>`}columnName(t){let e="",i=t;do e=String.fromCharCode(65+i%26)+e,i=Math.floor(i/26)-1;while(i>=0);return e}uniqueSheetNames(t){const e=new Set;return t.map((i,s)=>{const n=i.title.replace(/[:\\/?*[\]]/g," ").slice(0,$.SHEET_NAME_MAX)||`Phần ${s+1}`;let a=n,l=2;for(;e.has(a);)a=`${n.slice(0,$.SHEET_NAME_MAX-2)} ${l++}`;return e.add(a),a})}workbook(t){const e=t.map((i,s)=>`<sheet name="${O(i)}" sheetId="${s+1}" r:id="rId${s+1}"/>`).join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${$.NS}" xmlns:r="${$.NS_REL}"><sheets>${e}</sheets></workbook>`}workbookRels(t){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({length:t},(i,s)=>`<Relationship Id="rId${s+1}" Type="${$.NS_REL}/worksheet" Target="worksheets/sheet${s+1}.xml"/>`).join("")}</Relationships>`}contentTypes(t){return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+Array.from({length:t},(i,s)=>`<Override PartName="/xl/worksheets/sheet${s+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")+"</Types>"}};o($,"NS","http://schemas.openxmlformats.org/spreadsheetml/2006/main"),o($,"NS_REL","http://schemas.openxmlformats.org/officeDocument/2006/relationships"),o($,"SHEET_NAME_MAX",31),o($,"ROOT_RELS",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');let Et=$;const Z=class Z{async downloadXml130(t,e){const i=await this.getEndpointTemplate()??Z.DEFAULT_ENDPOINT;if(!i)return console.log("[HisXmlDownloader] Chưa cấu hình hisXmlEndpoint"),null;const s=typeof location<"u"?location.origin:"",n=encodeURIComponent(t),a=i.replace("{origin}",s).replace("{soVaoVien}",n).replace("{patientCode}",n);console.log(`[HisXmlDownloader] GET ${a}`);const l=await fetch(a,{credentials:"include",signal:e});if(l.status===401||l.status===403)throw new Error("HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào HIS trên trình duyệt rồi thử lại.");if(!l.ok)throw new Error(`HIS trả về lỗi HTTP ${l.status} khi tải XML 130.`);const c=await l.text(),h=c.trimStart().slice(0,200).toLowerCase();if(!h.startsWith("<?xml")&&(h.includes("<!doctype html")||h.includes("dangnhap")||h.includes("loginform")))throw new Error("Chưa đăng nhập HIS hoặc không có quyền tải hồ sơ này. Hãy đăng nhập vào HIS trên trình duyệt rồi thử lại.");if(c.trim()==="")throw new Error("Không tìm thấy hồ sơ cho số vào viện này. Kiểm tra lại số vào viện.");return c}async getEndpointTemplate(){var t;try{if(typeof chrome<"u"&&((t=chrome.storage)!=null&&t.local)){const i=(await chrome.storage.local.get(Z.STORAGE_KEY_ENDPOINT))[Z.STORAGE_KEY_ENDPOINT];if(typeof i=="string"&&i.trim()!=="")return i.trim()}}catch(e){console.warn("[HisXmlDownloader] Không đọc được cấu hình endpoint:",e)}return null}};o(Z,"STORAGE_KEY_ENDPOINT","hisXmlEndpoint"),o(Z,"DEFAULT_ENDPOINT","{origin}/web_his/api/xuatFileXmlCV130?loaiKcb=1&coBaoHiem=1&maHoa=0&soVaoVien={soVaoVien}");let At=Z;const Ge="__zcGuiBhxhExport__",We="__zcGuiBhxhExportRequest__",Ye="ntu02d060_guibaohiem4210",Qe="__zcGuiKyTongExport__",je="__zcGuiKyTongExportRequest__",_e="ntu02d061_guidshs_bhxh4210";class jt{constructor(){o(this,"capture",null);o(this,"listeners",[]);document.addEventListener(Ge,t=>this.onCapture(t));try{document.dispatchEvent(new CustomEvent(We))}catch{}}static isSupportedPage(){if(typeof location>"u")return!1;const t=location.search.toLowerCase();return location.pathname.toLowerCase().includes("manager.jsp")&&t.includes(Ye)}hasCapture(){return this.capture!==null}getCapture(){return this.capture}getMaLkList(){var t;return((t=this.capture)==null?void 0:t.maLkList)??[]}onChange(t){this.listeners.push(t)}onCapture(t){const e=t.detail;if(typeof e=="string")try{const i=JSON.parse(e);if(!i||typeof i.paramsJson!="string"||i.paramsJson==="")return;this.capture=i,console.log(`[GuiBhxhStore] Đã nhớ lượt Xuất XML KMH (${i.maLkList.length} bệnh nhân)`),this.listeners.forEach(s=>s())}catch(i){console.warn("[GuiBhxhStore] Không đọc được dữ liệu lượt xuất XML:",i)}}}class Ze{async download(t,e){const i=`${location.origin}/vnpthis/RestService`,s={func:"ajaxCALL_SP_X",params:["XUAT.XML",t.paramsJson]};t.uuid!==""&&(s.uuid=t.uuid);const n=JSON.stringify(s);console.log(`[GuiBhxhXmlDownloader] POST ${i} (${t.maLkList.length} bệnh nhân)`);const a=await fetch(i,{method:"POST",credentials:"include",headers:{"Content-Type":"text/plain; charset=UTF-8","X-Requested-With":"XMLHttpRequest"},body:n,signal:e});if(a.status===401||a.status===403)throw new Error("HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào VNPT-HIS trên trình duyệt rồi thử lại.");if(!a.ok)throw new Error(`HIS trả về lỗi HTTP ${a.status} khi tải XML KMH.`);const l=await a.text(),c=l.trimStart().slice(0,200).toLowerCase();if(!c.startsWith("<?xml")&&(c.includes("<!doctype html")||c.includes("dangnhap")||c.includes("login")))throw new Error("Chưa đăng nhập HIS hoặc phiên đã hết hạn. Hãy đăng nhập vào VNPT-HIS trên trình duyệt rồi thử lại.");if(l.trim()==="")throw new Error("HIS không trả về nội dung nào cho lượt xuất này.");return l}}class _t{constructor(){o(this,"capture",null);o(this,"listeners",[]);document.addEventListener(Qe,t=>this.onCapture(t));try{document.dispatchEvent(new CustomEvent(je))}catch{}}static isSupportedPage(){if(typeof location>"u")return!1;const t=location.search.toLowerCase();return location.pathname.toLowerCase().includes("manager.jsp")&&t.includes(_e)}hasCapture(){return this.capture!==null}getCapture(){return this.capture}onChange(t){this.listeners.push(t)}onCapture(t){const e=t.detail;if(typeof e=="string")try{const i=JSON.parse(e);if(!i||typeof i.url!="string"||i.url==="")return;this.capture=i,console.log("[GuiKyTongStore] Đã nhớ lượt Xuất XML Ký tổng"),this.listeners.forEach(s=>s())}catch(i){console.warn("[GuiKyTongStore] Không đọc được dữ liệu lượt xuất XML Ký tổng:",i)}}}class Je{async download(t,e){console.log(`[GuiKyTongXmlDownloader] GET ${t.url}`);const i={Accept:"*/*","X-Requested-With":"XMLHttpRequest"};t.auth!==""&&(i.Authorization=t.auth);const s=await fetch(t.url,{method:"GET",credentials:"include",headers:i,signal:e});if(s.status===401||s.status===403)throw new Error("HIS yêu cầu đăng nhập (phiên hết hạn). Hãy đăng nhập lại vào VNPT-HIS trên trình duyệt rồi thử lại.");if(!s.ok)throw new Error(`HIS trả về lỗi HTTP ${s.status} khi tải XML Ký tổng.`);const n=await s.text(),a=n.trimStart().slice(0,200).toLowerCase();if(a.includes("<!doctype html")||a.includes("dangnhap")||a.includes("login"))throw new Error("Chưa đăng nhập HIS hoặc phiên đã hết hạn. Hãy đăng nhập vào VNPT-HIS trên trình duyệt rồi thử lại.");if(n.trim()==="")throw new Error("HIS không trả về nội dung nào cho lượt xuất này.");try{const l=JSON.parse(n),c=typeof(l==null?void 0:l.results)=="string"?l.results:"";if(c.trim()!=="")return c;if(l&&typeof l.code=="number"&&l.code!==200)throw new Error(`HIS từ chối lượt tải: ${l.message??`mã lỗi ${l.code}`}.`)}catch(l){if(l instanceof Error&&l.message.startsWith("HIS từ chối"))throw l}if(a.startsWith("<?xml"))return n;throw new Error("Phản hồi của HIS không đúng định dạng mong đợi (thiếu nội dung XML).")}}const ti="__zcPaymentList__",ei="__zcPaymentListRequest__",ii="__zcPaymentRow__",si="kiemtrabangke";class it{constructor(){o(this,"snapshot",null);o(this,"selectedRow",null);o(this,"listeners",[]);document.addEventListener(ti,t=>this.onSnapshot(t)),document.addEventListener(ii,t=>this.onRow(t));try{document.dispatchEvent(new CustomEvent(ei))}catch{}}static isSupportedPage(){return typeof location<"u"&&location.pathname.toLowerCase().includes(si)}hasSearched(){return this.snapshot!==null}getTickets(){var t;return((t=this.snapshot)==null?void 0:t.items)??[]}getAdmissionNumbers(){const t=new Set,e=[];for(const i of this.getTickets())t.has(i.soVaoVien)||(t.add(i.soVaoVien),e.push(i.soVaoVien));return e}findTicket(t){return this.getTickets().find(e=>e.soVaoVien===t)??null}getSelectedAdmission(){var t;return((t=this.selectedRow)==null?void 0:t.soVaoVien)??null}getSelectedPatientName(){const t=this.selectedRow;if(!t)return null;if(t.tenBenhNhan!=="")return t.tenBenhNhan;const e=this.findTicket(t.soVaoVien);return e&&e.tenBenhNhan!==""?e.tenBenhNhan:null}onChange(t){this.listeners.push(t)}onSnapshot(t){const e=it.parse(t);!e||!Array.isArray(e.items)||(this.snapshot=e,this.selectedRow=null,console.log(`[PaymentListStore] Đã nhớ ${e.items.length} phiếu thanh toán`),this.notify())}onRow(t){const e=it.parse(t);!e||typeof e.soVaoVien!="string"||e.soVaoVien===""||(this.selectedRow=e,this.notify())}notify(){this.listeners.forEach(t=>t())}static parse(t){const e=t.detail;if(typeof e!="string")return null;try{return JSON.parse(e)}catch(i){return console.warn("[PaymentListStore] Không đọc được dữ liệu bảng kê:",i),null}}}class Zt{constructor(t){o(this,"host");o(this,"overlay",null);o(this,"settle",null);o(this,"onKeyDown",t=>{t.key==="Escape"?(t.preventDefault(),this.close(!1)):t.key==="Enter"&&(t.preventDefault(),this.close(!0))});this.host=t}ask(t){return this.close(!1),new Promise(e=>{this.settle=e;const i=document.createElement("div");i.className="zc-confirm",i.innerHTML=`
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
                </div>`;const s=i.querySelector(".zc-confirm-title");s&&(s.textContent=t.title);const n=i.querySelector(".zc-confirm-btn.cancel"),a=i.querySelector(".zc-confirm-btn.ok");n&&(n.textContent=t.cancelLabel??"Hủy"),a&&(a.textContent=t.confirmLabel??"Đồng ý"),n==null||n.addEventListener("click",()=>this.close(!1)),a==null||a.addEventListener("click",()=>this.close(!0)),i.addEventListener("click",l=>{l.target===i&&this.close(!1)}),i.addEventListener("keydown",this.onKeyDown),this.host.appendChild(i),this.overlay=i,requestAnimationFrame(()=>i.classList.add("open")),a==null||a.focus()})}close(t){var i;(i=this.overlay)==null||i.remove(),this.overlay=null;const e=this.settle;this.settle=null,e==null||e(t)}static styles(){return`
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
        `}}const gt=class gt{constructor(t,e,i,s,n,a,l){o(this,"apiClient");o(this,"xmlDownloader");o(this,"renderer");o(this,"container");o(this,"panel");o(this,"paymentList");o(this,"guiBhxh");o(this,"guiBhxhDownloader",new Ze);o(this,"guiKyTong");o(this,"guiKyTongDownloader",new Je);o(this,"confirmDialog");o(this,"capacity",new ft);o(this,"downloads",new yt([new vt,new kt,new Et]));o(this,"mode","hoi");o(this,"messagesEl",null);o(this,"inputEl",null);o(this,"fileInputEl",null);o(this,"sendBtnEl",null);o(this,"isBusy",!1);o(this,"abortController",null);o(this,"welcomeEl",null);o(this,"welcomeCollapsed",!1);o(this,"welcomeUserDecided",!1);o(this,"robot",null);o(this,"fileQueue",[]);o(this,"fileSeq",0);o(this,"trayEl",null);o(this,"plusMenuEl",null);this.apiClient=e??new mt,this.xmlDownloader=i??new At,this.renderer=s??new bt,this.paymentList=n??new it,this.guiBhxh=a??new jt,this.guiKyTong=l??new _t,this.panel=t,this.container=t.getTabContainer("chat"),this.container.classList.add("chat-root"),this.confirmDialog=new Zt(this.container),t.addStyles(this.getStyles()),t.addStyles(Zt.styles()),this.createUI(),this.paymentList.onChange(()=>this.renderPaymentBar()),this.guiBhxh.onChange(()=>this.renderGuiBhxhBar()),this.guiKyTong.onChange(()=>this.renderGuiKyTongBar())}setBusy(t){var s,n;this.isBusy=t,t?this.panel.beginChecking():this.panel.endChecking(),(s=this.robot)==null||s.notifyThinking(t),this.container.classList.toggle("chat-busy",t),this.inputEl&&(this.inputEl.disabled=t,this.inputEl.placeholder=t?"Đang xử lý — bấm ■ để dừng...":this.placeholderFor(this.mode));const e=this.container.querySelector(".chat-attach");e&&(e.disabled=t);const i=this.container.querySelector(".chat-plus");i&&(i.disabled=t),t&&this.hidePlusMenu(),this.sendBtnEl&&(this.sendBtnEl.disabled=!1,this.sendBtnEl.classList.toggle("chat-stop",t),this.sendBtnEl.textContent=t?"■":"➤",this.sendBtnEl.title=t?"Dừng":"Gửi"),t||(n=this.inputEl)==null||n.focus(),this.renderTray(),this.renderPaymentBar(),this.renderGuiBhxhBar(),this.renderGuiKyTongBar()}abortCurrent(){var t;(t=this.abortController)==null||t.abort()}isAbort(t){return t instanceof DOMException&&t.name==="AbortError"}addLoadingMessage(t){return this.addBotHtml(`<span class="chat-spinner"></span><span class="chat-loading-text">${t}</span>`)}focusInput(){var t;(t=this.inputEl)==null||t.focus()}attachRobot(t){this.robot=t}createUI(){this.container.innerHTML=`
            <div class="chat-messages"></div>
            <div class="chat-drop-hint">📄 Thả file XML vào đây để kiểm tra</div>
            <div class="chat-bangke" hidden></div>
            <div class="chat-guibhxh" hidden></div>
            <div class="chat-kytong" hidden></div>
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
        `,this.messagesEl=this.container.querySelector(".chat-messages"),this.inputEl=this.container.querySelector(".chat-input"),this.fileInputEl=this.container.querySelector(".chat-file"),this.sendBtnEl=this.container.querySelector(".chat-send"),this.trayEl=this.container.querySelector(".chat-tray"),this.plusMenuEl=this.container.querySelector(".chat-plus-menu"),this.inputEl&&(this.inputEl.placeholder=this.placeholderFor(this.mode)),this.attachEvents(),this.showWelcome(),this.renderPaymentBar(),this.renderGuiBhxhBar(),this.renderGuiKyTongBar(),console.log("[ChatPanel] UI created")}showWelcome(){var e;this.welcomeEl=null;const t=this.addBotHtml('<button class="chat-welcome-toggle" type="button">💡</button><div class="chat-welcome-body">Xin chào! Bạn gõ câu hỏi nghiệp vụ BHYT vào ô bên dưới là tôi trả lời ngay.<br/>Bấm nút <b>+</b> để đổi chế độ:<br/>• <b>Hỏi thông tin y tế</b> — hỏi nghiệp vụ BHYT (đang chọn sẵn).<br/>• <b>Kiểm tra số vào viện</b> — tải hồ sơ XML 130 từ HIS và kiểm tra xuất toán.<br/>Hoặc bấm 📎 để đính kèm nhiều file <b>XML 130</b> kiểm tra hàng loạt — từ 2 file trở lên sẽ tự động <b>đối chiếu chéo</b> giữa các hồ sơ (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị).<br/>Riêng ở màn hình <b>Kiểm tra bảng kê</b>, sau khi bấm <b>Xem thông tin</b> sẽ có thêm hai nút ngay trên ô nhập, khỏi phải xuất file hay gõ tay số vào viện:<br/>• <b>📋 Kiểm tra (n) file XML130</b> — lấy trọn danh sách phiếu vừa tìm, tải hồ sơ từ HIS rồi kiểm tra một lượt kèm đối chiếu chéo.<br/>• <b>🔎 Kiểm tra XML130 cho BN</b> — chỉ hồ sơ của dòng bảng kê bạn đang chọn (chưa chọn dòng nào thì nút còn khóa).</div>');t.classList.add("chat-msg-wide","chat-welcome"),(e=t.querySelector(".chat-welcome-toggle"))==null||e.addEventListener("click",()=>this.setWelcomeCollapsed(!this.welcomeCollapsed,!0)),this.welcomeEl=t,this.welcomeCollapsed=!1,this.welcomeUserDecided=!1,this.syncWelcomeToggle()}collapseWelcomeOnFirstUse(){!this.welcomeEl||this.welcomeCollapsed||this.welcomeUserDecided||this.setWelcomeCollapsed(!0,!1)}setWelcomeCollapsed(t,e){this.welcomeEl&&(this.welcomeCollapsed=t,e&&(this.welcomeUserDecided=!0),this.welcomeEl.classList.toggle("chat-welcome-collapsed",t),this.syncWelcomeToggle())}syncWelcomeToggle(){var i;const t=(i=this.welcomeEl)==null?void 0:i.querySelector(".chat-welcome-toggle");if(!t)return;const e=this.welcomeCollapsed?"Mở lại hướng dẫn nhanh":"Thu gọn hướng dẫn nhanh";t.title=e,t.setAttribute("aria-label",e),t.setAttribute("aria-expanded",String(!this.welcomeCollapsed))}clearHistory(){this.isBusy||(this.fileQueue=[],this.renderTray(),this.messagesEl&&(this.messagesEl.innerHTML=""),this.downloads.clear(),this.showWelcome())}attachDownload(t,e,i,s){this.downloads.attach(t,D.fromValidation(e,i,s))}patientSubject(t,e){var l;const i=this.paymentList.findTicket(t),s=(l=e.results)==null?void 0:l[0],n=(i==null?void 0:i.tenBenhNhan)||(s==null?void 0:s.hoTen)||"",a=W.fromPatient(n,(i==null?void 0:i.ngayKham)||(s==null?void 0:s.ngayVao)||"");return a===""?`số vào viện ${t}`:a}attachEvents(){var n,a,l,c;const t=this.container.querySelector(".chat-clear");t==null||t.addEventListener("click",()=>this.clearHistory());const e=this.container.querySelector(".chat-send");e==null||e.addEventListener("click",()=>{this.isBusy?this.abortCurrent():this.handleSend()}),(n=this.inputEl)==null||n.addEventListener("keydown",h=>{h.key==="Enter"&&!h.shiftKey&&(h.preventDefault(),this.isBusy||this.handleSend())}),(a=this.inputEl)==null||a.addEventListener("input",()=>{var h;this.isBusy||(h=this.robot)==null||h.notifyTyping()});const i=this.container.querySelector(".chat-plus");i==null||i.addEventListener("click",h=>{h.stopPropagation(),this.togglePlusMenu()}),this.container.addEventListener("click",h=>{const u=h.target;!u.closest(".chat-plus")&&!u.closest(".chat-plus-menu")&&this.hidePlusMenu()});const s=this.container.querySelector(".chat-attach");s==null||s.addEventListener("click",()=>{var h;return(h=this.fileInputEl)==null?void 0:h.click()}),(l=this.fileInputEl)==null||l.addEventListener("change",()=>{var h,u;(u=(h=this.fileInputEl)==null?void 0:h.files)!=null&&u.length&&this.addFilesToQueue(this.fileInputEl.files),this.fileInputEl&&(this.fileInputEl.value="")}),(c=this.messagesEl)==null||c.addEventListener("toggle",h=>{const u=h.target;u instanceof HTMLDetailsElement&&u.open&&u.scrollIntoView({block:"nearest",behavior:"smooth"})},!0),this.container.addEventListener("dragover",h=>{h.preventDefault(),h.stopPropagation(),this.container.classList.add("dragging")}),this.container.addEventListener("dragleave",h=>{h.preventDefault(),h.stopPropagation(),this.container.classList.remove("dragging")}),this.container.addEventListener("drop",h=>{var u,p;h.preventDefault(),h.stopPropagation(),this.container.classList.remove("dragging"),(p=(u=h.dataTransfer)==null?void 0:u.files)!=null&&p.length&&this.addFilesToQueue(h.dataTransfer.files)})}placeholderFor(t){return t==="svv"?"Nhập số vào viện để kiểm tra XML 130...":"Nhập câu hỏi nghiệp vụ BHYT..."}setMode(t){var e;this.mode=t,this.inputEl&&!this.isBusy&&(this.inputEl.placeholder=this.placeholderFor(t)),(e=this.inputEl)==null||e.focus()}togglePlusMenu(){if(this.plusMenuEl){if(!this.plusMenuEl.hidden){this.hidePlusMenu();return}this.plusMenuEl.innerHTML=gt.MODE_OPTIONS.map(t=>`
                <div class="chat-menu-item${t.mode===this.mode?" active":""}" data-mode="${t.mode}">
                    <span class="chat-menu-icon">${t.icon}</span>
                    <span class="chat-menu-label">${t.label}</span>
                    ${t.mode===this.mode?'<span class="chat-menu-check">✓</span>':""}
                </div>`).join(""),this.plusMenuEl.hidden=!1,this.plusMenuEl.querySelectorAll(".chat-menu-item").forEach(t=>{t.addEventListener("click",()=>{this.setMode(t.dataset.mode),this.hidePlusMenu()})})}}hidePlusMenu(){this.plusMenuEl&&(this.plusMenuEl.hidden=!0,this.plusMenuEl.innerHTML="")}handleSend(){var e;if(!this.inputEl||this.isBusy)return;const t=this.inputEl.value.trim();if(t){if(this.mode==="svv"){const i=(e=t.match(/\d+/))==null?void 0:e[0];if(!i){this.addBotHtml("Đang ở chế độ <b>Số vào viện</b> — hãy nhập một số vào viện (dãy số). Muốn hỏi nghiệp vụ thì bấm nút <b>Hỏi</b> phía trên.");return}this.inputEl.value="",this.addUserMessage(t),this.handleAdmissionCheck(i);return}if(this.isTooVague(t)){this.inputEl.value="",this.addUserMessage(t),this.addBotHtml("Câu hỏi hơi ngắn nên tôi chưa rõ ý. Bạn nêu cụ thể hơn giúp tôi nhé.");return}this.inputEl.value="",this.addUserMessage(t),this.handleQuestion(t)}}isTooVague(t){const i=t.trim().replace(/[^\p{L}]/gu,"");return!!(i.length<3||new RegExp("^(\\p{L})\\1*$","u").test(i))}addFilesToQueue(t){if(this.isBusy){this.addBotHtml("⏳ Đang xử lý lượt kiểm tra hiện tại — chờ xong rồi thêm file nhé.");return}const e=Array.from(t),i=e.filter(n=>n.name.toLowerCase().endsWith(".xml")),s=e.length-i.length;s>0&&this.addBotHtml(`⚠ Đã bỏ qua ${s} file không phải <b>.xml</b> (chỉ nhận hồ sơ XML 130).`);for(const n of i)this.fileQueue.push({id:++this.fileSeq,file:n,status:"pending",abort:null,note:""});this.renderTray()}renderTray(){if(!this.trayEl)return;if(this.fileQueue.length===0){this.trayEl.hidden=!0,this.trayEl.innerHTML="";return}this.trayEl.hidden=!1;const t=this.fileQueue.filter(a=>a.status==="pending").length,e=this.fileQueue.some(a=>a.status==="checking"),i=this.isBusy?"disabled":"",s=this.fileQueue.map(a=>{const l=a.status==="checking"?`<button class="chat-file-btn stop" data-act="stop" data-id="${a.id}" title="Dừng">■</button>`:`<button class="chat-file-btn go" data-act="check" data-id="${a.id}" title="Kiểm tra file này" ${i}>▶</button>
                           <button class="chat-file-btn" data-act="remove" data-id="${a.id}" title="Xóa" ${i}>✕</button>`,c=a.status==="checking"?'<span class="chat-spinner"></span>':'<span class="chat-file-ic">📄</span>',h=a.note?`<span class="chat-file-note">${this.escape(a.note)}</span>`:"";return`
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
                <button class="chat-tray-btn" data-act="clear-all" ${i}>Xóa hết</button>
            </div>`;this.trayEl.innerHTML=`<div class="chat-tray-list">${s}</div>${n}`,this.bindTrayEvents()}bindTrayEvents(){var t;(t=this.trayEl)==null||t.querySelectorAll("[data-act]").forEach(e=>{e.addEventListener("click",()=>{const i=e.dataset.act,s=e.dataset.id?Number(e.dataset.id):null;i==="check"&&s?this.checkOne(s):i==="stop"&&s?this.stopOne(s):i==="remove"&&s?this.removeQueued(s):i==="check-all"?this.checkAll():i==="stop-all"?this.stopAll():i==="clear-all"&&this.clearAll()})})}async checkOne(t){var s;const e=this.fileQueue.find(n=>n.id===t);if(!e||e.status==="checking"||this.isBusy)return;e.status="checking",e.note="",e.abort=new AbortController,this.abortController=e.abort,this.setBusy(!0);let i=!1;try{const n=await this.apiClient.validateXml130(e.file,e.file.name,e.abort.signal);i=!0;const a=this.addBotHtml(`<div class="chat-file-result-head">📄 ${this.escape(e.file.name)}</div>`+this.renderer.renderValidationResult(n));a.classList.add("chat-msg-wide"),this.attachDownload(a,n,W.fromXmlFile(e.file.name),e.file.name),(s=this.robot)==null||s.notifyResult(this.resultFor(n.xuatToanRisk===!0,n.found===!1||n.hosoCount===0))}catch(n){const a=this.isAbort(n);e.status="pending",e.note=a?"Đã dừng, bấm ▶ để kiểm tra lại":"Chưa kiểm tra được, bấm ▶ để thử lại",this.addBotHtml(`<div class="chat-file-result-head">📄 ${this.escape(e.file.name)}</div>`+(a?"⏹ Đã dừng theo yêu cầu.":this.renderEndOrError(n)))}finally{e.abort=null,i&&this.releaseFiles([e]),this.setBusy(!1)}}async checkAll(){if(this.isBusy)return;const t=this.fileQueue.filter(e=>e.status==="pending");t.length!==0&&await this.checkBatch(t)}async checkBatch(t,e=""){var M;const i=this.capacity.measure(),s=t.reduce((f,k)=>f+k.file.size,0);if(s>i.budgetBytes){this.addBotHtml(`⚠ Lô đang chọn nặng ${this.mb(s)}MB — vượt mức máy này kham được (${i.summary} → tối đa ${this.mb(i.budgetBytes)}MB mỗi lượt). Hãy chia nhỏ theo tuần (bấm ✕ bớt file rồi "Kiểm tra tất cả" từng đợt). Lưu ý: đối chiếu chéo chỉ so các file trong cùng một đợt.`);return}this.panel.maximizeForBatchCheck();const n=new AbortController;for(const f of t)f.status="checking",f.note="Trong lô",f.abort=n;this.abortController=n,this.setBusy(!0);const a=this.addBotHtml(`<div class="chat-stream-status"><span class="chat-spinner"></span><span class="chat-stream-text">Đang tải ${t.length} file lên máy chủ...</span></div><div class="chat-progress"><div class="chat-progress-bar" style="width:0%"></div></div><div class="chat-stream-stats"></div>`);a.classList.add("chat-msg-wide");const l=a.querySelector(".chat-stream-text"),c=a.querySelector(".chat-progress-bar"),h=a.querySelector(".chat-stream-stats"),u=new Map;for(const f of t)u.set(f.file.name,{results:[],hosoCount:0,issueCount:0,riskCount:0});const p=new Map;let g=[],y=null,b=0,T=!1;this.panel.setBatchProgress("Đang tải file lên...");try{if(await this.apiClient.validateXml130BatchStream(t.map(f=>({blob:f.file,name:f.file.name})),f=>{if(f.type==="start")b=f.hosoCount??0,l&&(l.innerHTML=`Đã nhận <b>${f.fileCount}</b> file (<b>${f.hosoCount}</b> hồ sơ). Đang đối chiếu chéo giữa các hồ sơ...`),this.panel.setBatchProgress(`Đối chiếu chéo ${f.hosoCount??0} hồ sơ...`);else if(f.type==="fileError"&&f.fileName)p.set(f.fileName,f.error??"Không đọc được");else if(f.type==="cross")g=f.crossIssues??[],(g.length>0||b>1)&&this.addBotHtml(this.renderer.renderStreamCross(g,f.conflicts??[])).classList.add("chat-msg-wide"),l&&(l.innerHTML=b>1?"Đối chiếu chéo xong (kết quả ở trên). Đang kiểm tra từng hồ sơ...":"Đang kiểm tra hồ sơ...");else if(f.type==="hoso"){const k=u.get(f.fileName??"");k&&f.result&&(k.hosoCount++,k.issueCount+=f.result.issueCount,f.result.xuatToanRisk&&k.riskCount++,f.result.issueCount>0&&k.results.push(f.result));const H=f.index??0,L=f.total??0;l&&(l.innerHTML=`Đang kiểm tra hồ sơ <b>${H}/${L}</b>...`),c&&L>0&&(c.style.width=`${Math.round(H/L*100)}%`),h&&(h.innerHTML=`⚠ <b>${f.riskCount??0}</b> hồ sơ nguy cơ xuất toán · ✔ <b>${H-(f.riskCount??0)}</b> không · tổng <b>${f.issueCount??0}</b> vấn đề`),this.panel.setBatchProgress(`${H}/${L} · ⚠ ${f.riskCount??0}`,L>0?H/L*100:null)}else f.type==="done"&&(y=f)},n.signal),T=!0,y){this.setMessageHtml(a,this.renderer.renderStreamSummary(y,u,p));const f=y;this.downloads.attach(a,D.fromStream(f,u,p,g,e));const k=f.riskCount??0,H=f.hosoCount??0;this.panel.completeBatchProgress(`✔ Xong ${H} hồ sơ · ⚠ ${k}`),(M=this.robot)==null||M.notifyResult(k>0?"aiError":H>0?"allValid":"warning")}else this.panel.setBatchProgress(null)}catch(f){const k=this.isAbort(f);for(const L of t)L.status="pending",L.note=k?"Đã dừng, kiểm tra lại được":"Chưa kiểm tra được, thử lại được";this.panel.setBatchProgress(null);const H=[...u.values()].reduce((L,F)=>L+F.hosoCount,0);if(k&&H>0){const L={type:"done",hosoCount:H,riskCount:[...u.values()].reduce((F,m)=>F+m.riskCount,0),issueCount:[...u.values()].reduce((F,m)=>F+m.issueCount,0),summary:"Đã dừng theo yêu cầu — bên dưới là kết quả của phần hồ sơ ĐÃ kiểm tra (kiểm tra lại bất cứ lúc nào, mỗi lần chạy độc lập, không lưu dở dang trên máy chủ)."};this.setMessageHtml(a,'<div class="chat-banner chat-banner-warn">⏹ Đã dừng theo yêu cầu</div>'+this.renderer.renderStreamSummary(L,u,p)),this.downloads.attach(a,D.fromStream(L,u,p,g,[e,"đã dừng giữa chừng"].filter(F=>F!=="").join(" ")))}else this.setMessageHtml(a,this.renderEndOrError(f))}finally{for(const f of t)f.abort=null;T&&this.releaseFiles(t),this.setBusy(!1)}}releaseFiles(t){const e=new Set(t.map(i=>i.id));this.fileQueue=this.fileQueue.filter(i=>!e.has(i.id))}stopOne(t){var e,i;(i=(e=this.fileQueue.find(s=>s.id===t))==null?void 0:e.abort)==null||i.abort()}stopAll(){this.fileQueue.forEach(t=>{var e;return(e=t.abort)==null?void 0:e.abort()})}removeQueued(t){var i;const e=this.fileQueue.find(s=>s.id===t);(i=e==null?void 0:e.abort)==null||i.abort(),this.fileQueue=this.fileQueue.filter(s=>s.id!==t),this.renderTray()}clearAll(){this.stopAll(),this.fileQueue=[],this.renderTray()}renderPaymentBar(){var c,h;const t=this.container.querySelector(".chat-bangke");if(!t)return;if(!it.isSupportedPage()){t.hidden=!0,t.innerHTML="";return}const e=this.paymentList.getAdmissionNumbers().length,i=this.paymentList.getSelectedAdmission(),s=this.paymentList.getSelectedPatientName(),n=this.isBusy?"disabled":"",a=this.isBusy||i===null?"disabled":"",l=i===null?"":s??"Bệnh nhân đang chọn";t.hidden=!1,t.innerHTML=`
            <div class="chat-bangke-row">
                <button class="chat-bangke-btn" data-act="all" ${n}
                    title="Lấy số vào viện từ danh sách phiếu thanh toán vừa tìm được, tải toàn bộ XML 130 rồi kiểm tra một lượt kèm đối chiếu chéo">
                    📋 Kiểm tra${e>0?` (${e})`:""} file XML130
                </button>
                <button class="chat-bangke-btn" data-act="one" ${a}
                    title="${i===null?"Hãy bấm chọn một dòng trên bảng kê trước":`Kiểm tra XML130 cho BN: ${this.escape(l)}`}">
                    🔎 Kiểm tra XML130 cho BN:${l===""?"":`<span class="chat-bangke-sub">${this.escape(l)}</span>`}
                </button>
            </div>`,(c=t.querySelector('[data-act="all"]'))==null||c.addEventListener("click",()=>void this.checkFromPaymentList()),(h=t.querySelector('[data-act="one"]'))==null||h.addEventListener("click",()=>void this.checkSelectedRow())}renderGuiBhxhBar(){var n;const t=this.container.querySelector(".chat-guibhxh");if(!t)return;if(!jt.isSupportedPage()){t.hidden=!0,t.innerHTML="";return}const e=this.guiBhxh.getCapture(),i=(e==null?void 0:e.maLkList.length)??0,s=this.isBusy||e===null?"disabled":"";t.hidden=!1,t.innerHTML=`
            <div class="chat-bangke-row">
                <button class="chat-guibhxh-btn" data-act="kmh" ${s}
                    title="${e===null?'Hãy tick chọn bệnh nhân rồi bấm nút "Xuất XML KMH" của HIS trước — tôi sẽ dùng đúng lượt xuất đó để lấy file kiểm tra':`Tải file XML KMH của lượt xuất vừa bấm (${i} bệnh nhân) rồi kiểm tra một lượt kèm đối chiếu chéo`}">
                    📋 Kiểm tra XML KMH${i>0?` (${this.num(i)} bệnh nhân)`:""}
                </button>
            </div>`,(n=t.querySelector('[data-act="kmh"]'))==null||n.addEventListener("click",()=>void this.checkFromGuiBhxh())}async checkFromGuiBhxh(){if(this.isBusy)return;const t=this.guiBhxh.getCapture();if(t===null){this.addBotHtml("⚠ Chưa có lượt xuất XML nào để dùng.<br/>Hãy tick chọn bệnh nhân rồi bấm nút <b>Xuất XML KMH</b> của HIS trước — tôi bắt tham số từ đúng lượt bấm đó và gọi lại để lấy file, không tự tìm kiếm lần nữa.");return}const e=t.maLkList.length;if(e===0){this.addBotHtml("⚠ Lượt xuất vừa rồi không có bệnh nhân nào. Hãy chọn lại rồi bấm <b>Xuất XML KMH</b>.");return}const i=this.capacity.measure();if(e>i.maxFiles){this.addBotHtml(`⚠ Lượt xuất có <b>${this.num(e)}</b> bệnh nhân, vượt sức bộ nhớ cho một lượt (<b>${this.num(i.maxFiles)}</b> hồ sơ).<br/>Máy đang dùng: ${i.summary} — tải file gộp chừng đó hồ sơ vào bộ nhớ tab sẽ làm treo trình duyệt.<br/>Hãy chọn ít bệnh nhân hơn rồi bấm <b>Xuất XML KMH</b> lại.`);return}const s=this.capacity.estimateWait(e,i);if(!await this.confirmDialog.ask({icon:"📋",title:"Kiểm tra XML KMH",messageHtml:`Bạn muốn kiểm tra file XML KMH của lượt xuất vừa bấm (<b>${this.num(e)}</b> bệnh nhân)?<br/>File sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>Thời gian chờ dự kiến: <b>${s}</b> (máy đang dùng: ${i.summary}).<br/>Trong lúc chạy vẫn xem được tiến độ và bấm <b>Dừng</b> bất cứ lúc nào.`,confirmLabel:`Kiểm tra ${this.num(e)} hồ sơ`,cancelLabel:"Để sau"}))return;const a=new AbortController;this.abortController=a,this.setBusy(!0);const l=this.addLoadingMessage("Đang tải file XML KMH từ HIS...");try{const c=await this.guiBhxhDownloader.download(t,a.signal),h=new Date(t.at),u=b=>String(b).padStart(2,"0"),p=`KMH_${t.hcode||"hoso"}_${h.getFullYear()}${u(h.getMonth()+1)}${u(h.getDate())}_${u(h.getHours())}${u(h.getMinutes())}${u(h.getSeconds())}.xml`,g=new File([c],p,{type:"text/xml"});if(g.size>i.budgetBytes){this.setMessageHtml(l,`⚠ File XML nặng ${this.mb(g.size)} — vượt ngân sách bộ nhớ của máy này (${i.summary} → tối đa ${this.mb(i.budgetBytes)}MB mỗi lượt).<br/>Hãy chọn ít bệnh nhân hơn rồi bấm <b>Xuất XML KMH</b> lại.`);return}this.setMessageHtml(l,`Đã tải file <b>${this.escape(p)}</b> (${this.mb(g.size)}, ${this.num(e)} bệnh nhân) — đang đưa vào kiểm tra...`);const y={id:++this.fileSeq,file:g,status:"pending",abort:null,note:""};this.fileQueue.push(y),this.renderTray(),await this.checkBatch([y])}catch(c){this.setMessageHtml(l,this.renderEndOrError(c))}finally{this.setBusy(!1)}}renderGuiKyTongBar(){var s;const t=this.container.querySelector(".chat-kytong");if(!t)return;if(!_t.isSupportedPage()){t.hidden=!0,t.innerHTML="";return}const e=this.guiKyTong.getCapture(),i=this.isBusy||e===null?"disabled":"";t.hidden=!1,t.innerHTML=`
            <div class="chat-bangke-row">
                <button class="chat-kytong-btn" data-act="kytong" ${i}
                    title="${e===null?'Hãy bấm nút "Xuất XML Ký tổng" của HIS trước — tôi sẽ dùng đúng lượt xuất đó để lấy file kiểm tra':"Tải file XML Ký tổng của lượt xuất vừa bấm rồi kiểm tra một lượt kèm đối chiếu chéo"}">
                    📋 Kiểm tra XML Ký tổng
                </button>
            </div>`,(s=t.querySelector('[data-act="kytong"]'))==null||s.addEventListener("click",()=>void this.checkFromGuiKyTong())}async checkFromGuiKyTong(){if(this.isBusy)return;const t=this.guiKyTong.getCapture();if(t===null){this.addBotHtml("⚠ Chưa có lượt xuất XML nào để dùng.<br/>Hãy bấm nút <b>Xuất XML Ký tổng</b> của HIS trước — tôi bắt liên kết tải từ đúng lượt bấm đó và gọi lại để lấy file, không tự tìm kiếm lần nữa.");return}const e=this.capacity.measure();if(!await this.confirmDialog.ask({icon:"📋",title:"Kiểm tra XML Ký tổng",messageHtml:`Bạn muốn kiểm tra file XML Ký tổng của lượt xuất vừa bấm?<br/>File sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>Máy đang dùng: ${e.summary}.<br/>Trong lúc chạy vẫn xem được tiến độ và bấm <b>Dừng</b> bất cứ lúc nào.`,confirmLabel:"Kiểm tra",cancelLabel:"Để sau"}))return;const s=new AbortController;this.abortController=s,this.setBusy(!0);const n=this.addLoadingMessage("Đang tải file XML Ký tổng từ HIS...");try{const a=await this.guiKyTongDownloader.download(t,s.signal),l=new Date(t.at),c=g=>String(g).padStart(2,"0"),h=`KyTong_${l.getFullYear()}${c(l.getMonth()+1)}${c(l.getDate())}_${c(l.getHours())}${c(l.getMinutes())}${c(l.getSeconds())}.xml`,u=new File([a],h,{type:"text/xml"});if(u.size>e.budgetBytes){this.setMessageHtml(n,`⚠ File XML nặng ${this.mb(u.size)} — vượt ngân sách bộ nhớ của máy này (${e.summary} → tối đa ${this.mb(e.budgetBytes)}MB mỗi lượt).<br/>Hãy xuất lô ít hồ sơ hơn rồi bấm <b>Xuất XML Ký tổng</b> lại.`);return}this.setMessageHtml(n,`Đã tải file <b>${this.escape(h)}</b> (${this.mb(u.size)}) — đang đưa vào kiểm tra...`);const p={id:++this.fileSeq,file:u,status:"pending",abort:null,note:""};this.fileQueue.push(p),this.renderTray(),await this.checkBatch([p])}catch(a){this.setMessageHtml(n,this.renderEndOrError(a))}finally{this.setBusy(!1)}}async checkSelectedRow(){if(this.isBusy)return;const t=this.paymentList.getSelectedAdmission();if(t===null){this.addBotHtml("⚠ Hãy bấm chọn một dòng trên bảng kê trước, rồi bấm lại nút này.");return}await this.handleAdmissionCheck(t)}async checkFromPaymentList(){if(this.isBusy)return;if(!this.paymentList.hasSearched()){this.addBotHtml("⚠ Chưa có danh sách phiếu thanh toán nào.<br/>Hãy bấm <b>Xem thông tin</b> trên màn hình <b>Kiểm tra bảng kê</b> trước — tôi sẽ lấy số vào viện từ đúng danh sách bạn vừa tìm, không tìm lại lần nữa.");return}const t=this.paymentList.getAdmissionNumbers();if(t.length===0){this.addBotHtml("⚠ Danh sách phiếu thanh toán vừa tìm <b>không có phiếu nào</b> nên chưa có gì để kiểm tra.<br/>Hãy đổi điều kiện tìm kiếm (ngày, đơn vị, trạng thái) rồi tìm lại.");return}const e=this.capacity.measure();if(t.length>e.maxFiles){this.addBotHtml(`⚠ Danh sách có <b>${this.num(t.length)}</b> hồ sơ, vượt sức bộ nhớ cho một lượt (<b>${this.num(e.maxFiles)}</b> hồ sơ).<br/>Máy đang dùng: ${e.summary} — tải chừng đó hồ sơ vào bộ nhớ tab sẽ làm treo trình duyệt.<br/>Tôi <b>không cắt bớt danh sách</b> để chạy một phần, vì đối chiếu chéo sẽ bỏ sót những hồ sơ nằm ngoài phần được kiểm tra.<br/>Hãy thu hẹp điều kiện tìm kiếm (ngày, khoa, đơn vị) cho danh sách ngắn lại rồi tìm lại.`);return}const i=t,s=this.capacity.estimateWait(i.length,e);if(!await this.confirmDialog.ask({icon:"📋",title:"Kiểm tra hàng loạt",messageHtml:`Bạn muốn kiểm tra <b>${this.num(i.length)}</b> file XML130 lấy từ danh sách phiếu thanh toán vừa tìm?<br/>Hồ sơ sẽ được tải từ HIS rồi kiểm tra một lượt, có đối chiếu chéo giữa các hồ sơ.<br/>Thời gian chờ dự kiến: <b>${s}</b> (máy đang dùng: ${e.summary}).<br/>Trong lúc chạy vẫn xem được tiến độ từng hồ sơ và bấm <b>Dừng</b> bất cứ lúc nào.`,confirmLabel:`Kiểm tra ${this.num(i.length)} file`,cancelLabel:"Để sau"}))return;const a=new AbortController;this.abortController=a,this.setBusy(!0);const l=this.addLoadingMessage(`Đang tải <b>0/${i.length}</b> hồ sơ XML 130 từ HIS...`),c=l.querySelector(".chat-loading-text");let h=[],u=[],p=!1;try{const b=await this.downloadAdmissionFiles(i,e,a.signal,T=>{c&&(c.innerHTML=`Đang tải <b>${T}/${i.length}</b> hồ sơ XML 130 từ HIS...`),this.panel.setBatchProgress(`Tải hồ sơ ${T}/${i.length}`,T/i.length*100)});h=b.files,u=b.errors,p=b.outOfMemory}finally{this.panel.setBatchProgress(null),this.setBusy(!1)}const g=a.signal.aborted;if(this.setMessageHtml(l,`${g?"⏹ Đã dừng khi tải — ":""}Đã tải <b>${h.length}/${i.length}</b> hồ sơ từ HIS.`+(u.length>0?` <span class="chat-file-note error">${u.length} hồ sơ không tải được</span>`:"")),p){this.addBotHtml(`⚠ Đã dừng ở <b>${h.length}/${i.length}</b> hồ sơ vì chạm ngưỡng bộ nhớ của máy này (${e.summary} → tối đa ${this.mb(e.budgetBytes)}MB mỗi lượt) — lô này nặng hơn dự tính.<br/>Tôi <b>chưa kiểm tra</b> phần đã tải, vì lô thiếu hồ sơ sẽ làm đối chiếu chéo bỏ sót.<br/>Hãy thu hẹp điều kiện tìm kiếm cho danh sách ngắn lại rồi tìm lại.`);return}if(u.length>0){const b=u.slice(0,10);this.addBotHtml(`⚠ <b>${u.length}</b> hồ sơ không tải được từ HIS (đã bỏ qua, phần còn lại vẫn kiểm tra):<br/>`+b.map(T=>`• Số vào viện <b>${this.escape(T.soVaoVien)}</b>: ${this.escape(T.message)}`).join("<br/>")+(u.length>b.length?`<br/>• ... và ${u.length-b.length} hồ sơ khác`:"")).classList.add("chat-msg-wide")}if(h.length===0){g||this.addBotHtml("Không tải được hồ sơ nào nên chưa kiểm tra được. Kiểm tra lại phiên đăng nhập HIS rồi thử lại.");return}const y=h.map(b=>({id:++this.fileSeq,file:b,status:"pending",abort:null,note:""}));this.fileQueue.push(...y),this.renderTray(),await this.checkBatch(y)}async downloadAdmissionFiles(t,e,i,s){const n=new Array(t.length).fill(null),a=[];let l=0,c=0,h=0,u=!1;const p=async()=>{for(;!i.aborted&&!u;){const y=l++;if(y>=t.length)return;const b=t[y];try{const T=await this.xmlDownloader.downloadXml130(b,i);if(T===null)throw new Error("Chưa cấu hình kết nối HIS trong extension");const M=new File([T],`xml130_${b}.xml`,{type:"text/xml"});n[y]=M,h+=M.size,h>e.budgetBytes&&(u=!0)}catch(T){if(this.isAbort(T))return;a.push({soVaoVien:b,message:T instanceof Error?T.message:"Lỗi tải hồ sơ"})}s(++c)}},g=Math.min(e.parallelDownloads,t.length);return await Promise.all(Array.from({length:g},()=>p())),{files:n.filter(y=>y!==null),errors:a,outOfMemory:u}}async handleAdmissionCheck(t){var s;const e=this.addLoadingMessage(`Đang tải hồ sơ XML 130 của số vào viện <b>${this.escape(t)}</b> từ HIS...`);this.abortController=new AbortController;const i=this.abortController.signal;this.setBusy(!0);try{const n=await this.xmlDownloader.downloadXml130(t,i);if(n===null){this.setMessageHtml(e,"Chưa cấu hình kết nối HIS nên tôi không tự tải được hồ sơ theo số vào viện.<br/>Bạn hãy xuất file <b>XML 130</b> từ HIS rồi đính kèm (nút 📎) hoặc kéo-thả vào đây để kiểm tra.");return}this.setMessageHtml(e,'<span class="chat-spinner"></span><span class="chat-loading-text">Đã tải xong, đang kiểm tra khả năng xuất toán...</span>');const a=new Blob([n],{type:"text/xml"}),l=await this.apiClient.validateXml130(a,`xml130_${t}.xml`,i);e.classList.add("chat-msg-wide"),this.setMessageHtml(e,this.renderer.renderValidationResult(l)),this.attachDownload(e,l,this.patientSubject(t,l),`xml130_${t}.xml`),(s=this.robot)==null||s.notifyResult(this.resultFor(l.xuatToanRisk===!0,l.found===!1||l.hosoCount===0))}catch(n){this.setMessageHtml(e,this.renderEndOrError(n))}finally{this.setBusy(!1)}}async handleQuestion(t){const e=this.addLoadingMessage("Đang tìm câu trả lời...");this.abortController=new AbortController,this.setBusy(!0);try{const i=await this.apiClient.ask(t,this.abortController.signal);this.setMessageHtml(e,this.renderer.renderAnswer(i))}catch(i){this.setMessageHtml(e,this.renderEndOrError(i))}finally{this.setBusy(!1)}}addUserMessage(t){this.appendMessage("user",this.escape(t))}addBotHtml(t){return this.appendMessage("bot",t)}appendMessage(t,e){var s;this.collapseWelcomeOnFirstUse();const i=document.createElement("div");return i.className=`chat-msg chat-msg-${t}`,i.innerHTML=e,(s=this.messagesEl)==null||s.appendChild(i),this.scrollToBottom(),i}setMessageHtml(t,e){t.innerHTML=e,this.scrollToBottom()}scrollToBottom(){this.messagesEl&&(this.messagesEl.scrollTop=this.messagesEl.scrollHeight)}resultFor(t,e){return t?"aiError":e?"warning":"success"}renderEndOrError(t){return this.isAbort(t)?'<span class="chat-loading-text">⏹ Đã dừng theo yêu cầu.</span>':this.buildErrorHtml(t)}buildErrorHtml(t){const e=t instanceof Error?t.message:String(t);return`❌ ${this.escape(e)}`}num(t){return t.toLocaleString("vi-VN")}mb(t){return this.num(Math.round(t/1024/1024))}escape(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}getStyles(){return`
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
            /* Thanh nút màn hình Gửi bảo hiểm 4210 (VNPT-HIS) — cùng kiểu thanh bảng kê */
            .chat-guibhxh {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-guibhxh[hidden] { display: none; }
            .chat-guibhxh-btn {
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
            .chat-guibhxh-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-guibhxh-btn:disabled { opacity: 0.55; cursor: default; }
            /* Thanh nút màn hình Gửi DSHS BHXH 4210 (VNPT-HIS) — cùng kiểu thanh bảng kê */
            .chat-kytong {
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
                padding: 8px 10px;
                flex-shrink: 0;
            }
            .chat-kytong[hidden] { display: none; }
            .chat-kytong-btn {
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
            .chat-kytong-btn:hover:not(:disabled) { background: #eff6ff; }
            .chat-kytong-btn:disabled { opacity: 0.55; cursor: default; }



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
        `}};o(gt,"MODE_OPTIONS",[{mode:"hoi",icon:"💬",label:"Hỏi thông tin y tế"},{mode:"svv",icon:"🔢",label:"Kiểm tra số vào viện"}]);let Tt=gt;var d=(r=>(r.Boot="Boot",r.Idle="Idle",r.LongIdle="LongIdle",r.Watching="Watching",r.Hover="Hover",r.Listening="Listening",r.Typing="Typing",r.Thinking="Thinking",r.Explaining="Explaining",r.Happy="Happy",r.Celebrate="Celebrate",r.Sad="Sad",r.Confused="Confused",r.PointError="PointError",r.Sleeping="Sleeping",r.WakeUp="WakeUp",r.Flying="Flying",r.Falling="Falling",r.Landing="Landing",r.Fell="Fell",r.Disabled="Disabled",r))(d||{}),v=(r=>(r.Neutral="Neutral",r.Happy="Happy",r.Curious="Curious",r.Focused="Focused",r.Sleepy="Sleepy",r.Proud="Proud",r.Embarrassed="Embarrassed",r.Sad="Sad",r.Surprised="Surprised",r))(v||{}),x=(r=>(r[r.Idle=0]="Idle",r[r.Mouse=1]="Mouse",r[r.Validation=2]="Validation",r[r.UserClick=3]="UserClick",r[r.Critical=4]="Critical",r))(x||{});const ni="data:image/png;base64,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",E=w.color;function ai(){const{width:r,height:t}=w.size;return`
<svg class="robot-svg" viewBox="0 0 96 108" width="${r}" height="${t}"
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
      <image id="robot-chest-logo" href="${ni}"
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
</svg>`.trim()}class Jt{constructor(t){o(this,"svg");o(this,"float");o(this,"head");o(this,"pupils");o(this,"armLeft");o(this,"armRight");o(this,"mouth");o(this,"antennaTip");o(this,"eyeSets");o(this,"cheeks");o(this,"sweat");o(this,"zzz");o(this,"thumb");t.innerHTML=ai();const e=i=>{const s=t.querySelector(`#${i}`);if(!s)throw new Error(`[RobotView] Thiếu phần tử SVG #${i}`);return s};this.svg=t.querySelector("svg"),this.float=e("robot-float"),this.head=e("robot-head"),this.pupils=e("robot-pupils"),this.armLeft=e("robot-arm-l"),this.armRight=e("robot-arm-r"),this.mouth=e("robot-mouth"),this.antennaTip=e("robot-antenna-tip"),this.eyeSets={open:e("robot-eyes-open"),happy:e("robot-eyes-happy"),closed:e("robot-eyes-closed")},this.cheeks=e("robot-cheeks"),this.sweat=e("robot-sweat"),this.zzz=e("robot-zzz"),this.thumb=e("robot-thumb")}setPupilOffset(t,e){const i=w.mouse.pupilMaxShift,s=Math.max(-i,Math.min(i,t)),n=Math.max(-i,Math.min(i,e));this.pupils.style.transform=`translate(${s}px, ${n}px)`}setHeadTilt(t){this.head.style.transform=`rotate(${t}deg)`}setEyeMode(t){Object.keys(this.eyeSets).forEach(e=>{this.eyeSets[e].style.opacity=e===t?"1":"0"})}setMouthPath(t){this.mouth.setAttribute("d",t)}setCheeksVisible(t){this.cheeks.style.opacity=t?"1":"0"}setSweatVisible(t){this.sweat.style.opacity=t?"1":"0"}setZzzVisible(t){this.zzz.style.opacity=t?"1":"0"}setThumbVisible(t){this.thumb.style.opacity=t?"1":"0"}static partOriginCss(){return`
            #robot-head { transform-box: fill-box; transform-origin: 50% 92%; }
            #robot-pupils { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-eyes-open { transform-box: fill-box; transform-origin: 50% 50%; }
            #robot-arm-l { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-arm-r { transform-box: fill-box; transform-origin: 50% 8%; }
            #robot-float { transform-box: fill-box; transform-origin: 50% 100%; }
            #robot-antenna-tip { transform-box: fill-box; transform-origin: 50% 50%; }
        `}get openEyes(){return this.eyeSets.open}get zzzGroup(){return this.zzz}}const X={neutral:"M42 51 Q48 54 54 51",smile:"M41 50 Q48 58 55 50",grin:"M40 49 Q48 60 56 49 Q48 55 40 49",sad:"M42 54 Q48 49 54 54",flat:"M43 52 L53 52",open:"M44 50 Q48 57 52 50 Q48 53 44 50",small:"M45 51 Q48 55 51 51"};class ri{constructor(t){o(this,"current",v.Neutral);this.view=t}get emotion(){return this.current}set(t){this.current=t;const e=this.view;switch(e.setCheeksVisible(!1),e.setSweatVisible(!1),t){case v.Happy:e.setEyeMode("happy"),e.setMouthPath(X.smile);break;case v.Proud:e.setEyeMode("happy"),e.setMouthPath(X.grin),e.setCheeksVisible(!0);break;case v.Curious:e.setEyeMode("open"),e.setMouthPath(X.small);break;case v.Focused:e.setEyeMode("open"),e.setMouthPath(X.flat);break;case v.Sleepy:e.setEyeMode("closed"),e.setMouthPath(X.small);break;case v.Embarrassed:e.setEyeMode("open"),e.setMouthPath(X.flat),e.setCheeksVisible(!0),e.setSweatVisible(!0);break;case v.Sad:e.setEyeMode("open"),e.setMouthPath(X.sad);break;case v.Surprised:e.setEyeMode("open"),e.setMouthPath(X.open);break;case v.Neutral:default:e.setEyeMode("open"),e.setMouthPath(X.neutral);break}}}const Ct="cubic-bezier(0.34, 1.56, 0.64, 1)";function A(r,t,e,i={}){return r.animate(t,{duration:e,easing:"ease-in-out",fill:"none",...i})}const te={breathe:{loop:!0,build:r=>[A(r.float,[{transform:"translateY(0)"},{transform:"translateY(-2px)"},{transform:"translateY(0)"}],3200,{iterations:1/0})]},blink:{build:r=>[A(r.openEyes,[{transform:"scaleY(1)"},{transform:"scaleY(0.08)"},{transform:"scaleY(1)"}],170)]},lookAround:{build:r=>[A(r.pupils,[{transform:"translate(0,0)"},{transform:"translate(-3px,0)"},{transform:"translate(-3px,0)"},{transform:"translate(3px,0)"},{transform:"translate(3px,0)"},{transform:"translate(0,0)"}],2200)]},scratchHead:{build:r=>[A(r.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-120deg)"},{transform:"rotate(-110deg)"},{transform:"rotate(-120deg)"},{transform:"rotate(0deg)"}],1400),A(r.head,[{transform:"rotate(0deg)"},{transform:"rotate(-5deg)"},{transform:"rotate(-4deg)"},{transform:"rotate(-6deg)"},{transform:"rotate(0deg)"}],1400)]},yawn:{build:r=>[A(r.head,[{transform:"rotate(0deg)"},{transform:"rotate(0deg) translateY(-1px)"},{transform:"rotate(0deg)"}],1600),A(r.float,[{transform:"scale(1,1)"},{transform:"scale(1.03,0.98)"},{transform:"scale(1,1)"}],1600)]},wave:{build:r=>[A(r.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-40deg)"},{transform:"rotate(-10deg)"},{transform:"rotate(-40deg)"},{transform:"rotate(0deg)"}],1100,{easing:Ct})]},nod:{build:r=>[A(r.head,[{transform:"rotate(0deg) translateY(0)"},{transform:"rotate(0deg) translateY(3px)"},{transform:"rotate(0deg) translateY(0)"},{transform:"rotate(0deg) translateY(3px)"},{transform:"rotate(0deg) translateY(0)"}],900)]},think:{loop:!0,build:r=>[A(r.head,[{transform:"rotate(-4deg)"},{transform:"rotate(4deg)"},{transform:"rotate(-4deg)"}],2400,{iterations:1/0}),A(r.armRight,[{transform:"rotate(-118deg)"},{transform:"rotate(-124deg)"},{transform:"rotate(-118deg)"}],2400,{iterations:1/0}),A(r.antennaTip,[{opacity:1},{opacity:.4},{opacity:1}],1200,{iterations:1/0})]},tiltCurious:{build:r=>[A(r.head,[{transform:"rotate(0deg)"},{transform:"rotate(12deg)"}],400,{fill:"forwards"})]},thumbsUp:{build:r=>(r.setThumbVisible(!0),[A(r.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-18deg)"},{transform:"rotate(-10deg)"}],600,{fill:"forwards",easing:Ct}),A(r.float,[{transform:"translateY(0)"},{transform:"translateY(-5px)"},{transform:"translateY(0)"}],600)])},celebrate:{build:r=>[A(r.float,[{transform:"translateY(0)"},{transform:"translateY(-16px)"},{transform:"translateY(0)"},{transform:"translateY(-12px)"},{transform:"translateY(0)"}],1200,{easing:Ct}),A(r.armLeft,[{transform:"rotate(0deg)"},{transform:"rotate(38deg)"},{transform:"rotate(0deg)"},{transform:"rotate(38deg)"},{transform:"rotate(0deg)"}],1200),A(r.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(-38deg)"},{transform:"rotate(0deg)"},{transform:"rotate(-38deg)"},{transform:"rotate(0deg)"}],1200)]},sad:{build:r=>[A(r.head,[{transform:"rotate(0deg)"},{transform:"rotate(0deg) translateY(3px)"}],500,{fill:"forwards"}),A(r.float,[{transform:"translateY(0)"},{transform:"translateY(3px)"}],500,{fill:"forwards"})]},pointError:{build:r=>[A(r.armRight,[{transform:"rotate(0deg)"},{transform:"rotate(52deg)"},{transform:"rotate(44deg)"},{transform:"rotate(52deg)"},{transform:"rotate(44deg)"}],1400,{fill:"forwards"})]},dizzy:{build:r=>[A(r.head,[{transform:"rotate(-8deg)"},{transform:"rotate(8deg)"},{transform:"rotate(-6deg)"},{transform:"rotate(6deg)"},{transform:"rotate(0deg)"}],900)]},wake:{build:r=>[A(r.head,[{transform:"rotate(-6deg)"},{transform:"rotate(6deg)"},{transform:"rotate(-4deg)"},{transform:"rotate(0deg)"}],700),A(r.openEyes,[{transform:"scaleY(0.1)"},{transform:"scaleY(1)"}],500)]},sleepBob:{loop:!0,build:r=>(r.setZzzVisible(!0),[A(r.float,[{transform:"translateY(0)"},{transform:"translateY(-1.5px)"},{transform:"translateY(0)"}],4200,{iterations:1/0}),A(r.zzzGroup,[{opacity:.3,transform:"translateY(0)"},{opacity:1,transform:"translateY(-4px)"},{opacity:.3,transform:"translateY(0)"}],4200,{iterations:1/0})])}};class oi{constructor(t){o(this,"baseAnims",[]);o(this,"gestureAnims",[]);o(this,"reduceMotion",!1);this.view=t}setReduceMotion(t){this.reduceMotion=t,t&&this.cancelAll()}setBase(t){this.cancelList(this.baseAnims),this.baseAnims=[],!(!t||this.reduceMotion)&&(this.baseAnims=te[t].build(this.view))}playGesture(t){if(this.cancelList(this.gestureAnims),this.gestureAnims=[],this.reduceMotion)return Promise.resolve();const e=te[t].build(this.view);return this.gestureAnims=e,e.length===0?Promise.resolve():Promise.all(e.map(i=>i.finished.catch(()=>{}))).then(()=>{})}cancelGestures(){this.cancelList(this.gestureAnims),this.gestureAnims=[]}cancelAll(){this.cancelList(this.baseAnims),this.cancelList(this.gestureAnims),this.baseAnims=[],this.gestureAnims=[]}cancelList(t){for(const e of t)try{e.cancel()}catch{}}}const li={[d.Boot]:x.UserClick,[d.Idle]:x.Idle,[d.LongIdle]:x.Idle,[d.Watching]:x.Idle,[d.Hover]:x.Idle,[d.Sleeping]:x.Idle,[d.Listening]:x.Validation,[d.Typing]:x.Validation,[d.Thinking]:x.Validation,[d.Explaining]:x.Validation,[d.Happy]:x.Validation,[d.Celebrate]:x.Validation,[d.Sad]:x.Validation,[d.Confused]:x.Validation,[d.PointError]:x.Validation,[d.WakeUp]:x.UserClick,[d.Landing]:x.UserClick,[d.Flying]:x.Critical,[d.Falling]:x.Critical,[d.Fell]:x.Critical,[d.Disabled]:x.Critical};class ci{constructor(t,e){o(this,"currentState");this.onEnter=e,this.currentState=t}get state(){return this.currentState}is(...t){return t.includes(this.currentState)}dispatch(t,e=x.Idle){return t===this.currentState||e<li[this.currentState]?!1:(this.transition(t),!0)}force(t){t!==this.currentState&&this.transition(t)}transition(t){const e=this.currentState;this.currentState=t,this.onEnter(t,e)}}class hi{constructor(t,e,i){o(this,"applyGaze",!0);o(this,"started",!1);o(this,"hovering",!1);o(this,"offBalanceTimer",null);o(this,"onMove",t=>this.handleMove(t));this.host=t,this.view=e,this.cb=i}start(){this.started||(this.started=!0,window.addEventListener("mousemove",this.onMove,{passive:!0}))}stop(){this.started&&(this.started=!1,window.removeEventListener("mousemove",this.onMove),this.clearOffBalance())}setApplyGaze(t){this.applyGaze=t,t||(this.view.setPupilOffset(0,0),this.view.setHeadTilt(0),this.clearOffBalance())}center(){const t=this.host.getBoundingClientRect();return{x:t.left+t.width/2,y:t.top+t.height*.34}}handleMove(t){this.cb.onActivity();const e=this.center(),i=t.clientX-e.x,s=t.clientY-e.y,a=Math.hypot(i,s)<w.mouse.hoverRadius;if(a!==this.hovering&&(this.hovering=a,this.cb.onHoverChange(a)),!this.applyGaze)return;this.view.setPupilOffset(i/42,s/42);const l=Math.max(-18,Math.min(w.mouse.headMaxDeg,i/12));this.view.setHeadTilt(l),s<-220?this.offBalanceTimer===null&&(this.offBalanceTimer=window.setTimeout(()=>{this.offBalanceTimer=null,this.applyGaze&&this.cb.onOffBalance()},w.mouse.offBalanceMs)):this.clearOffBalance()}clearOffBalance(){this.offBalanceTimer!==null&&(clearTimeout(this.offBalanceTimer),this.offBalanceTimer=null)}}class di{constructor(t){o(this,"current",null);this.host=t}fall(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"rotate(0deg) translateY(0)",easing:"ease-in-out"},{transform:"rotate(-7deg) translateY(0)",offset:.12,easing:"ease-out"},{transform:"rotate(-4deg) translateY(0)",offset:.2,easing:"ease-in"},{transform:"rotate(22deg) translateY(7px)",offset:.44,easing:"cubic-bezier(0.6,0,0.9,0.4)"},{transform:"rotate(19deg) translateY(4px)",offset:.52,easing:"ease-out"},{transform:"rotate(21deg) translateY(6px)",offset:.6,easing:"ease-in-out"},{transform:"rotate(20deg) translateY(6px)",offset:.72,easing:"ease-in-out"},{transform:"rotate(9deg) translateY(2px)",offset:.86,easing:"ease-out"},{transform:"rotate(-3deg) translateY(0)",offset:.94,easing:"ease-in-out"},{transform:"rotate(0deg) translateY(0)",easing:"ease-out"}],1700)}landingSquash(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"scale(1, 1)"},{transform:"scale(1.18, 0.82)",offset:.35},{transform:"scale(0.94, 1.06)",offset:.62},{transform:"scale(1, 1)"}],520)}flyToPopup(){const t=window.innerHeight+160;return this.host.style.transformOrigin="50% 50%",this.animate([{transform:"translateY(0)",opacity:1},{transform:"translateY(12px)",opacity:1,offset:.16},{transform:`translateY(-${t*.5}px)`,opacity:1,offset:.6},{transform:`translateY(-${t}px)`,opacity:0}],1e3,"cubic-bezier(0.5, 0, 0.7, 0.2)")}dropIn(){const t=window.innerHeight+160;return this.host.style.transformOrigin="50% 100%",this.animate([{transform:`translateY(-${t}px)`,opacity:0},{transform:`translateY(-${t*.4}px)`,opacity:1,offset:.3},{transform:"translateY(0)",offset:.66},{transform:"translateY(-16px)",offset:.78},{transform:"translateY(0)",offset:.88},{transform:"translateY(-6px)",offset:.95},{transform:"translateY(0)"}],1150,"cubic-bezier(0.45, 0, 0.9, 0.5)")}leapFrom(t,e){const i=Math.hypot(t,e),s=Math.min(e,0)-Math.max(18,i*.32);return this.host.style.transformOrigin="50% 100%",this.animate([{transform:`translate(${t}px, ${e}px) scale(1, 1)`},{transform:`translate(${t}px, ${e+5}px) scale(1.1, 0.9)`,offset:.14,easing:"ease-out"},{transform:`translate(${t*.55}px, ${s}px) scale(0.92, 1.1)`,offset:.5,easing:"ease-out"},{transform:"translate(0, 0) scale(1, 1)",offset:.76,easing:"cubic-bezier(0.6,0,0.9,0.5)"},{transform:"translate(0, 4px) scale(1.14, 0.86)",offset:.85,easing:"ease-out"},{transform:"translate(0, -3px) scale(0.97, 1.04)",offset:.93,easing:"ease-in-out"},{transform:"translate(0, 0) scale(1, 1)"}],Math.round(620+Math.min(320,i*1.2)))}hop(){return this.host.style.transformOrigin="50% 100%",this.animate([{transform:"translateY(0)"},{transform:"translateY(-18px)",offset:.5},{transform:"translateY(0)"}],500)}reset(){this.cancel(),this.host.style.transform="",this.host.style.opacity=""}cancel(){if(this.current){try{this.current.cancel()}catch{}this.current=null}}animate(t,e,i="ease-in-out"){this.cancel();const s=this.host.animate(t,{duration:e,easing:i,fill:"forwards"});return this.current=s,s.finished.then(()=>{try{s.commitStyles()}catch{}try{s.cancel()}catch{}this.current===s&&(this.current=null)}).catch(()=>{})}}const I=class I{constructor(t,e){o(this,"observer",null);o(this,"settleTimer",null);o(this,"frame",0);o(this,"lastKey","");o(this,"started",!1);o(this,"onDomChange",t=>{this.isOwnChange(t)||this.schedule()});o(this,"onViewportChange",()=>this.schedule());this.homeBox=t,this.onChange=e}start(){this.started||(this.started=!0,this.observer=new MutationObserver(this.onDomChange),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["style","class","hidden","disabled"]}),window.addEventListener("resize",this.onViewportChange,{passive:!0}),window.addEventListener("scroll",this.onViewportChange,{passive:!0,capture:!0}),this.schedule())}stop(){var t;this.started&&(this.started=!1,(t=this.observer)==null||t.disconnect(),this.observer=null,window.removeEventListener("resize",this.onViewportChange),window.removeEventListener("scroll",this.onViewportChange,!0),this.clearPending())}refresh(){this.schedule()}schedule(){this.started&&(this.settleTimer!==null&&clearTimeout(this.settleTimer),this.settleTimer=window.setTimeout(()=>{this.settleTimer=null,cancelAnimationFrame(this.frame),this.frame=requestAnimationFrame(()=>this.scan())},w.obstacle.settleMs))}clearPending(){this.settleTimer!==null&&(clearTimeout(this.settleTimer),this.settleTimer=null),cancelAnimationFrame(this.frame),this.frame=0}scan(){if(!this.started)return;const t=this.findObstacle(this.homeBox()),e=(t==null?void 0:t.key)??"";e!==this.lastKey&&(this.lastKey=e,this.onChange(t))}findObstacle(t){const e=w.obstacle,i=window.innerHeight-e.bandHeight;let s=null;for(const n of I.samplePoints(t)){const a=this.topElementAt(n.x,n.y);if(a)for(const l of I.buttonsAt(a,e.selector)){const c=l.getBoundingClientRect();c.width<e.minSize||c.height<e.minSize||c.height>e.bandHeight||c.top<i||I.overlaps(c,t)&&(!l.matches(e.selector)&&!I.isPinned(l)||(s===null||c.top<s.top)&&(s=I.describe(l,c)))}}return s}static buttonsAt(t,e){const i=I.clickableAncestor(t,e);return i?[i]:t===document.body||t===document.documentElement?[]:Array.from(t.querySelectorAll(e)).slice(0,w.obstacle.maxCandidates)}static clickableAncestor(t,e){let i=t,s=null;for(let n=0;i!==null&&n<w.obstacle.maxClimb&&!(i===document.body||i===document.documentElement);n++){if(I.isClickable(i,e))s=i;else if(s!==null)break;i=i.parentElement}return s}static isPinned(t){let e=t;for(let i=0;e!==null&&i<w.obstacle.maxClimb;i++){const s=window.getComputedStyle(e).position;if(s==="fixed"||s==="sticky")return!0;e=e.parentElement}return!1}static isClickable(t,e){if(t.matches(e)||t.hasAttribute("onclick"))return!0;const i=typeof t.className=="string"?t.className:"";return w.obstacle.clickableName.test(`${t.id} ${i}`)?!0:window.getComputedStyle(t).cursor==="pointer"}topElementAt(t,e){if(t<0||e<0||t>=window.innerWidth||e>=window.innerHeight)return null;for(const i of document.elementsFromPoint(t,e))if(!i.closest(zt))return i;return null}static samplePoints(t){const e=[t.left+4,t.left+t.width/2,t.left+t.width-4],i=[t.top+t.height-6,t.top+t.height*.78,t.top+t.height*.55];return e.flatMap(s=>i.map(n=>({x:s,y:n})))}static overlaps(t,e){return t.left<e.left+e.width&&t.right>e.left&&t.top<e.top+e.height&&t.bottom>e.top}static describe(t,e){const s=([t.textContent,t.getAttribute("title"),t.getAttribute("aria-label")].find(l=>(l??"").trim()!=="")??"").replace(/\s+/g," ").trim().slice(0,40),n=l=>Math.round(l/4)*4,a=I.identify(t);return{left:e.left,top:e.top,width:e.width,height:e.height,label:s,id:a,key:`${a}|${n(e.left)},${n(e.top)},${n(e.width)},${n(e.height)}`}}static identify(t){const e=I.ids.get(t);if(e!==void 0)return e;const i=`${t.tagName}#${I.idSeed+=1}`;return I.ids.set(t,i),i}isOwnChange(t){return t.every(e=>{const i=e.target,s=i instanceof Element?i:i.parentElement;return(s==null?void 0:s.closest(zt))!=null})}};o(I,"ids",new WeakMap),o(I,"idSeed",0);let Mt=I;class ui{constructor(t,e){o(this,"spot");o(this,"footInset",0);this.host=t,this.layout=e,this.spot={mode:"home",right:e.home.right,bottom:e.home.bottom}}get current(){return this.spot}setFootInset(t){this.footInset=Math.max(0,Math.round(t))}homeBox(){const{home:t,size:e}=this.layout,i=Math.max(1,e.height-this.footInset);return{left:window.innerWidth-t.right-e.width,top:window.innerHeight-t.bottom-e.height,width:e.width,height:i}}plan(t){const{home:e,size:i}=this.layout;if(!t)return{mode:"home",right:e.right,bottom:e.bottom};const s=w.obstacle,n=Math.round(window.innerHeight-t.top-this.footInset),a=n-e.bottom,l=this.homeBox(),c=Math.min(t.left+t.width,l.left+l.width)-Math.max(t.left,l.left);if(a>=s.minStandRise&&a<=s.maxStandRise&&t.height>=s.minStandThickness&&c>=i.width*s.minFootShare&&n+i.height<=window.innerHeight-s.edgeGap)return{mode:"stand",right:e.right,bottom:n};const u=Math.round(window.innerWidth-t.left+s.dodgeGap);if(u+i.width<=window.innerWidth-s.edgeGap)return{mode:"dodge",right:u,bottom:e.bottom};const p=window.innerHeight-i.height-s.edgeGap;return{mode:"lift",right:e.right,bottom:Math.max(e.bottom,Math.min(n,p))}}apply(t){this.spot=t,this.host.style.right=`${t.right}px`,this.host.style.bottom=`${t.bottom}px`}}class St{constructor(t,e){o(this,"parking");o(this,"watcher");o(this,"enabled",!0);o(this,"moving",!1);o(this,"queued",null);o(this,"bumpedId",null);this.options=e,this.parking=new ui(t,e),this.watcher=new Mt(()=>this.parking.homeBox(),i=>this.onObstacle(i))}start(){this.watcher.start()}setFootInset(t){this.parking.setFootInset(t),this.watcher.refresh()}setEnabled(t){this.enabled=t,t&&this.watcher.refresh()}destroy(){this.watcher.stop()}onObstacle(t){const e=this.parking.plan(t),i=t!==null&&t.id!==this.bumpedId;this.bumpedId=(t==null?void 0:t.id)??null,this.moveTo(e,i&&e.mode!=="home"&&this.parking.current.mode==="home")}async moveTo(t,e){var a,l,c,h,u,p;const i=this.parking.current,s=t.right-i.right,n=t.bottom-i.bottom;if(!(s===0&&n===0)){if(!this.enabled){this.parking.apply(t);return}if(this.moving){this.queued=t;return}this.moving=!0;try{const g=!St.reduceMotion();e&&g&&((l=(a=this.options).onReact)==null||l.call(a,"bump"),await this.options.mover.fall()),this.parking.apply(t);const y=Math.abs(s)<w.obstacle.smallStep&&Math.abs(n)<w.obstacle.smallStep;g&&!y&&((h=(c=this.options).onReact)==null||h.call(c,t.mode==="home"?"home":"stand"),await this.options.mover.leapFrom(s,n)),(p=(u=this.options).onReact)==null||p.call(u,"settled")}finally{this.moving=!1;const g=this.queued;this.queued=null,g&&this.moveTo(g,!1)}}}static reduceMotion(){var t;try{return((t=window.matchMedia)==null?void 0:t.call(window,"(prefers-reduced-motion: reduce)").matches)===!0}catch{return!1}}}class Lt{constructor(t){o(this,"enabled",!0);this.onChange=t}init(){var e,i,s,n;const t=w.storageKey.enabled;try{(i=(e=chrome.storage)==null?void 0:e.local)==null||i.get({[t]:!0},a=>{this.enabled=a[t]!==!1,this.onChange(this.enabled)}),(n=(s=chrome.storage)==null?void 0:s.onChanged)==null||n.addListener((a,l)=>{if(l!=="local"||!a[t])return;const c=a[t].newValue!==!1;c!==this.enabled&&(this.enabled=c,this.onChange(c))})}catch(a){console.warn("[Robot][PopupController] Không đọc được cấu hình, mặc định BẬT",a),this.onChange(!0)}}isEnabled(){return this.enabled}setEnabled(t){var e,i;this.enabled=t;try{(i=(e=chrome.storage)==null?void 0:e.local)==null||i.set({[w.storageKey.enabled]:t})}catch(s){console.warn("[Robot][PopupController] Không ghi được cấu hình",s)}}}const ee=[w.color.vnptBlue,w.color.vnptBlueLight,w.color.happy,w.color.think,"#FF6B8B"];function gi(r,t=16){const e=w.size.width/2;for(let i=0;i<t;i++){const s=document.createElement("span"),n=ee[i%ee.length],a=5+i%3*2;s.style.cssText=`
            position:absolute; left:${e}px; top:8px; width:${a}px; height:${a*1.4}px;
            background:${n}; border-radius:1px; pointer-events:none; z-index:5; opacity:0;`,r.appendChild(s);const l=(i/t-.5)*140+(i%2?8:-8),c=60+i%4*26,h=(i%2?1:-1)*(180+i%3*120);s.animate([{transform:"translate(0,0) rotate(0deg)",opacity:1,offset:0},{transform:`translate(${l*.5}px, -18px) rotate(${h*.3}deg)`,opacity:1,offset:.25},{transform:`translate(${l}px, ${c}px) rotate(${h}deg)`,opacity:0,offset:1}],{duration:1100+i%5*120,easing:"cubic-bezier(0.2, 0.6, 0.4, 1)",fill:"forwards"}).finished.then(()=>s.remove()).catch(()=>s.remove())}}const It={petals:{glyphs:["🌸","🌷","🌼"],size:[10,14],fallMs:[2600,4200],sway:22,spin:!0,opacity:.95,perTick:2},leaves:{glyphs:["🍂","🍁"],size:[12,16],fallMs:[2400,3800],sway:28,spin:!0,opacity:.95,perTick:2},snow:{glyphs:["❄️","❅","·"],size:[8,13],fallMs:[3e3,5200],sway:16,spin:!1,opacity:.9,perTick:3},sun:{glyphs:["✨","☀️"],size:[9,13],fallMs:[2200,3400],sway:12,spin:!1,opacity:.85,perTick:1}},ie="season-particle";function pi(r){return r in It}function fi(r){var t;return((t=It[r])==null?void 0:t.perTick)??0}function mi(r,t,e){const i=It[t];if(!i)return;const{width:s,height:n}=w.size,a=e??i.perTick;for(let l=0;l<a;l++){const c=document.createElement("span");c.className=ie,c.textContent=i.glyphs[Math.floor(Math.random()*i.glyphs.length)];const h=i.size[0]+Math.random()*(i.size[1]-i.size[0]),u=Math.random()*(s+20)-10;c.style.cssText=`position:absolute; left:${u}px; top:-16px; font-size:${h}px;
            line-height:1; pointer-events:none; z-index:4; opacity:0; will-change:transform,opacity;`,r.appendChild(c);const p=(Math.random()<.5?-1:1)*i.sway,g=i.spin?(Math.random()<.5?-1:1)*(120+Math.random()*240):0,y=i.fallMs[0]+Math.random()*(i.fallMs[1]-i.fallMs[0]);c.animate([{transform:"translate(0,0) rotate(0deg)",opacity:0,offset:0},{transform:`translate(${p*.5}px, ${n*.45}px) rotate(${g*.5}deg)`,opacity:i.opacity,offset:.5},{transform:`translate(${p}px, ${n+20}px) rotate(${g}deg)`,opacity:0,offset:1}],{duration:y,easing:"ease-in",fill:"forwards"}).finished.then(()=>c.remove()).catch(()=>c.remove())}}function bi(r){r.querySelectorAll(`.${ie}`).forEach(t=>t.remove())}const N={schedule:{wakeUp:6*60,napStart:11*60,napEnd:14*60,sleepStart:17*60,sleepEnd:6*60,dailyJitterMinutes:60},waitEscalation:[{atMs:0,id:"think",label:"suy nghĩ"},{atMs:3e3,id:"sit",label:"ngồi xuống"},{atMs:1e4,id:"magnifier",label:"lấy kính lúp"},{atMs:2e4,id:"tea",label:"uống trà"},{atMs:4e4,id:"read",label:"đọc sách"},{atMs:6e4,id:"meditate",label:"ngồi thiền"},{atMs:12e4,id:"fishing",label:"câu cá"},{atMs:3e5,id:"camp",label:"dựng lều"},{atMs:6e5,id:"campfire",label:"đốt lửa"},{atMs:12e5,id:"buildHouse",label:"dựng nhà"},{atMs:18e5,id:"aged",label:"già đi"}],seasons:[{atMs:0,id:"spring",label:"Mùa xuân",effects:["petals","butterfly"]},{atMs:45e3,id:"summer",label:"Mùa hè",effects:["sun","cicada"]},{atMs:9e4,id:"autumn",label:"Mùa thu",effects:["leaves","wind"]},{atMs:135e3,id:"winter",label:"Mùa đông",effects:["snow","coat"]}],aging:[{atMs:1e4,id:"dust",label:"bám bụi"},{atMs:3e4,id:"dustMore",label:"bụi nhiều hơn"},{atMs:45e3,id:"rust",label:"rỉ sét"},{atMs:6e4,id:"loose",label:"ốc vít lỏng"},{atMs:9e4,id:"grayHair",label:"đầu bạc"},{atMs:12e4,id:"cane",label:"chống gậy"},{atMs:15e4,id:"slow",label:"đi rất chậm"},{atMs:18e4,id:"elder",label:"thành ông lão"}],waitRandom:{minMs:4e3,maxMs:12e3,avoidImmediateRepeat:!0}};var S=(r=>(r.Working="working",r.Napping="napping",r.Sleeping="sleeping",r))(S||{});class yi{constructor(t=N.schedule){this.cfg=t}phaseAt(t){const e=t.getHours()*60+t.getMinutes(),i=this.dailyJitter(t),s=this.cfg.sleepStart+i;return e>=this.cfg.napStart&&e<this.cfg.napEnd?S.Napping:e>=s||e<this.cfg.wakeUp?S.Sleeping:S.Working}dailyJitter(t){const e=t.getFullYear()*366+this.dayOfYear(t),i=Math.sin(e*12.9898)*43758.5453,s=i-Math.floor(i),n=this.cfg.dailyJitterMinutes;return Math.round((s*2-1)*n)}dayOfYear(t){const e=new Date(t.getFullYear(),0,0),i=t.getTime()-e.getTime();return Math.floor(i/864e5)}}class xi{constructor(){o(this,"items",new Map)}register(t){return this.items.has(t.id)&&console.warn(`[ActivityRegistry] Trùng id "${t.id}", ghi đè bản cũ.`),this.items.set(t.id,t),this}registerAll(t){for(const e of t)this.register(e);return this}get(t){return this.items.get(t)}all(){return[...this.items.values()]}candidates(t){return this.all().filter(e=>!e.phases||e.phases.includes(t))}}class se{constructor(t=Math.random){this.rng=t}pickWeighted(t,e){const i=e&&t.length>1?t.filter(a=>a.id!==e):t,s=i.reduce((a,l)=>a+Math.max(0,l.weight),0);if(i.length===0||s<=0)return null;let n=this.rng()*s;for(const a of i)if(n-=Math.max(0,a.weight),n<=0)return a;return i[i.length-1]}pick(t,e){const i=e&&t.length>1?t.filter(s=>s.id!==e):t;return i.length===0?null:i[Math.min(i.length-1,Math.floor(this.rng()*i.length))]}intBetween(t,e){return Math.floor(t+this.rng()*(e-t+1))}}class wi{constructor(t,e){o(this,"lastId");this.registry=t,this.random=e}next(t){const e=this.registry.candidates(t),i=this.lastId,s=this.random.pickWeighted(e,i);if(!s)return null;this.lastId=s.id;const n=this.random.intBetween(s.minMs,s.maxMs);return{activity:s,durationMs:n}}reset(){this.lastId=void 0}}class Rt{constructor(t){o(this,"stages");this.stages=[...t].sort((e,i)=>e.atMs-i.atMs)}at(t){let e=null;for(const i of this.stages)if(t>=i.atMs)e=i;else break;return e}crossed(t,e){const i=this.at(t),s=this.at(e);return s&&s.id!==(i==null?void 0:i.id)?s:null}all(){return this.stages}}class vi{constructor(t,e,i,s,n){o(this,"points",[]);o(this,"coveredMs",0);this.stages=t,this.rng=e,this.minMs=i,this.maxMs=s,this.avoidRepeat=n}at(t){this.ensureCovered(t);let e=null;for(const i of this.points)if(t>=i.atMs)e=i.stage;else break;return e}crossed(t,e){const i=this.at(t),s=this.at(e);return s&&s.id!==(i==null?void 0:i.id)?s:null}reset(){this.points.length=0,this.coveredMs=0}ensureCovered(t){var e;if(this.stages.length!==0){if(this.points.length===0){const i=this.rng.pick(this.stages);if(!i)return;this.points.push({atMs:0,stage:i})}for(;this.coveredMs<=t;){const i=Math.max(1,this.rng.intBetween(this.minMs,this.maxMs));this.coveredMs+=i;const s=(e=this.points[this.points.length-1])==null?void 0:e.stage.id,n=this.rng.pick(this.stages,this.avoidRepeat?s:void 0);if(!n)break;this.points.push({atMs:this.coveredMs,stage:n})}}}}class ki{constructor(t=N.waitEscalation,e){o(this,"timeline");o(this,"sequencer");this.timeline=new Rt(t),this.sequencer=e!=null&&e.random?new vi(t,e.rng??new se,N.waitRandom.minMs,N.waitRandom.maxMs,N.waitRandom.avoidImmediateRepeat):null}stageAt(t){return this.sequencer?this.sequencer.at(t):this.timeline.at(t)}stageCrossed(t,e){return this.sequencer?this.sequencer.crossed(t,e):this.timeline.crossed(t,e)}reset(){var t;(t=this.sequencer)==null||t.reset()}}class Ei{constructor(t=N.seasons){o(this,"timeline");this.timeline=new Rt(t)}seasonAt(t){return this.timeline.at(t)}seasonCrossed(t,e){return this.timeline.crossed(t,e)}}class Ai{constructor(t=N.aging){o(this,"timeline");this.timeline=new Rt(t)}stageAt(t){return this.timeline.at(t)}stageCrossed(t,e){return this.timeline.crossed(t,e)}}const Ti=[{id:"sleep",label:"ngủ",category:"rest",weight:5,minMs:15e3,maxMs:4e4,isPrivate:!0,phases:[S.Sleeping,S.Napping]},{id:"meditate",label:"ngồi thiền",category:"rest",weight:2,minMs:1e4,maxMs:2e4},{id:"stargaze",label:"ngắm sao",category:"rest",weight:1,minMs:1e4,maxMs:18e3,phases:[S.Sleeping]},{id:"readBook",label:"đọc sách",category:"hobby",weight:4,minMs:12e3,maxMs:24e3,phases:[S.Working]},{id:"drinkCoffee",label:"uống cà phê",category:"hobby",weight:3,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"drinkTea",label:"uống trà",category:"hobby",weight:3,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"playRubik",label:"chơi Rubik",category:"hobby",weight:2,minMs:1e4,maxMs:2e4,phases:[S.Working]},{id:"playGame",label:"chơi game",category:"hobby",weight:2,minMs:12e3,maxMs:22e3,phases:[S.Working]},{id:"listenMusic",label:"nghe nhạc",category:"hobby",weight:3,minMs:1e4,maxMs:2e4},{id:"writeDiary",label:"viết nhật ký",category:"hobby",weight:1,minMs:1e4,maxMs:16e3,phases:[S.Sleeping]},{id:"shower",label:"tắm",category:"chore",weight:1,minMs:8e3,maxMs:14e3,isPrivate:!0},{id:"brushTeeth",label:"đánh răng",category:"chore",weight:2,minMs:6e3,maxMs:1e4},{id:"wateringPlant",label:"tưới cây",category:"chore",weight:2,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"gym",label:"tập gym",category:"exercise",weight:2,minMs:1e4,maxMs:18e3,phases:[S.Working]},{id:"pushUp",label:"chống đẩy",category:"exercise",weight:2,minMs:8e3,maxMs:14e3,phases:[S.Working]},{id:"martialArts",label:"tập võ",category:"exercise",weight:1,minMs:1e4,maxMs:16e3,phases:[S.Working]},{id:"chargeBattery",label:"sạc pin",category:"work",weight:3,minMs:12e3,maxMs:22e3},{id:"oiling",label:"tra dầu",category:"work",weight:2,minMs:8e3,maxMs:14e3},{id:"selfRepair",label:"sửa chính mình",category:"work",weight:1,minMs:1e4,maxMs:18e3},{id:"learnCoding",label:"học lập trình",category:"work",weight:2,minMs:12e3,maxMs:22e3,phases:[S.Working]}];class Bt{constructor(t){o(this,"scheduler");o(this,"idle");o(this,"wait");o(this,"season");o(this,"aging");var s,n,a,l;const e=(t==null?void 0:t.registry)??new xi().registerAll(Ti),i=(t==null?void 0:t.random)??new se;this.scheduler=(t==null?void 0:t.scheduler)??new yi,this.idle=new wi(e,i),this.wait=new ki((s=t==null?void 0:t.thresholds)==null?void 0:s.waitEscalation,{random:((n=t==null?void 0:t.thresholds)==null?void 0:n.waitEscalationRandom)===!0}),this.season=new Ei((a=t==null?void 0:t.thresholds)==null?void 0:a.seasons),this.aging=new Ai((l=t==null?void 0:t.thresholds)==null?void 0:l.aging)}currentPhase(t){return this.scheduler.phaseAt(t)}nextActivity(t){return this.idle.next(this.scheduler.phaseAt(t))}waitSnapshot(t){return{stage:this.wait.stageAt(t),season:this.season.seasonAt(t),aging:this.aging.stageAt(t)}}waitCrossings(t,e){return{stage:this.wait.stageCrossed(t,e),season:this.season.seasonCrossed(t,e),aging:this.aging.stageCrossed(t,e)}}resetActivity(){this.idle.reset()}resetWait(){this.wait.reset()}}const Ci={dust:"grayscale(0.15)",dustMore:"grayscale(0.3)",rust:"grayscale(0.4) sepia(0.25)",loose:"grayscale(0.5) sepia(0.3)",grayHair:"grayscale(0.65) sepia(0.3)",cane:"grayscale(0.75) sepia(0.35)",slow:"grayscale(0.85) sepia(0.4)",elder:"grayscale(1) sepia(0.5) opacity(0.9)"},ne=["lookAround","scratchHead","wave","nod","tiltCurious","yawn"],Mi={spring:"",summer:"saturate(1.2) brightness(1.05)",autumn:"sepia(0.35)",winter:"brightness(1.08) saturate(0.85)"};class Si{constructor(t={}){o(this,"host");o(this,"stage");o(this,"view");o(this,"emotion");o(this,"anim");o(this,"sm");o(this,"tracker");o(this,"physics");o(this,"avoidance");o(this,"popup");o(this,"life");o(this,"activateCb",null);o(this,"booted",!1);o(this,"seq",0);o(this,"idleGestureTimer",null);o(this,"idleToLongTimer",null);o(this,"longToSleepTimer",null);o(this,"autoReturnTimer",null);o(this,"typingTimer",null);o(this,"waitTimer",null);o(this,"waitStart",0);o(this,"waitPrev",0);o(this,"waitRandom");o(this,"reduceMotion",!1);var n;this.options=t,this.life=new Bt({thresholds:t.thresholds}),this.waitRandom=((n=t.thresholds)==null?void 0:n.waitEscalationRandom)===!0,this.host=document.createElement("div"),this.host.id=lt.robotSvg,this.host.style.cssText=`position:fixed; right:${w.home.right}px; bottom:${w.home.bottom}px;
            width:${w.size.width}px; height:${w.size.height}px; z-index:2147483647;
            cursor:pointer; overflow:visible; user-select:none;`;const e=this.host.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=this.getStyles();const s=document.createElement("div");s.className="robot-stage",e.append(i,s),this.stage=s,this.view=new Jt(s),this.emotion=new ri(this.view),this.anim=new oi(this.view),this.physics=new di(this.host),this.sm=new ci(d.Boot,(a,l)=>this.onEnter(a,l)),this.tracker=new hi(this.host,this.view,{onActivity:()=>this.onActivity(),onHoverChange:a=>this.onHoverChange(a),onOffBalance:()=>this.sm.dispatch(d.Fell,x.Mouse)}),this.popup=new Lt(a=>this.onEnabledChange(a)),this.avoidance=new St(this.host,{home:w.home,size:w.size,mover:this.physics,onReact:a=>this.onAvoidanceReact(a)}),this.host.addEventListener("click",()=>this.onClick()),this.host.title="ZeroCheck AI",document.body.appendChild(this.host),this.applyReduceMotion(),this.tracker.start(),this.avoidance.start(),this.popup.init()}onActivate(t){this.activateCb=t}notifyChatOpened(){this.sm.dispatch(d.Listening,x.UserClick)}notifyChatClosed(){this.sm.is(d.Flying,d.Falling,d.Disabled,d.Landing)||this.sm.dispatch(d.Idle,x.UserClick)}notifyTyping(){this.sm.dispatch(d.Typing,x.UserClick),this.typingTimer!==null&&clearTimeout(this.typingTimer),this.typingTimer=window.setTimeout(()=>{this.sm.is(d.Typing)&&this.sm.dispatch(d.Listening,x.UserClick)},1600)}notifyThinking(t){t?this.sm.dispatch(d.Thinking,x.UserClick):this.sm.is(d.Thinking)&&this.sm.dispatch(d.Listening,x.UserClick)}notifyResult(t){const e={success:d.Happy,allValid:d.Celebrate,warning:d.Confused,localError:d.PointError,aiError:d.Sad};this.sm.dispatch(e[t],x.Validation)}destroy(){this.clearAllTimers(),this.tracker.stop(),this.avoidance.destroy(),this.anim.cancelAll(),this.physics.cancel(),this.host.remove()}onClick(){var t;this.sm.is(d.Disabled)||((t=this.activateCb)==null||t.call(this),this.sm.is(d.Sleeping,d.LongIdle)&&this.onActivity())}onActivity(){this.sm.is(d.Sleeping)?this.sm.dispatch(d.WakeUp,x.Mouse):this.sm.is(d.LongIdle)?this.sm.dispatch(d.Idle,x.Mouse):this.sm.is(d.Idle)&&this.armIdleTimers()}onHoverChange(t){t?this.sm.dispatch(d.Hover,x.Mouse):this.sm.is(d.Hover)&&this.sm.dispatch(d.Idle,x.Mouse)}onEnabledChange(t){if(!this.booted){this.booted=!0,t?this.sm.force(d.Idle):this.sm.force(d.Disabled);return}this.sm.force(t?d.Falling:d.Flying)}onEnter(t,e){const i=++this.seq;switch(this.anim.cancelGestures(),this.clearAutoReturn(),this.clearIdleTimers(),this.stopWaitEscalation(),t){case d.Idle:this.enterIdle();break;case d.LongIdle:this.tracker.setApplyGaze(!0),this.emotion.set(v.Sleepy),this.anim.setBase("breathe"),this.host.style.transform="translateY(6px)",this.longToSleepTimer=window.setTimeout(()=>this.sm.dispatch(d.Sleeping,x.Idle),w.timing.longIdleToSleep);break;case d.Sleeping:this.tracker.setApplyGaze(!1),this.emotion.set(v.Sleepy),this.anim.setBase("sleepBob"),this.host.style.transform="translateY(6px)";break;case d.WakeUp:this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.host.style.transform="",this.anim.setBase("breathe"),this.anim.playGesture("wake").then(()=>this.thenIf(i,()=>this.sm.force(d.Idle)));break;case d.Hover:this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!0),this.emotion.set(v.Happy),this.anim.setBase("breathe"),this.host.style.transform="",this.anim.playGesture("wave");break;case d.Listening:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("nod");break;case d.Typing:this.gazeOffPose(v.Curious),this.anim.setBase("breathe"),this.anim.playGesture("tiltCurious");break;case d.Thinking:this.gazeOffPose(v.Focused),this.anim.setBase("think"),this.startWaitEscalation(i);break;case d.Explaining:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("nod"),this.autoReturn(i,d.Listening,1800);break;case d.Happy:this.gazeOffPose(v.Happy),this.anim.setBase("breathe"),this.anim.playGesture("thumbsUp"),this.autoReturn(i,d.Idle,2200);break;case d.Celebrate:this.gazeOffPose(v.Proud),this.anim.setBase("breathe"),this.anim.playGesture("celebrate"),this.physics.hop(),gi(this.stage),this.autoReturn(i,d.Idle,2600);break;case d.Confused:this.gazeOffPose(v.Embarrassed),this.anim.setBase("breathe"),this.anim.playGesture("scratchHead"),this.autoReturn(i,d.Idle,2600);break;case d.Sad:this.gazeOffPose(v.Sad),this.anim.setBase("breathe"),this.anim.playGesture("sad"),this.host.style.transform="translateY(5px)",this.autoReturn(i,d.Idle,3e3);break;case d.PointError:this.gazeOffPose(v.Sad),this.anim.setBase("breathe"),this.anim.playGesture("pointError"),this.autoReturn(i,d.Idle,3200);break;case d.Flying:this.enterFlying(i);break;case d.Disabled:this.clearAllTimers(),this.avoidance.setEnabled(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Sleepy),this.anim.setBase(null),this.host.style.pointerEvents="none";break;case d.Falling:this.enterFalling(i);break;case d.Landing:this.enterLanding(i);break;case d.Fell:this.enterFell(i);break;case d.Boot:}}gazeOffPose(t){this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.view.setHeadTilt(0),this.view.setPupilOffset(0,0),this.emotion.set(t),this.host.style.transform=""}onAvoidanceReact(t){if(this.sm.is(d.Idle,d.LongIdle,d.Sleeping,d.Hover,d.Watching))switch(t){case"bump":this.emotion.set(v.Surprised);break;case"stand":this.emotion.set(v.Happy);break;case"home":this.emotion.set(v.Happy);break;case"settled":this.emotion.set(this.sm.is(d.LongIdle,d.Sleeping)?v.Sleepy:v.Neutral);break}}enterIdle(){this.view.setZzzVisible(!1),this.view.setThumbVisible(!1),this.host.style.pointerEvents="auto",this.host.style.transform="",this.host.style.opacity="",this.emotion.set(v.Neutral),this.tracker.setApplyGaze(!0),this.avoidance.setEnabled(!0),this.anim.setBase("breathe"),this.armIdleTimers()}enterFlying(t){this.clearAllTimers(),this.avoidance.setEnabled(!1),this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.anim.setBase(null),this.physics.flyToPopup().then(()=>this.thenIf(t,()=>this.sm.force(d.Disabled)))}enterFalling(t){this.clearAllTimers(),this.host.style.pointerEvents="auto",this.view.setZzzVisible(!1),this.tracker.setApplyGaze(!1),this.emotion.set(v.Surprised),this.anim.setBase(null),this.physics.dropIn().then(()=>this.thenIf(t,()=>this.sm.force(d.Landing)))}enterLanding(t){this.emotion.set(v.Embarrassed),this.anim.setBase("breathe"),this.physics.landingSquash().then(()=>this.thenIf(t,()=>{this.emotion.set(v.Happy),this.anim.playGesture("thumbsUp"),window.setTimeout(()=>this.thenIf(t,()=>this.sm.force(d.Idle)),800)}))}enterFell(t){this.tracker.setApplyGaze(!1),this.emotion.set(v.Embarrassed),this.anim.setBase(null),this.physics.fall().then(()=>this.thenIf(t,()=>{this.anim.playGesture("dizzy"),window.setTimeout(()=>this.thenIf(t,()=>this.sm.force(d.Idle)),700)}))}startWaitEscalation(t){this.waitStart=Date.now(),this.waitPrev=0,this.life.resetWait();const e=()=>{if(t!==this.seq)return;const i=Date.now()-this.waitStart,s=this.life.waitCrossings(this.waitPrev,i);s.stage&&this.playWaitStage(s.stage.id);const n=this.life.waitSnapshot(i);this.applyThinkingVisual(n),this.emitSeasonParticles(n),this.waitPrev=i,this.waitTimer=window.setTimeout(e,1e3)};this.waitTimer=window.setTimeout(e,1e3)}stopWaitEscalation(){this.waitTimer!==null&&(clearTimeout(this.waitTimer),this.waitTimer=null),this.stage.style.filter="",bi(this.stage)}emitSeasonParticles(t){if(this.reduceMotion||!t.season)return;const e=t.season.effects.find(i=>pi(i));e&&mi(this.stage,e,fi(e))}playWaitStage(t){if(this.waitRandom){const e=ne[Math.floor(Math.random()*ne.length)];this.anim.playGesture(e);return}t!=="think"&&(this.host.style.transform="translateY(6px)")}applyThinkingVisual(t){const e=[];t.aging&&e.push(Ci[t.aging.id]??""),t.season&&e.push(Mi[t.season.id]??""),this.stage.style.filter=e.filter(Boolean).join(" ")}armIdleTimers(){this.clearIdleTimers(),this.scheduleIdleGesture(),this.idleToLongTimer=window.setTimeout(()=>this.sm.dispatch(d.LongIdle,x.Idle),w.timing.idleToLongIdle)}scheduleIdleGesture(){const{idleGestureMin:t,idleGestureMax:e}=w.timing,i=this.options.lively?.5:1,s=(t+Math.random()*(e-t))*i;this.idleGestureTimer=window.setTimeout(()=>{if(this.sm.is(d.Idle)){const n=this.options.lively?["blink","lookAround","scratchHead","yawn","wave","nod"]:["blink","blink","lookAround","scratchHead","yawn"],a=n[Math.floor(Math.random()*n.length)];this.anim.playGesture(a)}this.scheduleIdleGesture()},s)}autoReturn(t,e,i){this.autoReturnTimer=window.setTimeout(()=>this.thenIf(t,()=>this.sm.dispatch(e,x.Validation)),i)}thenIf(t,e){t===this.seq&&e()}clearIdleTimers(){this.clearTimer("idleGestureTimer"),this.clearTimer("idleToLongTimer"),this.clearTimer("longToSleepTimer")}clearAutoReturn(){this.clearTimer("autoReturnTimer")}clearAllTimers(){this.clearIdleTimers(),this.clearAutoReturn(),this.clearTimer("typingTimer"),this.stopWaitEscalation()}clearTimer(t){const e=this[t];e!==null&&(clearTimeout(e),this[t]=null)}applyReduceMotion(){var t,e,i;try{const s=(t=window.matchMedia)==null?void 0:t.call(window,"(prefers-reduced-motion: reduce)");let n=(s==null?void 0:s.matches)===!0;this.reduceMotion=n,(i=(e=chrome.storage)==null?void 0:e.local)==null||i.get({[w.storageKey.reduceMotion]:!1},a=>{n=n||a[w.storageKey.reduceMotion]===!0,this.reduceMotion=n,this.anim.setReduceMotion(n)})}catch{}}getStyles(){return`
            :host { all: initial; }
            .robot-stage { position: relative; width: 100%; height: 100%; }
            .robot-svg { display: block; overflow: visible; filter: drop-shadow(0 4px 8px rgba(0,60,110,0.20)); }
            /* Gaze mượt: đầu & con ngươi có transition nhẹ; WAAPI vẫn ghi đè khi có gesture. */
            #robot-head { transition: transform 0.18s ease-out; }
            #robot-pupils { transition: transform 0.14s ease-out; }
            ${Jt.partOriginCss()}
        `}}const ae="svg";function Li(r){return r==="svg"||r==="svgAnim"||r==="three"}const Ii="his-robot3d:cmd",re="his-robot3d:activate",oe="his-robot3d:ready",le="his-robot3d:failed";class ce{constructor(t,e,i="demo"){o(this,"activateCb",null);o(this,"fallback",null);o(this,"script",null);o(this,"ready",!1);o(this,"destroyed",!1);o(this,"lastEnabled",!0);o(this,"life",new Bt({thresholds:this.thresholds}));o(this,"waitStart",0);o(this,"lifeTimer",0);o(this,"lastAging",null);o(this,"lastSeason",null);o(this,"popup",new Lt(t=>{this.lastEnabled=t,this.send({type:"enabled",value:t})}));o(this,"onActivateEvt",()=>{var t;return(t=this.activateCb)==null?void 0:t.call(this)});o(this,"onReadyEvt",()=>{this.ready=!0,this.appearance&&this.send({type:"appearance",color:this.appearance.color,scale:this.appearance.scale,showLogo:this.appearance.showLogo,logoDataUrl:this.appearance.logoDataUrl}),this.send({type:"enabled",value:this.lastEnabled})});o(this,"onFailedEvt",()=>this.useFallback());this.thresholds=t,this.appearance=e,this.variant=i,document.addEventListener(re,this.onActivateEvt),document.addEventListener(oe,this.onReadyEvt,{once:!0}),document.addEventListener(le,this.onFailedEvt,{once:!0}),this.inject(),this.popup.init()}inject(){try{const t=chrome.runtime.getURL("robot3d/index.js")+(this.variant==="cute"?"?variant=cute":""),e=document.createElement("script");e.type="module",e.src=t,e.addEventListener("error",()=>this.useFallback()),(document.head||document.documentElement).appendChild(e),this.script=e,window.setTimeout(()=>{!this.ready&&!this.destroyed&&this.useFallback()},4e3)}catch{this.useFallback()}}useFallback(){var t;this.fallback||this.destroyed||((t=this.script)==null||t.remove(),this.script=null,this.fallback=new Si({lively:this.variant==="cute",thresholds:this.thresholds}),this.activateCb&&this.fallback.onActivate(this.activateCb))}send(t){this.fallback||document.dispatchEvent(new CustomEvent(Ii,{detail:t}))}onActivate(t){var e;this.activateCb=t,(e=this.fallback)==null||e.onActivate(t)}notifyChatOpened(){var t;this.send({type:"chatOpened"}),(t=this.fallback)==null||t.notifyChatOpened()}notifyChatClosed(){var t;this.send({type:"chatClosed"}),(t=this.fallback)==null||t.notifyChatClosed()}notifyTyping(){var t;this.send({type:"typing"}),(t=this.fallback)==null||t.notifyTyping()}notifyThinking(t){var e,i;this.send({type:"thinking",active:t,random:((e=this.thresholds)==null?void 0:e.waitEscalationRandom)===!0}),(i=this.fallback)==null||i.notifyThinking(t),t?this.startWaitClock():this.stopWaitClock()}notifyResult(t){var e;this.send({type:"result",result:t}),(e=this.fallback)==null||e.notifyResult(t),this.stopWaitClock()}startWaitClock(){if(this.waitStart)return;this.life.resetWait(),this.waitStart=Date.now(),this.lastAging=null,this.lastSeason=null;const t=()=>{var n,a;if(this.destroyed||!this.waitStart)return;const e=this.life.waitSnapshot(Date.now()-this.waitStart),i=((n=e.aging)==null?void 0:n.id)??null,s=((a=e.season)==null?void 0:a.id)??null;(i!==this.lastAging||s!==this.lastSeason)&&(this.lastAging=i,this.lastSeason=s,this.send({type:"life",aging:i,season:s})),this.lifeTimer=window.setTimeout(t,1e3)};t()}stopWaitClock(){!this.waitStart&&!this.lifeTimer||(window.clearTimeout(this.lifeTimer),this.lifeTimer=0,this.waitStart=0,(this.lastAging!==null||this.lastSeason!==null)&&(this.lastAging=null,this.lastSeason=null,this.send({type:"life",aging:null,season:null})))}destroy(){var t,e;this.destroyed=!0,this.stopWaitClock(),this.send({type:"destroy"}),document.removeEventListener(re,this.onActivateEvt),document.removeEventListener(oe,this.onReadyEvt),document.removeEventListener(le,this.onFailedEvt),(t=this.script)==null||t.remove(),(e=this.fallback)==null||e.destroy()}}class Ri{constructor(){o(this,"providesLauncher",!1)}onActivate(t){}notifyChatOpened(){}notifyChatClosed(){}notifyTyping(){}notifyThinking(t){}notifyResult(t){}destroy(){}}function Bi(r,t,e){switch(r){case"three":return new ce(t,e);case"svgAnim":return new ce(t,e,"cute");case"svg":default:return new Ri}}const $i=/^#[0-9a-fA-F]{6}$/,Hi="/api/extension-config",zi=4e3,ht="extensionConfigCache",Pi=5*60*1e3;function Fi(){return{color:null,scale:100,showLogo:!1,logoDataUrl:null}}function he(){return{robotRenderer:ae,thresholds:{},appearance:Fi()}}async function de(r=new Nt().baseUrl){const{licenseKey:t}=await Kt(),e=await Oi(t);if(e&&Date.now()-e.fetchedAt<Pi)return ot(e.raw);const i=new AbortController,s=setTimeout(()=>i.abort(),zi);try{const n={Accept:"application/json"};t&&(n[Xt]=t),e!=null&&e.etag&&(n["If-None-Match"]=e.etag);const a=await fetch(`${r}${Hi}`,{method:"GET",headers:n,signal:i.signal});if(a.status===304&&e)return await ue({...e,fetchedAt:Date.now()}),ot(e.raw);if(!a.ok)return e?ot(e.raw):he();const l=await a.json();return await ue({licenseKey:t,etag:a.headers.get("ETag")??"",fetchedAt:Date.now(),raw:l}),ot(l)}catch{return e?ot(e.raw):he()}finally{clearTimeout(s)}}function Vi(r){const t=(e,i)=>{if(i!=="local"||!(ct in e))return;const{oldValue:s,newValue:n}=e[ct];s!==n&&Di().then(()=>r==null?void 0:r())};try{chrome.storage.onChanged.addListener(t)}catch{return()=>{}}return()=>{try{chrome.storage.onChanged.removeListener(t)}catch{}}}async function Di(){try{await chrome.storage.local.remove(ht)}catch{}}async function Oi(r){try{const e=(await chrome.storage.local.get({[ht]:null}))[ht];return!e||typeof e!="object"||!e.raw||e.licenseKey!==r||typeof e.fetchedAt!="number"?null:e}catch{return null}}async function ue(r){try{await chrome.storage.local.set({[ht]:r})}catch{}}function ot(r){var i,s,n,a;const t=Li(r.robotRenderer)?r.robotRenderer:ae,e={waitEscalation:$t(N.waitEscalation,(i=r.life)==null?void 0:i.waitEscalation),seasons:$t(N.seasons,(s=r.life)==null?void 0:s.seasons),aging:$t(N.aging,(n=r.life)==null?void 0:n.aging),waitEscalationRandom:((a=r.life)==null?void 0:a.waitEscalationRandom)===!0};return{robotRenderer:t,thresholds:e,appearance:Ni(r.appearance)}}function Ni(r){const t=typeof(r==null?void 0:r.color)=="string"&&$i.test(r.color)?r.color:null,e=typeof(r==null?void 0:r.scale)=="number"&&Number.isFinite(r.scale)?Math.round(r.scale):100,i=Math.min(200,Math.max(40,e||100)),s=(r==null?void 0:r.showLogo)===!0,n=typeof(r==null?void 0:r.logoDataUrl)=="string"&&r.logoDataUrl.startsWith("data:image/")?r.logoDataUrl:null;return{color:t,scale:i,showLogo:s,logoDataUrl:n}}function $t(r,t){if(!t||t.length===0)return r;const e=new Map(t.map(i=>[i.id,i.atMs]));return r.map(i=>e.has(i.id)?{...i,atMs:e.get(i.id)}:i)}console.log("ZeroCheck AI Loaded");async function qi(){console.log("Content script initialization started");const r=new U;console.log("[FieldRegistry] Initialized");const t=new ye;console.log("[FormAnalyzer] Initialized");const e=new ve(t,r);console.log("[ChangeTracker] Initialized");const i=new Re;i.registerRule(new Be),i.registerRule(new $e),i.registerRule(new He),i.registerRule(new ze),console.log("[ValidationEngine] Initialized with",i.getRuleCount(),"rules");const s=new Xe(i);s.registerPageMapping("Diagnosis",["maBenhNhan","ngaySinh","gioiTinh","icdVao","icdRa","icdChuan","chanDoan","tenBacSi"]),s.registerPageMapping("PatientIntake",["maBenhNhan","hoTen","ngaySinh","gioiTinh","danToc","quocGia","soBhyt","cccd","soDienThoai","diaChi"]),s.registerPageMapping("MedicalEncounter",["maBenhNhan","ngayKham","ngayVao","ngayRa","khoa","phong","giuong","trieuChung","chanDoanBan","chanDoanPhu"]),console.log("[ValidationPipeline] Initialized");const n={},a=new Set,l=300,c={gioitinh:["icdVao","icdRa"],cbgioitinh:["icdVao","icdRa"],gender:["icdVao","icdRa"],ngaysinh:["icdVao","icdRa"],dateofbirth:["icdVao","icdRa"]},h=m=>c[m.toLowerCase()]??[];let u=0;const p=3e4,g=new Ce;console.log("[UnifiedAssistantPanel] Initialized");const y=await de();console.log("[ExtensionConfig] robotRenderer =",y.robotRenderer),Ot(document.documentElement,y.appearance.color),Vi(()=>{de().then(m=>{Ot(document.documentElement,m.appearance.color),m.robotRenderer!==y.robotRenderer&&console.log("[ExtensionConfig] Đổi khóa bản quyền: hình hài robot mới áp dụng ở lần tải trang sau.")})});const b=Bi(y.robotRenderer,y.thresholds,y.appearance);b.providesLauncher!==!1?g.useExternalLauncher():new Lt(m=>{g.setLauncherVisible(m),m||g.close()}).init(),b.onActivate(()=>{g.isPanelOpen()?g.close():(g.open("chat"),b.notifyChatOpened())}),g.onClose(()=>b.notifyChatClosed()),console.log("[RobotMascot] Initialized");const T=new pt({openChat:()=>{g.isPanelOpen()?g.open("chat"):(g.open("chat"),b.notifyChatOpened())},clickPlus:()=>g.clickPlusButton(),getRect:m=>g.getUiRect(m),supports:m=>m==="bangke-all"||m==="bangke-one"?it.isSupportedPage():!0});T.showIfFirstRun(),chrome.runtime.onMessage.addListener((m,V,nt)=>{(m==null?void 0:m.type)==="zc-show-onboarding"&&(T.show(),nt({ok:!0}))});const M=new Te(g),f=new Ae(M,m=>{console.log("[NotificationManager] Explain button clicked:",m)});console.log("[NotificationManager] Initialized"),e.onFieldChange(m=>{if(console.log(`[Validation] Field changed: ${m}`),["textIcdVao","textIcdRa","textIcdChuan"].includes(m)){console.log(`[Validation] Skipping search field: ${m}`);return}const V=r.get(m);V&&!V.element.hasAttribute("data-has-focus-listener")&&(V.element.addEventListener("focus",()=>{a.add(m),console.log(`[Focus] Field ${m} focused`)}),V.element.setAttribute("data-has-focus-listener","true")),a.add(m);const nt=[m,...h(m)];n[m]&&clearTimeout(n[m]),n[m]=setTimeout(async()=>{delete n[m];const J=r.refreshValues();J>0&&console.log(`[Validation] Đã đồng bộ ${J} trường với giá trị thật trên form`);for(const G of nt){const ge=G!==m,tt=r.get(G);if(!tt){ge||console.warn(`[Validation] Field ${G} not found in registry`);continue}const pe=tt.value??"";if(ge){if(pe==="")continue;console.log(`[Validation] Re-checking dependent field ${G} (triggered by ${m})`)}else if(!a.has(G)){console.log(`[Validation] Field ${G} not focused, skipping result display`);continue}console.log(`[Validation] Validating field: ${G}, value: "${tt.value}"`);const fe=new Map;r.getAll().forEach(B=>{fe.set(B.id,B.value)});const Ui={currentPage:window.location.href,currentField:tt,currentValue:pe,formValues:fe,fieldRegistry:r,metadata:{}};g.beginChecking();let j;try{j=await s.validateField(Ui)}finally{g.endChecking()}if(console.log(`[Pipeline] Decision: ${j.decision}, Local Passed: ${j.localPassed}, Remote Called: ${j.remoteCalled}`),j.remoteError){const B=Date.now();B-u>p&&(u=B,f.notify({field:tt.element,level:"warning",title:"Mất kết nối máy chủ kiểm tra",message:j.remoteError,suggestion:"Kiểm tra Backend API đang chạy; các cảnh báo hiển thị hiện tại chỉ là kiểm tra cục bộ.",canExplain:!1,metadata:{fieldLabel:tt.label},timestamp:Date.now()}))}const Ht=j.localResults;Ht.length>0?(console.log(`[ValidationResults] ${G}:`,Ht),Ht.forEach(B=>{f.notify({field:B.field.element,level:B.level,title:B.title,message:B.message,suggestion:B.suggestion,canExplain:B.canExplain,metadata:{...B.metadata,fieldLabel:B.field.label},timestamp:Date.now()})})):j.remoteError||(console.log(`[Validation] Field ${G}: PASS`),f.clearFieldError(tt.element))}},l)}),e.onFieldBlur((m,V)=>{console.log(`[Blur] Field ${m} - user left field`),a.delete(m),n[m]&&(clearTimeout(n[m]),delete n[m])}),e.start(document),console.log("[ChangeTracker] Started monitoring for form changes");let k=0;const H=5,L=()=>{k++,console.log(`[Scan] Attempt ${k} - Starting form analysis on page...`);const m=r.size();t.scan(document,r);const V=r.size(),nt=V-m;if(console.log(`[Scan Complete] Found ${V} total field(s) on page (${nt} new)`),nt>0){const J=e.getEventBinder();J&&J.bindAll()}if(V===0&&k<H)console.log("[Scan] No fields found, retrying in 500ms..."),setTimeout(L,500);else if(V===0)console.warn("[Warning] No form fields detected after multiple attempts");else{const J=r.getAll();console.log("[Fields]",J)}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{requestAnimationFrame(L)}):requestAnimationFrame(L);const F=new Tt(g);F.attachRobot(b),console.log("[ChatPanel] Initialized"),g.onTabChange(m=>{m==="chat"&&(F.focusInput(),b.notifyChatOpened())}),window.hisAssistantPanel=g,window.hisChatPanel=F,window.aiValidationNotifier=f,window.validationEngine=i,window.validationPipeline=s,window.fieldRegistry=r,window.hisRobot=b,window.hisRobotLife=new Bt}qi()})();
