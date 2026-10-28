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

  // Webhook URL Google Apps Script Backend
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmWsZUScOhwkdcn82w3GqJ4xY3G5j0fK9gXhZxTqXgXB0BcgFcmEezl4-rXTW0FFGr/exec';

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      redirect: 'follow'
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi kết nối Google Apps Script:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Không thể kết nối đến máy chủ xử lý dữ liệu: ' + error.message 
    });
  }
}
