// Shared KING STUDIO editorial footer — vanilla web component.
// Mounted via <x-import component-from-global-scope="ks-footer" from="./ks-footer.js">.
(function () {
  if (customElements.get('ks-footer')) return;
  class KSFooter extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block';
      this.innerHTML = `
      <footer style="background:#0b0a0a;color:rgba(240,238,233,.7);font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif">
        <div style="max-width:1280px;margin:0 auto;padding:34px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start">
            <div style="display:flex;flex-direction:column;gap:6px">
              <span style="font-family:'Pretendard Variable',Pretendard,Inter,sans-serif;font-weight:900;font-size:18px;color:#F0EEE9">KING STUDIO</span>
              <span style="font-size:12px">hello@kingstudio.co.kr · +82 2 000 0000</span>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px;font-weight:700;letter-spacing:.04em">
              <a href="Service.dc.html" style="color:rgba(240,238,233,.8);text-decoration:none">About</a>
              <a href="Service.dc.html" style="color:rgba(240,238,233,.8);text-decoration:none">Contacts</a>
              <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Terms</a>
              <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Privacy</a>
              <a href="#" style="color:rgba(240,238,233,.8);text-decoration:none">Refund</a>
            </div>
          </div>
          <div style="border-top:1px solid rgba(240,238,233,.12);padding-top:16px;display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.7;color:rgba(240,238,233,.5)">
            <span>KING STUDIO (킹스튜디오) · CEO: <span style="font-family:ui-monospace,Menlo,monospace">[대표자명]</span> · Business reg. no.: <span style="font-family:ui-monospace,Menlo,monospace">[000-00-00000]</span> · Privacy officer: <span style="font-family:ui-monospace,Menlo,monospace">[담당자명]</span></span>
            <span>Address: <span style="font-family:ui-monospace,Menlo,monospace">[서울특별시 성동구 ○○로 00, 0층]</span></span>
            <span>All payments are charged in KRW. Other currencies are shown for reference only; the final rate is set by your card issuer.</span>
            <span style="color:rgba(240,238,233,.32)">© 2026 KING STUDIO. All rights reserved.</span>
          </div>
        </div>
      </footer>`;
    }
  }
  customElements.define('ks-footer', KSFooter);
})();
