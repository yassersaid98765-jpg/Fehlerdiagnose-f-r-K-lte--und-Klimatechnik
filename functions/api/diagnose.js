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

    // قائمة النماذج المستقرة
    const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (const model of models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
          
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts }] })
          });
          
          const data = await res.json();

          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            return new Response(JSON.stringify({ result: aiText }), { headers: cors });
          }

          if (data.error && data.error.code === 503) {
            lastError = data.error.message;
            await sleep(3000); // انتظار 3 ثوانٍ قبل المحاولة مرة أخرى
            continue; 
          }

          lastError = data.error ? data.error.message : "خطأ غير معروف";
          break;

        } catch (e) {
          lastError = e.message;
          await sleep(2000);
        }
      }
    }

    return new Response(JSON.stringify({ error: "السيرفرات مشغولة جداً حالياً. يرجى المحاولة بعد دقيقة. (تفاصيل: " + lastError + ")" }), { status: 500, headers: cors });

  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ في الخادم: " + e.message }), { status: 500, headers: cors });
  }
}
