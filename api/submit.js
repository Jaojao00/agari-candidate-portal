export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  // Bật CORS cho phép gọi API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Chỉ chấp nhận phương thức POST' });
  }

  // Webhook URL Google Apps Script Backend (Đã kích hoạt quyền công khai ANYONE_ANONYMOUS)
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKm_8s5btcRz4CGrpPaKRtQUh_5KOkvc2SuGxrymv_BtQm1iMMPnAj1yAhz40ktygo/exec';

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      console.error('Phản hồi từ Google Apps Script không phải JSON:', text);
      return res.status(500).json({
        success: false,
        message: 'Lỗi phản hồi từ Google: ' + (text.substring(0, 150) || 'Không có phản hồi')
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi kết nối Google Apps Script:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Không thể kết nối đến máy chủ xử lý dữ liệu: ' + error.message 
    });
  }
}
