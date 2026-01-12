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

    // API 키 길이 확인 (실제 키는 로그에 출력 안 함)
    console.log('API 키 길이:', GEMINI_API_KEY.length);
    console.log('API 키 시작 문자:', GEMINI_API_KEY.substring(0, 10) + '...');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('요청 URL (키 제외):', apiUrl.replace(/key=.+$/, 'key=***'));

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    };
    console.log('요청 본문:', JSON.stringify(requestBody).substring(0, 200) + '...');

    // Gemini API 호출 (Gemini 1.5 Flash 모델 사용)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 전체 오류 응답:', errorText);
      console.error('응답 헤더:', JSON.stringify([...response.headers.entries()]));
      
      // 더 자세한 오류 정보 반환
      return res.status(500).json({ 
        error: `Gemini API error: ${response.status}`,
        details: errorText,
        statusCode: response.status,
        statusText: response.statusText
      });
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


