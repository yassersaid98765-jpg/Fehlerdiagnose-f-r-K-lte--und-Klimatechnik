export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const { prompt, imageData } = await request.json();
    
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "خطأ: مفتاح GEMINI_API_KEY غير موجود في إعدادات Cloudflare." }), { status: 500, headers: cors });
    }

    // استخدام النموذج المدعوم حالياً بدلاً من النموذج القديم
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const parts = [{ text: prompt }];
    if (imageData) {
      parts.push({ 
        inline_data: { 
          mime_type: "image/jpeg", 
          data: imageData 
        } 
      });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    });
    
    const data = await res.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        return new Response(JSON.stringify({ error: "خطأ من Google: " + JSON.stringify(data) }), { status: 500, headers: cors });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    return new Response(JSON.stringify({ result: aiText }), { headers: cors });

  } catch (e) {
    return new Response(JSON.stringify({ error: "حدث خطأ في الخادم: " + e.message }), { status: 500, headers: cors });
  }
}
