const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid'); // Kita butuh uuid untuk ID unik

// Konfigurasi otentikasi (sama seperti file sebelumnya)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Antrian';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name, phone, order } = JSON.parse(event.body);

    if (!name || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nama dan nomor telepon harus diisi.' }) };
    }

    const newRow = [
      uuidv4(), // ID unik untuk setiap baris
      name,
      phone,
      new Date().toISOString(), // Timestamp
      'waiting', // Status awal
      order, // Order number
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Berhasil ditambahkan ke antrian.' }),
    };
  } catch (error) {
    console.error('Error adding to Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal menambahkan data ke Google Sheets.' }),
    };
  }
};
