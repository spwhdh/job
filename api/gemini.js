// Vercel Serverless Function - Gemini API
// API 키는 환경 변수에서 안전하게 가져옴

module.exports = async function handler(req, res) {
  // CORS 설정 (클라이언트에서 접근 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 환경 변수에서 API 키 가져오기 (코드에 직접 넣지 않음!)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ 
      error: 'API key not configured',
      message: 'Vercel 환경 변수에 GEMINI_API_KEY를 설정해주세요.' 
    });
  }

  try {
    const { prompt, type } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Gemini API 호출:', { type, promptLength: prompt.length });

    // Gemini API 호출 (최신 2.5 Flash 모델 사용)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 응답에서 텍스트 추출
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('Gemini API 성공:', { responseLength: text.length });
      
      return res.status(200).json({ 
        success: true,
        text: text,
        type: type 
      });
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format from Gemini API');
    }
    
  } catch (error) {
    console.error('Error in Gemini API handler:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Gemini API 호출 중 오류가 발생했습니다.' 
    });
  }
}


