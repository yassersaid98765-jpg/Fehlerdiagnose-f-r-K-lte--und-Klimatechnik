export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const { prompt, fileData, mimeType } = await request.json();
    
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "خطأ: مفتاح GEMINI_API_KEY غير موجود." }), { status: 500, headers: cors });
    }

    const parts = [{ text: prompt }];
    if (fileData) {
      parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: fileData } });
    }

    const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
          
          // هنا أضفنا ميزة البحث في جوجل (Google Search Grounding)
          const payload = {
            contents: [{ parts }],
            tools: [{ google_search: {} }] 
          };
          
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
          const data = await res.json();

          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            
            // استخراج الروابط التي اعتمد عليها الذكاء الاصطناعي (إن وجدت)
            let sources = [];
            const metadata = data.candidates[0].groundingMetadata;
            if (metadata && metadata.groundingChunks) {
               metadata.groundingChunks.forEach(chunk => {
                   if(chunk.web && chunk.web.uri) {
                       sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                   }
               });
            }

            return new Response(JSON.stringify({ result: aiText, sources: sources }), { headers: cors });
          }

          if (data.error && data.error.code === 503) {
            lastError = data.error.message;
            await sleep(2000); 
            continue; 
          }
          lastError = data.error ? data.error.message : "خطأ غير معروف";
          break;
        } catch (e) {
          lastError = e.message;
          await sleep(1000);
        }
      }
    }
    return new Response(JSON.stringify({ error: "السيرفرات مشغولة: " + lastError }), { status: 500, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ في الخادم: " + e.message }), { status: 500, headers: cors });
  }
}
