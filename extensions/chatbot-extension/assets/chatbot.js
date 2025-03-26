!function(){"use strict";const e=async e=>{const t=(()=>{let e=window.Shopify?.shop;return e})();if(t){const o=await(async(e,t)=>{try{const t=await fetch(`/apps/chatbot-api/supabase?shopId=${encodeURIComponent(e)}`,{method:"GET",credentials:"same-origin",headers:{Accept:"application/json"}});if(!t.ok)throw new Error(`Server responded with status: ${t.status}`);return(await t.json()).color}catch(e){return console.error("Error fetching the color preference!",e),t}})(t,e);o&&(e=>{document.querySelectorAll(".chatbot-toggle-button, .chatbot-header, .send-button, .user-message").forEach((t=>{t.style.backgroundColor=e})),document.querySelectorAll(".chatbot-window, .user-message").forEach((t=>{t.style.borderColor=e})),document.querySelectorAll(".typing-indicator span").forEach((t=>{t.style.backgroundColor=e}))})(o)}};function t(e,t,n){const r=new Headers({"Content-Type":"application/json",Accept:"application/json"});fetch("/apps/chatbot-api/deepseek",{method:"POST",headers:r,body:JSON.stringify({messages:[{role:"user",content:e}]})}).then((e=>e.ok?e.json():e.json().then((t=>{throw new Error(`Server error: ${e.status} - ${JSON.stringify(t)}`)})))).then((e=>{t&&t.remove(),e&&e.answer?o(e.answer,"bot"):o("Sorry, I couldn't process your request.","bot")})).catch((e=>{t&&t.remove(),o("Sorry, there was an error processing your request. Please try again later.","bot"),console.error("Error:",e)}))}function o(e,t,o){const n=document.querySelector(".message-list"),r=document.createElement("div");r.className=`message ${t}-message`,r.textContent=e,r.style.backgroundColor="#40444b",r.style.borderColor="#40444b",n.appendChild(r),function(){const e=document.querySelector(".chat-window");e.scrollTop=e.scrollHeight}()}document.addEventListener("DOMContentLoaded",(function(){const o=document.getElementById("shopify-chatbot");if(!o)return;const n=o.dataset.primaryColor||"#008080",r=o.dataset.textColor||"#f8f8f8",s=o.dataset.title||"Store Assistant";o.style.setProperty("--primary-color",n),o.style.setProperty("--text-color",r);const c=function(e){const t=document.createElement("button");return t.className="chatbot-toggle-button",t.innerHTML="💬",t.style.backgroundColor=e,t}(n);o.appendChild(c);const a=function(e,t){const o=document.createElement("div");o.className="chatbot-window",o.style.borderColor=e;const n=document.createElement("div");n.className="chatbot-header",n.style.backgroundColor=e,n.innerHTML=`\n      <h3 class="chatbot-header-title">${t}</h3>\n      <button class="chatbot-close-button">✕</button>\n    `,o.appendChild(n);const r=document.createElement("div");r.className="chat-window";const s=document.createElement("div");s.className="message-list",r.appendChild(s),o.appendChild(r);const c=document.createElement("div");return c.className="input-component",c.innerHTML=`\n      <input type="text" class="input-box" placeholder="Type your message...">\n      <button class="send-button" disabled style="background-color: ${e};">\n        Send\n      </button>\n    `,o.appendChild(c),o}(n,s);o.appendChild(a),c.addEventListener("click",(()=>{a.classList.toggle("open"),a.classList.contains("open")?c.innerHTML="×":c.innerHTML="💬",a.classList.contains("open")&&document.querySelector(".input-box").focus()})),a.querySelector(".chatbot-close-button").addEventListener("click",(()=>{a.classList.remove("open"),document.querySelector(".chatbot-toggle-button").innerHTML="💬"})),function(e){const o=document.querySelector(".input-box"),n=document.querySelector(".send-button"),r=document.querySelector(".message-list");function s(){const e=o.value.trim();if(""===e)return;c(e,"user"),o.value="",n.disabled=!0;const s=document.createElement("div");s.className="typing-indicator",s.innerHTML="<span></span><span></span><span></span>",s.style.backgroundColor="#40444b",s.style.borderColor="#40444b",r.appendChild(s),a(),t(e,s)}function c(t,o){const n=document.createElement("div");n.className=`message ${o}-message`,n.textContent=t,"user"===o?(n.style.backgroundColor=e,n.style.borderColor=e):(n.style.backgroundColor="#40444b",n.style.borderColor="#40444b"),r.appendChild(n),a()}function a(){const e=document.querySelector(".chat-window");e.scrollTop=e.scrollHeight}o.addEventListener("input",(()=>{n.disabled=""===o.value.trim()})),n.addEventListener("click",(()=>s())),o.addEventListener("keypress",(e=>{"Enter"===e.key&&""!==o.value.trim()&&(e.preventDefault(),s())})),setTimeout((()=>{c("Hi there! How can I help you today?","bot")}),500)}(n),e(n)}))}();
