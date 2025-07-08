const { google } = require('googleapis');

exports.handler = async (event, context) => {
  // --- DEBUGGING STEP ---
  // Memindahkan semua logika ke dalam handler untuk menjamin log muncul.
  console.log('--- STARTING getQueue HANDLER ---');
  try {
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    console.log('Raw GOOGLE_PRIVATE_KEY from env:', rawPrivateKey);

    if (!rawPrivateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('One or more Google credentials environment variables are not set.');
    }

    // Ini adalah perbaikan paling umum untuk private key di env vars.
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
    const SHEET_NAME = 'Antrian';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = response.data.values || [];
    const data = rows.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      timestamp: row[3],
      status: row[4],
      order: parseFloat(row[5]) || 0,
    }));

    data.sort((a, b) => a.order - b.order);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('CRITICAL ERROR in getQueue handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal memproses permintaan. Cek logs.' }),
    };
  }
};
