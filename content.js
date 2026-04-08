
function scanPaymentGateways() {
  const GATEWAYS = [
    { name: "Paytm", strong: [/securegw\.paytm\.in/i, /merchantpgp\.paytm\.com/i, /\btxnToken\b/i, /\bMID\b/i], medium: [/merchant\.mid/i, /checksumhash/i, /paytm(?:wallet|merchant|checksum)/i], weak: [/\bpaytm\b/i] },
    { name: "Razorpay", strong: [/checkout\.razorpay\.com/i, /api\.razorpay\.com/i, /\brazorpay_order_id\b/i, /\brzp_[a-z0-9]+\b/i], medium: [/\bkey_id\b/i, /razorpay-checkout/i, /\brazorpay\b/i], weak: [] },
    { name: "Cashfree", strong: [/api\.cashfree\.com/i, /sdk\.cashfree\.com/i, /\bpayment_session_id\b/i, /\border_token\b/i], medium: [/cashfree\.com\/pg/i, /\bcashfree\b/i], weak: [] },
    { name: "CCAvenue", strong: [/secure\.ccavenue\.com/i, /\bencRequest\b/i, /\baccess_code\b/i], medium: [/\bccavenue\b/i], weak: [] },
    { name: "PayU", strong: [/secure\.payu/i, /payubiz/i, /\btxnid\b/i], medium: [/\bpayu\b/i, /\bhash\b/i], weak: [] },
    { name: "PhonePe", strong: [/mercury-t2\.phonepe\.com/i, /api-preprod\.phonepe\.com/i, /api\.phonepe\.com/i, /\bmerchantTransactionId\b/i], medium: [/\bphonepe\b/i], weak: [] },
    { name: "BillDesk", strong: [/pgi\.billdesk\.com/i, /\bbdorderid\b/i], medium: [/\bbilldesk\b/i], weak: [] },
    { name: "Juspay", strong: [/\bjuspay\b/i, /\bhypercheckout\b/i, /\bsessionToken\b/i], medium: [], weak: [] },
    { name: "Easebuzz", strong: [/\beasebuzz\b/i, /\baccess_key\b/i], medium: [], weak: [] },
    { name: "Zaakpay", strong: [/\bzaakpay\b/i, /\btransToken\b/i], medium: [], weak: [] },
    { name: "SBIePay", strong: [/\bsbiepay\b/i, /\bmerchantOrderNo\b/i], medium: [], weak: [] },
    { name: "Instamojo", strong: [/\binstamojo\b/i], medium: [], weak: [] },
    { name: "Airpay", strong: [/\bairpay\b/i], medium: [], weak: [] },
    { name: "PayKun", strong: [/\bpaykun\b/i], medium: [], weak: [] },
    { name: "EBS", strong: [/\bebspg\b/i, /ebs\.in/i], medium: [], weak: [] },
    { name: "DirecPay", strong: [/\bdirecpay\b/i], medium: [], weak: [] },
    { name: "EnKash", strong: [/\benkash\b/i], medium: [], weak: [] },
    { name: "Stripe", strong: [/js\.stripe\.com/i, /checkout\.stripe\.com/i, /api\.stripe\.com/i, /\bpk_(live|test)_[a-z0-9_]+\b/i, /\bclient_secret\b/i], medium: [/\bstripe\b/i], weak: [] },
    { name: "PayPal", strong: [/paypalobjects\.com/i, /paypal\.com/i, /\bclient-id=\b/i], medium: [/\bpaypal\b/i], weak: [] },
    { name: "Braintree", strong: [/\bbraintree\b/i, /\bclientToken\b/i], medium: [], weak: [] },
    { name: "Amazon Pay", strong: [/\bamazonpay\b/i, /payments-amazon/i], medium: [/\bamazon pay\b/i], weak: [] },
    { name: "Adyen", strong: [/\badyen\b/i, /\bclientKey\b/i], medium: [], weak: [] },
    { name: "Worldpay", strong: [/\bworldpay\b/i], medium: [], weak: [] },
    { name: "BlueSnap", strong: [/\bbluesnap\b/i], medium: [], weak: [] },
    { name: "Authorize.Net", strong: [/\bauthorize\.net\b/i, /\bauthorizenet\b/i], medium: [], weak: [] },
    { name: "2Checkout / Verifone", strong: [/\b2checkout\b/i, /\bverifone\b/i], medium: [], weak: [] },
    { name: "Checkout.com", strong: [/\bcheckout\.com\b/i, /\bcko_[a-z0-9]+\b/i], medium: [], weak: [] },
    { name: "Square", strong: [/squareup\.com/i, /js\.squarecdn\.com/i, /sandbox\.web\.squarecdn\.com/i, /\bsq0(idp|atp)-/i], medium: [/\bsquarecdn\b/i, /\bapplicationId\b/i], weak: [] },
    { name: "Bolt", strong: [/\bboltpay\b/i, /bolt\.com/i], medium: [], weak: [] },
    { name: "Klarna", strong: [/\bklarna\b/i], medium: [], weak: [] },
    { name: "Afterpay / Clearpay", strong: [/\bafterpay\b/i, /\bclearpay\b/i], medium: [], weak: [] },
    { name: "Affirm", strong: [/\baffirm\b/i], medium: [], weak: [] },
    { name: "WePay", strong: [/\bwepay\b/i], medium: [], weak: [] }
  ];

  const IGNORE = [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /doubleclick\.net/i,
    /facebook\.com\/tr/i,
    /clarity\.ms/i,
    /hotjar/i,
    /segment\.(com|io)/i,
    /cdn\.cookielaw/i,
    /intercom/i,
    /hubspot/i,
    /crisp\.chat/i
  ];

  const aggregate = new Map();

  function ensure(name){
    if(!aggregate.has(name)){
      aggregate.set(name,{
        name,score:0,strongHits:0,mediumHits:0,weakHits:0,reasons:[],examples:[],
        evidenceGroups:{script:[],iframe:[],form:[],resource:[],html:[],text:[],url:[],other:[]}
      });
    }
    return aggregate.get(name);
  }

  function groupFor(label){
    const x=String(label).toLowerCase();
    if(x.includes('script')) return 'script';
    if(x.includes('iframe')) return 'iframe';
    if(x.includes('form')) return 'form';
    if(x.includes('resource')) return 'resource';
    if(x.includes('html')) return 'html';
    if(x.includes('text')) return 'text';
    if(x.includes('url')) return 'url';
    return 'other';
  }

  function addUnique(arr, value, limit){
    if(value && arr.length < limit && !arr.includes(value)) arr.push(value);
  }

  function note(gateway,type,reason,value,score,label){
    const row=ensure(gateway);
    row.score+=score;
    if(type==="strong") row.strongHits+=1;
    if(type==="medium") row.mediumHits+=1;
    if(type==="weak") row.weakHits+=1;
    addUnique(row.reasons, reason, 8);
    const sample=value?String(value).slice(0,260):"";
    addUnique(row.examples, sample, 8);
    const group=groupFor(label);
    addUnique(row.evidenceGroups[group], sample, 4);
  }

  function analyzeText(text,label){
    if(!text) return;
    const s=String(text);
    if(IGNORE.some((p)=>p.test(s))) return;
    for(const gateway of GATEWAYS){
      for(const pattern of gateway.strong){ try{ if(pattern.test(s)) note(gateway.name,"strong",`Strong ${label} match ${pattern}`,s,6,label); }catch(e){} }
      for(const pattern of gateway.medium){ try{ if(pattern.test(s)) note(gateway.name,"medium",`Medium ${label} match ${pattern}`,s,3,label); }catch(e){} }
      for(const pattern of gateway.weak){ try{ if(pattern.test(s)) note(gateway.name,"weak",`Weak ${label} match ${pattern}`,s,1,label); }catch(e){} }
    }
  }

  function addElementSignals(doc,prefix){
    try{
      doc.querySelectorAll('script[src], iframe[src], form[action], link[href], img[src], a[href]').forEach((el)=>{
        const value=el.src||el.href||el.action;
        if(value) analyzeText(value, `${prefix}${el.tagName.toLowerCase()}`);
      });
    }catch(e){}
  }

  let bodyText="";
  try{ analyzeText(location.href,"page-url"); }catch(e){}
  addElementSignals(document,"");

  try{
    performance.getEntriesByType('resource').forEach((entry)=>{
      if(entry && entry.name) analyzeText(entry.name,"resource");
    });
  }catch(e){}

  try{
    const htmlSample=document.documentElement?document.documentElement.outerHTML.slice(0,300000):"";
    analyzeText(htmlSample,"html");

    const endpointHints = htmlSample.match(/(?:checkout|payment|pay|order|session|token|gateway|merchant)[-_a-zA-Z0-9:/?.=&]{0,80}/g) || [];
    endpointHints.slice(0,120).forEach((hint)=>analyzeText(hint,"html-endpoint"));
  }catch(e){}

  try{
    bodyText=document.body?document.body.innerText.slice(0,120000):"";
    analyzeText(bodyText,"page-text");
  }catch(e){}

  try{
    document.querySelectorAll("form").forEach((form)=>{
      const action=form.action||"";
      const method=form.method||"";
      const fields=Array.from(form.querySelectorAll("input[name], button[name], input[id], button[id], input[value], button")).map(el=>{
        return [el.name||"", el.id||"", el.value||"", el.textContent||""].join(" ");
      }).join(" ");
      analyzeText(`${action} ${method} ${fields}`,"form");
    });
  }catch(e){}

  try{
    Array.from(document.querySelectorAll("iframe")).forEach((iframe,idx)=>{
      try{
        analyzeText(iframe.src || `iframe-${idx+1}`,"iframe-src");
        const doc=iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if(!doc) return;
        addElementSignals(doc,"iframe-");
        const iframeHtml=doc.documentElement?doc.documentElement.outerHTML.slice(0,150000):"";
        const iframeText=doc.body?doc.body.innerText.slice(0,60000):"";
        analyzeText(iframeHtml,"iframe-html");
        analyzeText(iframeText,"iframe-text");
      }catch(e){}
    });
  }catch(e){}

  const results=Array.from(aggregate.values())
    .filter((item)=>item.score>=3)
    .sort((a,b)=>b.score-a.score)
    .map((item)=>{
      let confidence="Low";
      if(item.strongHits>=1 || item.score>=12) confidence="High";
      else if(item.mediumHits>=1 || item.score>=6) confidence="Medium";
      let verdict="Detected";
      if(item.strongHits===0 && item.mediumHits===0 && item.weakHits>0) verdict="Possible mention only";
      else if(item.strongHits===0 && item.mediumHits>0) verdict="Probable integration clue";
      else if(item.strongHits>0) verdict="Strong integration clue";
      return {...item, confidence, verdict};
    });

  const genericSignals=[];
  const genericPatterns=[/checkout/i,/payment/i,/pay now/i,/upi/i,/netbanking/i,/credit card/i,/debit card/i,/wallet/i,/place order/i,/continue to payment/i];
  for(const p of genericPatterns){ try{ if(p.test(bodyText)||p.test(location.href)) genericSignals.push(String(p)); }catch(e){} }

  return {
    url: location.href,
    title: document.title || "",
    scannedSources: results.reduce((n,item)=>n+item.examples.length,0),
    genericSignals,
    results,
    note: "Auto-scans on popup open. Best results usually appear on cart or checkout pages."
  };
}
scanPaymentGateways();
