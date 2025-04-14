!function(){"use strict";const t="#008080",e="#f8f8f8",n="#333",o="https://api.ipify.org?format=json",r="https://ipapi.co",a="/apps/chatbot-api/agent_conversation",s="/apps/chatbot-api/analytics";let i=[];function c(t=[]){i=t,0===t.length?sessionStorage.removeItem("conversationHistory"):sessionStorage.setItem("conversationHistory",JSON.stringify(i))}function l(){const t=document.createElement("div");return t.className="circular-loader",t.innerHTML='\n    <svg class="circular-loader-svg" viewBox="25 25 50 50">\n      <circle class="loader-path" cx="50" cy="50" r="20" fill="none" stroke-width="3" stroke-miterlimit="10"/>\n    </svg>\n  ',t}function d(t,e,n){document.createElement("div").className="product-slider-container";const o=document.createElement("div");if(o.className="product-slider",t.slice(0,4).forEach((t=>{const r=function(t,e){const n=document.createElement("div");n.className="product-card",n.innerHTML=`\n      <img src="${t.image}" class="product-image">\n      <div class="product-title">${t.title}</div>\n      <div class="product-price">${t.price}</div>\n      <a href="${t.url}" class="view-product-button">View</a>\n      <button class="add-to-cart-button">Add to Cart</button>\n    `;const o=n.querySelector(".add-to-cart-button");return o.style.backgroundColor=e,o.addEventListener("click",(async e=>{e.preventDefault(),o.disabled=!0;const r=l();r.classList.add("button-loader"),o.appendChild(r),o.innerHTML="",o.appendChild(r);try{await new Promise((e=>{n.dispatchEvent(new CustomEvent("addToCart",{detail:t,bubbles:!0,composed:!0})),setTimeout(e,1e3)}))}finally{o.removeChild(r),o.innerHTML="Add to Cart",o.disabled=!1}})),n}(t,e);r.addEventListener("addToCart",(t=>{t.stopPropagation(),n(t.detail)})),o.appendChild(r)})),t.length>0){const t=document.createElement("div");t.className="see-more-container";const n=document.createElement("button");n.className="see-more-button",n.textContent="See More",n.style.backgroundColor=e,n.addEventListener("click",(()=>{window.location.href="/"})),t.appendChild(n),o.appendChild(t)}return o}const u="chatbotSessionData",p="chatbotCartItems";function m(){return window.Shopify?.shop||"default-shop-id"}function h(t){return t?"string"==typeof t&&t.startsWith("gid://shopify/ProductVariant/")?parseInt(t.split("/").pop(),10):parseInt(t,10)||null:null}function y(t,e){return t.length===e.length&&t.every(((t,n)=>t.id===e[n].id&&t.qty===e[n].qty))}async function g(){const t=await fetch("/cart.js",{method:"GET",headers:{"Content-Type":"application/json",Accept:"application/json","X-Requested-With":"XMLHttpRequest"},credentials:"same-origin"});return t.ok?await t.json():(console.error("Failed to get cart",t.status,await t.text()),null)}let f=null,v=null,w=null,b=!1;function S(){v||(v=function(){const t=document.createElement("div");return t.className="cart-drawer",t.innerHTML='\n      <div class="cart-drawer-header">\n        <h3 class="cart-drawer-title">Added to Cart</h3>\n        <button class="cart-drawer-close">×</button>\n      </div>\n      <div class="cart-drawer-content"></div>\n      <button class="checkout-button">Checkout</button>\n    ',t.style.display="none",t}());const t=document.querySelector(".chat-page");t&&t!==w&&(v.parentNode&&v.parentNode.removeChild(v),t.appendChild(v),w=t,v.querySelector(".cart-drawer-close").addEventListener("click",L),v.querySelector(".checkout-button").addEventListener("click",(async t=>{t.preventDefault();const e=t.target,n=e.textContent,o=l();e.innerHTML="",e.appendChild(o),e.disabled=!0;try{const t=I();await T(t)?window.location.href="/cart":alert("Failed to sync cart. Please try again.")}catch(t){console.error("Checkout error:",t),alert("An error occurred during checkout.")}finally{e.removeChild(o),e.textContent=n,e.disabled=!1}})))}function C(){S(),k(I()),q(),function(){document.addEventListener("cart:requestComplete",(t=>_(t))),document.addEventListener("cart:updated",(t=>_(t))),document.addEventListener("cart:change",(t=>_(t)));let t=null,e=0;setInterval((async()=>{try{const n=await g(),o=n?.item_count||0;n?.token===t&&o===e||(t=n?.token,e=o,_({detail:{response:n}}))}catch(t){console.error("Error polling cart:",t)}}),8e3)}()}function E(){S(),v.style.display="block",v.classList.add("open"),v.classList.remove("auto-close"),function(){f&&clearTimeout(f);f=setTimeout(L,5e3)}()}function L(){v&&(v.classList.remove("open"),v.classList.add("auto-close"))}function k(t){S();const e=v.querySelector(".cart-drawer-content");if(e.innerHTML="",0===t.length)return void(e.innerHTML="<p>Your cart is empty</p>");const n=document.createDocumentFragment();t.forEach((t=>{const e=function(t){const e=document.createElement("div");return e.className="cart-item",e.innerHTML=`\n      <img src="${t.image}" alt="${t.title}" class="cart-item-image">\n      <div class="cart-item-details">\n        <h4 class="cart-item-title">${t.title}</h4>\n        <p class="cart-item-price">${t.price}</p>\n        <div class="cart-item-actions">\n          <div class="quantity-selector">\n            <button class="quantity-btn minus">-</button>\n            <input type="text" class="quantity-input" value="${t.quantity}" readonly>\n            <button class="quantity-btn plus">+</button>\n          </div>\n        </div>\n      </div>\n    `,e}(t);!function(t,e){t.querySelector(".minus").addEventListener("click",(()=>{N(e,-1)})),t.querySelector(".plus").addEventListener("click",(()=>{N(e,1)}))}(e,t),n.appendChild(e)})),e.appendChild(n)}function q(){const t=I().reduce(((t,e)=>t+e.quantity),0);document.querySelectorAll(".cart-count").forEach((e=>{e.textContent=t,e.style.display=t>0?"flex":"none"}))}function I(){try{return(JSON.parse(localStorage.getItem(p))||[]).map((t=>{const e=h(t.variant_id);return{...t,variant_id:e,id:e}}))}catch(t){return console.error("Error parsing cart items",t),[]}}async function N(t,e=1){if(!t.variant_id)return void console.error("Cannot add to cart - product missing variant_id",t);const n=h(t.variant_id);if(!n)return void console.error("Invalid variant ID format",t.variant_id);const o=I(),r=o.find((t=>h(t.variant_id)===n));r?(r.quantity+=e,r.quantity<=0&&o.splice(o.indexOf(r),1)):e>0&&o.push({...t,quantity:e,variant_id:n,id:n,properties:t.properties||{chatbot_added:!0}}),await $(o),await T(o),E()}async function T(t){if(b)return!0;b=!0;const e=document.querySelectorAll(".chatbot-cart-icon"),n=[];e.forEach((t=>{const e=l();e.classList.add("cart-icon-loader"),t.appendChild(e),n.push({icon:t,loader:e})}));try{const e=await g(),n=e?.items||[];if(!!y(t.map((t=>({id:t.id,qty:t.quantity}))),n.map((t=>({id:t.id,qty:t.quantity})))))return!0;if(!await async function(){const t=await fetch("/cart/clear.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","X-Requested-With":"XMLHttpRequest"},credentials:"same-origin"});return t.ok?(await t.json(),!0):(console.error("Failed to clear cart",t.status,await t.text()),!1)}())return!1;if(0===t.length)return!0;const o=await async function(t){const e=t.map((t=>({id:h(t.variant_id),quantity:t.quantity,properties:{chatbot_added:!0}}))).filter((t=>t.id));if(0===e.length)return console.error("No valid items to add after filtering"),!1;const n=await fetch("/cart/add.js",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","X-Requested-With":"XMLHttpRequest"},body:JSON.stringify({items:e}),credentials:"same-origin"});return n.ok?(await n.json(),!0):(console.error("Failed to add items to cart",n.status,await n.text()),!1)}(t);return o}catch(t){return console.error("Error syncing cart:",t),!1}finally{n.forEach((({icon:t,loader:e})=>{t.removeChild(e)})),b=!1}}function $(t){try{localStorage.setItem(p,JSON.stringify(t)),k(t),q()}catch(t){console.error("Error saving cart to localStorage",t)}}async function _(t){try{const e=t.detail?.response||await g();e&&await async function(t){if(b)return;const e=t.items.map((t=>({id:t.id,variant_id:`gid://shopify/ProductVariant/${t.id}`,title:t.title,price:t.price,image:t.image,quantity:t.quantity,properties:t.properties||{}}))),n=I().map((t=>({id:t.id,qty:t.quantity})));y(e.map((t=>({id:t.id,qty:t.quantity}))),n)||(console.log("Cart changed in store, updating local cart"),$(e))}(e)}catch(t){console.error("Error handling cart update:",t)}}let H=!1;function x(){H||(C(),document.querySelectorAll(".chatbot-cart-icon").forEach((t=>{t.addEventListener("click",(t=>{t.stopPropagation(),E()}))})),H=!0)}let M=null,O=!1,j=[],A=0;async function J(t,e){M&&W();try{const n=await fetch(`/apps/chatbot-api/ws/${t}/${e}`);if(console.log("Fetch Response:",n),!n.ok)throw new Error("Failed to get WebSocket endpoint");const o=await n.json();console.log("Websocket endpoint data:",o);const r=o.wsEndpoint;M=new WebSocket(r),M.onopen=()=>{for(console.log("WebSocket connection established"),O=!0,A=0;j.length>0;){P(j.shift())}},M.onmessage=t=>{try{const e=JSON.parse(t.data);console.log("WebSocket message received:",e),"conversation_stored"===e.type&&(e.success?console.log(`Conversation stored successfully with ID: ${e.conversation_id}`):console.error(`Failed to store conversation: ${e.error}`))}catch(t){console.error("Error processing WebSocket message:",t)}},M.onclose=n=>{if(console.log("WebSocket connection closed:",n),O=!1,A<5){A++;const n=Math.min(1e3*A,5e3);console.log(`Attempting to reconnect in ${n}ms (attempt ${A})`),setTimeout((()=>J(t,e)),n)}},M.onerror=t=>{console.error("WebSocket error:",t)}}catch(n){if(console.error("Error initializing WebSocket:",n),A<5){A++;const n=Math.min(1e3*A,5e3);console.log(`Error connecting. Retrying in ${n}ms (attempt ${A})`),setTimeout((()=>J(t,e)),n)}}}function P(t){O&&M?M.send(JSON.stringify(t)):j.push(t)}function W(){M&&(M.close(),M=null,O=!1)}function D(t,e,n=[],o){const r=document.querySelector(".message-list");if(!r)return;const a=document.createElement("div");a.className="message-wrapper";const s=function(t,e){const n=document.createElement("div");return n.className=`message ${e}-message`,n.innerHTML=function(t){const e=(t=t.replace(/â€¢/g,"•")).split("\n");let n="",o=!1,r="";for(let t=0;t<e.length;t++){const a=e[t].trim();if(""===a&&t>0&&t<e.length-1){const n=e[t-1].trim(),o=e[t+1].trim();if(n.startsWith("•")&&o.startsWith("•"))continue}a.startsWith("•")?(r&&!o&&(n+=`<p>${r}</p>`,r=""),o||(n+='<ul class="message-list-items">',o=!0),n+=`<li>${a.substring(1).trim()}</li>`):(o&&(n+="</ul>",o=!1),a?r?r+=" "+a:r=a:r&&(n+=`<p>${r}</p>`,r=""))}return o&&(n+="</ul>"),r&&(n+=`<p>${r}</p>`),n}(t),n}(t,e);if(a.appendChild(s),"bot"===e&&n.length>0){const t=d(n,o,(t=>{!function(t){if(!t.variant_id)return console.error("Product missing required variant_id",t),!1;const e=h(t.variant_id);e?N({...t,variant_id:e,image:t.image||"",title:t.title||"",price:t.price||"",quantity:t.quantity,source:"chatbot"}):console.error("Invalid variant ID format",t.variant_id)}({title:t.title,price:t.price,image:t.image,variant_id:t.variant_id||t.id,quantity:1})}));a.appendChild(t)}if(r.appendChild(a),!window.isLoadingHistory&&(function(t,e,n){try{const o=JSON.parse(sessionStorage.getItem("chatMessages")||"[]");o.push({text:t,sender:e,products:n,timestamp:(new Date).toISOString()}),sessionStorage.setItem("chatMessages",JSON.stringify(o))}catch(t){console.error("Error saving message to session storage:",t)}}(t,e,n),"bot"===e)){const e=JSON.parse(sessionStorage.getItem("chatMessages")||"[]");if(e.length>=2){const n=e.filter((t=>"user"===t.sender)).pop();n&&P({type:"store_conversation",user_query:n.text,agent_response:t})}}}let R=!1;function F(t){const e=sessionStorage.getItem("conversationHistory");if(e)try{c(JSON.parse(e))}catch(t){console.error("Error parsing conversation history:",t),c()}else c();const o=document.querySelector(".input-box"),r=document.querySelector(".send-button"),s=m(),l=localStorage.getItem("userId")||"1";J(s,l),console.log("Initializing WebSocket with:",{shopId:s,userId:l}),window.addEventListener("beforeunload",(()=>{W()})),function(t){if(!R)try{const e=sessionStorage.getItem("chatMessages");e&&(window.isLoadingHistory=!0,JSON.parse(e).forEach((e=>{D(e.text,e.sender,e.products||[],"user"===e.sender?t:n)})),window.isLoadingHistory=!1,R=!0)}catch(t){window.isLoadingHistory=!1,console.error("Error loading chat history from session storage:",t)}}(t);const d=async()=>{const e=o.value.trim();if(!e)return;D(e,"user",[],t),o.value="";const r=function(t){const e=document.createElement("div");return e.className="typing-indicator",e.innerHTML="\n      <span></span>\n      <span></span>\n      <span></span>\n    ",e.querySelectorAll("span").forEach((e=>{e.style.backgroundColor=t})),e}(t);document.querySelector(".message-list").appendChild(r);try{const{answer:t,products:o,history:r}=await async function(t,e){const n=new AbortController,o=setTimeout((()=>n.abort()),12e4),r=new Headers({"Content-Type":"application/json",Accept:"application/json"}),s={id:i.length,user:t,agent:"",timestamp:(new Date).toISOString()};i.push(s),sessionStorage.setItem("conversationHistory",JSON.stringify(i));const c=`${a}?shopId=${encodeURIComponent(e)}`;try{const t=await fetch(c,{method:"POST",headers:r,body:JSON.stringify({messages:i}),signal:n.signal});if(clearTimeout(o),!t.ok){const e=await t.json();throw new Error(e.message||"Failed to get bot response")}const e=await t.json();return i.length>0&&(i[i.length-1].agent=e.answer,i[i.length-1].timestamp=(new Date).toISOString(),sessionStorage.setItem("conversationHistory",JSON.stringify(i))),{answer:e.answer,products:e.products||[],history:e.hisory||i}}catch(t){throw clearTimeout(o),"AbortError"===t.name?new Error("Request timed out. Please try again."):t}}(e,m());D(t,"bot",o||[],n)}catch(t){console.error("Chat error:",t),D("Sorry, something went wrong! Can you please try again later.","bot",[],n)}finally{r.remove(),o.focus()}};o.addEventListener("input",(()=>{r.disabled=""===o.value.trim()})),o.addEventListener("keypress",(t=>{"Enter"===t.key&&d()})),r.addEventListener("click",d)}async function z(){const e=await async function(){const e=m();try{const n=await fetch(`/apps/chatbot-api/supabase?shopId=${encodeURIComponent(e)}`);if(!n.ok)throw new Error("Failed to fetch color");return(await n.json()).color||t}catch(e){return console.error("Color fetch error:",e),t}}();return function(t){document.documentElement.style.setProperty("--primary-color",t),[".chatbot-toggle-button",".chatbot-header",".send-button",".start-chat-button",".add-to-cart-button"].forEach((e=>{document.querySelectorAll(e).forEach((e=>{e.style.backgroundColor=t}))})),document.querySelectorAll(".chatbot-window, .email-collection-screen").forEach((e=>{e.style.borderColor=t}))}(e),e}function X(){try{const t=sessionStorage.getItem(u);return t?JSON.parse(t):{}}catch(t){return console.error("Failed to parse session data:",t),{}}}async function B(t){try{const e=(await async function(){try{const t=await fetch(o);return await t.json()}catch(t){return console.error("IP fetch failed:",t),{ip:"unknown"}}}()).ip||"unknown",n=await async function(t){if("unknown"===t)return{country:"unknown",city:"unknown"};try{const e=await fetch(`${r}/${t}/json/`),n=await e.json();return{country:n.country_name||"unknown",city:n.city||"unknown",region:n.region||"unknown"}}catch(t){return console.error("Location fetch failed:",t),{country:"unknown",city:"unknown"}}}(e),a={email:t,ip:e,country:n.country||"unknown",city:n.city||"unknown",region:n.region||"unknown",session_start:(new Date).toISOString(),interactions:0,total_chat_interactions:0,products_added_to_cart:0,cart_items:[]};if(!function(t){try{const e=JSON.stringify({...X(),...t});return sessionStorage.setItem(u,e),!0}catch(t){return console.error("Failed to update session:",t),!1}}(a))throw new Error("Failed to store session");return X()}catch(t){throw console.error("Session initialization failed:",t),t}}function V(){return!!X().email}function G(t,e){const n=document.createElement("div");n.className="chatbot-header",n.style.backgroundColor=t,n.innerHTML=`\n    <h3 class="chatbot-header-title">${e}</h3>\n  `;const o=function(){const t=document.createElement("div");return t.className="chatbot-cart-icon",t.innerHTML='\n      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n        <circle cx="9" cy="21" r="1"></circle>\n        <circle cx="20" cy="21" r="1"></circle>\n        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>\n      </svg>\n      <span class="cart-count">0</span>\n    ',t}();return n.appendChild(o),n}function U(t,e){const n=document.createElement("div");n.className="chat-page";const o=G(e,"Store Assistant");n.appendChild(o);const r=document.createElement("div");r.className="chat-content";const a=function(){const t=document.createElement("div");return t.className="message-list",t}();r.appendChild(a),n.appendChild(r);const s=function(t){const e=document.createElement("div");return e.className="input-component",e.innerHTML='\n      <input type="text" class="input-box" placeholder="Type your message...">\n      <button class="send-button" disabled>Send</button>\n    ',e.querySelector(".send-button").style.backgroundColor=t,e}(e);return n.appendChild(s),n}function Y(t){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)}function K(t,e,n=!1){const o=V()?U(0,e):function(t="Store Assistant",e){const n=document.createElement("div");n.className="email-gate-page",n.innerHTML=`\n    <div class="chatbot-header" style="background-color: ${e}">\n      <h3 class="chatbot-header-title">${t}</h3>\n    </div>\n    <div class="email-collection-content">\n      <p>\n        To get started with our chat assistant, please enter your email address. This helps us \n        personalize your experience\n      </p>\n      <input \n        type="email" \n        class="email-input" \n        placeholder="Your email address" \n        required\n        aria-label="Email address"\n        aria-describedby="email-error"\n        >\n      <div id="email-error" class="error-message hidden">Please enter a valid email address</div>\n      <button class="start-chat-button" style="background-color: ${e}">Continue to Chat</button>\n      <button class="skip-button">Continue as Guest</button> \n    </div>\n  `;const o=n.querySelector(".email-input"),r=n.querySelector(".error-message"),a=n.querySelector(".start-chat-button"),s=n.querySelector(".skip-button");return a.addEventListener("click",(async()=>{const t=o.value.trim();if(!Y(t))return r.classList.remove("hidden"),void o.focus();const e=a.textContent,n=l();a.innerHTML="",a.appendChild(n),a.disabled=!0;try{await B(t),window.chatbotRenderContent&&window.chatbotRenderContent(!0)}catch(t){console.error("Session initialization failed:",t),r.textContent="Failed to start chat. Please try again.",r.classList.remove("hidden"),a.removeChild(n),a.textContent=e,a.disabled=!1}})),o.addEventListener("input",(()=>{Y(o.value.trim())&&r.classList.add("hidden")})),s.addEventListener("click",(async()=>{const t=s.textContent,e=l();s.innerHTML="",s.appendChild(e),s.disabled=!0;try{const t=`Anonymous_${Date.now()}`;await B(t),window.chatbotRenderContent&&window.chatbotRenderContent(!0)}catch(n){console.error("Session initialization failed:",n),s.removeChild(e),s.textContent=t,s.disabled=!1}})),n}("Store Assistant",e),r=t.querySelector(".chat-page, .email-gate-page");return r&&t.removeChild(r),o.classList.add("hidden"),t.appendChild(o),n&&(o.classList.remove("hidden"),o.classList.add("open")),o}let Q=null,Z=!1;document.addEventListener("DOMContentLoaded",(async()=>{const n=document.getElementById("shopify-chatbot");if(!n)return void console.error("Chatbot container not found");const o=l();n.appendChild(o),n.style.setProperty("--primary-color",t),n.style.setProperty("--text-color",e);const r=await z();n.removeChild(o);const a=function(t){const e=document.createElement("button");return e.className="chatbot-toggle-button",e.innerHTML="💬",e.style.backgroundColor=t,e}(r);n.appendChild(a),window.chatbotRenderContent=t=>(Q=K(n,r,t),t&&V()&&F(r),Q.classList.contains("chat-page")&&x(),Q),Q=K(n,r,!1),a.addEventListener("click",(()=>{Z=!Z,Z?(Q.classList.remove("hidden"),Q.classList.add("open"),V()&&(F(r),document.querySelector(".input-box")?.focus()),Q.classList.contains("chat-page")&&x()):(Q.classList.remove("open"),Q.classList.add("hidden")),a.innerHTML=Z?"x":"💬"})),function(){const t=m();console.log("Shop ID:",t),window.addEventListener("beforeunload",(()=>{const e=JSON.parse(sessionStorage.getItem(u));if(console.log("Analytics Data:",e),e){const n={type:"application/json"},o=new Blob([JSON.stringify({shopId:t,sessionData:e})],n);navigator.sendBeacon(`${s}`,o)}}))}()}))}();
