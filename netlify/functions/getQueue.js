const { google } = require('googleapis');

// Konfigurasi otentikasi
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // FIX: Decode kunci dari format Base64
    private_key: Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Antrian'; 

exports.handler = async (event, context) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`, // Asumsi kolom A-F: id, name, phone, timestamp, status, order
    });

    const rows = response.data.values || [];
    // Skip header row (baris pertama)
    const data = rows.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      timestamp: row[3],
      status: row[4],
      order: parseFloat(row[5]) || 0, // Pastikan order adalah angka
    }));

    // Urutkan berdasarkan 'order'
    data.sort((a, b) => a.order - b.order);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal mengambil data dari Google Sheets.' }),
    };
  }
};
